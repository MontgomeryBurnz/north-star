import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { sampleDiscoverySources, sampleDiscoverySynthesis } from "../src/data/sample-program.ts";
import type { StoredProgram } from "../src/lib/program-intake-types.ts";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier === "@/lib/guidance-model-settings") return { url: `data:text/javascript,export async function getGuidanceModelSettings(){return {provider:"openai",model:"gpt-5.5",reasoningEffort:"medium",textVerbosity:"medium"}}`, shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  }
});
const { generateDiscoverySynthesis } = await import("../src/lib/discovery-studio-service.ts");
hooks.deregister();

const program: StoredProgram = {
  id: "fixture-discovery", createdAt: "2026-10-18", updatedAt: "2026-10-18",
  intake: { programName: "Private fixture client", programOwner: "", vision: "", sowSummary: "", outcomes: "", stakeholders: "", risks: "", constraints: "", currentStatus: "", decisionsNeeded: "", blockers: "", artifacts: sampleDiscoverySources }
};

function response(value: unknown) {
  return Response.json({ status: "completed", output_text: JSON.stringify(value), usage: { input_tokens: 100, output_tokens: 100, total_tokens: 200 } });
}
const evidence = { summary: "Source inventory reviewed", sources: sampleDiscoverySources.map((source) => ({ sourceId: source.id, findings: [source.extractedText!], limitations: "Fictional evidence" })), contradictions: ["Approval owner unresolved"], missingInformation: ["Category scope"], recommendations: ["Close policy decisions"] };

function streamedPayload(value: Record<string, unknown>, id = "resp_fixture") {
  const text = `event: response.output_text.delta\ndata: ${JSON.stringify({ type: "response.output_text.delta", delta: "Ignore this incomplete draft" })}\n\nevent: response.completed\ndata: ${JSON.stringify({ type: "response.completed", response: { id, status: "completed", ...value } })}\n\n`;
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({
    start(controller) {
      for (let index = 0; index < bytes.length; index += 17) controller.enqueue(bytes.slice(index, index + 17));
      controller.close();
    }
  }), { headers: { "content-type": "text/event-stream", "x-request-id": "req_fixture" } });
}

async function withStubs(run: (logs: unknown[][]) => Promise<void>) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalInfo = console.info;
  const originalError = console.error;
  const originalNow = Date.now;
  const originalTimeout = AbortSignal.timeout;
  const logs: unknown[][] = [];
  process.env.OPENAI_API_KEY = "fixture-key-never-sent";
  console.info = (...args) => { logs.push(args); };
  console.error = (...args) => { logs.push(args); };
  try { await run(logs); } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    console.error = originalError;
    Date.now = originalNow;
    AbortSignal.timeout = originalTimeout;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
}

test("Studio reviews every source before generation and uses the previous package for revisions", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "fixture-key-never-sent";
  const calls: Record<string, unknown>[] = [];
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push(body);
    return response(calls.length % 2 ? evidence : sampleDiscoverySynthesis);
  };
  try {
    const first = await generateDiscoverySynthesis(program);
    assert.equal(first.provider, "openai");
    assert.equal(first.quality?.status, "reviewed");
    assert.equal(first.sources?.length, 6);
    assert.equal(first.modelUsage?.totalTokens, 400);
    assert.equal(calls.length, 2);
    const revised = await generateDiscoverySynthesis(program, "Offline entry remains excluded.", { previousSynthesis: first, feedback: "Clarify the intake validation criteria." });
    assert.equal(revised.revision?.number, 2);
    assert.match(JSON.stringify(calls[2]), /previousPackage/);
    assert.match(JSON.stringify(calls[2]), /Clarify the intake validation/);
    assert.match(JSON.stringify(calls[3]), /evidenceReview/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("public research sends only the explicit topic and retains verified citations", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "fixture-key-never-sent";
  const calls: Record<string, unknown>[] = [];
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push(body);
    if (calls.length === 1) return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: "Use testable criteria.", annotations: [{ type: "url_citation", title: "Primary research", url: "https://example.org/research" }] }] }] });
    return response(calls.length === 2 ? evidence : sampleDiscoverySynthesis);
  };
  try {
    const result = await generateDiscoverySynthesis(program, "Private notes", { externalResearch: true, researchTopic: "Service intake usability" });
    const searchInput = JSON.stringify(calls[0].input);
    assert.match(searchInput, /Service intake usability/);
    assert.doesNotMatch(searchInput, /Private fixture client|Private notes|Civic Services/);
    assert.equal(result.research?.status, "completed");
    assert.equal(result.research?.sources[0].url, "https://example.org/research");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("failed AI calls and malformed hierarchy never silently replace the current package", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "fixture-key-never-sent";
  try {
    globalThis.fetch = async () => Response.json({ error: { code: "credit_balance_exhausted" } }, { status: 429 });
    await assert.rejects(generateDiscoverySynthesis(program), /rate limited|credits/);
    let calls = 0;
    const invalid = structuredClone(sampleDiscoverySynthesis);
    invalid.stories[0].featureId = "invented-feature";
    globalThis.fetch = async () => response(++calls === 1 ? evidence : invalid);
    await assert.rejects(generateDiscoverySynthesis(program), /quality checks/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("streamed research, evidence and synthesis keep complete citations, aggregate usage, model and high reasoning", async () => {
  await withStubs(async (logs) => {
    const calls: Record<string, unknown>[] = [];
    const research = { output: [{ content: [{ type: "output_text", text: "Use accessible résumé forms.", annotations: [{ type: "url_citation", title: "Primary reference", url: "https://example.org/primary" }] }] }] };
    globalThis.fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      calls.push(body);
      const content = calls.length === 1 ? research : { output_text: JSON.stringify(calls.length === 2 ? evidence : sampleDiscoverySynthesis) };
      return streamedPayload({ ...content, usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 } }, `resp_fixture_${calls.length}`);
    };
    const result = await generateDiscoverySynthesis(program, "", { externalResearch: true, researchTopic: "Public accessibility practices" });
    assert.equal(result.provider, "openai");
    assert.equal(result.quality?.status, "reviewed");
    assert.equal(result.research?.status, "completed");
    assert.equal(result.research?.sources[0].url, "https://example.org/primary");
    assert.equal(result.modelUsage?.inputTokens, 300);
    assert.equal(result.modelUsage?.outputTokens, 600);
    assert.equal(result.modelUsage?.totalTokens, 900);
    assert.equal(result.modelUsage?.responseId, "resp_fixture_3");
    for (const body of calls) {
      assert.equal(body.stream, true);
      assert.equal(body.store, false);
      assert.equal(body.model, "gpt-5.5");
      assert.deepEqual(body.reasoning, { effort: "high" });
    }
    const telemetry = logs.map((item) => item[1] as Record<string, unknown>);
    assert.deepEqual(telemetry.map((item) => item.stage), ["public-research", "evidence-review", "product-synthesis"]);
    assert.equal(new Set(telemetry.map((item) => item.runId)).size, 1);
    assert.ok(telemetry.every((item) => item.requestId === "req_fixture"));
    assert.doesNotMatch(JSON.stringify(logs), /Private fixture|fixture-key-never-sent|accessible résumé|Ignore this incomplete/);
  });
});

test("core stages share the bounded run budget instead of each stopping at 120 seconds", async () => {
  await withStubs(async (logs) => {
    let now = 0;
    let calls = 0;
    const timeouts: number[] = [];
    Date.now = () => now;
    AbortSignal.timeout = (ms) => { timeouts.push(ms); return new AbortController().signal; };
    globalThis.fetch = async () => {
      now += ++calls === 1 ? 60_000 : 180_000;
      return response(calls === 1 ? evidence : sampleDiscoverySynthesis);
    };
    assert.equal((await generateDiscoverySynthesis(program)).quality?.status, "reviewed");
    assert.deepEqual(timeouts, [740_000, 680_000]);
    const telemetry = logs.map((item) => item[1] as Record<string, unknown>);
    assert.deepEqual(telemetry.map((item) => item.timeoutMs), timeouts);
    assert.deepEqual(telemetry.map((item) => item.remainingBudgetMs), [680_000, 500_000]);
  });
});

test("research remains capped at 120 seconds and cannot reset the shared core budget", async () => {
  await withStubs(async () => {
    let now = 0;
    let calls = 0;
    const timeouts: number[] = [];
    Date.now = () => now;
    AbortSignal.timeout = (ms) => { timeouts.push(ms); return new AbortController().signal; };
    globalThis.fetch = async () => {
      calls++;
      now += calls === 1 ? 100_000 : 50_000;
      if (calls === 1) throw new DOMException("Private research failure", "TimeoutError");
      return response(calls === 2 ? evidence : sampleDiscoverySynthesis);
    };
    const result = await generateDiscoverySynthesis(program, "", { externalResearch: true, researchTopic: "Public service practices" });
    assert.equal(result.research?.status, "unavailable");
    assert.equal(result.quality?.status, "reviewed");
    assert.deepEqual(timeouts, [120_000, 640_000, 590_000]);
  });
});

test("exhausted shared deadline prevents another paid provider request", async () => {
  await withStubs(async (logs) => {
    let now = 0;
    let calls = 0;
    Date.now = () => now;
    AbortSignal.timeout = () => new AbortController().signal;
    globalThis.fetch = async () => { calls++; now = 740_000; return response(evidence); };
    await assert.rejects(generateDiscoverySynthesis(program), /time limit.*preserved/);
    assert.equal(calls, 1);
    assert.equal((logs.at(-1)?.[1] as Record<string, unknown>).category, "deadline-exhausted");
  });
});

test("timeouts, network failures, malformed JSON and truncated streams report the phase without leaking data", async () => {
  await withStubs(async (logs) => {
    const previous = structuredClone(sampleDiscoverySynthesis);
    const originalPrevious = JSON.stringify(previous);
    const cases = [
      { failure: async () => { throw new DOMException("fixture-key-never-sent Private fixture", "TimeoutError"); }, message: /evidence review reached its time limit/, category: "timeout" },
      { failure: async () => { throw new TypeError("Private fixture network URL", { cause: { code: "UND_ERR_HEADERS_TIMEOUT", message: "fixture-key-never-sent" } }); }, message: /connection was interrupted during evidence review/, category: "connection-error" },
      { failure: async () => new Response("Private fixture invalid JSON fixture-key-never-sent"), message: /unreadable response during evidence review/, category: "malformed-response" },
      { failure: async () => new Response('data: {"type":"response.output_text.delta","delta":"Private fixture"}\n\n', { headers: { "content-type": "text/event-stream" } }), message: /connection was interrupted during evidence review/, category: "truncated-stream" }
    ];
    for (const item of cases) {
      globalThis.fetch = item.failure;
      await assert.rejects(generateDiscoverySynthesis(program, "", { previousSynthesis: previous }), item.message);
      const diagnostic = logs.at(-1)?.[1] as Record<string, unknown>;
      assert.equal(diagnostic.stage, "evidence-review");
      assert.equal(diagnostic.category, item.category);
    }
    assert.equal(JSON.stringify(previous), originalPrevious);
    assert.doesNotMatch(JSON.stringify(logs), /Private fixture|fixture-key-never-sent|network URL|invalid JSON/);
    assert.match(JSON.stringify(logs), /UND_ERR_HEADERS_TIMEOUT/);
  });
});

test("HTTP and streamed quota failures retain safe codes and useful guidance without exposing provider messages", async () => {
  await withStubs(async (logs) => {
    for (const [code, message] of [
      ["credit_balance_exhausted", /API credits/],
      ["project_spend_limit_exceeded", /project spend limit/],
      ["organization_spend_limit_exceeded", /organization spend limit/],
      ["organization_usage_limit_exceeded", /organization usage limit/],
      ["insufficient_quota", /billing or usage quota/]
    ] as const) {
      const error = { code, type: "insufficient_quota", message: "Private fixture provider output fixture-key-never-sent" };
      globalThis.fetch = async () => Response.json({ error }, { status: 429, headers: { "x-request-id": "req_quota" } });
      await assert.rejects(generateDiscoverySynthesis(program), message);
      assert.equal((logs.at(-1)?.[1] as Record<string, unknown>).upstreamCode, code);
      globalThis.fetch = async () => new Response(`data: ${JSON.stringify({ type: "response.failed", response: { id: "resp_quota", status: "failed", error } })}\n\n`, { headers: { "content-type": "text/event-stream" } });
      await assert.rejects(generateDiscoverySynthesis(program), message);
      assert.equal((logs.at(-1)?.[1] as Record<string, unknown>).responseId, "resp_quota");
      assert.equal((logs.at(-1)?.[1] as Record<string, unknown>).upstreamCode, code);
    }
    globalThis.fetch = async () => Response.json({ error: { code: "Private fixture", message: "Private fixture" } }, { status: 500, headers: { "x-request-id": "fixture-key-never-sent" } });
    await assert.rejects(generateDiscoverySynthesis(program));
    assert.equal((logs.at(-1)?.[1] as Record<string, unknown>).requestId, undefined);
    assert.equal((logs.at(-1)?.[1] as Record<string, unknown>).upstreamCode, undefined);
    assert.doesNotMatch(JSON.stringify(logs), /Private fixture|fixture-key-never-sent|provider output/);
  });
});
