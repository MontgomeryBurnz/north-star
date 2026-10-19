import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

const clientSource = readFileSync(new URL("../src/components/discovery-studio-console.tsx", import.meta.url), "utf8");
const parsed = ts.createSourceFile("discovery-studio-console.tsx", clientSource, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const helper = parsed.statements.find((statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement) && statement.name?.text === "generateStudioPackage");
assert.ok(helper, "Exercise the actual console orchestration helper without mounting UI or making real requests.");
const compiledHelper = ts.transpileModule(helper.getText(parsed), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;

const checkpoint = "synthetic-memory-only-checkpoint";
const completed = { executiveSummary: "Completed and checked package" } as DiscoverySynthesis;
const input = () => ({
  workspaceName: "Fictional sample", artifacts: [{ id: "S1", extractedText: "Source evidence" }],
  resolutionNotes: "Additional context", selectedOutputs: ["roadmap", "backlog", "stories", "tests", "gaps", "analysis"],
  externalResearch: true, researchTopic: "Generic public service intake",
  previousSynthesis: { revision: { number: 4 }, executiveSummary: "Preserved previous package" },
  feedback: "ISSUE · Whole package: preserve the original metric."
});

function harness(options: {
  checkpoint?: unknown;
  evidence?: () => Promise<unknown>;
  product?: () => Promise<DiscoverySynthesis>;
  fetchError?: "evidence" | "product";
} = {}) {
  const requests: { url: string; init: RequestInit; body: Record<string, unknown> }[] = [];
  const statuses: string[] = [];
  const mockFetch = async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    requests.push({ url, init, body });
    if (body.phase === options.fetchError) throw new Error("Synthetic connection failure");
    return new Response(null, { status: 200 });
  };
  const evidenceReader = async (_response: Response, onHeartbeat?: () => void) => {
    onHeartbeat?.();
    return options.evidence ? await options.evidence() : "checkpoint" in options ? options.checkpoint : checkpoint;
  };
  const productReader = async (_response: Response, onHeartbeat?: () => void) => {
    onHeartbeat?.();
    return options.product ? await options.product() : completed;
  };
  const generate = new Function("fetch", "readDiscoveryEvidenceResponse", "readDiscoveryStudioResponse", `${compiledHelper}\nreturn generateStudioPackage;`)(mockFetch, evidenceReader, productReader) as (snapshot: string, onStatus: (message: string) => void) => Promise<DiscoverySynthesis>;
  return { requests, statuses, run: (snapshot = JSON.stringify(input())) => generate(snapshot, (status) => statuses.push(status)) };
}

test("one Studio operation runs evidence then product with the same immutable inputs and SSE acceptance", async () => {
  const { requests, statuses, run } = harness();
  assert.equal(await run(), completed);
  assert.equal(requests.length, 2);
  const [{ body: evidence }, { body: product }] = requests;
  assert.equal(evidence.phase, "evidence");
  assert.equal(product.phase, "product");
  assert.equal(product.checkpoint, checkpoint);
  assert.equal("checkpoint" in evidence, false);
  const { phase: evidencePhase, ...evidenceInput } = evidence;
  const { phase: productPhase, checkpoint: productCheckpoint, ...productInput } = product;
  assert.equal(evidencePhase, "evidence");
  assert.equal(productPhase, "product");
  assert.equal(productCheckpoint, checkpoint);
  assert.deepEqual(evidenceInput, input());
  assert.deepEqual(productInput, evidenceInput);
  for (const request of requests) {
    assert.equal(request.url, "/api/studio/discovery-synthesis");
    assert.equal(request.init.method, "POST");
    assert.equal(new Headers(request.init.headers).get("accept"), "text/event-stream");
  }
  assert.ok(statuses.some((status) => /Phase 1 of 2/.test(status)));
  assert.ok(statuses.some((status) => /Phase 2 of 2/.test(status)));
  assert.ok(statuses.every((status) => !status.includes(checkpoint)));
});

test("product cannot start until the evidence checkpoint reader completes", async () => {
  let finishEvidence: ((value: string) => void) | undefined;
  const pending = new Promise<string>((resolve) => { finishEvidence = resolve; });
  const { requests, run } = harness({ evidence: () => pending });
  const result = run();
  await Promise.resolve();
  assert.equal(requests.length, 1);
  finishEvidence!(checkpoint);
  assert.equal(await result, completed);
  assert.equal(requests.length, 2);
});

test("changes to the original request object cannot alter product inputs after evidence starts", async () => {
  const original = input();
  const snapshot = JSON.stringify(original);
  const { requests, run } = harness({ evidence: async () => {
    original.artifacts[0].extractedText = "Changed source";
    original.selectedOutputs.length = 0;
    original.feedback = "Changed feedback";
    original.previousSynthesis.executiveSummary = "Changed previous package";
    return checkpoint;
  } });
  await run(snapshot);
  const { phase, checkpoint: token, ...productInput } = requests[1].body;
  assert.equal(phase, "product");
  assert.equal(token, checkpoint);
  assert.deepEqual(productInput, JSON.parse(snapshot));
});

test("missing, blank, nonstring or oversized checkpoints never trigger product generation", async () => {
  for (const invalid of [undefined, null, false, 0, {}, "", "   ", "x".repeat(1_500_001)]) {
    const { requests, run } = harness({ checkpoint: invalid });
    await assert.rejects(run(), /complete evidence checkpoint/);
    assert.equal(requests.length, 1);
  }
});

test("evidence transport or application failure stops the operation without a product request or retry", async () => {
  for (const options of [
    { fetchError: "evidence" as const },
    { evidence: async () => { throw new Error("Evidence quality gate failed"); } }
  ]) {
    const { requests, run } = harness(options);
    await assert.rejects(run(), /Synthetic connection failure|Evidence quality gate failed/);
    assert.equal(requests.length, 1);
  }
});

test("product failure never retries or returns a partial synthesis", async () => {
  for (const options of [
    { fetchError: "product" as const },
    { product: async () => { throw new Error("Product quality gate failed"); } }
  ]) {
    const { requests, run } = harness(options);
    await assert.rejects(run(), /Synthetic connection failure|Product quality gate failed/);
    assert.equal(requests.length, 2);
  }
});

test("the console applies only a completed two-phase result and keeps checkpoint state out of storage", () => {
  const analyzeStart = clientSource.indexOf("async function analyzePackage");
  const analyzeEnd = clientSource.indexOf("async function exportPackage", analyzeStart);
  const analyze = clientSource.slice(analyzeStart, analyzeEnd);
  assert.ok(analyze.indexOf("await generateStudioPackage(requestSnapshot, setStatus)") < analyze.indexOf("setSynthesis(result)"));
  assert.match(analyze, /if \(analysisInFlightRef\.current \|\| exportAction !== null\) return/);
  assert.match(analyze, /finally \{ analysisInFlightRef\.current = false; setIsAnalyzing\(false\)/);
  assert.doesNotMatch(clientSource, /localStorage|sessionStorage|console\.(?:log|debug|info|warn|error)|checkpoint.*(?:location|URLSearchParams)/);
});
