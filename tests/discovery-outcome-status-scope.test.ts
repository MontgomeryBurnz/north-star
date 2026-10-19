import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryFidelity, type DiscoveryEvidenceLedgerItem } from "../src/lib/discovery-fidelity.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

const quote = "Business outcomes: reduce assignment delay from 3.8 days to under four business hours; establish a single auditable approval path; give leaders a timely view of demand, aging, and service-level risk. Outcomes are targets, not achieved results.";
const outcomes = [
  "A business outcome target is to establish a single auditable approval path; this is a target, not an achieved result.",
  "A business outcome target is to give leaders a timely view of demand, aging, and service-level risk; this is a target, not an achieved result."
];

function review(output: string) {
  const ledger: DiscoveryEvidenceLedgerItem[] = [
    { id: "BASELINE", sourceId: "SRC1", quote, kind: "fact", statement: "The assignment delay baseline is 3.8 days." },
    { id: "DELAY", sourceId: "SRC1", quote, kind: "proposal", statement: "The proposed assignment delay target is under 4 business hours." },
    ...outcomes.map((statement, index) => ({ id: `VD00${index + 3}`, sourceId: "SRC1", quote, kind: "proposal" as const, statement }))
  ];
  const synthesis: DiscoverySynthesis = {
    executiveSummary: "The assignment delay baseline is 3.8 days. The proposed assignment delay target is under 4 business hours.",
    evidenceSummary: output, capabilities: [], painPoints: [], businessRules: [], assumptions: [], gaps: [],
    readinessScore: 40, readinessNarrative: "Resolve source-linked decisions before commitment.", sourceCount: 1, generatedAt: "2026-10-19T00:00:00Z", provider: "openai",
    roadmap: [{ horizon: "Now", title: "Request handling", outcome: "Review the proposed workflow", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "EP1", title: "Request handling", objective: "Review proposed workflow", featureIds: ["F1"], sourceIds: ["SRC1"] }],
    features: [{ id: "F1", epicId: "EP1", title: "Request handling", description: "Review configured request handling", outcome: "Review before implementation", priority: "must", sourceIds: ["SRC1"] }],
    stories: [{ id: "U1", epicId: "EP1", featureId: "F1", title: "Request handling", story: "Review configured request handling", acceptanceCriteria: ["Missing configuration blocks processing.", "An invalid operation leaves the request unchanged."], sourceIds: ["SRC1"], readiness: "needs-input", testCases: [
      { id: "T1", title: "Configured request", type: "happy-path", steps: ["Configure the workflow", "Submit a permitted request"], expectedResult: "The configured request is recorded." },
      { id: "T2", title: "Invalid request", type: "negative", steps: ["Submit an invalid request"], expectedResult: "The request is rejected without changing the record." }
    ] }]
  };
  return reviewDiscoveryFidelity(synthesis, ledger, ledger.map((item) => ({ evidenceId: item.id, disposition: item.kind === "proposal" ? "proposal" : "context", storyIds: item.kind === "proposal" ? ["U1"] : [], testIds: item.kind === "proposal" ? ["T1", "T2"] : [], gapIds: [] })), [{ id: "SRC1", text: quote }]);
}

test("an unrelated approved document-review result cannot settle business outcome targets", () => {
  for (const separator of [". ", "; "]) {
    const result = review(`The auditable approval path and timely demand view remain proposed business outcome targets${separator}An approved result of the separate document review is available.`);
    assert.deepEqual(result.errors, [], separator);
  }
});

test("concrete approval-path and timely-view approval or achievement stay hard", () => {
  for (const [id, subject] of [["VD003", "The single auditable approval path"], ["VD004", "The timely view of demand"]]) {
    for (const claim of [`${subject} is approved.`, `${subject} has been achieved.`, `The approved ${subject.slice(4).toLowerCase()} is available.`, `The achieved ${subject.slice(4).toLowerCase()} is available.`]) {
      assert.ok(review(claim).errors.some((error) => error.startsWith(id) && /presents proposed outcomes as approved or achieved/.test(error)), claim);
    }
  }
  for (const suffix of ["is approved", "has been achieved"]) {
    const claim = `The timely view of demand, aging, and service-level risk ${suffix}.`;
    assert.ok(review(claim).errors.some((error) => error.startsWith("VD004") && /presents proposed outcomes as approved or achieved/.test(error)), claim);
  }
});

test("explicit settlement of all business outcome targets cannot disappear behind concrete-object scoping", () => {
  for (const subject of ["All business outcome targets", "All outcome targets", "All targets", "All proposed business outcome targets", "All of the outcome targets"]) for (const suffix of ["are approved", "have been achieved"]) {
    const claim = `${subject} ${suffix}.`;
    for (const id of ["VD003", "VD004"]) assert.ok(review(claim).errors.some((error) => error.startsWith(id) && /presents proposed outcomes as approved or achieved/.test(error)), claim);
  }
});

test("a safe preceding target statement cannot hide a later concrete outcome promotion", () => {
  for (const separator of [". ", "; ", ", and ", "; however "]) {
    for (const [id, claim] of [["VD003", "the single auditable approval path is approved"], ["VD004", "the timely view of demand has been achieved"]]) {
      const result = review(`The auditable approval path and timely demand view remain proposed business outcome targets${separator}${claim}.`);
      assert.ok(result.errors.some((error) => error.startsWith(id) && /presents proposed outcomes as approved or achieved/.test(error)), separator + claim);
    }
  }
});

test("unresolved target anaphora stays source-linked owner review rather than silently becoming ready", () => {
  for (const output of [
    "The auditable approval path remains a proposed target; this target has been achieved.",
    "The target is achieved.",
    "Both business outcome targets are approved.",
    "The proposed business outcome targets are achieved.",
    "The auditable approval path and timely demand view remain proposed; that outcome is approved."
  ]) {
    const result = review(output);
    assert.deepEqual(result.errors, []);
    assert.ok(result.reviewIssues.some((issue) => ["VD003", "VD004"].includes(issue.evidenceId) && issue.sourceId === "SRC1" && /unresolved outcome reference/i.test(issue.message)), output);
  }
});

test("outcome diagnostics retain the actual failing assertion after a long unrelated summary prefix", () => {
  const prefix = "The source document describes the current request workflow and leaves configuration decisions for owner review. ".repeat(8);
  const claim = "The single auditable approval path has been achieved.";
  const result = review(prefix + claim);
  const error = result.errors.find((message) => message.startsWith("VD003") && /presents proposed outcomes/.test(message));
  assert.ok(error);
  assert.ok(error.includes(claim), error);
  assert.ok(!error.includes("The source document describes"), error);
  assert.ok(error.length < 520, "Authenticated diagnostics remain bounded.");
});

test("a same-sentence status cue past 400 characters is diagnosed from its actual hard match", () => {
  const padding = "the current workflow and document configuration decisions for owner review, ".repeat(9);
  const claim = "the achieved single auditable approval path is available";
  for (const prefix of [
    "Do not treat the timely demand view as achieved results while document reviewers reconcile ",
    "Do not present previously achieved outcomes as achieved results while document reviewers reconcile "
  ]) {
    const result = review(prefix + padding + "and " + claim + ".");
    const error = result.errors.find((message) => message.startsWith("VD003") && /presents proposed outcomes/.test(message));
    assert.ok(error);
    assert.ok(error.includes(claim), error);
    assert.ok(!error.includes("Do not"), "A prior negated achieved cue must not steal the diagnostic window.");
    assert.ok(error.length < 520, "Authenticated diagnostics remain bounded.");
  }
});
