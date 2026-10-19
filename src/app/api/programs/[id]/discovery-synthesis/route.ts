import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { auditActorFromManagedUser, buildSystemAuditActor } from "@/lib/audit-event-service";
import { DiscoveryGenerationError, generateDiscoverySynthesis, synthesisToArtifact } from "@/lib/discovery-studio-service";
import type { DiscoverySynthesisRequest } from "@/lib/discovery-studio-types";
import { createAuditEvent, createOpenAIUsageRecord, createRoleArtifact, getProgram, listRoleArtifacts } from "@/lib/program-store";

const artifactType = "studio-discovery-build-package";
// Keep this above the service's 740s deadline so saved artifacts/audits finish.
export const maxDuration = 800;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const program = await getProgram(id);
  if (!program) return NextResponse.json({ error: "Program not found." }, { status: 404 });

  const history = await listRoleArtifacts(id, artifactType);
  const latest = history.find((artifact) => artifact.discoverySynthesis)?.discoverySynthesis ?? null;
  return NextResponse.json({ history, synthesis: latest });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentUser, response } = await requireProgramRouteAccess(request, id, { loadCurrentUser: true });
  if (response) return response;

  const program = await getProgram(id);
  if (!program) return NextResponse.json({ error: "Program not found." }, { status: 404 });
  if (!program.intake.artifacts.some((artifact) => artifact.extractedText?.trim())) {
    return NextResponse.json({ error: "Add at least one readable discovery source before analysis." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as DiscoverySynthesisRequest;
  const resolutionNotes = typeof body.resolutionNotes === "string" ? body.resolutionNotes.slice(0, 12_000) : "";
  let synthesis;
  try {
    synthesis = await generateDiscoverySynthesis(program, resolutionNotes);
  } catch (error) {
    return NextResponse.json({ error: error instanceof DiscoveryGenerationError ? error.message : "Studio could not complete the analysis." }, { status: 503 });
  }
  const artifact = await createRoleArtifact(id, synthesisToArtifact(program, synthesis, resolutionNotes));

  if (artifact.modelUsage) {
    await createOpenAIUsageRecord(id, { ...artifact.modelUsage, sourceId: artifact.id });
  }
  await createAuditEvent({
    actor: auditActorFromManagedUser(currentUser) ?? buildSystemAuditActor(),
    entityId: artifact.id,
    entityLabel: artifact.title,
    entityType: "role-artifact",
    eventType: "artifact.generate",
    metadata: {
      artifactType,
      blockingGapCount: synthesis.gaps.filter((gap) => gap.severity === "blocking").length,
      readinessScore: synthesis.readinessScore,
      sourceCount: synthesis.sourceCount,
      version: artifact.version
    },
    programId: id,
    programName: program.intake.programName,
    summary: `${program.intake.programName} discovery package synthesized into a product definition for review.`,
    surface: "Studio"
  });

  const history = await listRoleArtifacts(id, artifactType);
  return NextResponse.json({ artifact, history, synthesis });
}
