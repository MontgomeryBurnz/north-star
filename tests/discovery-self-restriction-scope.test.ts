import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryFidelity } from "../src/lib/discovery-fidelity.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

const rule = "A user cannot approve their own policy exception.";

function fixture(sourceRule = rule) {
  const value: DiscoverySynthesis = {
    executiveSummary: sourceRule, evidenceSummary: sourceRule,
    capabilities: ["Apply the confirmed decision rule."], painPoints: ["Decision controls need consistent enforcement."],
    businessRules: [sourceRule], assumptions: [], gaps: [], readinessScore: 40,
    readinessNarrative: "Review unresolved policy before commitment.",
    sourceCount: 1, generatedAt: "2026-10-19T00:00:00Z", provider: "openai",
    roadmap: [{ horizon: "Now", title: "Decision controls", outcome: "Apply confirmed policy", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "E1", title: "Decision controls", objective: "Apply confirmed policy", featureIds: ["F1"], sourceIds: ["S1"] }],
    features: [{ id: "F1", epicId: "E1", title: "Decision controls", description: "Enforce the source rule", outcome: "Consistent decisions", priority: "must", sourceIds: ["S1"] }],
    stories: [{
      id: "U1", epicId: "E1", featureId: "F1", title: "Enforce the source decision rule",
      story: "As an authorized reviewer, I want the confirmed decision rule enforced so that decisions follow policy.",
      acceptanceCriteria: [sourceRule, "An authorized reviewer can approve another user's policy exception."],
      sourceIds: ["S1"], readiness: "needs-input",
      testCases: [
        { id: "T1", title: "Approve another user's policy exception", type: "happy-path", steps: ["Approve a policy exception raised by another user"], expectedResult: "Approval is recorded." },
        { id: "T2", title: "Block self-approval of a policy exception", type: "negative", steps: ["Attempt to approve one's own policy exception"], expectedResult: "Approval is blocked and the policy exception remains pending." }
      ]
    }]
  };
  const ledger = [{ id: "SELF", sourceId: "S1", quote: sourceRule, statement: sourceRule, kind: "requirement" as const }];
  const coverage = [{ evidenceId: "SELF", disposition: "implemented", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] }];
  const sources = [{ id: "S1", text: sourceRule }];
  return { value, ledger, coverage, sources };
}

test("a rule-qualified non-prohibition creates a source-linked hold without inventing rejection authority or resolving it", () => {
  for (const clause of [
    "not blocked from rejecting it solely by the self approval rule",
    "A user is not prevented from rejecting it solely under the self-approval rule."
  ]) {
    const { value, ledger, coverage, sources } = fixture();
    value.stories[0].acceptanceCriteria.push(clause);
    const before = structuredClone(value);
    const reviewed = reviewDiscoveryFidelity(value, ledger, coverage, sources);
    assert.deepEqual(reviewed.errors, []);
    assert.ok(reviewed.reviewIssues.some((issue) => issue.evidenceId === "SELF" && issue.sourceId === "S1" && /does not establish permitted rejection or resolve a pronoun/.test(issue.message)));
    assert.deepEqual(value, before, "Review must not rewrite the output, resolve it, or mark rejection as permitted.");
  }
});

test("actual rejection bans and broader own-request scopes remain hard failures", () => {
  for (const clause of [
    "A user cannot reject their own policy exception.",
    "Block a user from rejecting their own policy exception.",
    "A user cannot approve or reject their own policy exception.",
    "A user cannot approve their own request.",
    "A user is not blocked from rejecting their own request solely by the self approval rule."
  ]) {
    const { value, ledger, coverage, sources } = fixture();
    value.businessRules.push(clause);
    assert.ok(reviewDiscoveryFidelity(value, ledger, coverage, sources).errors.some((error) => /self-decision restriction/.test(error)), clause);
  }
});

test("a named rule qualifier needs an actual source-backed policy-exception anchor", () => {
  const { value, ledger, coverage, sources } = fixture();
  value.businessRules.push("not blocked from rejecting it solely by the self approval rule");
  const unrelatedLedger = [{ ...ledger[0], statement: "Requests have accountable owners.", kind: "fact" as const }];
  const reviewed = reviewDiscoveryFidelity(value, unrelatedLedger, coverage, sources);
  assert.ok(reviewed.errors.some((error) => /self-decision restriction/.test(error)));
  assert.ok(!reviewed.reviewIssues.some((issue) => /Rule-qualified rejection wording/.test(issue.message)));

  for (const statement of [
    "A user cannot approve or reject their own policy exception.",
    "A user cannot approve their own policy exception, but they cannot reject their own policy exception either.",
    "A user cannot approve their own request."
  ]) {
    const broadenedLedger = [{ ...ledger[0], statement }];
    const broadenedReview = reviewDiscoveryFidelity(value, broadenedLedger, coverage, sources);
    assert.ok(broadenedReview.errors.some((error) => /self-decision restriction/.test(error)), statement);
    assert.ok(!broadenedReview.reviewIssues.some((issue) => /Rule-qualified rejection wording/.test(issue.message)), "A broadened ledger assertion cannot supply the narrow source-backed anchor.");
  }

  const otherScope = fixture("A user cannot approve their own request.");
  otherScope.value.businessRules.push("not blocked from rejecting it solely by the self approval rule");
  const withoutExceptionPolicy = reviewDiscoveryFidelity(otherScope.value, otherScope.ledger, otherScope.coverage, otherScope.sources);
  assert.ok(withoutExceptionPolicy.errors.some((error) => /self-decision restriction/.test(error)));
  assert.ok(!withoutExceptionPolicy.reviewIssues.some((issue) => /Rule-qualified rejection wording/.test(issue.message)));
});

test("contrast conjunctions cannot hide a new rejection prohibition", () => {
  for (const contrast of ["but", "however", "whereas"]) {
    const { value, ledger, coverage, sources } = fixture();
    value.businessRules.push(`A user cannot approve their own policy exception, ${contrast} they cannot reject their own policy exception either.`);
    assert.ok(reviewDiscoveryFidelity(value, ledger, coverage, sources).errors.some((error) => /self-decision restriction/.test(error)));
  }
});

test("unattributed double negation does not use the narrow qualified-rejection hold", () => {
  for (const clause of [
    "A user is not blocked from rejecting it.",
    "A user is not blocked from rejecting it by the self approval rule.",
    "A user is blocked from rejecting it solely by the self approval rule."
  ]) {
    const { value, ledger, coverage, sources } = fixture();
    value.businessRules.push(clause);
    const reviewed = reviewDiscoveryFidelity(value, ledger, coverage, sources);
    assert.ok(!reviewed.reviewIssues.some((issue) => /Rule-qualified rejection wording/.test(issue.message)));
    if (/self approval rule/.test(clause)) assert.ok(reviewed.errors.some((error) => /self-decision restriction/.test(error)));
  }
});
