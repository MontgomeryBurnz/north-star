import { NextResponse } from "next/server";
import { getGuidedPlanBundle } from "@/lib/program-aggregates";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await context.params;
  const bundle = await getGuidedPlanBundle(id);
  return NextResponse.json(bundle);
}
