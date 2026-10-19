import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryFidelity } from "../src/lib/discovery-fidelity.ts";
import type { DiscoveryEvidenceLedgerItem } from "../src/lib/discovery-fidelity.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

const windows = "Indicative planning windows: 0–30 days validate blueprint and policy, 31–60 days pilot configuration and validation, 61–120 days assess scale-up.";
const quote = `${windows} These are planning horizons, not committed release dates.`;
const status = "The indicative planning windows are planning horizons, not committed release dates.";

function fixture() {
  const synthesis: DiscoverySynthesis = {
    executiveSummary: windows, evidenceSummary: windows, capabilities: [], painPoints: [], businessRules: [], assumptions: [status], gaps: [],
    readinessScore: 40, readinessNarrative: "Resolve source-linked decisions before commitment.", sourceCount: 1, generatedAt: "2026-10-19T00:00:00Z", provider: "openai",
    roadmap: [{ horizon: "Review", title: "Planning review", outcome: "Review the proposed workflow", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "EP1", title: "Workflow", objective: "Review proposed workflow", featureIds: ["F1"], sourceIds: ["SRC1"] }],
    features: [{ id: "F1", epicId: "EP1", title: "Workflow", description: "Review unresolved decisions", outcome: "Review before implementation", priority: "must", sourceIds: ["SRC1"] }],
    stories: [{ id: "U1", epicId: "EP1", featureId: "F1", title: "Workflow", story: "As a coordinator, I want validated rules so that requests follow policy.", acceptanceCriteria: ["Missing configuration blocks processing.", "An invalid operation leaves the request unchanged."], sourceIds: ["SRC1"], readiness: "needs-input", testCases: [
      { id: "T1", title: "Configured request", type: "happy-path", steps: ["Configure the workflow", "Submit a permitted request"], expectedResult: "The request is recorded." },
      { id: "T2", title: "Missing configuration", type: "negative", steps: ["Submit a request without configuration"], expectedResult: "Processing is blocked without changing the request." }
    ] }]
  };
  const ledger: DiscoveryEvidenceLedgerItem[] = [
    { id: "WINDOWS", sourceId: "SRC1", quote, kind: "proposal", statement: windows },
    { id: "EL059", sourceId: "SRC1", quote, kind: "proposal", statement: status }
  ];
  const coverage: Array<{ evidenceId: string; disposition: "context" | "proposal" | "implemented"; storyIds: string[]; testIds: string[]; gapIds: string[] }> = [
    { evidenceId: "WINDOWS", disposition: "proposal", storyIds: [], testIds: [], gapIds: [] },
    { evidenceId: "EL059", disposition: "context", storyIds: [], testIds: [], gapIds: [] }
  ];
  return { synthesis, ledger, coverage, sources: [{ id: "SRC1", text: quote }] };
}
function review(value: ReturnType<typeof fixture>) {
  return reviewDiscoveryFidelity(value.synthesis, value.ledger, value.coverage, value.sources);
}

test("source-backed indicative planning noncommitment is unlinked metadata without hiding its dated windows", () => {
  const result = review(fixture());
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.reviewIssues, []);
});

test("a pure equivalent indicative-horizon status preserves the same explicit noncommitment", () => {
  const value = fixture();
  value.ledger[1].statement = "The planning horizons are indicative, not committed release dates.";
  value.synthesis.assumptions = [value.ledger[1].statement];
  assert.deepEqual(review(value).errors, []);
});

test("quantified planning windows cannot use the planning-status metadata allowance", () => {
  const value = fixture();
  value.coverage[0].disposition = "context";
  assert.match(review(value).errors.join(" "), /WINDOWS promotes a proposal to a confirmed obligation/);
  value.coverage[0].disposition = "proposal";
  value.ledger[1].statement = "The indicative planning windows of 0–30 days are planning horizons, not committed release dates.";
  assert.match(review(value).errors.join(" "), /EL059 promotes a proposal to a confirmed obligation/);
});

test("implementation scope cannot be appended to a status statement and hidden as context", () => {
  const value = fixture();
  value.ledger[1].statement = `${status} A resident portal is proposed.`;
  value.synthesis.assumptions = [value.ledger[1].statement];
  assert.match(review(value).errors.join(" "), /EL059 promotes a proposal to a confirmed obligation/);
});

test("planning-status context stays unlinked and cannot make dependent work ready", () => {
  for (const disposition of ["context", "implemented"] as const) {
    const value = fixture();
    value.coverage[1] = { ...value.coverage[1], disposition, storyIds: ["U1"], testIds: ["T1", "T2"] };
    assert.match(review(value).errors.join(" "), /EL059 promotes a proposal to a confirmed obligation/);
  }
  const value = fixture();
  value.coverage[1] = { ...value.coverage[1], disposition: "proposal", storyIds: ["U1"], testIds: ["T1", "T2"] };
  value.synthesis.stories[0].readiness = "ready";
  assert.match(review(value).errors.join(" "), /EL059 has unresolved evidence but marks a dependent story ready/);
});

test("the noncommitment must be explicit in visible output, not only the source quotation", () => {
  const value = fixture();
  value.synthesis.assumptions = [];
  assert.match(review(value).errors.join(" "), /EL059 promotes a proposal to a confirmed obligation/);
});

test("the source must support the precise indicative noncommitment status", () => {
  const value = fixture();
  const changedQuote = `${windows} These are committed release dates.`;
  value.sources[0].text = changedQuote;
  value.ledger.forEach((item) => { item.quote = changedQuote; });
  assert.match(review(value).errors.join(" "), /EL059 promotes a proposal to a confirmed obligation/);
});

test("actual approval, release commitment or achievement remains hard despite visible noncommitment metadata", () => {
  for (const claim of [
    "The planning windows are approved release dates.",
    "The planning windows are committed release dates.",
    "The planning horizons have been achieved.",
    "The approved planning horizons guide delivery.",
    "The committed planning windows guide delivery.",
    "The release dates for the planning windows are approved."
  ]) {
    const value = fixture();
    value.synthesis.assumptions.push(claim);
    assert.match(review(value).errors.join(" "), /EL059 promotes a proposal to a confirmed obligation/, claim);
  }
});

test("an unrelated earlier negation or completed conditional clause cannot hide direct planning achievement", () => {
  for (const claim of [
    "Evidence must not be discarded and the planning horizons have been achieved.",
    "Evidence is retained if requested, and the planning horizons have been achieved."
  ]) {
    const value = fixture();
    value.synthesis.assumptions.push(claim);
    assert.match(review(value).errors.join(" "), /EL059 promotes a proposal to a confirmed obligation/, claim);
  }
});

test("negative or explicitly conditional planning status does not become a false definite settlement", () => {
  for (const claim of [
    "The planning horizons have not been achieved.",
    "The planning windows are not approved.",
    "The not yet approved planning horizons remain provisional.",
    "Once planning horizons are approved, delivery can be considered.",
    "If planning windows are approved and the planning horizons are achieved, delivery can be considered."
  ]) {
    const value = fixture();
    value.synthesis.assumptions.push(claim);
    assert.deepEqual(review(value).errors, [], claim);
  }
});
