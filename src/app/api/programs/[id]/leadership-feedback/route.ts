import { NextResponse } from "next/server";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";
import { createGuidedPlan, createLeadershipFeedback, getLatestGuidedPlan, listLeadershipFeedback } from "@/lib/program-store";
import type { LeadershipReviewInput } from "@/lib/leadership-feedback-types";
import { saveLeadershipReview } from "@/lib/program-loop-service";
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

  return NextResponse.json({ feedback: result.record, plan: result.plan });
}
