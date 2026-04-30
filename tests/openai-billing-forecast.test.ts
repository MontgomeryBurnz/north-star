import assert from "node:assert/strict";
import test from "node:test";
import { getBillingExpenseForecast } from "../src/lib/openai-billing-forecast.ts";
import type { OpenAIBillingReconciliation } from "../src/lib/openai-billing-types.ts";

const connectedBilling: OpenAIBillingReconciliation = {
  configured: true,
  connected: true,
  source: "openai-costs-api",
  windowKey: "last-7-days",
  windowLabel: "Last 7 days",
  windowStart: "2026-04-01T00:00:00.000Z",
  windowEnd: "2026-04-08T00:00:00.000Z",
  syncedAt: "2026-04-08T12:00:00.000Z",
  actualSpendUsd: 14,
  costsApiSpendUsd: 14,
  usageEstimatedSpendUsd: 13.5,
  spendSource: "costs-api",
  actualInputTokens: 1000,
  actualCachedInputTokens: 400,
  actualOutputTokens: 500,
  actualTotalTokens: 1500,
  actualRequests: 70,
  actualCacheHitRate: 0.4,
  localTrackedSpendUsd: 10,
  localTrackedCalls: 50,
  localTrackedTokens: 1200,
  unallocatedSpendUsd: 4
};

test("getBillingExpenseForecast projects run rate from the selected billing window", () => {
  const forecast = getBillingExpenseForecast(connectedBilling);

  assert.ok(forecast);
  assert.equal(forecast.observedDays, 7);
  assert.equal(forecast.dailyRunRateUsd, 2);
  assert.equal(forecast.projectedThirtyDaySpendUsd, 60);
  assert.equal(forecast.projectedNinetyDaySpendUsd, 180);
  assert.equal(forecast.averageRequestCostUsd, 0.2);
});

test("getBillingExpenseForecast returns null until billing is connected", () => {
  assert.equal(getBillingExpenseForecast({ ...connectedBilling, connected: false }), null);
});
