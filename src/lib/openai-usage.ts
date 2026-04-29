import { getOpenAIModelPricing } from "./openai-pricing.ts";
import type { OpenAIUsageMetadata, OpenAIUsageWorkflow } from "./program-intelligence-types.ts";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function extractOpenAIUsageMetadata(input: {
  payload: unknown;
  workflow: OpenAIUsageWorkflow;
  model: string;
  reasoningEffort?: string;
  cacheKey?: string;
}): OpenAIUsageMetadata | null {
  const payload = asRecord(input.payload);
  const usage = asRecord(payload?.usage);
  if (!usage) return null;

  const inputTokens = asNumber(usage.input_tokens ?? usage.prompt_tokens);
  const outputTokens = asNumber(usage.output_tokens ?? usage.completion_tokens);
  const totalTokens = asNumber(usage.total_tokens) || inputTokens + outputTokens;
  const inputDetails = asRecord(usage.input_tokens_details ?? usage.prompt_tokens_details);
  const outputDetails = asRecord(usage.output_tokens_details ?? usage.completion_tokens_details);
  const cachedInputTokens = Math.min(inputTokens, asNumber(inputDetails?.cached_tokens));
  const reasoningOutputTokens = asNumber(outputDetails?.reasoning_tokens);

  if (!inputTokens && !outputTokens && !totalTokens) return null;

  const pricing = getOpenAIModelPricing(input.model);
  const billableUncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
  const estimatedUncachedInputCostUsd = pricing
    ? (billableUncachedInputTokens / 1_000_000) * pricing.inputPerMillionTokensUsd
    : 0;
  const estimatedCachedInputCostUsd = pricing
    ? (cachedInputTokens / 1_000_000) * pricing.cachedInputPerMillionTokensUsd
    : 0;
  const estimatedOutputCostUsd = pricing
    ? (outputTokens / 1_000_000) * pricing.outputPerMillionTokensUsd
    : 0;
  const estimatedCostUsd = estimatedUncachedInputCostUsd + estimatedCachedInputCostUsd + estimatedOutputCostUsd;
  const estimatedCachedInputSavingsUsd = pricing
    ? (cachedInputTokens / 1_000_000) * (pricing.inputPerMillionTokensUsd - pricing.cachedInputPerMillionTokensUsd)
    : 0;

  return {
    provider: "openai",
    workflow: input.workflow,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    cacheKey: input.cacheKey,
    responseId: typeof payload?.id === "string" ? payload.id : undefined,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    totalTokens,
    reasoningOutputTokens,
    estimatedCostUsd,
    estimatedCachedInputSavingsUsd,
    pricingAsOf: pricing?.asOf
  };
}
