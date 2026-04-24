import { localAssistantProvider } from "@/lib/assistant-local-provider";
import { openaiAssistantProvider } from "@/lib/assistant-openai-provider";
import type { AssistantProvider, AssistantProviderId, AssistantRequest, AssistantServiceResponse } from "@/lib/assistant-types";

const providers: Record<AssistantProviderId, AssistantProvider> = {
  local: localAssistantProvider,
  openai: openaiAssistantProvider
};

function configuredProvider(): AssistantProviderId {
  const value = process.env.ASSISTANT_PROVIDER;
  return value === "openai" ? "openai" : "local";
}

function selectProvider(requestedProvider?: AssistantProviderId) {
  return providers[requestedProvider ?? configuredProvider()];
}

export async function getAssistantServiceResponse(request: AssistantRequest): Promise<AssistantServiceResponse> {
  const provider = selectProvider(request.provider);
  return provider.getResponse(request);
}
