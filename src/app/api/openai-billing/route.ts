import { NextResponse } from "next/server";
import { getAdminAccessContext } from "@/lib/leadership-auth";
import { getOpenAIBillingReconciliation } from "@/lib/openai-billing";
import type { OpenAIBillingWindowKey } from "@/lib/openai-billing-types";
import { listAllOpenAIUsageRecords } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

const billingWindowKeys = new Set<OpenAIBillingWindowKey>([
  "month-to-date",
  "last-7-days",
  "last-14-days",
  "last-30-days",
  "custom"
]);

function parseBillingWindowKey(value: string | null): OpenAIBillingWindowKey | undefined {
  return billingWindowKeys.has(value as OpenAIBillingWindowKey) ? (value as OpenAIBillingWindowKey) : undefined;
}

export async function GET(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const access = await getAdminAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const windowKey = parseBillingWindowKey(url.searchParams.get("window"));
  const usageRecords = await listAllOpenAIUsageRecords();
  const billing = await getOpenAIBillingReconciliation(usageRecords, {
    windowKey,
    customStartDate: url.searchParams.get("start") ?? undefined,
    customEndDate: url.searchParams.get("end") ?? undefined
  });

  return NextResponse.json({ billing });
}
