import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryFidelity } from "../src/lib/discovery-fidelity.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

function review(statement: string, output: string) {
  const synthesis: DiscoverySynthesis = {
    executiveSummary: statement, evidenceSummary: statement, capabilities: [], painPoints: [], businessRules: [], assumptions: [], gaps: [],
    readinessScore: 40, readinessNarrative: "Resolve source-linked decisions before commitment.", sourceCount: 1, generatedAt: "2026-10-19T00:00:00Z", provider: "openai",
    roadmap: [{ horizon: "Now", title: "Request handling", outcome: "Review the proposed workflow", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "EP1", title: "Request handling", objective: "Review proposed workflow", featureIds: ["F1"], sourceIds: ["SRC1"] }],
    features: [{ id: "F1", epicId: "EP1", title: "Request handling", description: output, outcome: "Review before implementation", priority: "must", sourceIds: ["SRC1"] }],
    stories: [{ id: "U1", epicId: "EP1", featureId: "F1", title: "Request handling", story: output, acceptanceCriteria: ["Missing configuration blocks processing.", "An invalid operation leaves the request unchanged."], sourceIds: ["SRC1"], readiness: "needs-input", testCases: [
      { id: "T1", title: "Configured request", type: "happy-path", steps: ["Configure the workflow", "Submit a permitted request"], expectedResult: "The configured request is recorded." },
      { id: "T2", title: "Unauthorized sensitive-content access", type: "negative", steps: ["Open a sensitive request as an unauthorized user"], expectedResult: "Access is denied; no sensitive content is exposed." }
    ] }]
  };
  return reviewDiscoveryFidelity(synthesis,
    [{ id: "E051", sourceId: "SRC1", quote: statement, kind: "proposal", statement }],
    [{ evidenceId: "E051", disposition: "proposal", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] }],
    [{ id: "SRC1", text: statement }]);
}

const pilotWork = "Pilot work should prioritize category-aware intake, protected sensitive requests, basic routing, and auditable exceptions.";

test("an approved category prerequisite does not definitely approve the proposed category-aware intake", () => {
  const output = "As a resident service coordinator, I want the intake form to request the information required for the selected approved category so that work can begin without clarification.";
  const result = review(pilotWork, output);
  assert.deepEqual(result.errors, []);
  assert.ok(result.reviewIssues.some((issue) => issue.evidenceId === "E051" && issue.sourceId === "SRC1" && /Proposal outcome status/.test(issue.message)),
    "The ambiguous component approval must remain a source-linked human review hold.");
});

test("an approval modifier on a future operating prerequisite remains a source-linked hold", () => {
  const statement = "A resident self-service portal is proposed for later assessment.";
  const result = review(statement, "The resident self-service portal depends on approved intake categories before workflow commitment.");
  assert.deepEqual(result.errors, []);
  assert.ok(result.reviewIssues.some((issue) => issue.evidenceId === "E051" && issue.sourceId === "SRC1"),
    "A future prerequisite must not silently approve the portal or disappear from review.");
});

test("a category modifier cannot borrow a later works verb as approval of pilot work", () => {
  const result = review(pilotWork, "The selected approved category works well during pilot work.");
  assert.deepEqual(result.errors, []);
  assert.ok(result.reviewIssues.some((issue) => issue.evidenceId === "E051" && issue.sourceId === "SRC1"),
    "Works must not be stemmed into the proposed work entity to manufacture definite approval.");
});

test("direct approval of the proposed intake stays a hard failure", () => {
  for (const output of [
    "The approved intake supports pilot work.",
    "Pilot work uses the selected approved category and approved intake.",
    "The category-aware intake for pilot work is approved.",
    "The category-aware intake for pilot work has been achieved.",
    "The approved intake depends on confirmed operating-model decisions for pilot work."
  ]) {
    assert.match(review(pilotWork, output).errors.join(" "), /presents proposed outcomes as approved or achieved/, output);
  }
});

test("approval of a resident portal noun phrase stays hard even with a later prerequisite", () => {
  const statement = "A resident self-service portal is proposed for later assessment.";
  for (const output of [
    "The approved resident self-service portal is available.",
    "The approved resident portal improves accessibility.",
    "The approved resident portal depends on confirmed operating-model decisions.",
    "The resident self-service portal depends on approved categories and the approved portal is available.",
    "The resident self-service portal is approved.",
    "The resident self-service portal has been achieved."
  ]) {
    assert.match(review(statement, output).errors.join(" "), /presents proposed outcomes as approved or achieved/, output);
  }
});

test("an unknown leading approval modifier cannot be skipped to manufacture direct proposal binding", () => {
  const statement = "A resident self-service portal is proposed for later assessment.";
  const result = review(statement, "The approved external resident portal improves accessibility.");
  assert.deepEqual(result.errors, []);
  assert.ok(result.reviewIssues.some((issue) => issue.evidenceId === "E051" && issue.sourceId === "SRC1"),
    "Unknown leading modifier scope remains a review hold instead of skipping to a later shared noun.");
});

test("approved categories stay hard when categories themselves are the proposed scope", () => {
  const statement = "Pilot categories are proposed for later assessment.";
  for (const output of ["The approved pilot categories are available.", "The pilot categories are approved."]) {
    assert.match(review(statement, output).errors.join(" "), /presents proposed outcomes as approved or achieved/, output);
  }
});

const reporting = "Cross-region reporting follows once categories and metric definitions are stable.";
test("the four real reporting-prerequisite contexts are not definite proposal approval or achievement",()=>{
  for(const context of [
    "Show volume, unassigned requests, aging buckets, reassignment rate, and cases/alerts when requests reach 80% of applicable SLA, using confirmed metric definitions.",
    "The story remains needs-input until per-category SLAs, calendars, pause/resume behavior, escalation owner, and metric definitions are confirmed.",
    "Display pilot management dashboard metrics using confirmed definitions",
    "Using confirmed metric definitions, the dashboard displays volume, unassigned requests, aging buckets, reassignment rate, and cases that reach 80% of applicable SLA.",
    "Cross-region reporting uses confirmed metric definitions."
  ]) assert.deepEqual(review(reporting,context).errors,[],context);
});

test("a conditional source cannot hide actual reporting approval or achievement, even after safe prerequisites",()=>{
  const promotions=["Cross-region reporting is approved.","Cross-region reporting has been achieved.","The approved cross-region reporting provides the management view."];
  for(const promotion of promotions) for(const prefix of [
    "",
    "Metric definitions remain unconfirmed. ",
    "The story remains needs-input until categories and metric definitions are stable; ",
    "The story remains needs-input until categories and metric definitions are stable, and ",
    "Once categories and metric definitions are confirmed, "
  ]) assert.match(review(reporting,prefix+promotion).errors.join(" "),/presents proposed outcomes as approved or achieved/,prefix+promotion);
});

test("prerequisite attribution is source-aware and generalizes beyond reporting",()=>{
  const routing="Regional routing follows once ownership and category definitions are stable.";
  assert.deepEqual(review(routing,"Regional routing uses confirmed category definitions.").errors,[]);
  for(const context of ["Regional routing is approved.","Regional routing has been achieved.","Once category definitions are confirmed, regional routing is approved."]) {
    assert.match(review(routing,context).errors.join(" "),/presents proposed outcomes as approved or achieved/,context);
  }
  for(const context of ["Use confirmed metric definitions.","Using confirmed metric definitions, display the management view.","Metric definitions are approved."]) {
    assert.match(review("Metric definitions are proposed.",context).errors.join(" "),/presents proposed outcomes as approved or achieved/,context);
  }
});

test("a one-word proposed capability still binds its own approval rather than its longer prerequisite",()=>{
  const statement="Reporting follows once metric definitions are stable.";
  assert.deepEqual(review(statement,"Reporting uses confirmed metric definitions.").errors,[]);
  for(const context of ["Reporting is approved.","Reporting has been achieved.","Metric definitions remain unconfirmed; reporting is approved."]) {
    assert.match(review(statement,context).errors.join(" "),/presents proposed outcomes as approved or achieved/,context);
  }
});

test("a proposed use-case noun phrase must not lose its approval modifier to a verb boundary",()=>{
  assert.match(review("Use cases are proposed.","The approved use cases are available.").errors.join(" "),/presents proposed outcomes as approved or achieved/);
  assert.match(review("Uses of resident data are proposed for owner review.","The approved uses of resident data are available.").errors.join(" "),/presents proposed outcomes as approved or achieved/);
});
