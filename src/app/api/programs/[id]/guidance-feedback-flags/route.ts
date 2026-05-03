import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { buildSystemAuditActor } from "@/lib/audit-event-service";
import { createAuditEvent, createGuidanceFeedbackFlag, listGuidanceFeedbackFlags } from "@/lib/program-store";
import type { GuidanceFeedbackFlag } from "@/lib/program-intelligence-types";
import { createGovernanceFlag } from "@/lib/program-loop-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const flags = await listGuidanceFeedbackFlags(id);
  return NextResponse.json({ flags });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const body = (await request.json()) as Partial<GuidanceFeedbackFlag>;
  const result = await createGovernanceFlag(
    {
      createGuidanceFeedbackFlag
    },
    id,
    body
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await createAuditEvent({
    actor: buildSystemAuditActor(),
    entityId: result.record.id,
    entityLabel: result.record.targetLabel ?? result.record.targetType ?? "Guidance flag",
    entityType: "guidance-flag",
    eventType: "flag.create",
    metadata: {
      scope: result.record.scope,
      targetRole: result.record.targetRole,
      targetType: result.record.targetType
    },
    programId: id,
    programName: result.record.programName,
    summary: `${result.record.programName} guidance flag submitted.`,
    surface: "Guided Plans"
  });

  return NextResponse.json({ flag: result.record });
}
