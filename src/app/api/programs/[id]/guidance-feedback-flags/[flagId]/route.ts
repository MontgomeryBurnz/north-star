import { NextResponse } from "next/server";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";
import { reviewGuidanceFeedbackFlag } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; flagId: string }> }
) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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

  return NextResponse.json({ flag });
}
