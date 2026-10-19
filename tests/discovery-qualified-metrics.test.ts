import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryFidelity } from "../src/lib/discovery-fidelity.ts";
import type { DiscoveryEvidenceLedgerItem } from "../src/lib/discovery-fidelity.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

function review(ledger: DiscoveryEvidenceLedgerItem[], field: string) {
  const value: DiscoverySynthesis = {
    executiveSummary: ledger.map(item => item.statement).join(" "), evidenceSummary: field,
    capabilities: [], painPoints: [], businessRules: [], assumptions: [], gaps: [],
    readinessScore: 40, readinessNarrative: "Review source-linked decisions before commitment.",
    sourceCount: ledger.length, generatedAt: "2026-10-19T00:00:00Z", provider: "openai",
    roadmap: [{ horizon: "Next", title: "Request handling", outcome: "Review the proposed workflow", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "EP1", title: "Request handling", objective: "Review workflow", featureIds: ["F1"], sourceIds: [ledger[0].sourceId] }],
    features: [{ id: "F1", epicId: "EP1", title: "Request handling", description: "Review the proposed design", outcome: "Evidence-backed definition", priority: "must", sourceIds: [ledger[0].sourceId] }],
    stories: [{ id: "U1", epicId: "EP1", featureId: "F1", title: "Request handling", story: "As a coordinator, I want configured request handling so that decisions remain traceable.", acceptanceCriteria: ["Missing configuration blocks processing.", "An invalid operation leaves the request unchanged."], sourceIds: [ledger[0].sourceId], readiness: "needs-input", testCases: [
      { id: "T1", title: "Configured request", type: "happy-path", steps: ["Configure the workflow", "Submit a permitted request"], expectedResult: "The request is recorded." },
      { id: "T2", title: "Invalid request", type: "negative", steps: ["Submit an invalid operation"], expectedResult: "The request remains unchanged." }
    ] }]
  };
  return reviewDiscoveryFidelity(value, ledger,
    ledger.map(item => ({ evidenceId: item.id, disposition: item.kind === "proposal" ? "proposal" : "context", storyIds: [], testIds: [], gapIds: [] })),
    ledger.map(item => ({ id: item.sourceId, text: item.quote })));
}

const median = "The baseline median request-to-assignment time is 3.8 calendar days.";
const metricLedger: DiscoveryEvidenceLedgerItem[] = [{ id: "BASE", sourceId: "S1", quote: median, statement: median, kind: "fact" }];

test("an explicit not-a-mean explanation does not change a median baseline", () => {
  for (const field of [
    "The median request-to-assignment time is 3.8 calendar days, not a mean or average.",
    "The baseline is a median of 3.8 calendar days, not an average.",
    "The median is 3.8 calendar days, not a mean/average."
  ]) assert.deepEqual(review(metricLedger, field).errors, [], field);
});

test("affirmative mean changes, mixed claims and double negation remain hard and diagnostic", () => {
  for (const field of [
    "The mean request-to-assignment time is 3.8 calendar days.",
    "The median request-to-assignment time is 3.8 calendar days, not a mean but an average.",
    "The median request-to-assignment time is 3.8 calendar days, not not a mean.",
    "The request-to-assignment time is 3.8 calendar days and isn't not a mean.",
    "The request-to-assignment time is 3.8 calendar days and can't not be an average.",
    "The request-to-assignment time is 3.8 calendar days, not a median or mean.",
    "The request-to-assignment time is 3.8 calendar days, not an average or median."
  ]) {
    const errors = review(metricLedger, field).errors.join(" ");
    assert.match(errors, /changes a median into a mean\/average/, field);
    assert.ok(errors.includes(field), "The authenticated diagnostic must identify the actual offending output.");
  }
});

test("mean and average baselines permit only explicit opposing-median negation", () => {
  for (const statistic of ["mean", "average"]) {
    const statement = `The baseline ${statistic} request-to-assignment time is 3.8 calendar days.`;
    const ledger = [{ ...metricLedger[0], quote: statement, statement }];
    assert.deepEqual(review(ledger, `The ${statistic} request-to-assignment time is 3.8 calendar days, not a median.`).errors, []);
    for (const field of [
      "The median request-to-assignment time is 3.8 calendar days.",
      `The request-to-assignment time is 3.8 calendar days, not a ${statistic} or median.`,
      "The request-to-assignment time is 3.8 calendar days, not not a median."
    ]) assert.match(review(ledger, field).errors.join(" "), /changes a mean\/average into a median/, field);
  }
});

const delivery = "The delivery approach is to configure and prove a three-region pilot before expanding to 12 regions after an outcome review.";
const pilot = "The pilot will cover three regions.";
const proposal: DiscoveryEvidenceLedgerItem = { id: "DELIVERY", sourceId: "S1", quote: delivery, statement: delivery, kind: "proposal" };
const confirmed: DiscoveryEvidenceLedgerItem = { id: "PILOT", sourceId: "S2", quote: pilot, statement: pilot, kind: "fact" };

test("confirmation wording for a pilot boundary remains a review hold rather than approval of its delivery approach", () => {
  const result = review([proposal, confirmed], "The confirmed pilot boundary is three regions before scale-up.");
  assert.deepEqual(result.errors, []);
  assert.ok(result.reviewIssues.some(issue => issue.evidenceId === "DELIVERY" && issue.sourceId === "S1" && /requires owner review before commitment/.test(issue.message)));
});

test("a boundary modifier or an independently confirmed pilot count cannot approve a whole delivery proposal", () => {
  for (const field of [
    "The three-region delivery approach is approved.",
    "The confirmed pilot boundary is three regions and the delivery approach is approved.",
    "The confirmed pilot boundary is three regions and the delivery approach is confirmed."
  ]) assert.match(review([proposal, confirmed], field).errors.join(" "), /presents a proposed target as approved or achieved/, field);

  const unresolved = review([proposal], "The confirmed pilot boundary is three regions before scale-up.");
  assert.ok(unresolved.reviewIssues.some(issue => issue.evidenceId === "DELIVERY" && /requires owner review before commitment/.test(issue.message)));
});
