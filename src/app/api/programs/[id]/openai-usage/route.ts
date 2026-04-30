import { NextResponse } from "next/server";
import { getAdminAccessContext } from "@/lib/leadership-auth";
import { listOpenAIUsageRecords } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const access = await getAdminAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const usageRecords = await listOpenAIUsageRecords(id);
  return NextResponse.json({ usageRecords });
}
