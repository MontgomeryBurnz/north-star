import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireInternalWorkspaceRouteAccess } from "@/lib/api-route-access";
import { auditActorFromManagedUser, buildSystemAuditActor } from "@/lib/audit-event-service";
import { DiscoveryGenerationError, generateDiscoverySynthesis, isDiscoveryEvidenceCheckpoint, reviewDiscoverySources, validateDiscoverySynthesis } from "@/lib/discovery-studio-service";
import type { DiscoveryEvidenceCheckpoint } from "@/lib/discovery-studio-service";
import { assertDiscoveryCheckpointConfigured, DiscoveryCheckpointError, discoveryRequestFingerprint, openDiscoveryCheckpoint, sealDiscoveryCheckpoint } from "@/lib/discovery-studio-checkpoint";
import { discoveryStudioResponse } from "@/lib/discovery-studio-transport";
import type { DiscoverySynthesisRequest } from "@/lib/discovery-studio-types";
import type { ProgramArtifact, StoredProgram } from "@/lib/program-intake-types";
import { createAuditEvent } from "@/lib/program-store";

export const runtime = "nodejs";
// The service stops at 740s, leaving time for validation/audit writes before
// Vercel Pro's generally available 800s Fluid Compute limit.
export const maxDuration = 800;
const sessionCookie = process.env.NODE_ENV === "production" ? "__Host-northstar-studio-session" : "northstar-studio-session";

function browserSession(request: Request) {
  const value = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
  return value && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value) ? value : undefined;
}

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeArtifact(value: unknown, index: number): ProgramArtifact | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ProgramArtifact>;
  const name = cleanText(input.name, 240);
  const extractedText = cleanText(input.extractedText, 200_000);
  if (!name) return null;

  return {
    id: cleanText(input.id, 240) || `SOURCE-${index + 1}`,
    name,
    size: typeof input.size === "number" && Number.isFinite(input.size) ? Math.max(0, input.size) : 0,
    type: cleanText(input.type, 120) || "unknown",
    lastModified: typeof input.lastModified === "number" && Number.isFinite(input.lastModified) ? input.lastModified : 0,
    fileFormat: input.fileFormat,
    artifactType: input.artifactType,
    sourceQuality: input.sourceQuality,
    analysisPriority: input.analysisPriority,
    sourceKind: extractedText ? "text" : "metadata-only",
    extractionStatus: extractedText ? (input.extractionStatus === "partial" ? "partial" : "extracted") : "unsupported",
    extractionMethod: input.extractionMethod,
    extractionSummary: cleanText(input.extractionSummary, 500),
    extractedText
  };
}

function buildWorkspace(name: string, artifacts: ProgramArtifact[]): StoredProgram {
  const now = new Date().toISOString();
  return {
    id: `studio-${randomUUID()}`,
    createdAt: now,
    updatedAt: now,
    intake: {
      programName: name,
      programOwner: "",
      vision: "",
      sowSummary: "",
      outcomes: "",
      stakeholders: "",
      risks: "",
      constraints: "",
      currentStatus: "",
      decisionsNeeded: "",
      blockers: "",
      artifacts
    }
  };
}

export async function POST(request: Request) {
  const { currentUser, response } = await requireInternalWorkspaceRouteAccess(request);
  if (response) return response;
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Cross-origin Studio requests are not allowed." }, { status: 403 });

  const requestText = await request.text();
  if (Buffer.byteLength(requestText, "utf8") > 4_000_000) return NextResponse.json({ error: "The discovery request is too large. Split the package into smaller groups." }, { status: 413 });
  let body: DiscoverySynthesisRequest;
  try { body = JSON.parse(requestText) as DiscoverySynthesisRequest; } catch { return NextResponse.json({ error: "Invalid discovery request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid discovery request." }, { status: 400 });
  if (body.phase !== undefined && body.phase !== "evidence" && body.phase !== "product") return NextResponse.json({ error: "Invalid Studio generation phase." }, { status: 400 });
  if (body.phase !== "product" && body.checkpoint !== undefined) return NextResponse.json({ error: "An evidence checkpoint is only valid for product generation." }, { status: 400 });
  if (Array.isArray(body.artifacts) && (body.artifacts.length > 16 || body.artifacts.some((source) => typeof source?.extractedText === "string" && source.extractedText.length > 200_000))) {
    return NextResponse.json({ error: "Use up to 16 sources with at most 200,000 extracted characters each. Split larger sources before analysis." }, { status: 400 });
  }
  const workspaceName = cleanText(body.workspaceName, 120) || "Discovery workspace";
  const artifacts = (Array.isArray(body.artifacts) ? body.artifacts : [])
    .slice(0, 16)
    .map(normalizeArtifact)
    .filter((artifact): artifact is ProgramArtifact => Boolean(artifact));

  if (!artifacts.some((source) => source.extractedText?.trim())) {
    return NextResponse.json({ error: "Add at least one readable discovery source before analysis." }, { status: 400 });
  }
  if (new Set(artifacts.map((source) => source.id)).size !== artifacts.length) return NextResponse.json({ error: "Each discovery source needs a unique identifier." }, { status: 400 });
  if (body.previousSynthesis && !validateDiscoverySynthesis(body.previousSynthesis)) return NextResponse.json({ error: "The prior product package is invalid. Generate a fresh package before refining it." }, { status: 400 });

  const resolutionNotes = cleanText(body.resolutionNotes, 12_000);
  const allowedOutputs = ["roadmap", "backlog", "stories", "tests", "gaps", "analysis"];
  const selectedOutputs = Array.isArray(body.selectedOutputs) ? body.selectedOutputs.filter((output) => allowedOutputs.includes(output)) : undefined;
  const researchTopic = cleanText(body.researchTopic, 500);
  if (body.externalResearch && !researchTopic) return NextResponse.json({ error: "Enter a public topic for external research." }, { status: 400 });
  const options = {
    feedback: cleanText(body.feedback, 12_000), previousSynthesis: body.previousSynthesis, selectedOutputs,
    externalResearch: body.externalResearch === true, researchTopic
  };
  const existingSession = browserSession(request);
  const session = existingSession ?? randomUUID();
  const binding = { owner: `${currentUser?.id ?? "site-access"}:${session}`, requestFingerprint: "" };
  let reviewedCheckpoint: DiscoveryEvidenceCheckpoint | undefined;
  if (body.phase) {
    try {
      binding.requestFingerprint = discoveryRequestFingerprint({ workspaceName, artifacts, resolutionNotes, ...options });
      assertDiscoveryCheckpointConfigured();
      if (body.phase === "product") {
        if (!existingSession || typeof body.checkpoint !== "string") return NextResponse.json({ error: "The evidence review session is missing. Start a new analysis." }, { status: 409 });
        const opened = openDiscoveryCheckpoint(body.checkpoint, binding);
        if (!isDiscoveryEvidenceCheckpoint(opened)) return NextResponse.json({ error: "The evidence checkpoint is invalid. Start a new analysis." }, { status: 409 });
        reviewedCheckpoint = opened;
      }
    } catch (error) {
      return NextResponse.json({ error: error instanceof DiscoveryCheckpointError ? error.message : "Studio's secure generation handoff is unavailable. Your current package is preserved." }, { status: error instanceof DiscoveryCheckpointError && error.code === "checkpoint-too-large" ? 413 : 503 });
    }
  }
  const result = await discoveryStudioResponse(request, async () => {
    let synthesis;
    try {
      const workspace = buildWorkspace(workspaceName, artifacts);
      if (body.phase) workspace.id = `studio-${discoveryRequestFingerprint(binding)}`;
      if (body.phase === "evidence") {
        const checkpoint = await reviewDiscoverySources(workspace, resolutionNotes, options);
        return { status: 200, body: { checkpoint: sealDiscoveryCheckpoint(checkpoint, binding) } };
      }
      synthesis = await generateDiscoverySynthesis(workspace, resolutionNotes, options, reviewedCheckpoint);
    } catch (error) {
      return { status: 503, body: { error: error instanceof DiscoveryGenerationError || error instanceof DiscoveryCheckpointError ? error.message : "Studio could not finish the analysis. Your current package is preserved." } };
    }
    const eventId = randomUUID();

    await createAuditEvent({
      actor: auditActorFromManagedUser(currentUser) ?? buildSystemAuditActor(),
      entityId: eventId,
      entityLabel: workspaceName,
      entityType: "studio-workspace",
      eventType: "artifact.generate",
      metadata: {
        blockingGapCount: synthesis.gaps.filter((gap) => gap.severity === "blocking").length,
        provider: synthesis.provider,
        readinessScore: synthesis.readinessScore,
        sourceCount: synthesis.sourceCount,
        modelUsage: synthesis.modelUsage,
        revision: synthesis.revision?.number,
        standalone: true
      },
      summary: `${workspaceName} synthesized into a product definition for review.`,
      surface: "Studio"
    });

    return { status: 200, body: { synthesis } };
  });
  if (body.phase === "evidence" && !existingSession) result.headers.append("set-cookie", `${sessionCookie}=${session}; Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return result;
}
