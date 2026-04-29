import test from "node:test";
import assert from "node:assert/strict";
import { extractOpenAIUsageMetadata } from "../src/lib/openai-usage.ts";

test("extractOpenAIUsageMetadata parses Responses API usage and estimates cached-input cost", () => {
  const usage = extractOpenAIUsageMetadata({
    workflow: "guided-plan",
    model: "gpt-5.5",
    reasoningEffort: "medium",
    cacheKey: "north-star:guided-plan:program-1",
    payload: {
      id: "resp_123",
      usage: {
        input_tokens: 10_000,
        input_tokens_details: {
          cached_tokens: 4_000
        },
        output_tokens: 2_000,
        output_tokens_details: {
          reasoning_tokens: 500
        },
        total_tokens: 12_000
      }
    }
  });

  assert.ok(usage);
  assert.equal(usage.responseId, "resp_123");
  assert.equal(usage.inputTokens, 10_000);
  assert.equal(usage.cachedInputTokens, 4_000);
  assert.equal(usage.outputTokens, 2_000);
  assert.equal(usage.reasoningOutputTokens, 500);
  assert.equal(usage.estimatedCostUsd, 0.092);
  assert.equal(Number(usage.estimatedCachedInputSavingsUsd.toFixed(3)), 0.018);
});

test("extractOpenAIUsageMetadata returns null when usage is absent", () => {
  const usage = extractOpenAIUsageMetadata({
    workflow: "guide",
    model: "gpt-5.5",
    payload: {}
  });

  assert.equal(usage, null);
});
