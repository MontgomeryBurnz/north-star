export type AssistantMode = "direct" | "retrieval" | "fallback";

export type AssistantContentType = "initiative" | "framework" | "aiProduct" | "experiment" | "faq" | "profile" | "program";

export type AssistantProviderId = "local" | "openai";

export type MatchedContent = {
  id: string;
  type: AssistantContentType;
  title: string;
  score: number;
  summary: string;
  tags: string[];
  matchedKeywords: string[];
};

export type AssistantSection = {
  title: string;
  items: string[];
};

export type AssistantRelatedItem = {
  id: string;
  type: Exclude<AssistantContentType, "faq" | "profile">;
  title: string;
  href: string;
  summary: string;
  status?: string;
};

export type AssistantDebug = {
  normalizedPrompt: string;
  matchedKeywords: string[];
  matchedRecords: MatchedContent[];
  ranking: MatchedContent[];
  sections: AssistantSection[];
  modelProfile?: {
    provider: AssistantProviderId;
    model?: string;
    reasoningEffort?: string;
    verbosity?: string;
  };
};

export type AssistantResponse = {
  answer: string;
  bullets: string[];
  sections: AssistantSection[];
  sources: string[];
  relatedPrompts: string[];
  relatedContent: AssistantRelatedItem[];
  mode: AssistantMode;
  matches: MatchedContent[];
  debug: AssistantDebug;
};

export type AssistantMessageInput = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantRequest = {
  prompt: string;
  selectedProgramId?: string;
  history?: AssistantMessageInput[];
  provider?: AssistantProviderId;
  includeDebug?: boolean;
};

export type AssistantServiceResponse = AssistantResponse & {
  provider: AssistantProviderId;
};

export type AssistantGroundingPayload = {
  prompt: string;
  matchedContent: MatchedContent[];
  sourceLabels: string[];
  answerSections: AssistantSection[];
};

export type AssistantProvider = {
  id: AssistantProviderId;
  getResponse(request: AssistantRequest): Promise<AssistantServiceResponse>;
};
