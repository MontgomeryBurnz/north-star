import type { AssistantServiceResponse } from "@/lib/assistant-types";

export type AssistantConversationTurn = {
  id: string;
  programId: string;
  programName: string;
  prompt: string;
  response: AssistantServiceResponse;
  createdAt: string;
  updatedAt: string;
};
