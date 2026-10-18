import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireInternalWorkspaceRouteAccess } from "@/lib/api-route-access";
import { auditActorFromManagedUser, buildSystemAuditActor } from "@/lib/audit-event-service";
import { generateDiscoverySynthesis } from "@/lib/discovery-studio-service";
import type { DiscoverySynthesisRequest } from "@/lib/discovery-studio-types";
import type { ProgramArtifact, StoredProgram } from "@/lib/program-intake-types";
import { createAuditEvent } from "@/lib/program-store";

export const runtime = "nodejs";

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeArtifact(value: unknown, index: number): ProgramArtifact | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<ProgramArtifact>;
  const name = cleanText(input.name, 240);
  const extractedText = cleanText(input.extractedText, 50_000);
  if (!name || !extractedText) return null;

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
    sourceKind: "text",
    extractionStatus: input.extractionStatus === "partial" ? "partial" : "extracted",
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

  const body = (await request.json().catch(() => ({}))) as DiscoverySynthesisRequest;
  const workspaceName = cleanText(body.workspaceName, 120) || "Discovery workspace";
  const artifacts = (Array.isArray(body.artifacts) ? body.artifacts : [])
    .slice(0, 16)
    .map(normalizeArtifact)
    .filter((artifact): artifact is ProgramArtifact => Boolean(artifact));

  if (!artifacts.length) {
    return NextResponse.json({ error: "Add at least one readable discovery source before analysis." }, { status: 400 });
  }

  const resolutionNotes = cleanText(body.resolutionNotes, 12_000);
  const synthesis = await generateDiscoverySynthesis(buildWorkspace(workspaceName, artifacts), resolutionNotes);
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
      standalone: true
    },
    summary: `${workspaceName} synthesized into a build-ready product definition.`,
    surface: "Studio"
  });

  return NextResponse.json({ synthesis });
}
