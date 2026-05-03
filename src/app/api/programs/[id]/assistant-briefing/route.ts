import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { getAssistantBriefing } from "@/lib/assistant-briefing";
import { createOpenAIUsageRecord } from "@/lib/program-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const briefing = await getAssistantBriefing(id);
  const { modelUsage, ...publicBriefing } = briefing;

  if (modelUsage) {
    await createOpenAIUsageRecord(id, { ...modelUsage, sourceId: `${id}:assistant-briefing` });
  }

  return NextResponse.json({ briefing: publicBriefing });
}
