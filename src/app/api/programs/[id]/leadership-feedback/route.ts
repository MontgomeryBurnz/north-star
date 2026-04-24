import { NextResponse } from "next/server";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";
import { createGuidedPlan, createLeadershipFeedback, getLatestGuidedPlan, listLeadershipFeedback } from "@/lib/program-store";
import type { LeadershipReviewInput } from "@/lib/leadership-feedback-types";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const feedback = await listLeadershipFeedback(id);
  return NextResponse.json({ feedback });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<LeadershipReviewInput>;

  if (!body.programName?.trim()) {
    return NextResponse.json({ error: "Program name is required." }, { status: 400 });
  }

  const feedback = await createLeadershipFeedback(id, {
    programName: body.programName,
    timelineSummary: body.timelineSummary ?? "",
    progressHighlights: body.progressHighlights ?? "",
    activeRisks: body.activeRisks ?? "",
    leadershipGuidance: body.leadershipGuidance ?? "",
    supportRequests: body.supportRequests ?? "",
    feedbackToDeliveryLead: body.feedbackToDeliveryLead ?? ""
  });

  const latestPlan = await getLatestGuidedPlan(id);
  const plan =
    latestPlan?.sourceRecordIds.includes(feedback.id)
      ? latestPlan
      : await createGuidedPlan(id);

  return NextResponse.json({ feedback, plan });
}
