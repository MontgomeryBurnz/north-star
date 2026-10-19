import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { sampleDiscoverySources, sampleDiscoverySynthesis } from "../src/data/sample-program.ts";
import type { StoredProgram } from "../src/lib/program-intake-types.ts";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier === "@/lib/guidance-model-settings") return { url: `data:text/javascript,export async function getGuidanceModelSettings(){return {provider:"openai",model:"fixture-model",reasoningEffort:"high",textVerbosity:"medium"}}`, shortCircuit: true };
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
