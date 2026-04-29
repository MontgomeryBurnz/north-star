export type OpenAIBillingWindowKey = "month-to-date" | "last-7-days" | "last-14-days" | "last-30-days" | "custom";

export type OpenAIBillingReconciliation = {
  configured: boolean;
  connected: boolean;
  source: "openai-costs-api";
  windowKey: OpenAIBillingWindowKey;
  windowLabel: string;
  windowStart: string;
  windowEnd: string;
  syncedAt: string;
  projectId?: string;
  actualSpendUsd: number | null;
  costsApiSpendUsd: number | null;
  usageEstimatedSpendUsd: number | null;
  spendSource: "costs-api" | "usage-estimate" | null;
  actualInputTokens: number | null;
  actualCachedInputTokens: number | null;
  actualOutputTokens: number | null;
  actualTotalTokens: number | null;
  actualRequests: number | null;
  actualCacheHitRate: number | null;
  localTrackedSpendUsd: number;
  localTrackedCalls: number;
  localTrackedTokens: number;
  unallocatedSpendUsd: number | null;
  error?: string;
};
