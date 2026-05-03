import { NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/api-route-access";
import { auditActorFromAccess } from "@/lib/audit-event-service";
import { createAuditEvent, reviewGuidanceFeedbackFlag } from "@/lib/program-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; flagId: string }> }
) {
  const { access, response } = await requireAdminRouteAccess(request);
  if (response) return response;

  const { id, flagId } = await params;
  const body = (await request.json()) as {
    status?: "approved" | "denied";
    leadershipDisposition?: string;
    reviewedBy?: string;
  };

  if (body.status !== "approved" && body.status !== "denied") {
    return NextResponse.json({ error: "A valid review status is required." }, { status: 400 });
  }

  if (!body.leadershipDisposition?.trim()) {
    return NextResponse.json({ error: "Leadership disposition is required." }, { status: 400 });
  }

  const flag = await reviewGuidanceFeedbackFlag(id, flagId, {
    status: body.status,
    leadershipDisposition: body.leadershipDisposition,
    reviewedBy: body.reviewedBy?.trim() || "leadership"
  });

  if (!flag) {
    return NextResponse.json({ error: "Flag not found." }, { status: 404 });
  }

  await createAuditEvent({
    actor: auditActorFromAccess(access),
    entityId: flag.id,
    entityLabel: flag.targetLabel ?? flag.targetType ?? "Guidance flag",
    entityType: "guidance-flag",
    eventType: "flag.review",
    metadata: {
      reviewedBy: flag.reviewedBy,
      status: flag.status,
      targetRole: flag.targetRole,
      targetType: flag.targetType
    },
    programId: id,
    programName: flag.programName,
    summary: `${flag.programName} guidance flag ${flag.status}.`,
    surface: "Admin"
  });

  return NextResponse.json({ flag });
}
