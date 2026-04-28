import test from "node:test";
import assert from "node:assert/strict";
import { asStringArray, asTrimmedString, extractOutputText, parseStructuredModelOutput } from "../src/lib/openai-structured-output.ts";

test("extractOutputText prefers output_text then nested output_text content", () => {
  assert.equal(extractOutputText({ output_text: "direct" }), "direct");
  assert.equal(
    extractOutputText({
      output: [{ content: [{ type: "output_text", text: "nested" }] }]
    }),
    "nested"
  );
});

test("parseStructuredModelOutput recovers JSON wrapped in extra text only when validator passes", () => {
  const parsed = parseStructuredModelOutput(
    "prefix {\"name\":\"North Star\",\"items\":[\"one\",\"two\"]} suffix",
    (value) => {
      const record = typeof value === "object" && value && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
      const name = record ? asTrimmedString(record.name) : null;
      const items = record ? asStringArray(record.items, { min: 1 }) : null;
      return name && items ? { name, items } : null;
    }
  );

  assert.deepEqual(parsed, {
    name: "North Star",
    items: ["one", "two"]
  });
});

test("parseStructuredModelOutput rejects shape mismatches", () => {
  const parsed = parseStructuredModelOutput("{\"name\":\"North Star\",\"items\":\"wrong\"}", (value) => {
    const record = typeof value === "object" && value && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
    const name = record ? asTrimmedString(record.name) : null;
    const items = record ? asStringArray(record.items, { min: 1 }) : null;
    return name && items ? { name, items } : null;
  });

  assert.equal(parsed, null);
});
