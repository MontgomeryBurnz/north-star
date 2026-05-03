import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { buildSystemAuditActor } from "@/lib/audit-event-service";
import {
  createAuditEvent,
  createGuidedPlan,
  createProgramUpdate,
  deleteProgramUpdatesByTag,
  getLatestGuidedPlan,
  listProgramUpdates
} from "@/lib/program-store";
import type { ActiveProgramReview } from "@/lib/active-program-types";
import { saveActiveProgramReview } from "@/lib/program-loop-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const updates = await listProgramUpdates(id);
  return NextResponse.json({ updates });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const body = (await request.json()) as Partial<ActiveProgramReview>;
  const result = await saveActiveProgramReview(
    {
      createProgramUpdate,
      getLatestGuidedPlan,
      createGuidedPlan
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
    entityLabel: result.record.programName,
    entityType: "program-update",
    eventType: "program.update",
    metadata: {
      guidedPlanId: result.plan?.id,
      roleUpdateCount: result.record.review.teamRoleUpdates?.length ?? 0
    },
    programId: id,
    programName: result.record.programName,
    summary: `${result.record.programName} active update saved.`,
    surface: "Program Hub"
  });

  if (result.plan?.sourceRecordIds.includes(result.record.id)) {
    await createAuditEvent({
      actor: buildSystemAuditActor(),
      entityId: result.plan.id,
      entityLabel: result.plan.programName,
      entityType: "guided-plan",
      eventType: "guidance.refresh",
      metadata: {
        trigger: "program-update",
        sourceRecordId: result.record.id
      },
      programId: id,
      programName: result.plan.programName,
      summary: `${result.plan.programName} guidance refreshed from active update.`,
      surface: "Guided Plans"
    });
  }

  return NextResponse.json({ update: result.record, plan: result.plan });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as {
    refreshGuidance?: boolean;
    tag?: string;
  };
  const tag = body.tag?.trim() ?? "";

  if (!tag.startsWith("North Star active-program save smoke ")) {
    return NextResponse.json({ error: "Only tagged Active Program smoke updates can be pruned." }, { status: 400 });
  }

  const deletedCount = await deleteProgramUpdatesByTag(id, tag);
  const plan = body.refreshGuidance && deletedCount ? await createGuidedPlan(id) : null;
  const programName = plan?.programName ?? "Active program";

  if (deletedCount) {
    await createAuditEvent({
      actor: buildSystemAuditActor(),
      entityId: id,
      entityLabel: programName,
      entityType: "program-update",
      eventType: "program.update",
      metadata: {
        deletedCount,
        smokeCleanup: true,
        tag,
        refreshedGuidance: Boolean(plan)
      },
      programId: id,
      programName,
      summary: `${programName} smoke update cleanup removed ${deletedCount} tagged record${deletedCount === 1 ? "" : "s"}.`,
      surface: "Program Hub"
    });
  }

  return NextResponse.json({ deletedCount, plan });
}
