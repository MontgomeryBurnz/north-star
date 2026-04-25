"use client";

import type { AssistantMessageInput, AssistantProviderId, AssistantServiceResponse } from "@/lib/assistant-types";

export async function getAssistantApiResponse(
  prompt: string,
  provider?: AssistantProviderId,
  selectedProgramId?: string,
  history?: AssistantMessageInput[]
): Promise<AssistantServiceResponse> {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt,
      selectedProgramId,
      history,
      provider,
      includeDebug: true
    })
  });

  if (!response.ok) {
    throw new Error("Assistant request failed.");
  }

  return (await response.json()) as AssistantServiceResponse;
}
