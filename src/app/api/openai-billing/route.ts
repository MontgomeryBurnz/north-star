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

async function requireAdminAccess(request: Request) {
  const access = await getAdminAccessContext();
  if (!access.authorized) {
    if (!isSiteAccessRequestAuthorized(request)) {
      return createSiteAccessDeniedResponse();
    }

    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

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
