import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryFidelity } from "../src/lib/discovery-fidelity.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

function review(statement: string, output: string, id: string, statusContext = false) {
  const sourceId = "SOURCE";
  const synthesis: DiscoverySynthesis = {
    executiveSummary: statement, evidenceSummary: statement, capabilities: [], painPoints: [], businessRules: [], assumptions: [], gaps: [],
    readinessScore: 40, readinessNarrative: "Review source-linked decisions before commitment.", sourceCount: 1, generatedAt: "2026-10-19T00:00:00Z", provider: "openai",
    roadmap: [{ horizon: "Now", title: "Review delivery", outcome: "Review before commitment", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "EP1", title: "Review delivery", objective: "Review before commitment", featureIds: ["F1"], sourceIds: [sourceId] }],
    features: [{ id: "F1", epicId: "EP1", title: "Review delivery", description: output, outcome: "Review before commitment", priority: "must", sourceIds: [sourceId] }],
    stories: [{ id: "U1", epicId: "EP1", featureId: "F1", title: "Review delivery", story: output, acceptanceCriteria: ["Undefined configuration blocks processing.", "Invalid operations leave existing records unchanged."], sourceIds: [sourceId], readiness: "needs-input", testCases: [
      { id: "T1", title: "Configured request", type: "happy-path", steps: ["Configure the workflow", "Submit a permitted request"], expectedResult: "The permitted request is recorded." },
      { id: "T2", title: "Unauthorized sensitive-content access", type: "negative", steps: ["Open a sensitive request as an unauthorized user"], expectedResult: "Access is denied; no sensitive content is exposed." }
    ] }]
  };
  return reviewDiscoveryFidelity(synthesis,
    [{ id, sourceId, quote: statement, kind: "proposal", statement }],
    [{ evidenceId: id, disposition: statusContext ? "context" : "proposal", storyIds: statusContext ? [] : ["U1"], testIds: statusContext ? [] : ["T1", "T2"], gapIds: [] }],
    [{ id: sourceId, text: statement }]);
}

const targetStatus = "The listed business outcomes are targets, not achieved results.";
const delivery = "The delivery approach is to configure and prove a three-region pilot before expanding to 12 regions after an outcome review.";

test("E048 does not mistake an explicit do-not-treat-as-achieved objective for an achievement claim", () => {
  const output = "As an operations sponsor, I want measured pilot outcomes compared with confirmed baselines so that scale-up decisions do not treat proposed targets as achieved results.";
  assert.deepEqual(review(targetStatus, output, "E048", true).errors, []);
});

test("negation on a different action or clause cannot excuse a real achieved-outcome assertion", () => {
  for (const output of [
    "The business outcomes are achieved results.",
    "Do not delete the evidence; the business outcomes are achieved results.",
    "Do not treat the business outcomes as missing; the business outcomes are achieved results.",
    "Do not treat proposed targets as achieved results; the business outcomes are achieved results.",
    "Do not treat proposed targets as achieved results, but the business outcomes are achieved results.",
    "The achieved business outcomes are available without a review."
  ]) {
    assert.match(review(targetStatus, output, "E048", true).errors.join(" "), /presents proposed outcomes as approved or achieved/, output);
  }
});

test("E050 approval of an unknown categories noun phrase does not definitively approve the proposed pilot", () => {
  const output = "Coordinator-submitted requests can be captured, routed, protected, audited, notified, and reported for approved pilot categories in three regions, subject to confirmed operating-model decisions.";
  const result = review(delivery, output, "E050");
  assert.deepEqual(result.errors, []);
  assert.ok(result.reviewIssues.some((issue) => issue.evidenceId === "E050" && issue.sourceId === "SOURCE" && /Proposal approval or modifier scope/.test(issue.message)),
    "Unknown category approval must remain a source-linked review hold, not silently disappear.");
});

test("actual pilot, expansion, intake and portal approval remain hard failures", () => {
  for (const output of [
    "The approved pilot in three regions is ready.",
    "The three-region pilot is approved.",
    "The expansion to 12 regions is approved.",
    "The three-region pilot has been achieved."
  ]) {
    assert.match(review(delivery, output, "E050").errors.join(" "), /presents a proposed target as approved or achieved/, output);
  }
  for (const [statement, output] of [
    ["Category-aware intake is proposed for later assessment.", "The approved category-aware intake supports delivery."],
    ["A resident self-service portal is proposed for later assessment.", "The approved resident portal improves accessibility."],
    ["A resident self-service portal is proposed for later assessment.", "The resident self-service portal is approved."],
    ["Pilot categories are proposed for later assessment.", "The approved pilot categories are available."]
  ]) {
    assert.match(review(statement, output, "PROPOSAL").errors.join(" "), /presents proposed outcomes as approved or achieved/, output);
  }
});

test("unknown noun modifiers remain bounded source-linked review rather than being discarded as verbs", () => {
  const statement = "A resident self-service portal is proposed for later assessment.";
  const result = review(statement, "The approved external resident portal improves accessibility.", "PORTAL");
  assert.deepEqual(result.errors, []);
  assert.ok(result.reviewIssues.some((issue) => issue.evidenceId === "PORTAL" && issue.sourceId === "SOURCE"));
});
