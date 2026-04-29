import { NextResponse } from "next/server";
import { getAssistantBriefing } from "@/lib/assistant-briefing";
import { createOpenAIUsageRecord } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const briefing = await getAssistantBriefing(id);
  const { modelUsage, ...publicBriefing } = briefing;

  if (modelUsage) {
    await createOpenAIUsageRecord(id, { ...modelUsage, sourceId: `${id}:assistant-briefing` });
  }

  return NextResponse.json({ briefing: publicBriefing });
}
