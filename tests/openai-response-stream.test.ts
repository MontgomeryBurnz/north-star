import assert from "node:assert/strict";
import test from "node:test";
import { OpenAIResponseStreamError, readOpenAIResponsePayload } from "../src/lib/openai-response-stream.ts";

function sse(text: string, chunkSize = 13) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({
    start(controller) {
      for (let start = 0; start < bytes.length; start += chunkSize) controller.enqueue(bytes.slice(start, start + chunkSize));
      controller.close();
    }
  }), { headers: { "content-type": "text/event-stream; charset=utf-8" } });
}

test("Responses SSE supports split UTF-8, CRLF, comments and multi-line data; only terminal output is used", async () => {
  const expected = { id: "resp_complete", status: "completed", output_text: "Résumé — 世界", usage: { total_tokens: 12 } };
  const text = [
    ": keepalive\r\n\r\n",
    `event: response.created\r\ndata: ${JSON.stringify({ type: "response.created", response: { id: "resp_complete", status: "in_progress" } })}\r\n\r\n`,
    `event: response.output_text.delta\r\ndata: ${JSON.stringify({ type: "response.output_text.delta", delta: "Unvalidated partial output" })}\r\n\r\n`,
    'event: response.completed\r\ndata: {"type":"response.completed",\r\ndata: "response":',
    `${JSON.stringify(expected)}}\r\n\r\n`
  ].join("");
  assert.deepEqual(await readOpenAIResponsePayload(sse(text, 1)), expected);
});

test("a completed response cancels the remaining stream instead of waiting for connection close", async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('data: {"type":"response.completed","response":{"status":"completed","output_text":"complete"}}\n\n')); },
    cancel() { cancelled = true; }
  }), { headers: { "content-type": "text/event-stream" } });
  assert.equal((await readOpenAIResponsePayload(response)).output_text, "complete");
  assert.equal(cancelled, true);
});

test("failed, incomplete and error terminal events reject partial responses", async () => {
  for (const [type, category] of [["response.failed", "failed-response"], ["response.incomplete", "incomplete-response"], ["error", "failed-response"]]) {
    const event = { type, code: "server_error", response: { id: "resp_failed", status: "failed", error: { code: "server_error", message: "Private output must never be exposed" } } };
    await assert.rejects(readOpenAIResponsePayload(sse(`data: ${JSON.stringify(event)}\n\n`)), (error: unknown) => error instanceof OpenAIResponseStreamError && error.category === category && error.responseId === "resp_failed");
  }
});

test("missing terminal events, unframed terminal data and DONE alone are truncated, not complete", async () => {
  for (const value of [
    'data: {"type":"response.output_text.delta","delta":"partial"}\n\n',
    'data: {"type":"response.completed","response":{"status":"completed"}}',
    'data: {"type":"response.completed","response":{"status":"completed"}}\n',
    "data: [DONE]\n\n",
    ""
  ]) await assert.rejects(readOpenAIResponsePayload(sse(value)), (error: unknown) => error instanceof OpenAIResponseStreamError && error.category === "truncated-stream");
  await assert.rejects(readOpenAIResponsePayload(new Response(null, { headers: { "content-type": "text/event-stream" } })), /truncated-stream/);
});

test("malformed event JSON, event mismatch and invalid terminal payloads are rejected", async () => {
  for (const value of [
    "data: not-json\n\n",
    "data: []\n\n",
    'event: response.failed\ndata: {"type":"response.completed","response":{"status":"completed"}}\n\n',
    'data: {"type":"response.completed"}\n\n',
    'data: {"type":"response.completed","response":{"status":"incomplete"}}\n\n'
  ]) await assert.rejects(readOpenAIResponsePayload(sse(value)), /malformed-response/);
  const invalidUtf8 = new Response(new Uint8Array([0xff]), { headers: { "content-type": "text/event-stream" } });
  await assert.rejects(readOpenAIResponsePayload(invalidUtf8), /malformed-response/);
});

test("JSON fixture compatibility accepts response objects and rejects malformed bodies", async () => {
  assert.deepEqual(await readOpenAIResponsePayload(Response.json({ status: "completed", output_text: "fixture" })), { status: "completed", output_text: "fixture" });
  await assert.rejects(readOpenAIResponsePayload(Response.json([])), /malformed-response/);
  await assert.rejects(readOpenAIResponsePayload(new Response("invalid-json")), SyntaxError);
});
