import { NextResponse } from "next/server";
import { getAssistantServiceResponse } from "@/lib/assistant-service";
import type { AssistantRequest } from "@/lib/assistant-types";
import { auditActorFromManagedUser } from "@/lib/audit-event-service";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { createAssistantConversation, createAuditEvent } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function POST(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const body = (await request.json()) as Partial<AssistantRequest>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const provider = body.provider === "openai" || body.provider === "local" ? body.provider : undefined;
  const selectedProgramId = typeof body.selectedProgramId === "string" ? body.selectedProgramId.trim() : undefined;

  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
  }

  const response = await getAssistantServiceResponse({
    prompt,
    selectedProgramId,
    history: body.history,
    provider,
    includeDebug: body.includeDebug
  });

  if (selectedProgramId) {
    const currentUser = await getCurrentManagedUser();
    const conversation = await createAssistantConversation(selectedProgramId, prompt, response);
    await createAuditEvent({
      actor: auditActorFromManagedUser(currentUser),
      entityId: conversation.id,
      entityLabel: prompt.slice(0, 120),
      entityType: "guide-dialogue",
      eventType: "guide.dialogue",
      metadata: {
        answerLength: response.answer.length,
        provider: response.provider,
        promptLength: prompt.length,
        relatedContentCount: response.relatedContent.length,
        selectedProgramId
      },
      programId: conversation.programId,
      programName: conversation.programName,
      summary: `Guide dialogue was saved for ${conversation.programName}.`,
      surface: "Guide"
    });
  }

  return NextResponse.json(response);
}
