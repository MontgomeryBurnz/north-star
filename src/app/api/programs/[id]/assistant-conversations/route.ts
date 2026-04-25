import { NextResponse } from "next/server";
import { listAssistantConversations } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const conversations = await listAssistantConversations(id);
  return NextResponse.json({ conversations });
}
