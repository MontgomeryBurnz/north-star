import test from "node:test";
import assert from "node:assert/strict";
import { getNorthStarPromptCacheKey } from "../src/lib/openai-prompt-cache.ts";

test("getNorthStarPromptCacheKey creates stable normalized workflow keys", () => {
  assert.equal(
    getNorthStarPromptCacheKey("Guided Plan", "Compass Compliance Hub Alpha"),
    "north-star:guided-plan:compass-compliance-hub-alpha"
  );
  assert.equal(getNorthStarPromptCacheKey("Guide"), "north-star:guide:global");
});

test("getNorthStarPromptCacheKey caps long cache keys", () => {
  const cacheKey = getNorthStarPromptCacheKey("leadership feedback", "x".repeat(200));

  assert.equal(cacheKey.length, 120);
  assert.ok(cacheKey.startsWith("north-star:leadership-feedback:"));
});
