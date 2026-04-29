import { NextResponse } from "next/server";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";
import { getOpenAIBillingReconciliation } from "@/lib/openai-billing";
import { listAllOpenAIUsageRecords } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const usageRecords = await listAllOpenAIUsageRecords();
  const billing = await getOpenAIBillingReconciliation(usageRecords);

  return NextResponse.json({ billing });
}
