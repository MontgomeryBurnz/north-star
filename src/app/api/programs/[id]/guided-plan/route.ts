import { NextResponse } from "next/server";
import { buildSystemAuditActor } from "@/lib/audit-event-service";
import { createAuditEvent, createGuidedPlan, getLatestGuidedPlan } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const plan = await getLatestGuidedPlan(id);

  if (!plan) {
    return NextResponse.json({ plan: null });
  }

  return NextResponse.json({ plan });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const plan = await createGuidedPlan(id);

  if (!plan) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  await createAuditEvent({
    actor: buildSystemAuditActor(),
    entityId: plan.id,
    entityLabel: plan.programName,
    entityType: "guided-plan",
    eventType: "guidance.refresh",
    metadata: {
      trigger: "manual-refresh",
      sourceRecordCount: plan.sourceRecordIds.length
    },
    programId: id,
    programName: plan.programName,
    summary: `${plan.programName} guidance refreshed manually.`,
    surface: "Guided Plans"
  });

  return NextResponse.json({ plan });
}
