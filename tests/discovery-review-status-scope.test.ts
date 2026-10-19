import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryFidelity } from "../src/lib/discovery-fidelity.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

const expansion = "The delivery approach is to configure and prove a three-region pilot before expanding to 12 regions after an outcome review.";
const successReview = "Success review should compare measured pilot assignment time, reassignment, incomplete requests, and requester satisfaction against confirmed baselines.";
const expansionOutput = "Prepare a proposed scale-up assessment package for leadership using measured pilot data and confirmed metric definitions; no 12-region expansion decision or achieved outcome is implied.";
const reviewOutputs = [
  "This review—not an achieved outcome—should compare measured pilot assignment time, reassignment, incomplete requests, and requester satisfaction against confirmed baselines. Verified cost savings must not be inferred from baseline dataset.",
  "The sources propose a future success review comparing assignment time, reassignment, incomplete requests, and requester satisfaction against confirmed baselines; product-owner-confirmed pilot exit thresholds and measurement definitions remain open."
];

function review(statement: string, output: string, id = "E069") {
  const synthesis: DiscoverySynthesis = {
    executiveSummary: statement, evidenceSummary: output, capabilities: [], painPoints: [], businessRules: [], assumptions: [], gaps: [],
    readinessScore: 40, readinessNarrative: "Review source-linked decisions before commitment.", sourceCount: 1, generatedAt: "2026-10-19T00:00:00Z", provider: "openai",
    roadmap: [{ horizon: "Now", title: "Review delivery", outcome: "Review before commitment", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "EP1", title: "Review delivery", objective: "Review before commitment", featureIds: ["F1"], sourceIds: ["SOURCE"] }],
    features: [{ id: "F1", epicId: "EP1", title: "Review delivery", description: output, outcome: "Review before commitment", priority: "must", sourceIds: ["SOURCE"] }],
    stories: [{ id: "U1", epicId: "EP1", featureId: "F1", title: "Review delivery", story: output, acceptanceCriteria: ["Undefined configuration blocks processing.", "Invalid operations leave existing records unchanged."], sourceIds: ["SOURCE"], readiness: "needs-input", testCases: [
      { id: "T1", title: "Configured request", type: "happy-path", steps: ["Configure the workflow", "Submit a permitted request"], expectedResult: "The permitted request is recorded." },
      { id: "T2", title: "Invalid request", type: "negative", steps: ["Submit an invalid request"], expectedResult: "The invalid request leaves the record unchanged." }
    ] }]
  };
  return reviewDiscoveryFidelity(synthesis,
    [{ id, sourceId: "SOURCE", quote: statement, kind: "proposal", statement }],
    [{ evidenceId: id, disposition: "proposal", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] }],
    [{ id: "SOURCE", text: statement }]);
}

test("the live E056 no-expansion-decision-or-achieved-outcome assertion is not an achievement", () => {
  assert.deepEqual(review(expansion, expansionOutput, "E056").errors, []);
});

test("both live E069 comparison-input modifiers and the verbatim source remain non-settled", () => {
  for (const output of [...reviewOutputs, successReview]) {
    const result = review(successReview, output);
    assert.deepEqual(result.errors, [], output);
    assert.ok(result.reviewIssues.some(issue => issue.evidenceId === "E069" && issue.sourceId === "SOURCE"), "Unresolved review prerequisites remain an owner-review hold.");
  }
});

test("the exact live safe contexts cannot hide a separately approved or achieved expansion", () => {
  for (const assertion of ["The expansion to 12 regions is approved.", "The expansion to 12 regions has been achieved.", "The approved pilot in three regions is available."]) {
    for (const separator of [" ", "; ", ", but "]) assert.match(review(expansion, expansionOutput + separator + assertion, "E056").errors.join(" "), /presents a proposed target as approved or achieved/, assertion);
  }
});

test("a proposed success review's own approval or achievement remains hard across mixed clauses", () => {
  for (const assertion of ["The success review is approved.", "The success review has been achieved.", "The approved success review is available."]) {
    for (const prefix of ["", reviewOutputs[0] + " ", reviewOutputs[1] + "; "]) {
      assert.match(review(successReview, prefix + assertion).errors.join(" "), /presents proposed outcomes as approved or achieved/, prefix + assertion);
    }
  }
});

test("confirmed baselines remain hard when baselines themselves are the proposed entity", () => {
  assert.match(review("Pilot baselines are proposed for owner review.", "The confirmed pilot baselines are available.").errors.join(" "), /presents proposed outcomes as approved or achieved/);
});

test("no or not on a different predicate cannot negate an actual achievement", () => {
  for (const output of [
    "No expansion decision is implied, but the expansion to 12 regions has been achieved.",
    "No delay prevents the achieved outcome from being available; the expansion to 12 regions is approved.",
    "No expansion decision is implied; the achieved pilot in three regions is available.",
    "The expansion to 12 regions is an achieved outcome.",
    "No 12-region expansion decision or achieved outcome is implied, but the expansion to 12 regions is approved."
  ]) assert.match(review(expansion, output, "E056").errors.join(" "), /presents a proposed target as approved or achieved/, output);
});

test("a removed no-achievement cue cannot steal a later actual hard-match diagnostic", () => {
  for (const [statement, negative, assertion] of [
    [successReview, "No expansion decision or achieved outcome is implied.", "The success review has been achieved."],
    [expansion, "No 12-region expansion decision or achieved outcome is implied.", "The expansion has been achieved."]
  ]) {
    const output = negative + " " + "The current documents leave measurement definitions for owner review. ".repeat(9) + assertion;
    const error = review(statement, output).errors.find(message => /presents (?:a proposed target|proposed outcomes) as approved or achieved/.test(message));
    assert.ok(error);
    assert.ok(error.includes(assertion), error);
    assert.ok(!error.includes(negative), error);
    assert.ok(error.length < 520, "Caller-only diagnostic remains bounded.");
  }
});

test("a no-implied clause cannot mask a same-count affirmative predicate after AND or BECAUSE", () => {
  for (const join of [" and ", " because "]) for (const assertion of ["expansion to 12 regions has been achieved", "expansion to 12 regions is approved"]) {
    const output = "No 12-region expansion decision or achieved outcome is implied" + join + assertion + ".";
    assert.match(review(expansion, output, "E056").errors.join(" "), /presents a proposed target as approved or achieved/, output);
  }
});

test("a later explicit expansion antecedent cannot omit its count to evade settlement checks", () => {
  for (const join of [". ", "; ", ", but ", " and ", " because "]) for (const assertion of ["The expansion is approved.", "The expansion has been achieved.", "The expansion is agreed."]) {
    const output = "No 12-region expansion decision or achieved outcome is implied" + join + assertion;
    assert.match(review(expansion, output, "E056").errors.join(" "), /presents a proposed target as approved or achieved/, output);
  }
});

test("a denied mean or imply complement is a review hold, not an affirmative settlement", () => {
  for (const verb of ["mean", "imply"]) for (const status of ["approved", "achieved", "confirmed", "committed", "agreed"]) {
    const output = `No 12-region expansion decision or achieved outcome is implied and this does not ${verb} the expansion is ${status}.`;
    const result = review(expansion, output, "E056");
    assert.deepEqual(result.errors, [], output);
    assert.ok(result.reviewIssues.some(issue => issue.evidenceId === "E056"), output);
  }
  const contradiction = "No 12-region expansion decision or achieved outcome is implied and this does not mean the expansion is approved; the expansion to 12 regions is approved.";
  assert.match(review(expansion, contradiction, "E056").errors.join(" "), /presents a proposed target as approved or achieved/);
});

test("unclassified active-voice settlement of the same expansion remains a source-linked hold", () => {
  for (const assertion of ["We approved the expansion.", "We have achieved the expansion.", "Leadership confirmed the expansion.", "We agreed to the expansion.", "We committed to the expansion."]) {
    const output = "No 12-region expansion decision or achieved outcome is implied; " + assertion;
    const result = review(expansion, output, "E056");
    assert.deepEqual(result.errors, [], output);
    assert.ok(result.reviewIssues.some(issue => issue.evidenceId === "E056" && issue.sourceId === "SOURCE" && /subsequent expansion-status assertion/.test(issue.message)), output);
  }
});

test("unrelated continuation status and a simple negated status do not acquire the new expansion hold", () => {
  for (const assertion of ["Metric definitions are confirmed.", "A separate document is approved.", "The expansion is not approved.", "We approved the expansion to 3 regions."]) {
    const result = review(expansion, "No 12-region expansion decision or achieved outcome is implied; " + assertion, "E056");
    assert.ok(!result.reviewIssues.some(issue => /subsequent expansion-status assertion/.test(issue.message)), assertion);
  }
});

test("conditional continuation remains an owner hold and a negated continuation is not approval", () => {
  for (const continuation of ["if the expansion to 12 regions is approved, review the plan", "unless the expansion is approved, do not proceed", "it is not true that the expansion is approved"]) {
    const output = "No 12-region expansion decision or achieved outcome is implied and " + continuation + ".";
    const result = review(expansion, output, "E056");
    assert.deepEqual(result.errors, [], output);
    assert.ok(result.reviewIssues.some(issue => issue.evidenceId === "E056"), output);
  }
  assert.deepEqual(review(expansion, "No 12-region expansion decision or achieved outcome is implied and the expansion is not approved.", "E056").errors, []);
});

test("outer negation or a false-claim wrapper cannot silently normalize the achievement cue", () => {
  for (const output of ["It is not true that no 12-region expansion decision or achieved outcome is implied.", "The claim that no 12-region expansion decision or achieved outcome is implied is false."]) {
    const result = review(expansion, output, "E056");
    assert.ok(result.errors.length || result.reviewIssues.some(issue => issue.evidenceId === "E056"), output);
  }
});
