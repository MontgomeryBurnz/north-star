import { denyExplorerRequest } from "@/lib/explorer-access";
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
import { appendStudioRevision, createStudioPackage, ensureStudioCollaborationSchema, getStudioPackage } from "@/lib/studio-collaboration-persistence";
import { isStudioInternalActor } from "@/lib/studio-collaboration";
import { StudioCollaborationError } from "@/lib/studio-collaboration-types";
import { isStudioRequestSameOrigin } from "@/lib/studio-request-origin";
import { isDemoMode } from "@/lib/demo-session";
import { hasStudioGenerationConsent, STUDIO_CONSENT_REQUIRED_MESSAGE } from "@/lib/studio-generation-consent";

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
  const explorerDenied = await denyExplorerRequest(request);
  if (explorerDenied) return explorerDenied;
  const { currentUser, response } = await requireInternalWorkspaceRouteAccess(request);
  if (response) return response;
  const demoMode = await isDemoMode();
  if (!isStudioRequestSameOrigin(request)) return NextResponse.json({ error: "Cross-origin Studio requests are not allowed." }, { status: 403 });
  if (currentUser && !isStudioInternalActor(currentUser)) return NextResponse.json({ error: "Your role can review explicitly shared work but cannot generate or own Studio packages." }, { status: 403 });

  const requestText = await request.text();
  if (Buffer.byteLength(requestText, "utf8") > 4_000_000) return NextResponse.json({ error: "The discovery request is too large. Split the package into smaller groups." }, { status: 413 });
  let body: DiscoverySynthesisRequest;
  try { body = JSON.parse(requestText) as DiscoverySynthesisRequest; } catch { return NextResponse.json({ error: "Invalid discovery request." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid discovery request." }, { status: 400 });
  if (!hasStudioGenerationConsent(body)) return NextResponse.json({ error: STUDIO_CONSENT_REQUIRED_MESSAGE }, { status: 428 });
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
  if (currentUser && !demoMode) {
    try { await ensureStudioCollaborationSchema(); }
    catch { return NextResponse.json({ error: "Studio package storage is unavailable. No model work has started; your current package is preserved." }, { status: 503 }); }
  }
  const studioPackageId = cleanText(body.studioPackageId, 100);
  const studioParentRevisionId = cleanText(body.studioParentRevisionId, 100);
  if (demoMode && (studioPackageId || studioParentRevisionId)) return NextResponse.json({ error: "Exit sample exploration before updating a saved collaboration package." }, { status: 403 });
  if (studioPackageId || studioParentRevisionId) {
    if (!currentUser || !studioPackageId || !studioParentRevisionId) return NextResponse.json({ error: "Sign in and open the saved package before refining it." }, { status: 401 });
    try {
      const saved = await getStudioPackage(currentUser, studioPackageId);
      if (!saved.canManage) return NextResponse.json({ error: "Only the package owner or an internal admin can regenerate this package." }, { status: 403 });
      if (saved.headRevisionId !== studioParentRevisionId) return NextResponse.json({ error: "A newer saved revision exists. Open it before generating another revision." }, { status: 409 });
      // Previous outputs must be the stored immutable snapshot, not a browser edit.
      options.previousSynthesis = saved.revision.synthesis;
    } catch (error) {
      return NextResponse.json({ error: error instanceof StudioCollaborationError ? error.message : "The saved Studio package is unavailable." }, { status: error instanceof StudioCollaborationError ? error.status : 503 });
    }
  }
  const existingSession = browserSession(request);
  const session = existingSession ?? randomUUID();
  const binding = { owner: `${currentUser?.id ?? "site-access"}:${session}`, requestFingerprint: "" };
  let reviewedCheckpoint: DiscoveryEvidenceCheckpoint | undefined;
  if (body.phase) {
    try {
      binding.requestFingerprint = discoveryRequestFingerprint({ workspaceName, artifacts, resolutionNotes, ...options, studioPackageId, studioParentRevisionId });
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
      if (currentUser && !demoMode) {
        const input = { title: workspaceName, synthesis, sources: artifacts, resolutionNotes,
          selectedOutputs: options.selectedOutputs, externalResearch: options.externalResearch,
          researchTopic: options.researchTopic, provenance: "server-generated" as const };
        let saved;
        if (studioPackageId) {
          const current = await getStudioPackage(currentUser, studioPackageId);
          if (!current.canManage || current.headRevisionId !== studioParentRevisionId) throw new StudioCollaborationError("A newer saved revision exists. Your previous package is preserved; open the latest revision before regenerating.", 409);
          saved = await appendStudioRevision(currentUser, studioPackageId, current.version, { ...input, parentRevisionId: studioParentRevisionId });
        } else {
          saved = await createStudioPackage(currentUser, input);
        }
        if (!saved.canManage) throw new Error("Missing saved Studio revision");
        synthesis = { ...saved.revision.synthesis, collaboration: { packageId: saved.id, revisionId: saved.revision.id, version: saved.version } };
      }
    } catch (error) {
      return { status: error instanceof StudioCollaborationError ? error.status : 503, body: { error: error instanceof DiscoveryGenerationError || error instanceof DiscoveryCheckpointError || error instanceof StudioCollaborationError ? error.message : "Studio could not finish and save the analysis. Your current package is preserved." } };
    }
    const eventId = randomUUID();

    try { await createAuditEvent({
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
    }); } catch (error) {
      // The immutable revision, creator and timestamp are already committed. A
      // secondary audit-reporting failure must not disguise that durable save.
      if (!synthesis.collaboration) throw error;
      console.error("Studio saved a package but secondary audit reporting failed");
      synthesis = { ...synthesis, collaboration: { ...synthesis.collaboration, auditWarning: true } };
    }

    return { status: 200, body: { synthesis } };
  });
  if (body.phase === "evidence" && !existingSession) result.headers.append("set-cookie", `${sessionCookie}=${session}; Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return result;
}
