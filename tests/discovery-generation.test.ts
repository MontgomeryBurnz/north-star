import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { sampleDiscoverySources as sourceFixtures, sampleDiscoverySynthesis as packageFixture } from "../src/data/sample-program.ts";
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

// Orchestration tests use controlled source facts, not the illustrative prepared package's
// unverified semantics. Independent adversarial fidelity fixtures exercise real source rules.
const fixtureFact = "Every service request has an accountable owner.";
const sampleDiscoverySources = sourceFixtures.map((source) => ({ ...source, extractedText: fixtureFact }));
const evidenceLedger = sampleDiscoverySources.map((source, index) => ({ id: `EV-${index + 1}`, sourceId: source.id, quote: fixtureFact, kind: "fact", statement: fixtureFact }));
const sampleDiscoverySynthesis = {
  ...packageFixture, businessRules: [...packageFixture.businessRules, fixtureFact],
  evidenceCoverage: evidenceLedger.map((item) => ({ evidenceId: item.id, disposition: "context", storyIds: [] as string[], testIds: [] as string[], gapIds: [] as string[] }))
};

const program: StoredProgram = {
  id: "fixture-discovery", createdAt: "2026-10-18", updatedAt: "2026-10-18",
  intake: { programName: "Private fixture client", programOwner: "", vision: "", sowSummary: "", outcomes: "", stakeholders: "", risks: "", constraints: "", currentStatus: "", decisionsNeeded: "", blockers: "", artifacts: sampleDiscoverySources }
};

function response(value: unknown) {
  return Response.json({ status: "completed", output_text: JSON.stringify(value), usage: { input_tokens: 100, output_tokens: 100, total_tokens: 200 } });
}
const evidence = { summary: "Source inventory reviewed", sources: sampleDiscoverySources.map((source) => ({ sourceId: source.id, findings: [source.extractedText!], limitations: "Fictional evidence" })), contradictions: ["Approval owner unresolved"], missingInformation: ["Category scope"], recommendations: ["Close policy decisions"], evidenceLedger };

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
    assert.equal(calls[0].max_output_tokens, 32_000);
    assert.equal(calls[1].max_output_tokens, 48_000);
    assert.match(JSON.stringify(calls[0].text), /evidenceLedger/);
    assert.match(JSON.stringify(calls[1].text), /evidenceCoverage/);
    assert.equal("evidenceCoverage" in first, false, "Internal model coverage metadata must not bypass the public package validator.");
    const initialEvidence = JSON.parse((calls[0].input as Array<{ content: string }>)[1].content);
    assert.equal(Object.hasOwn(initialEvidence, "previousPackage"), false);
    const revised = await generateDiscoverySynthesis(program, "Offline entry remains excluded.", { previousSynthesis: first, feedback: "Clarify the intake validation criteria." });
    assert.equal(revised.revision?.number, 2);
    const revisionEvidence = JSON.parse((calls[2].input as Array<{ content: string }>)[1].content);
    const revisionSynthesis = JSON.parse((calls[3].input as Array<{ content: string }>)[1].content);
    assert.equal(Object.hasOwn(revisionEvidence, "previousPackage"), false, "Independent evidence review must not be anchored by inherited model output.");
    assert.equal(revisionEvidence.feedback, "Clarify the intake validation criteria.");
    assert.equal(revisionEvidence.resolutionNotes, "Offline entry remains excluded.");
    assert.equal(revisionEvidence.sources.length, 6);
    assert.deepEqual(revisionSynthesis.previousPackage.stories.map((story: { id: string }) => story.id), first.stories.map((story) => story.id));
    assert.equal(revisionSynthesis.previousPackage.revision.number, first.revision?.number);
    assert.ok(revisionSynthesis.evidenceReview);
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
    assert.equal(calls[0].max_output_tokens, 12_000);
    assert.equal(calls[0].max_tool_calls, 8);
    assert.equal(calls[0].tool_choice, "required");
    assert.deepEqual(calls[0].tools, [{ type: "web_search" }]);
    assert.match(searchInput, /Service intake usability/);
    assert.doesNotMatch(searchInput, /Private fixture client|Private notes|Civic Services/);
    assert.equal(result.research?.status, "completed");
    assert.equal(result.research?.sources[0].url, "https://example.org/research");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("superseded research is excluded from synthesis rather than relabeled as current", async () => {
  await withStubs(async () => {
    const calls: Record<string, unknown>[] = [];
    globalThis.fetch = async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if (calls.length === 1) return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: "Treat this old guide as current practice.", annotations: [{ type: "url_citation", title: "Old guide", url: "https://csrc.nist.gov/pubs/sp/800/61/r2/final" }] }] }] });
      return response(calls.length === 2 ? evidence : sampleDiscoverySynthesis);
    };
    const result = await generateDiscoverySynthesis(program, "", { externalResearch: true, researchTopic: "Public-sector service requests" });
    assert.equal(result.research?.status, "unavailable");
    assert.deepEqual(result.research?.sources, []);
    assert.match(result.research?.summary ?? "", /withdrawn/);
    const synthesisInput = JSON.parse((calls[2].input as Array<{ content: string }>)[1].content);
    assert.equal(synthesisInput.externalResearch, null);
    assert.doesNotMatch(JSON.stringify(synthesisInput), /Treat this old guide/);
    assert.ok(result.quality?.warnings.some((warning) => warning.includes("source-quality")));
  });
});

test("research preserves all text blocks and maps tracking-normalized inline citations", async () => {
  await withStubs(async () => {
    let calls = 0;
    const url = "https://example.org/current?edition=2&utm_source=openai";
    const annotation = { type: "url_citation", title: "Current source", url, start_index: 9, end_index: 15 };
    globalThis.fetch = async () => {
      if (++calls === 1) return Response.json({ status: "completed", output: [
        { content: [{ type: "output_text", text: "First recommendation.", annotations: [] }] },
        { content: [{ type: "output_text", text: "Practice [cite].", annotations: [annotation] }] }
      ] });
      return response(calls === 2 ? evidence : sampleDiscoverySynthesis);
    };
    const result = await generateDiscoverySynthesis(program, "", { externalResearch: true, researchTopic: "Service quality" });
    assert.equal(result.research?.summary, "First recommendation.\n\nPractice [1].");
    assert.deepEqual(result.research?.sources, [{ title: "Current source", url: "https://example.org/current?edition=2" }]);
  });
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
    await assert.rejects(generateDiscoverySynthesis(program), /invalid epic or feature reference/);
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

test("core stages share the bounded run budget instead of using an independent stage cap", async () => {
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

test("research remains capped at 300 seconds and cannot reset the shared core budget", async () => {
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
    assert.deepEqual(timeouts, [300_000, 640_000, 590_000]);
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

test("fidelity failures allow at most one correction per candidate stage and preserve the previous complete package", async () => {
  await withStubs(async (logs) => {
    const previous = structuredClone(sampleDiscoverySynthesis);
    const original = JSON.stringify(previous);
    let calls = 0;
    const invalidEvidence = structuredClone(evidence);
    invalidEvidence.evidenceLedger[0].quote = "An invented source fact.";
    globalThis.fetch = async () => { calls++; return response(invalidEvidence); };
    await assert.rejects(generateDiscoverySynthesis(program, "", { previousSynthesis: previous }), (error: Error) => {
      assert.match(error.message, /evidence review failed fidelity checks/);
      assert.match(error.message, /\d+ validation issues?\b/);
      assert.match(error.message, /Source quotation: An invented source fact\./);
      assert.match(error.message, /Reviewed assertion:/);
      assert.ok(error.message.length < 10_000);
      return true;
    });
    assert.doesNotMatch(JSON.stringify(logs), /An invented source fact|Reviewed assertion|Source quotation/);
    assert.equal(calls, 2, "One completed evidence candidate may be corrected, but invalid evidence never reaches synthesis.");
    calls = 0;
    const invalidCoverage = structuredClone(sampleDiscoverySynthesis);
    invalidCoverage.evidenceCoverage[0].storyIds = ["UNKNOWN-STORY"] as never[];
    globalThis.fetch = async () => response(++calls === 1 ? evidence : invalidCoverage);
    await assert.rejects(generateDiscoverySynthesis(program, "", { previousSynthesis: previous }), /unresolved output references/);
    assert.equal(calls, 3, "At most one validation-guided correction may follow the initial product candidate.");
    assert.equal(JSON.stringify(previous), original);
  });
});

test("source-backed classification normalization reaches synthesis and final checks without exposing evidence in logs", async () => {
  await withStubs(async (logs) => {
    const proposed = "A pilot approval authority is proposed and awaits sponsor approval.";
    const sources = sampleDiscoverySources.map((source) => ({ ...source, extractedText: proposed }));
    const normalizedProgram = { ...program, intake: { ...program.intake, artifacts: sources } };
    const proposalEvidence = { ...evidence,
      sources: sources.map((source) => ({ sourceId: source.id, findings: [proposed], limitations: "Fictional evidence" })),
      evidenceLedger: sources.map((source, index) => ({ id: `EV-${index + 1}`, sourceId: source.id, quote: proposed, kind: "fact", statement: proposed }))
    };
    const original = JSON.stringify(proposalEvidence);
    const output = { ...sampleDiscoverySynthesis, assumptions: [...sampleDiscoverySynthesis.assumptions, proposed],
      evidenceCoverage: evidenceLedger.map((item) => ({ evidenceId: item.id, disposition: "proposal", storyIds: [], testIds: [], gapIds: [] }))
    };
    const calls: Record<string, unknown>[] = [];
    globalThis.fetch = async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return response(calls.length === 1 ? proposalEvidence : output);
    };
    assert.equal((await generateDiscoverySynthesis(normalizedProgram)).quality?.status, "reviewed");
    const synthesisInput = JSON.parse((calls[1].input as Array<{ content: string }>)[1].content);
    assert.ok(synthesisInput.evidenceReview.evidenceLedger.every((item: { kind: string }) => item.kind === "proposal"));
    assert.equal(JSON.stringify(proposalEvidence), original, "Normalization must not mutate the raw model envelope.");
    const metadata = logs.find((item) => item[0] === "[northstar:studio-evidence]")?.[1] as Record<string, unknown>;
    assert.equal(metadata.classificationNormalizationCount, 6);
    assert.doesNotMatch(JSON.stringify(logs), /pilot approval authority|awaits sponsor|fixture-key-never-sent/);
    calls.length = 0;
    const falselyConfirmed = { ...output, evidenceCoverage: sampleDiscoverySynthesis.evidenceCoverage };
    globalThis.fetch = async (_input, init) => { calls.push(JSON.parse(String(init?.body))); return response(calls.length === 1 ? proposalEvidence : falselyConfirmed); };
    await assert.rejects(generateDiscoverySynthesis(normalizedProgram), /promotes a proposal to a confirmed obligation/);
  });
});

test("ambiguous wording produces an explicit provisional review draft without repairing invalid coverage", async () => {
  await withStubs(async (logs) => {
    const quote = "Pilot category selection is an open decision.";
    const statement = "The council must review the pilot category selection.";
    const sources = sampleDiscoverySources.map((source) => ({ ...source, extractedText: quote }));
    const input = { ...program, intake: { ...program.intake, artifacts: sources } };
    const review = { ...evidence,
      sources: sources.map((source) => ({ sourceId: source.id, findings: [statement], limitations: "Interpretation requires review" })),
      evidenceLedger: sources.map((source, index) => ({ id: `EV-${index + 1}`, sourceId: source.id, quote, kind: "open-question", statement }))
    };
    const generated = { ...sampleDiscoverySynthesis, readinessScore: 95,
      stories: sampleDiscoverySynthesis.stories.map((story) => ({ ...story, readiness: "ready" })),
      gaps: [...sampleDiscoverySynthesis.gaps, { id: "GAP-EVIDENCE-REVIEW-1", title: "Existing model gap", severity: "important", sourceIds: [sources[0].id], description: "Preserve this gap.", question: "What is the decision?" }]
    };
    const original = JSON.stringify(generated);
    const calls: Record<string, unknown>[] = [];
    globalThis.fetch = async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return response(calls.length === 1 ? review : generated);
    };
    const result = await generateDiscoverySynthesis(input);
    assert.equal(result.provider, "openai");
    assert.equal(result.quality?.status, "provisional");
    assert.ok(result.readinessScore <= 60);
    assert.ok(result.stories.every((story) => story.readiness === "needs-input"));
    assert.match(result.readinessNarrative, /Review draft/);
    assert.match(result.quality!.warnings.join(" "), /do not treat this package as approved or build-ready/);
    assert.ok(!result.quality!.checks.includes("Source-driven fidelity and risk-based scenario checks passed"));
    assert.equal(result.gaps.filter((gap) => gap.title === "Review source interpretation before implementation").length, 6);
    assert.ok(result.gaps.some((gap) => gap.id === "GAP-EVIDENCE-REVIEW-1-HOLD-1" && gap.severity === "blocking"));
    assert.ok(result.gaps.some((gap) => gap.description.includes(quote) && gap.description.includes(statement)));
    const synthesisInput = JSON.parse((calls[1].input as Array<{ content: string }>)[1].content);
    assert.equal(synthesisInput.evidenceReview.reviewIssues.length, 6);
    assert.equal(JSON.stringify(generated), original);
    assert.doesNotMatch(JSON.stringify(logs), /Pilot category selection|council must review|Source quotation/);

    for (const invalidRow of [
      { ...generated.evidenceCoverage[0], gapIds: ["UNKNOWN-GAP"] },
      { ...generated.evidenceCoverage[0], gapIds: ["GAP-EVIDENCE-REVIEW-1-HOLD-1"] },
      { ...generated.evidenceCoverage[0], disposition: "INVALID" },
      { ...generated.evidenceCoverage[0], storyIds: ["UNKNOWN-STORY"] }
    ]) {
      calls.length = 0;
      const invalid = { ...generated, evidenceCoverage: [invalidRow, ...generated.evidenceCoverage.slice(1)] };
      globalThis.fetch = async () => { calls.push({}); return response(calls.length === 1 ? review : invalid); };
      await assert.rejects(generateDiscoverySynthesis(input), /failed structure, evidence fidelity or risk-based coverage checks/);
    }
    calls.length = 0;
    const omitted = { ...generated, evidenceCoverage: generated.evidenceCoverage.slice(1) };
    globalThis.fetch = async () => { calls.push({}); return response(calls.length === 1 ? review : omitted); };
    await assert.rejects(generateDiscoverySynthesis(input), /has no evidence-to-output coverage/);
  });
});

test("policy ambiguity introduced only by final synthesis is held as a provisional source-linked review draft", async () => {
  await withStubs(async (logs) => {
    const quote = "A user cannot approve their own policy exception.";
    const sources = sampleDiscoverySources.map((source) => ({ ...source, extractedText: quote }));
    const input = { ...program, intake: { ...program.intake, artifacts: sources } };
    const review = { ...evidence,
      sources: sources.map((source) => ({ sourceId: source.id, findings: [quote], limitations: "Fictional evidence" })),
      evidenceLedger: sources.map((source, index) => ({ id: `EV-${index + 1}`, sourceId: source.id, quote, kind: "requirement", statement: quote }))
    };
    const generated = structuredClone(sampleDiscoverySynthesis);
    generated.readinessScore = 95;
    generated.businessRules.push("A user cannot approve their own exception.");
    generated.stories.forEach((story) => { story.readiness = "ready"; });
    const story = generated.stories[0];
    story.testCases[1] = { id: story.testCases[1].id, title: "Prevent self approval", type: "negative", steps: ["Attempt approval of one's own policy exception"], expectedResult: "Approval is blocked and the policy exception remains pending." };
    generated.evidenceCoverage = review.evidenceLedger.map((item) => ({ evidenceId: item.id, disposition: "implemented", storyIds: [story.id], testIds: [story.testCases[1].id], gapIds: [] }));
    const original = JSON.stringify(generated);
    const calls: Record<string, unknown>[] = [];
    globalThis.fetch = async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return response(calls.length === 1 ? review : generated);
    };
    const result = await generateDiscoverySynthesis(input);
    const synthesisInput = JSON.parse((calls[1].input as Array<{ content: string }>)[1].content);
    assert.deepEqual(synthesisInput.evidenceReview.reviewIssues, [], "The hold must arise from final output, not an evidence-stage issue.");
    assert.equal(calls.length, 2, "Reviewable ambiguity alone does not incur a paid correction.");
    assert.equal(result.quality?.status, "provisional");
    assert.ok(result.readinessScore <= 60);
    assert.ok(result.stories.every((item) => item.readiness === "needs-input"));
    assert.match(result.readinessNarrative, /Review draft/);
    assert.ok(result.gaps.some((gap) => gap.severity === "blocking" && gap.sourceIds.includes(sources[0].id) && gap.description.includes("Reviewed clause:") && gap.description.includes(quote)));
    assert.match(result.quality!.warnings.join(" "), /do not treat this package as approved or build-ready/);
    assert.equal(JSON.stringify(generated), original);
    assert.doesNotMatch(JSON.stringify(logs), /own policy exception|own exception|Reviewed clause/);
  });
});

test("one validation-guided correction can fix a completed product candidate and is fully revalidated", async () => {
  await withStubs(async (logs) => {
    const invalid = structuredClone(sampleDiscoverySynthesis);
    invalid.stories[0].featureId = "invented-feature";
    const original = JSON.stringify(invalid);
    const calls: Record<string, unknown>[] = [];
    globalThis.fetch = async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return response(calls.length === 1 ? evidence : calls.length === 2 ? invalid : sampleDiscoverySynthesis);
    };
    const result = await generateDiscoverySynthesis(program, "", { selectedOutputs: ["roadmap", "tests"] });
    assert.equal(calls.length, 3);
    assert.equal(result.provider, "openai");
    assert.equal(result.quality?.status, "reviewed");
    assert.equal(result.stories[0].featureId, sampleDiscoverySynthesis.stories[0].featureId);
    assert.ok(result.quality?.checks.includes("Validation-guided correction rechecked against all package quality rules"));
    assert.equal(result.modelUsage?.totalTokens, 600);
    assert.equal(JSON.stringify(invalid), original);
    assert.match(JSON.stringify(calls[2].input), /invented-feature/);
    assert.match(JSON.stringify(calls[2].input), /invalid epic or feature reference/);
    assert.match(JSON.stringify(calls[2].input), /Every service request has an accountable owner/);
    const correctionInput = JSON.parse((calls[2].input as Array<{ content: string }>)[1].content);
    assert.deepEqual(correctionInput.candidatePackage, invalid);
    assert.ok(correctionInput.validationErrors.some((error: string) => error.includes("invalid epic or feature reference")));
    assert.deepEqual(correctionInput.selectedOutputs, ["roadmap", "tests"]);
    assert.equal(calls[2].max_output_tokens, 48_000);
    assert.equal(calls[2].stream, true);
    assert.equal(calls[2].store, false);
    assert.deepEqual(calls[2].reasoning, { effort: "high" });
    assert.deepEqual(logs.map((entry) => entry[1] as Record<string, unknown>).filter((entry) => entry.status === "completed").map((entry) => entry.stage), ["evidence-review", "product-synthesis", "product-repair"]);
    assert.doesNotMatch(JSON.stringify(logs), /invented-feature|Every service request|fixture-key-never-sent/);
  });
});

test("failed privacy coverage exposes bounded candidate diagnostics only to the caller and preserves the previous package", async () => {
  await withStubs(async (logs) => {
    const quote = "Dashboard summaries and notification subject lines must not expose resident personal details.";
    const sources = sampleDiscoverySources.map((source) => ({ ...source, extractedText: quote }));
    const input = { ...program, intake: { ...program.intake, artifacts: sources } };
    const review = { ...evidence,
      sources: sources.map((source) => ({ sourceId: source.id, findings: [quote], limitations: "Fictional evidence" })),
      evidenceLedger: sources.map((source, index) => ({ id: `EV-${index + 1}`, sourceId: source.id, quote, kind: "requirement", statement: quote }))
    };
    const invalid = structuredClone(sampleDiscoverySynthesis);
    const story = invalid.stories[0];
    story.testCases[0] = { id: story.testCases[0].id, title: "Private dashboard candidate", type: "happy-path", steps: ["Open the dashboard"], expectedResult: "The dashboard exposes resident personal details." };
    story.testCases[1] = { id: story.testCases[1].id, title: "Private notification candidate", type: "negative", steps: ["Inspect the notification subject"], expectedResult: "The notification subject includes resident personal details." };
    invalid.evidenceCoverage = review.evidenceLedger.map((item) => ({ evidenceId: item.id, disposition: "implemented", storyIds: [story.id], testIds: story.testCases.map((item) => item.id), gapIds: [] }));
    const previous = structuredClone(sampleDiscoverySynthesis);
    const original = JSON.stringify(previous);
    let calls = 0;
    globalThis.fetch = async () => response(++calls === 1 ? review : invalid);
    await assert.rejects(generateDiscoverySynthesis(input, "", { previousSynthesis: previous }), (error: Error) => {
      assert.match(error.message, /dashboard personal-data redaction test/);
      assert.match(error.message, /notification personal-data redaction test/);
      assert.match(error.message, /Private dashboard candidate/);
      assert.match(error.message, /Private notification candidate/);
      assert.ok(error.message.length < 10_000);
      return true;
    });
    assert.equal(calls, 3);
    assert.equal(JSON.stringify(previous), original);
    assert.doesNotMatch(JSON.stringify(logs), /Private dashboard candidate|Private notification candidate|resident personal details/);
  });
});

test("repeated invalid correction fails after one attempt and preserves the previous package", async () => {
  await withStubs(async () => {
    const previous = structuredClone(sampleDiscoverySynthesis);
    const original = JSON.stringify(previous);
    const invalid = structuredClone(sampleDiscoverySynthesis);
    invalid.evidenceCoverage[0].storyIds = ["UNKNOWN-STORY"] as never[];
    let calls = 0;
    globalThis.fetch = async () => response(++calls === 1 ? evidence : invalid);
    await assert.rejects(generateDiscoverySynthesis(program, "", { previousSynthesis: previous }), /unresolved output references/);
    assert.equal(calls, 3);
    assert.equal(JSON.stringify(previous), original);
  });
});

test("correction cannot reset the shared deadline or run with insufficient remaining time", async () => {
  await withStubs(async () => {
    let now = 0;
    let calls = 0;
    const timeouts: number[] = [];
    Date.now = () => now;
    AbortSignal.timeout = (ms) => { timeouts.push(ms); return new AbortController().signal; };
    const invalid = structuredClone(sampleDiscoverySynthesis);
    invalid.stories[0].featureId = "invented-feature";
    globalThis.fetch = async () => {
      calls++;
      now += calls === 1 ? 100_000 : 600_000;
      return response(calls === 1 ? evidence : invalid);
    };
    await assert.rejects(generateDiscoverySynthesis(program), /preserved/);
    assert.equal(calls, 2);
    assert.deepEqual(timeouts, [740_000, 640_000]);
  });
});

test("provider failures during product generation never trigger a paid correction retry", async () => {
  await withStubs(async () => {
    const invalid = structuredClone(sampleDiscoverySynthesis);
    invalid.stories[0].featureId = "invented-feature";
    for (const failure of [
      async () => Response.json({ error: { code: "credit_balance_exhausted" } }, { status: 429 }),
      async () => { throw new TypeError("Private fixture connection failure"); },
      async () => Response.json({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output_text: "Partial fixture" }),
      async () => Response.json({ output_text: JSON.stringify(invalid) }),
      async () => Response.json({ status: "completed", output_text: "{invalid JSON" })
    ]) {
      let calls = 0;
      globalThis.fetch = async () => ++calls === 1 ? response(evidence) : failure();
      await assert.rejects(generateDiscoverySynthesis(program));
      assert.equal(calls, 2);
    }
  });
});

function evidenceRepairFixture() {
  const row = "Measure | Current baseline | Target or decision\nRegional offices | 12 | Pilot 3 before scale-up";
  const pilot = "The pilot covers three regions.";
  const sources = sampleDiscoverySources.map((source) => ({ ...source,
    extractedText: source.id === "sample-volume-analysis" ? row : source.id === "sample-capability-assessment" ? pilot : fixtureFact
  }));
  const ledger = sources.map((source, index) => ({
    id: `EV-${index + 1}`, sourceId: source.id, quote: source.extractedText, kind: "fact",
    statement: source.id === "sample-volume-analysis" ? "The current regional-office baseline is 12 offices." : source.extractedText
  }));
  const invalid = { ...evidence, sources: sources.map((source) => ({ sourceId: source.id, findings: [source.extractedText], limitations: "Fictional evidence" })), evidenceLedger: [
    ...ledger, { id: "VA-003", sourceId: "sample-volume-analysis", quote: row, kind: "requirement", statement: "The target/decision is to pilot 3 regions before scale-up." }
  ] };
  const corrected = structuredClone(invalid);
  corrected.evidenceLedger[corrected.evidenceLedger.length - 1] = { id: "VA-003", sourceId: "sample-capability-assessment", quote: pilot, kind: "fact", statement: pilot };
  const output = { ...sampleDiscoverySynthesis,
    executiveSummary: `${fixtureFact} The current regional-office baseline is 12 offices. ${pilot}`,
    evidenceSummary: `The current regional-office baseline is 12 offices. ${pilot}`,
    evidenceCoverage: corrected.evidenceLedger.map((item) => ({ evidenceId: item.id, disposition: "context", storyIds: [], testIds: [], gapIds: [] }))
  };
  return { input: { ...program, intake: { ...program.intake, artifacts: sources } }, invalid, corrected, output };
}

test("a completed VA-003 ledger candidate gets one bounded source-guided correction before synthesis and aggregates every stage", async () => {
  await withStubs(async (logs) => {
    const fixture = evidenceRepairFixture();
    const calls: Record<string, unknown>[] = [];
    const timeouts: number[] = [];
    let now = 0;
    Date.now = () => now;
    AbortSignal.timeout = (ms) => { timeouts.push(ms); return new AbortController().signal; };
    globalThis.fetch = async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)));
      now += [10_000, 100_000, 150_000, 60_000][calls.length - 1] ?? 0;
      return response(calls.length === 1 ? { summary: "Public research unavailable" } : calls.length === 2 ? fixture.invalid : calls.length === 3 ? fixture.corrected : fixture.output);
    };
    const original = JSON.stringify(fixture.invalid);
    const result = await generateDiscoverySynthesis(fixture.input, "Private decision notes", { previousSynthesis: sampleDiscoverySynthesis, externalResearch: true, researchTopic: "Public service delivery" });
    assert.equal(calls.length, 4, "This valid product uses evidence correction but does not require product correction.");
    assert.deepEqual(timeouts, [300_000, 730_000, 180_000, 480_000]);
    assert.equal(result.modelUsage?.totalTokens, 800);
    assert.equal(result.modelUsage?.inputTokens, 400);
    assert.equal(result.modelUsage?.outputTokens, 400);
    assert.ok(result.quality?.checks.includes("Validation-guided evidence correction rechecked against all source coverage and fidelity rules"));
    assert.equal(JSON.stringify(fixture.invalid), original);
    assert.equal(calls[2].max_output_tokens, 32_000);
    assert.deepEqual(calls[2].text, calls[1].text);
    for (const call of calls) {
      assert.equal(call.model, "gpt-5.5"); assert.equal(call.store, false); assert.equal(call.stream, true);
      assert.deepEqual(call.reasoning, { effort: "high" });
    }
    const repair = JSON.parse((calls[2].input as Array<{ content: string }>)[1].content);
    assert.deepEqual(repair.candidateEvidence, fixture.invalid);
    assert.ok(repair.validationErrors.some((error: string) => error.includes("VA-003 changes or invents a source measurement")));
    assert.equal(repair.sources.length, 6);
    assert.equal(Object.hasOwn(repair, "previousPackage"), false);
    assert.equal(Object.hasOwn(repair, "externalResearch"), false);
    assert.match((calls[2].input as Array<{ content: string }>)[0].content, /unlabeled decision count.*unambiguous actual source quotation/);
    const synthesis = JSON.parse((calls[3].input as Array<{ content: string }>)[1].content);
    assert.deepEqual(synthesis.evidenceReview.evidenceLedger, fixture.corrected.evidenceLedger);
    const stages = logs.map((entry) => entry[1] as Record<string, unknown>).filter((entry) => entry.status === "completed");
    assert.deepEqual(stages.map((entry) => entry.stage), ["public-research", "evidence-review", "evidence-repair", "product-synthesis"]);
    assert.doesNotMatch(JSON.stringify(logs), /VA-003|Regional offices|Private decision|candidateEvidence|fixture-key-never-sent/);
  });
});

test("a failed evidence correction remains a bounded authenticated failure and never starts synthesis or a second correction", async () => {
  await withStubs(async (logs) => {
    const fixture = evidenceRepairFixture();
    const previous = structuredClone(sampleDiscoverySynthesis);
    const original = JSON.stringify(previous);
    let calls = 0;
    globalThis.fetch = async () => { calls++; return response(fixture.invalid); };
    await assert.rejects(generateDiscoverySynthesis(fixture.input, "", { previousSynthesis: previous }), (error: Error) => {
      assert.match(error.message, /evidence review failed fidelity checks/);
      assert.match(error.message, /VA-003 changes or invents/);
      assert.match(error.message, /Source quotation: Measure/);
      assert.ok(error.message.length < 10_000);
      return true;
    });
    assert.equal(calls, 2);
    assert.equal(JSON.stringify(previous), original);
    assert.doesNotMatch(JSON.stringify(logs), /VA-003|Regional offices|Source quotation|Reviewed assertion/);
  });
});

test("initial provider, incomplete, parse, malformed-shape and missing-source failures cannot trigger evidence correction", async () => {
  await withStubs(async () => {
    const fixture = evidenceRepairFixture();
    const missingSource = { ...fixture.invalid, sources: fixture.invalid.sources.slice(1) };
    const malformed = { ...fixture.invalid, contradictions: [42] };
    const missingLedgerSource = { ...fixture.invalid, evidenceLedger: fixture.invalid.evidenceLedger.filter((item) => item.sourceId !== "sample-workshop-notes") };
    const badLedgerShape = { ...fixture.invalid, evidenceLedger: [{ ...fixture.invalid.evidenceLedger[0], kind: ["fact"] }, ...fixture.invalid.evidenceLedger.slice(1)] };
    const noStatus = () => Response.json({ output_text: JSON.stringify(fixture.invalid) });
    for (const failure of [
      async () => Response.json({ error: { code: "credit_balance_exhausted" } }, { status: 429 }),
      async () => { throw new TypeError("Private network failure"); },
      async () => Response.json({ status: "incomplete", output_text: JSON.stringify(fixture.invalid) }),
      async () => response(missingSource), async () => response(malformed), async () => response(missingLedgerSource), async () => response(badLedgerShape),
      async () => Response.json({ status: "completed", output_text: "{invalid JSON" }), noStatus
    ]) {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return failure(); };
      await assert.rejects(generateDiscoverySynthesis(fixture.input));
      assert.equal(calls, 1, "Only a completed, valid-shape, source-complete evidence ledger may qualify for correction.");
    }
  });
});

test("repaired evidence must still pass full shape, source coverage and completion checks without retrying failures", async () => {
  await withStubs(async () => {
    const fixture = evidenceRepairFixture();
    for (const failure of [
      async () => response({ ...fixture.corrected, sources: fixture.corrected.sources.slice(1) }),
      async () => response({ ...fixture.corrected, recommendations: [42] }),
      async () => Response.json({ status: "completed", output_text: "{invalid JSON" }),
      async () => Response.json({ output_text: JSON.stringify(fixture.corrected) }),
      async () => Response.json({ error: { code: "credit_balance_exhausted" } }, { status: 429 }),
      async () => Response.json({ status: "incomplete", output_text: JSON.stringify(fixture.corrected) }),
      async () => { throw new TypeError("Private repair connection failure"); }
    ]) {
      let calls = 0;
      globalThis.fetch = async () => ++calls === 1 ? response(fixture.invalid) : failure();
      await assert.rejects(generateDiscoverySynthesis(fixture.input));
      assert.equal(calls, 2);
    }
  });
});

test("one evidence correction and one full product correction can both run within the same deadline and aggregate every stage", async () => {
  await withStubs(async (logs) => {
    const fixture = evidenceRepairFixture();
    const invalidProduct = structuredClone(fixture.output);
    invalidProduct.stories[0].featureId = "invented-feature";
    let now = 0;
    const calls: Record<string, unknown>[] = [];
    const timeouts: number[] = [];
    Date.now = () => now;
    AbortSignal.timeout = (ms) => { timeouts.push(ms); return new AbortController().signal; };
    globalThis.fetch = async (_input, init) => {
      calls.push(JSON.parse(String(init?.body)));
      now += [10_000, 100_000, 120_000, 180_000, 60_000][calls.length - 1] ?? 0;
      return response(calls.length === 1 ? { summary: "Public research unavailable" } : calls.length === 2 ? fixture.invalid : calls.length === 3 ? fixture.corrected : calls.length === 4 ? invalidProduct : fixture.output);
    };
    const result = await generateDiscoverySynthesis(fixture.input, "", { externalResearch: true, researchTopic: "Public service delivery" });
    assert.equal(calls.length, 5, "At most research + evidence + evidence correction + product + full product correction.");
    assert.deepEqual(timeouts, [300_000, 730_000, 180_000, 510_000, 330_000]);
    assert.equal(result.modelUsage?.totalTokens, 1000);
    assert.ok(result.quality?.checks.includes("Validation-guided evidence correction rechecked against all source coverage and fidelity rules"));
    assert.ok(result.quality?.checks.includes("Validation-guided correction rechecked against all package quality rules"));
    assert.deepEqual(logs.map((entry) => entry[1] as Record<string, unknown>).filter((entry) => entry.status === "completed").map((entry) => entry.stage), ["public-research", "evidence-review", "evidence-repair", "product-synthesis", "product-repair"]);
    const repair = JSON.parse((calls[4].input as Array<{ content: string }>)[1].content);
    assert.deepEqual(repair.candidatePackage, invalidProduct);
    assert.deepEqual(repair.evidenceReview.evidenceLedger, fixture.corrected.evidenceLedger);
    assert.match((calls[4].input as Array<{ content: string }>)[0].content, /actual observable, relevant test steps/);
    assert.doesNotMatch(JSON.stringify(logs), /VA-003|Regional offices|invented-feature/);
  });
});

test("evidence correction requires 360s remaining, caps itself at 180s and never resets the 740s deadline", async () => {
  await withStubs(async () => {
    const fixture = evidenceRepairFixture();
    for (const evidenceDuration of [380_001, 380_000]) {
      let now = 0;
      let calls = 0;
      const timeouts: number[] = [];
      Date.now = () => now;
      AbortSignal.timeout = (ms) => { timeouts.push(ms); return new AbortController().signal; };
      globalThis.fetch = async () => {
        calls++;
        now += calls === 1 ? evidenceDuration : calls === 2 ? 180_000 : 0;
        return response(calls === 1 ? fixture.invalid : calls === 2 ? fixture.corrected : fixture.output);
      };
      if (evidenceDuration > 380_000) {
        await assert.rejects(generateDiscoverySynthesis(fixture.input), /evidence review failed fidelity checks/);
        assert.equal(calls, 1);
        assert.deepEqual(timeouts, [740_000]);
      } else {
        assert.equal((await generateDiscoverySynthesis(fixture.input)).provider, "openai");
        assert.equal(calls, 3);
        assert.deepEqual(timeouts, [740_000, 180_000, 180_000]);
      }
    }
  });
});

test("product correction after evidence correction still requires 120s remaining and cannot reset the global deadline", async () => {
  await withStubs(async () => {
    const fixture = evidenceRepairFixture();
    const invalid = structuredClone(fixture.output);
    invalid.stories[0].featureId = "invented-feature";
    for (const productDuration of [340_001, 340_000]) {
      let now = 0;
      let calls = 0;
      const timeouts: number[] = [];
      Date.now = () => now;
      AbortSignal.timeout = (ms) => { timeouts.push(ms); return new AbortController().signal; };
      globalThis.fetch = async () => {
        calls++;
        now += calls === 1 ? 100_000 : calls === 2 ? 180_000 : calls === 3 ? productDuration : 0;
        return response(calls === 1 ? fixture.invalid : calls === 2 ? fixture.corrected : calls === 3 ? invalid : fixture.output);
      };
      if (productDuration > 340_000) {
        await assert.rejects(generateDiscoverySynthesis(fixture.input), /invalid epic or feature reference/);
        assert.equal(calls, 3);
        assert.deepEqual(timeouts, [740_000, 180_000, 460_000]);
      } else {
        assert.equal((await generateDiscoverySynthesis(fixture.input)).provider, "openai");
        assert.equal(calls, 4);
        assert.deepEqual(timeouts, [740_000, 180_000, 460_000, 120_000]);
      }
    }
  });
});

test("provider, incomplete, parse and missing-status product failures never cause extra retries after evidence correction", async () => {
  await withStubs(async () => {
    const fixture = evidenceRepairFixture();
    const invalid = structuredClone(fixture.output);
    invalid.stories[0].featureId = "invented-feature";
    const previous = structuredClone(sampleDiscoverySynthesis);
    const original = JSON.stringify(previous);
    for (const repairFailure of [false, true]) {
      for (const failure of [
        async () => Response.json({ error: { code: "credit_balance_exhausted" } }, { status: 429 }),
        async () => { throw new TypeError("Private product connection error"); },
        async () => Response.json({ status: "incomplete", output_text: JSON.stringify(fixture.output) }),
        async () => Response.json({ status: "completed", output_text: "{invalid JSON" }),
        async () => Response.json({ output_text: JSON.stringify(repairFailure ? fixture.output : invalid) }),
        ...(repairFailure ? [async () => response(invalid)] : [])
      ]) {
        let calls = 0;
        globalThis.fetch = async () => {
          calls++;
          if (calls === 1) return response(fixture.invalid);
          if (calls === 2) return response(fixture.corrected);
          if (calls === 3 && repairFailure) return response(invalid);
          return failure();
        };
        await assert.rejects(generateDiscoverySynthesis(fixture.input, "", { previousSynthesis: previous }));
        assert.equal(calls, repairFailure ? 4 : 3);
        assert.equal(JSON.stringify(previous), original);
      }
    }
  });
});

test("authenticated validation diagnostics include up to 12 error summaries, bounded evidence details and no source logs", async () => {
  await withStubs(async (logs) => {
    const longFact = `${fixtureFact} ${"Evidence context ".repeat(200)}`;
    const diagnosticSources = sampleDiscoverySources.map((source, index) => ({ ...source, extractedText: index < 3 ? longFact : fixtureFact }));
    const ledger = [...evidenceLedger.map((item, index) => index < 3 ? { ...item, id: `${item.id}-${"X".repeat(800)}`, quote: longFact, statement: longFact } : item), ...Array.from({ length: 8 }, (_, index) => ({ ...evidenceLedger[0], id: `EV-${index + 7}` }))];
    const review = { ...evidence, sources: diagnosticSources.map((source) => ({ sourceId: source.id, findings: [source.extractedText], limitations: "Fictional evidence" })), evidenceLedger: ledger };
    const invalid = { ...sampleDiscoverySynthesis, evidenceCoverage: ledger.map((item) => ({ evidenceId: item.id, disposition: "context", storyIds: ["UNKNOWN"], testIds: [], gapIds: [] })) };
    let calls = 0;
    globalThis.fetch = async () => response(++calls === 1 ? review : invalid);
    await assert.rejects(generateDiscoverySynthesis({ ...program, intake: { ...program.intake, artifacts: diagnosticSources } }), (error: Error) => {
      assert.match(error.message, /14 validation issues/);
      assert.match(error.message, /EV-12 has unresolved output references/);
      assert.doesNotMatch(error.message, /EV-13 has unresolved output references/);
      assert.match(error.message, /Evidence details \(first 3\)/);
      assert.match(error.message, /Source quotation: Every service request/);
      assert.ok(error.message.length < 10_000);
      assert.ok(error.message.length > 8500, "Stress the overall cap including the outer failure prefix and preservation suffix.");
      return true;
    });
    assert.equal(calls, 3);
    assert.doesNotMatch(JSON.stringify(logs), /Source quotation|EV-12|Every service request/);
  });
});
