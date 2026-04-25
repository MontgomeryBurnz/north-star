import { NextResponse } from "next/server";
import { getAssistantBriefing } from "@/lib/assistant-briefing";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const briefing = await getAssistantBriefing(id);
  return NextResponse.json({ briefing });
}
