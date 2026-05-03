import { NextResponse } from "next/server";
import { requireLeadershipRouteAccess } from "@/lib/api-route-access";
import { auditActorFromAccess } from "@/lib/audit-event-service";
import { createAuditEvent, createGuidedPlan, createLeadershipFeedback, getLatestGuidedPlan, listLeadershipFeedback } from "@/lib/program-store";
import type { LeadershipReviewInput } from "@/lib/leadership-feedback-types";
import { saveLeadershipReview } from "@/lib/program-loop-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireLeadershipRouteAccess(request);
  if (response) return response;

  const { id } = await params;
  const feedback = await listLeadershipFeedback(id);
  return NextResponse.json({ feedback });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { access, response } = await requireLeadershipRouteAccess(request);
  if (response) return response;

  const { id } = await params;
  const body = (await request.json()) as Partial<LeadershipReviewInput>;
  const result = await saveLeadershipReview(
    {
      createLeadershipFeedback,
      getLatestGuidedPlan,
      createGuidedPlan
    },
    id,
    body
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const actor = auditActorFromAccess(access);
  await createAuditEvent({
    actor,
    entityId: result.record.id,
    entityLabel: result.record.programName,
    entityType: "leadership-feedback",
    eventType: "leadership.feedback",
    metadata: {
      guidedPlanId: result.plan?.id,
      hasInterpretation: Boolean(result.record.interpretation)
    },
    programId: id,
    programName: result.record.programName,
    summary: `${result.record.programName} leadership feedback saved.`,
    surface: "Leadership"
  });

  if (result.plan?.sourceRecordIds.includes(result.record.id)) {
    await createAuditEvent({
      actor,
      entityId: result.plan.id,
      entityLabel: result.plan.programName,
      entityType: "guided-plan",
      eventType: "guidance.refresh",
      metadata: {
        trigger: "leadership-feedback",
        sourceRecordId: result.record.id
      },
      programId: id,
      programName: result.plan.programName,
      summary: `${result.plan.programName} guidance refreshed from leadership feedback.`,
      surface: "Guided Plans"
    });
  }

  return NextResponse.json({ feedback: result.record, plan: result.plan });
}
