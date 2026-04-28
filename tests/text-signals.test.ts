import test from "node:test";
import assert from "node:assert/strict";
import { firstNonEmpty, firstSignal, splitLines, splitSignals } from "../src/lib/text-signals.ts";

test("firstSignal returns the first trimmed signal across mixed delimiters", () => {
  assert.equal(firstSignal("  alpha ; beta\ncharlie", "fallback"), "alpha");
  assert.equal(firstSignal("", "fallback"), "fallback");
});

test("firstNonEmpty returns the first non-empty trimmed string", () => {
  assert.equal(firstNonEmpty("", "  ", " value ", "later"), "value");
  assert.equal(firstNonEmpty("", "  ", undefined), "");
});

test("splitSignals returns parsed signals or the fallback when empty", () => {
  assert.deepEqual(splitSignals("one\n• two; three"), ["one", "two", "three"]);
  assert.deepEqual(splitSignals("", "fallback"), ["fallback"]);
});

test("splitLines returns newline and comma separated values", () => {
  assert.deepEqual(splitLines("one, two\nthree"), ["one", "two", "three"]);
});
