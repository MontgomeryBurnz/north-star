export type LegacyAssistantResponse = {
  answer?: string;
  bullets?: string[];
  provider?: string;
  [key: string]: unknown;
};

export type AssistantConversationTurn = {
  id: string;
  programId: string;
  programName: string;
  prompt: string;
  response: LegacyAssistantResponse;
  createdAt: string;
  updatedAt: string;
};
