import { NextResponse } from "next/server";
import { getLatestGuidedPlan, listLeadershipFeedback } from "@/lib/program-store";
import { buildDeliveryLeadershipSignal } from "@/lib/leadership-signal";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await context.params;
  const [feedbacks, plan] = await Promise.all([listLeadershipFeedback(id), getLatestGuidedPlan(id)]);
  const latestFeedback = feedbacks[0] ?? null;
  const signal = buildDeliveryLeadershipSignal(latestFeedback, plan);

  return NextResponse.json({ signal });
}
