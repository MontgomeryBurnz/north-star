import { NextResponse } from "next/server";
import { buildSystemAuditActor } from "@/lib/audit-event-service";
import { createAuditEvent, createGuidedPlan, createProgramUpdate, getLatestGuidedPlan, listProgramUpdates } from "@/lib/program-store";
import type { ActiveProgramReview } from "@/lib/active-program-types";
import { saveActiveProgramReview } from "@/lib/program-loop-service";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const updates = await listProgramUpdates(id);
  return NextResponse.json({ updates });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
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
