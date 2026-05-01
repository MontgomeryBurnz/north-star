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
  if (!reconciliation) return null;

  const hasLocalTrackedUsage = Boolean(
    reconciliation.localTrackedSpendUsd > 0 ||
      reconciliation.localTrackedCalls > 0 ||
      reconciliation.localTrackedTokens > 0
  );
  if (!reconciliation.connected && !hasLocalTrackedUsage) return null;

  const observedSpendUsd = reconciliation.connected
    ? (reconciliation.actualSpendUsd ?? reconciliation.usageEstimatedSpendUsd ?? reconciliation.localTrackedSpendUsd)
    : reconciliation.localTrackedSpendUsd;
  const observedRequests = reconciliation.connected
    ? (reconciliation.actualRequests ?? reconciliation.localTrackedCalls)
    : reconciliation.localTrackedCalls;
  const observedTotalTokens = reconciliation.connected
    ? (reconciliation.actualTotalTokens ?? reconciliation.localTrackedTokens)
    : reconciliation.localTrackedTokens;
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
    basisLabel: reconciliation.connected
      ? reconciliation.spendSource === "usage-estimate"
        ? "OpenAI Usage API tokens and configured model rates"
        : "OpenAI Costs API actual spend"
      : "North Star app-tracked OpenAI usage"
  };
}
