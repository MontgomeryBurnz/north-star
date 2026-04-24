import { NextResponse } from "next/server";
import { getAssistantServiceResponse } from "@/lib/assistant-service";
import type { AssistantRequest } from "@/lib/assistant-types";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function POST(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const body = (await request.json()) as Partial<AssistantRequest>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const provider = body.provider === "openai" || body.provider === "local" ? body.provider : undefined;

  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
  }

  const response = await getAssistantServiceResponse({
    prompt,
    history: body.history,
    provider,
    includeDebug: body.includeDebug
  });

  return NextResponse.json(response);
}
