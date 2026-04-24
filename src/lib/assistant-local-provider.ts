import { getAssistantResponse } from "@/lib/assistant";
import type { AssistantProvider, AssistantRequest, AssistantServiceResponse } from "@/lib/assistant-types";

export const localAssistantProvider: AssistantProvider = {
  id: "local",
  async getResponse(request: AssistantRequest): Promise<AssistantServiceResponse> {
    const response = await getAssistantResponse(request.prompt);

    return {
      ...response,
      provider: "local"
    };
  }
};
