import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireInternalWorkspaceRouteAccess } from "@/lib/api-route-access";
import { auditActorFromManagedUser, buildSystemAuditActor } from "@/lib/audit-event-service";
import { DiscoveryGenerationError, generateDiscoverySynthesis, validateDiscoverySynthesis } from "@/lib/discovery-studio-service";
import type { DiscoverySynthesisRequest } from "@/lib/discovery-studio-types";
import type { ProgramArtifact, StoredProgram } from "@/lib/program-intake-types";
import { createAuditEvent } from "@/lib/program-store";

export const runtime = "nodejs";
// The service stops at 740s, leaving time for validation/audit writes before
// Vercel Pro's generally available 800s Fluid Compute limit.
export const maxDuration = 800;

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

  const requestText = await request.text();
  if (Buffer.byteLength(requestText, "utf8") > 4_000_000) return NextResponse.json({ error: "The discovery request is too large. Split the package into smaller groups." }, { status: 413 });
  let body: DiscoverySynthesisRequest;
  try { body = JSON.parse(requestText) as DiscoverySynthesisRequest; } catch { return NextResponse.json({ error: "Invalid discovery request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid discovery request." }, { status: 400 });
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
  let synthesis;
  try {
    synthesis = await generateDiscoverySynthesis(buildWorkspace(workspaceName, artifacts), resolutionNotes, {
      feedback: cleanText(body.feedback, 12_000), previousSynthesis: body.previousSynthesis, selectedOutputs,
      externalResearch: body.externalResearch === true, researchTopic
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof DiscoveryGenerationError ? error.message : "Studio could not finish the analysis. Your current package is preserved." }, { status: 503 });
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

  return NextResponse.json({ synthesis });
}
