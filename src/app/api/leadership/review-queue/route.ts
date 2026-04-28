import { NextResponse } from "next/server";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";
import { getLeadershipReviewQueue } from "@/lib/program-aggregates";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const reviewQueue = await getLeadershipReviewQueue();
  return NextResponse.json({ reviewQueue });
}
