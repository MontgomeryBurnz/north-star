import type { OpenAIBillingReconciliation } from "@/lib/openai-billing-types";

export type BillingExpenseForecast = {
  observedSpendUsd: number;
  observedRequests: number;
  observedTotalTokens: number;
  observedDays: number;
  dailyRunRateUsd: number;
  projectedThirtyDaySpendUsd: number;
  projectedNinetyDaySpendUsd: number;
  averageRequestCostUsd: number;
  averageMillionTokenCostUsd: number;
  basisLabel: string;
};

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function getBillingWindowDays(reconciliation: OpenAIBillingReconciliation) {
  const start = Date.parse(reconciliation.windowStart);
  const end = Date.parse(reconciliation.windowEnd);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 1;
  }

  return Math.max(1, (end - start) / millisecondsPerDay);
}

export function getBillingExpenseForecast(reconciliation: OpenAIBillingReconciliation | null): BillingExpenseForecast | null {
  if (!reconciliation?.connected) return null;

  const observedSpendUsd = reconciliation.actualSpendUsd ?? reconciliation.usageEstimatedSpendUsd ?? 0;
  const observedRequests = reconciliation.actualRequests ?? 0;
  const observedTotalTokens = reconciliation.actualTotalTokens ?? 0;
  const observedDays = getBillingWindowDays(reconciliation);
  const dailyRunRateUsd = observedSpendUsd / observedDays;

  return {
    observedSpendUsd,
    observedRequests,
    observedTotalTokens,
    observedDays,
    dailyRunRateUsd,
    projectedThirtyDaySpendUsd: dailyRunRateUsd * 30,
    projectedNinetyDaySpendUsd: dailyRunRateUsd * 90,
    averageRequestCostUsd: observedRequests ? observedSpendUsd / observedRequests : 0,
    averageMillionTokenCostUsd: observedTotalTokens ? (observedSpendUsd / observedTotalTokens) * 1_000_000 : 0,
    basisLabel:
      reconciliation.spendSource === "usage-estimate"
        ? "OpenAI Usage API tokens and configured model rates"
        : "OpenAI Costs API actual spend"
  };
}
