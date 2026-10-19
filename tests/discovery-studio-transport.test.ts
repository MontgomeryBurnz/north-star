import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { discoveryStudioResponse, readDiscoveryEvidenceResponse, readDiscoveryStudioResponse } from "../src/lib/discovery-studio-transport.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

function synthesis(): DiscoverySynthesis {
  return {
    executiveSummary: "A complete evidence-reviewed résumé — ready for review, not automatic approval.", evidenceSummary: "Source-backed findings.",
    capabilities: ["Handle requests"], painPoints: ["Inconsistent handling"], businessRules: [], assumptions: [], gaps: [],
    readinessScore: 60, readinessNarrative: "Human review required.", sourceCount: 1, generatedAt: "2026-10-19T00:00:00.000Z", provider: "openai",
    roadmap: [{ horizon: "Now", title: "Requests", outcome: "Consistent handling", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "E1", title: "Requests", objective: "Consistent handling", featureIds: ["F1"], sourceIds: ["S1"] }],
    features: [{ id: "F1", epicId: "E1", title: "Controls", description: "Apply confirmed rules", outcome: "Consistent handling", priority: "must", sourceIds: ["S1"] }],
    stories: [{ id: "U1", epicId: "E1", featureId: "F1", title: "Handle request", story: "As a coordinator, I want consistent handling.", acceptanceCriteria: ["The confirmed rule is enforced."], sourceIds: ["S1"], readiness: "needs-input", testCases: [{ id: "T1", title: "Apply a rule", type: "happy-path", steps: ["Perform the permitted operation"], expectedResult: "The confirmed rule is enforced." }] }],
    quality: { status: "provisional", checks: ["Server quality gates completed"], warnings: ["Owner review required"] },
    research: { status: "not-requested", summary: "No external research requested.", sources: [] },
    revision: { number: 2, summary: "Generated from evidence." }, sources: [{ id: "S1", name: "Discovery", coverage: "complete", characters: 100 }]
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function streamRequest(accept = "text/event-stream") { return new Request("https://example.test/api/studio/discovery-synthesis", { method: "POST", headers: { accept } }); }
function resultFrame(value: unknown = synthesis()) { return `event: result\ndata: ${JSON.stringify({ synthesis: value })}\n\n`; }
function streamResponse(value: string, fragmented = false) {
  const bytes = new TextEncoder().encode(value);
  let offset = 0;
  return new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset === bytes.length) { controller.close(); return; }
      const end = fragmented ? offset + 1 : bytes.length;
      controller.enqueue(bytes.slice(offset, end)); offset = end;
    }
  }), { headers: { "content-type": "text/event-stream; charset=utf-8" } });
}

test("SSE sends an immediate safe heartbeat while work is deferred and repeats every15s, then clears its timer", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const clear = t.mock.method(globalThis, "clearInterval");
  const pending = deferred<{ status: number; body: { synthesis: DiscoverySynthesis } }>();
  let calls = 0;
  const response = await discoveryStudioResponse(streamRequest(), () => { calls++; return pending.promise; });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store.*no-transform/);
  assert.equal(response.headers.get("content-length"), null);
  const reader = response.body!.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.equal(first, 'event: heartbeat\ndata: {"status":"working"}\n\n');
  t.mock.timers.tick(15_000);
  assert.equal(new TextDecoder().decode((await reader.read()).value), first);
  pending.resolve({ status: 200, body: { synthesis: synthesis() } });
  assert.match(new TextDecoder().decode((await reader.read()).value), /^event: result\n/);
  assert.equal((await reader.read()).done, true);
  assert.equal(calls, 1, "Heartbeats cannot initiate another generation.");
  assert.equal(clear.mock.callCount(), 1);
});

test("a complete generated result is delivered only after all deferred work, including audit, finishes", async () => {
  const audit = deferred<void>();
  let auditFinished = false;
  const response = await discoveryStudioResponse(streamRequest(), async () => {
    await audit.promise; auditFinished = true;
    return { status: 200, body: { synthesis: synthesis() } };
  });
  let committed = false;
  const reading = readDiscoveryStudioResponse(response).then((result) => { committed = true; return result; });
  await Promise.resolve();
  assert.equal(committed, false);
  audit.resolve();
  assert.deepEqual(await reading, synthesis());
  assert.equal(auditFinished, true);
});

test("generation errors arrive as terminal application errors and preserve their existing safe diagnostics", async () => {
  const message = "The package failed fidelity checks: 2 validation issues; showing the first 2. Your previous package is preserved.";
  let calls = 0;
  const response = await discoveryStudioResponse(streamRequest(), async () => { calls++; return { status: 503, body: { error: message } }; });
  assert.equal(response.status, 200, "SSE status is committed before generation; errors use the terminal envelope.");
  await assert.rejects(readDiscoveryStudioResponse(response), (error: Error) => error.message === message);
  assert.equal(calls, 1);
});

test("unexpected late work/audit failures produce a safe SSE error without logging or leaking the thrown error", async () => {
  const response = await discoveryStudioResponse(streamRequest(), async () => { throw new Error("private upstream payload and stack"); });
  const body = await response.text();
  assert.match(body, /event: heartbeat/);
  assert.match(body, /event: error/);
  assert.doesNotMatch(body, /event: result|private upstream|stack/);
});

test("stream cancellation clears the heartbeat and safely ignores eventual work completion without retrying", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const clear = t.mock.method(globalThis, "clearInterval");
  const pending = deferred<{ status: number; body: { synthesis: DiscoverySynthesis } }>();
  let calls = 0;
  const response = await discoveryStudioResponse(streamRequest(), () => { calls++; return pending.promise; });
  const reader = response.body!.getReader();
  await reader.read();
  await reader.cancel();
  assert.equal(clear.mock.callCount(), 1);
  pending.resolve({ status: 200, body: { synthesis: synthesis() } });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  t.mock.timers.tick(30_000);
  assert.equal((await reader.read()).done, true);
  assert.equal(calls, 1);
  assert.equal(clear.mock.callCount(), 1);
});

test("reader accepts arbitrarily fragmented UTF8, CRLF boundaries, comment heartbeats and multiline data", async () => {
  const pretty = JSON.stringify({ synthesis: synthesis() }, null, 2).split("\n").map((line) => `data: ${line}`).join("\r\n");
  const stream = `: keepalive\r\n\r\nevent: heartbeat\r\ndata: {"status":"working"}\r\n\r\nevent: result\r\n${pretty}\r\n\r\n`;
  let heartbeats = 0;
  assert.deepEqual(await readDiscoveryStudioResponse(streamResponse(stream, true), () => { heartbeats++; }), synthesis());
  assert.equal(heartbeats, 1, "Only a complete safe heartbeat updates the connected status.");
});

test("reader rejects EOF, missing frame terminators, unknown events and duplicate or trailing terminal content", async () => {
  for (const body of [
    "", 'event: heartbeat\ndata: {"status":"working"}\n\n', resultFrame().trimEnd(),
    "event: result\ndata: {bad-json}\n\n", `event: candidate\ndata: ${JSON.stringify({ synthesis: synthesis() })}\n\n`,
    `${resultFrame()}${resultFrame()}`, `${resultFrame()}event: result\ndata: {`,
    'event: error\ndata: {"error":42}\n\n'
  ]) await assert.rejects(readDiscoveryStudioResponse(streamResponse(body, true)), /connection was interrupted/);
});

test("a network disconnect or malformed nested result never replaces the prior revision", async () => {
  const prior = synthesis();
  let active = prior;
  const connection = new Response(new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("private network detail")); } }), { headers: { "content-type": "text/event-stream" } });
  await assert.rejects(async () => { active = await readDiscoveryStudioResponse(connection); }, /connection was interrupted/);
  assert.equal(active, prior);
  for (const change of [
    (value: DiscoverySynthesis) => { value.stories[0].testCases = null as unknown as []; },
    (value: DiscoverySynthesis) => { value.features = []; },
    (value: DiscoverySynthesis) => { value.quality!.warnings = 42 as unknown as []; },
    (value: DiscoverySynthesis) => { value.research!.status = ["completed"] as unknown as "completed"; },
    (value: DiscoverySynthesis) => { value.provider = ["openai"] as unknown as "openai"; },
    (value: DiscoverySynthesis) => { value.quality!.status = ["reviewed"] as unknown as "reviewed"; },
    (value: DiscoverySynthesis) => { value.stories[0].readiness = ["ready"] as unknown as "ready"; },
    (value: DiscoverySynthesis) => { value.stories[0].testCases[0].type = ["edge"] as unknown as "edge"; },
    (value: DiscoverySynthesis) => { value.sources![0].coverage = ["complete"] as unknown as "complete"; },
    (value: DiscoverySynthesis) => { delete (value as Partial<DiscoverySynthesis>).generatedAt; }
  ]) {
    const invalid = synthesis(); change(invalid);
    await assert.rejects(async () => { active = await readDiscoveryStudioResponse(streamResponse(resultFrame(invalid))); }, /connection was interrupted/);
    assert.equal(active, prior);
  }
});

test("reader bounds pending events and rejects invalid UTF8 without exposing decoder internals", async () => {
  await assert.rejects(readDiscoveryStudioResponse(streamResponse(`data: ${"x".repeat(4_000_001)}`)), /connection was interrupted/);
  const invalid = new Response(new Uint8Array([0xc3]), { headers: { "content-type": "text/event-stream" } });
  await assert.rejects(readDiscoveryStudioResponse(invalid), /connection was interrupted/);
});

test("legacy JSON callers keep success and503 statuses, and disabled stream negotiation stays JSON", async () => {
  for (const accept of ["application/json", "*/*", "text/event-stream;q=0"]) {
    const good = await discoveryStudioResponse(streamRequest(accept), async () => ({ status: 200, body: { synthesis: synthesis() } }));
    assert.match(good.headers.get("content-type") ?? "", /application\/json/);
    assert.deepEqual(await readDiscoveryStudioResponse(good), synthesis());
    const bad = await discoveryStudioResponse(streamRequest(accept), async () => ({ status: 503, body: { error: "Existing quality failure" } }));
    assert.equal(bad.status, 503);
    await assert.rejects(readDiscoveryStudioResponse(bad), /Existing quality failure/);
  }
  const failure = new Error("audit failed");
  await assert.rejects(discoveryStudioResponse(streamRequest("application/json"), async () => { throw failure; }), (error) => error === failure,
    "Legacy unexpected audit failures still propagate as server errors, not generation503.");
  await assert.rejects(readDiscoveryStudioResponse(new Response("<html>login</html>", { headers: { "content-type": "text/html" } })), /connection was interrupted/);
});

test("standalone route negotiates streaming only after auth/input checks and console applies only the completed reader result", () => {
  const route = readFileSync(new URL("../src/app/api/studio/discovery-synthesis/route.ts", import.meta.url), "utf8");
  assert.ok(route.indexOf("requireInternalWorkspaceRouteAccess(request)") < route.indexOf("await discoveryStudioResponse(request"));
  assert.ok(route.indexOf("if (body.externalResearch && !researchTopic)") < route.indexOf("await discoveryStudioResponse(request"));
  assert.ok(route.indexOf("await createAuditEvent") < route.indexOf("return { status: 200, body: { synthesis } }"));
  const client = readFileSync(new URL("../src/components/discovery-studio-console.tsx", import.meta.url), "utf8");
  assert.match(client, /accept: "text\/event-stream"/);
  assert.ok(client.indexOf("await generateStudioPackage(requestSnapshot,") < client.indexOf("setSynthesis(result)"));
});

test("evidence handoffs have a distinct terminal frame and cannot be confused with final packages", async () => {
  const checkpoint = "nsdcp.v1." + "a".repeat(64);
  for (const accept of ["text/event-stream", "application/json"]) {
    const response = await discoveryStudioResponse(streamRequest(accept), async () => ({ status: 200, body: { checkpoint } }));
    assert.equal(await readDiscoveryEvidenceResponse(response), checkpoint);
  }
  const frame = `event: checkpoint\ndata: ${JSON.stringify({ checkpoint })}\n\n`;
  assert.equal(await readDiscoveryEvidenceResponse(streamResponse(frame, true)), checkpoint);
  await assert.rejects(readDiscoveryStudioResponse(streamResponse(frame)), /connection was interrupted/);
  await assert.rejects(readDiscoveryEvidenceResponse(streamResponse(resultFrame())), /connection was interrupted/);
  for (const payload of [{ checkpoint: "" }, { checkpoint: 1 }, { checkpoint, synthesis: synthesis() }, { checkpoint: "x".repeat(1_500_001) }, { checkpoint: "a".repeat(40) + " " }]) {
    await assert.rejects(readDiscoveryEvidenceResponse(Response.json(payload)), /connection was interrupted/);
  }
  await assert.rejects(readDiscoveryEvidenceResponse(streamResponse(frame + frame)), /connection was interrupted/);
  await assert.rejects(readDiscoveryEvidenceResponse(streamResponse(frame.slice(0, -1))), /connection was interrupted/);
});
