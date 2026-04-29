import "server-only";
import type { OpenAIBillingReconciliation, OpenAIBillingWindowKey } from "@/lib/openai-billing-types";
import { getOpenAIModelPricing } from "@/lib/openai-pricing";
import type { OpenAIUsageRecord } from "@/lib/program-intelligence-types";

type OpenAICostsResponse = {
  data?: Array<{
    results?: Array<{
      amount?: {
        value?: number | string;
        currency?: string;
      };
    }>;
  }>;
  has_more?: boolean;
  next_page?: string | null;
};

type OpenAICompletionsUsageResponse = {
  data?: Array<{
    results?: Array<Record<string, unknown>>;
  }>;
  has_more?: boolean;
  next_page?: string | null;
};

export type OpenAIBillingWindowInput = {
  windowKey?: OpenAIBillingWindowKey;
  customStartDate?: string;
  customEndDate?: string;
  now?: Date;
};

const dayInMs = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
}

function parseUtcDateInput(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function formatUtcWindowDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function getWindowLabel(label: string, start: Date, end: Date) {
  return `${label}: ${formatUtcWindowDate(start)} - ${formatUtcWindowDate(end)} UTC`;
}

function getBillingWindow(input: OpenAIBillingWindowInput = {}) {
  const now = input.now ?? new Date();
  const windowKey = input.windowKey ?? "month-to-date";
  let label = "Month to date";
  let start = startOfUtcMonth(now);
  let end = now;

  if (windowKey === "last-7-days" || windowKey === "last-14-days" || windowKey === "last-30-days") {
    const days = windowKey === "last-7-days" ? 7 : windowKey === "last-14-days" ? 14 : 30;
    label = `Last ${days} days`;
    start = startOfUtcDay(new Date(now.getTime() - (days - 1) * dayInMs));
  }

  if (windowKey === "custom") {
    label = "Custom range";
    const todayStart = startOfUtcDay(now);
    const parsedStart = parseUtcDateInput(input.customStartDate) ?? startOfUtcMonth(now);
    const parsedEnd = parseUtcDateInput(input.customEndDate) ?? todayStart;
    start = parsedStart > now ? todayStart : parsedStart;
    end = endOfUtcDay(parsedEnd < start ? start : parsedEnd);
    if (end > now) end = now;
    if (end <= start) end = new Date(Math.min(now.getTime(), start.getTime() + dayInMs - 1000));
  }

  return {
    windowKey,
    label: getWindowLabel(label, start, end),
    start,
    end,
    startTime: Math.floor(start.getTime() / 1000),
    endTime: Math.floor(end.getTime() / 1000)
  };
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getOpenAIAdminKey() {
  return process.env.OPENAI_ADMIN_KEY?.trim() || process.env.OPENAI_BILLING_API_KEY?.trim();
}

function getOpenAIProjectId() {
  return process.env.OPENAI_BILLING_PROJECT_ID?.trim();
}

function getConfiguredOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.5";
}

function estimateUsageCost(input: {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  model?: string;
}) {
  const configuredModel = getConfiguredOpenAIModel();
  const pricing = getOpenAIModelPricing(input.model || configuredModel) ?? getOpenAIModelPricing(configuredModel);
  if (!pricing) return 0;

  const uncachedInputTokens = Math.max(0, input.inputTokens - input.cachedInputTokens);
  return (
    (uncachedInputTokens / 1_000_000) * pricing.inputPerMillionTokensUsd +
    (input.cachedInputTokens / 1_000_000) * pricing.cachedInputPerMillionTokensUsd +
    (input.outputTokens / 1_000_000) * pricing.outputPerMillionTokensUsd
  );
}

async function fetchOpenAIJson<T>(path: string, params: URLSearchParams, adminKey: string) {
  const response = await fetch(`https://api.openai.com${path}?${params.toString()}`, {
    headers: {
      authorization: `Bearer ${adminKey}`,
      "content-type": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`OpenAI billing sync failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function fetchOpenAICosts(input: {
  adminKey: string;
  startTime: number;
  endTime: number;
  projectId?: string;
}) {
  let page: string | null | undefined;
  let total = 0;

  do {
    const params = new URLSearchParams({
      start_time: String(input.startTime),
      end_time: String(input.endTime),
      bucket_width: "1d",
      limit: "180"
    });
    if (input.projectId) params.append("project_ids", input.projectId);
    if (page) params.set("page", page);

    const payload = await fetchOpenAIJson<OpenAICostsResponse>("/v1/organization/costs", params, input.adminKey);
    for (const bucket of payload.data ?? []) {
      for (const result of bucket.results ?? []) {
        const currency = result.amount?.currency?.toLowerCase();
        total += !currency || currency === "usd" ? asNumber(result.amount?.value) : 0;
      }
    }

    page = payload.has_more ? payload.next_page : null;
  } while (page);

  return total;
}

async function fetchOpenAICompletionsUsage(input: {
  adminKey: string;
  startTime: number;
  endTime: number;
  projectId?: string;
}) {
  let page: string | null | undefined;
  let inputTokens = 0;
  let cachedInputTokens = 0;
  let outputTokens = 0;
  let requests = 0;
  let estimatedSpendUsd = 0;

  do {
    const params = new URLSearchParams({
      start_time: String(input.startTime),
      end_time: String(input.endTime),
      bucket_width: "1d",
      limit: "31"
    });
    if (input.projectId) params.append("project_ids", input.projectId);
    params.append("group_by", "model");
    if (page) params.set("page", page);

    const payload = await fetchOpenAIJson<OpenAICompletionsUsageResponse>(
      "/v1/organization/usage/completions",
      params,
      input.adminKey
    );
    for (const bucket of payload.data ?? []) {
      for (const result of bucket.results ?? []) {
        const resultInputTokens = asNumber(result.input_tokens);
        const resultCachedInputTokens = asNumber(result.input_cached_tokens);
        const resultOutputTokens = asNumber(result.output_tokens);
        inputTokens += resultInputTokens;
        cachedInputTokens += resultCachedInputTokens;
        outputTokens += resultOutputTokens;
        requests += asNumber(result.num_model_requests);
        estimatedSpendUsd += estimateUsageCost({
          inputTokens: resultInputTokens,
          cachedInputTokens: resultCachedInputTokens,
          outputTokens: resultOutputTokens,
          model: typeof result.model === "string" ? result.model : undefined
        });
      }
    }

    page = payload.has_more ? payload.next_page : null;
  } while (page);

  return {
    inputTokens,
    cachedInputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    requests,
    cacheHitRate: inputTokens ? cachedInputTokens / inputTokens : 0,
    estimatedSpendUsd
  };
}

function summarizeLocalUsage(records: OpenAIUsageRecord[], start: Date, end: Date) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const recordsInWindow = records.filter((record) => {
    const createdAt = Date.parse(record.createdAt);
    return Number.isFinite(createdAt) && createdAt >= startTime && createdAt <= endTime;
  });

  return {
    spendUsd: recordsInWindow.reduce((sum, record) => sum + record.estimatedCostUsd, 0),
    calls: recordsInWindow.length,
    tokens: recordsInWindow.reduce((sum, record) => sum + record.totalTokens, 0)
  };
}

export async function getOpenAIBillingReconciliation(
  localUsageRecords: OpenAIUsageRecord[],
  windowInput: OpenAIBillingWindowInput = {}
): Promise<OpenAIBillingReconciliation> {
  const { windowKey, label, start, end, startTime, endTime } = getBillingWindow(windowInput);
  const local = summarizeLocalUsage(localUsageRecords, start, end);
  const adminKey = getOpenAIAdminKey();
  const projectId = getOpenAIProjectId() || undefined;
  const base = {
    source: "openai-costs-api" as const,
    windowKey,
    windowLabel: label,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    syncedAt: new Date().toISOString(),
    projectId,
    localTrackedSpendUsd: local.spendUsd,
    localTrackedCalls: local.calls,
    localTrackedTokens: local.tokens
  };

  if (!adminKey) {
    return {
      ...base,
      configured: false,
      connected: false,
      actualSpendUsd: null,
      costsApiSpendUsd: null,
      usageEstimatedSpendUsd: null,
      spendSource: null,
      actualInputTokens: null,
      actualCachedInputTokens: null,
      actualOutputTokens: null,
      actualTotalTokens: null,
      actualRequests: null,
      actualCacheHitRate: null,
      unallocatedSpendUsd: null,
      error: "Add OPENAI_ADMIN_KEY or OPENAI_BILLING_API_KEY to sync with OpenAI billing."
    };
  }

  try {
    const [actualSpendUsd, usage] = await Promise.all([
      fetchOpenAICosts({ adminKey, startTime, endTime, projectId }),
      fetchOpenAICompletionsUsage({ adminKey, startTime, endTime, projectId })
    ]);
    const reconciledSpendUsd = actualSpendUsd > 0 ? actualSpendUsd : usage.estimatedSpendUsd;

    return {
      ...base,
      configured: true,
      connected: true,
      actualSpendUsd: reconciledSpendUsd,
      costsApiSpendUsd: actualSpendUsd,
      usageEstimatedSpendUsd: usage.estimatedSpendUsd,
      spendSource: actualSpendUsd > 0 ? "costs-api" : "usage-estimate",
      actualInputTokens: usage.inputTokens,
      actualCachedInputTokens: usage.cachedInputTokens,
      actualOutputTokens: usage.outputTokens,
      actualTotalTokens: usage.totalTokens,
      actualRequests: usage.requests,
      actualCacheHitRate: usage.cacheHitRate,
      unallocatedSpendUsd: reconciledSpendUsd - local.spendUsd
    };
  } catch (error) {
    return {
      ...base,
      configured: true,
      connected: false,
      actualSpendUsd: null,
      costsApiSpendUsd: null,
      usageEstimatedSpendUsd: null,
      spendSource: null,
      actualInputTokens: null,
      actualCachedInputTokens: null,
      actualOutputTokens: null,
      actualTotalTokens: null,
      actualRequests: null,
      actualCacheHitRate: null,
      unallocatedSpendUsd: null,
      error: error instanceof Error ? error.message : "OpenAI billing sync failed."
    };
  }
}
