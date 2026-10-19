import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryEvidenceLedger, reviewDiscoveryFidelity } from "../src/lib/discovery-fidelity.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

function product(text: string): DiscoverySynthesis {
  return {
    executiveSummary: text, evidenceSummary: text, capabilities: ["Manage records"], painPoints: ["Inconsistent records"], businessRules: [text], assumptions: [],
    gaps: [], readinessScore: 40, readinessNarrative: "Review unresolved policy.", sourceCount: 1, generatedAt: "2026-10-19T00:00:00Z", provider: "openai",
    roadmap: [{ horizon: "Now", title: "Records", outcome: "Controlled records", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "E1", title: "Records", objective: "Controlled records", featureIds: ["F1"], sourceIds: ["S1"] }],
    features: [{ id: "F1", epicId: "E1", title: "Record controls", description: "Apply confirmed controls", outcome: "Controlled records", priority: "must", sourceIds: ["S1"] }],
    stories: [{ id: "U1", epicId: "E1", featureId: "F1", title: "Manage records", story: "As a records owner, I want governed records so that policy is applied.", acceptanceCriteria: [text, "Invalid operations are prevented."], sourceIds: ["S1"], readiness: "needs-input", testCases: [
      { id: "T1", title: "Retain records before the 5-year boundary", type: "happy-path", steps: ["Create an audit record", "Advance its age to immediately before 5 years"], expectedResult: "The audit record remains retained and available." },
      { id: "T2", title: "Reject an invalid operation", type: "negative", steps: ["Submit an invalid operation"], expectedResult: "Validation prevents the operation." }
    ] }]
  };
}

test("a procedural confirmation requirement is not mislabeled as an unapproved proposal or policy gap", () => {
  const text = "Record deletion requires customer confirmation before it proceeds.";
  const sources = [{ id: "S1", text }];
  const ledger = [{ id: "Q1", sourceId: "S1", quote: text, kind: "requirement" as const, statement: text }];
  assert.deepEqual(reviewDiscoveryEvidenceLedger(ledger, sources).errors, []);
  const definition = product(text);
  assert.deepEqual(reviewDiscoveryFidelity(definition, ledger, [{ evidenceId: "Q1", disposition: "implemented", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] }], sources).errors, []);
});

test("an unresolved authority can be expressed as a confirmation prerequisite without becoming settled policy", () => {
  const quote = "The pilot approval authority is unconfirmed and must be decided by the sponsor.";
  const statement = "Sponsor confirmation is required before the pilot approval authority can be configured.";
  const ledger = [{ id: "Q1", sourceId: "S1", quote, kind: "requirement" as const, statement }];
  const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "S1", text: quote }]);
  assert.deepEqual(reviewed.errors, []);
  assert.equal(reviewed.ledger[0].kind, "open-question");
  assert.equal(ledger[0].kind, "requirement");
  const settled = [{ ...ledger[0], statement: "The sponsor has approved the pilot approval authority and it is configured." }];
  assert.ok(reviewDiscoveryEvidenceLedger(settled, [{ id: "S1", text: quote }]).errors.length > 0);
});

test("an unchanged configuration decision statement retains its explicit unresolved status", () => {
  const text = "Exact per-category SLA, business calendar, pause/resume behavior, and escalation owner require decisions.";
  const reviewed = reviewDiscoveryEvidenceLedger([{ id: "Q1", sourceId: "S1", quote: text, statement: text, kind: "open-question" }], [{ id: "S1", text }]);
  assert.deepEqual(reviewed.errors, []);
  assert.equal(reviewed.ledger[0].kind, "open-question");
});

test("a proposal with a contextual quantity is not contaminated by an unrelated mandatory clause in its quote", () => {
  const quote = "Requests must have an owner. The pilot covers three regions. A resident self-service portal is a later proposal.";
  const statement = "A resident self-service portal is proposed for later assessment after the three-region pilot.";
  const reviewed = reviewDiscoveryEvidenceLedger([{ id: "Q1", sourceId: "S1", quote, kind: "proposal", statement }], [{ id: "S1", text: quote }]);
  assert.deepEqual(reviewed.errors, []);
  assert.equal(reviewed.ledger[0].kind, "proposal");
});

test("mixed table baselines and proposed targets remain separate atomic assertions", () => {
  const text = "Measure | Baseline | Target\nMedian assignment time | 3.8 calendar days | Under 4 business hours; calendar needs confirmation\nReassigned requests | 27% | Proposed target below 10%; owner to confirm";
  const entries = [
    { id: "Q1", sourceId: "S1", quote: "Median assignment time | 3.8 calendar days", kind: "fact", statement: "Median assignment time is 3.8 calendar days." },
    { id: "Q2", sourceId: "S1", quote: "Under 4 business hours; calendar needs confirmation", kind: "proposal", statement: "The proposed target is under 4 business hours; calendar needs confirmation." },
    { id: "Q3", sourceId: "S1", quote: "Reassigned requests | 27%", kind: "fact", statement: "Reassigned requests are 27%." },
    { id: "Q4", sourceId: "S1", quote: "Proposed target below 10%; owner to confirm", kind: "proposal", statement: "The proposed target is below 10%; owner to confirm." }
  ];
  assert.deepEqual(reviewDiscoveryEvidenceLedger(entries, [{ id: "S1", text }]).errors, []);
});

test("a shared broad measurement quote supports atomic duration claims without forcing all context into each claim", () => {
  const text = "Eight-week baseline.\nMedian assignment time | 3.8 calendar days | Under 4 business hours; business calendar needs confirmation";
  const sources = [{ id: "S1", text }];
  const ledger = [
    { id: "BASE", sourceId: "S1", quote: text, kind: "fact" as const, statement: "Median assignment time is 3.8 calendar days." },
    { id: "TARGET", sourceId: "S1", quote: text, kind: "proposal" as const, statement: "The proposed assignment target is under 4 business hours." },
    { id: "PERIOD", sourceId: "S1", quote: text, kind: "fact" as const, statement: "The observation period is an eight-week baseline." }
  ];
  assert.deepEqual(reviewDiscoveryEvidenceLedger(ledger, sources).errors, []);
  const output = product(ledger.map((item) => item.statement).join(" "));
  output.gaps = [{ id: "CAL", title: "Confirm business calendar", description: "The business calendar needs confirmation.", question: "Which business calendar should the target use?", severity: "blocking", sourceIds: ["S1"] }];
  const coverage = ledger.map((item) => ({ evidenceId: item.id, disposition: item.kind === "proposal" ? "proposal" : "context", storyIds: [], testIds: [], gapIds: item.kind === "proposal" ? ["CAL"] : [] }));
  assert.deepEqual(reviewDiscoveryFidelity(output, ledger, coverage, sources).errors, []);
  for (const [index, before, after] of [
    [0, "Median", "Average"], [0, "calendar", "business"], [1, "under", "at most"], [1, "4", "6"]
  ] as const) {
    const changed = structuredClone(ledger);
    changed[index].statement = changed[index].statement.replace(before, after);
    assert.ok(reviewDiscoveryEvidenceLedger(changed, sources).errors.length > 0, "Atomic measurement qualifiers cannot be invented or changed behind a valid context quote.");
  }
  assert.ok(reviewDiscoveryEvidenceLedger(ledger.filter((item) => item.id !== "PERIOD"), sources).errors.length > 0);
  const combined = ledger.filter((item) => item.id !== "PERIOD");
  combined[0] = { ...combined[0], statement: "Median assignment time is 3.8 calendar days during the eight-week baseline." };
  assert.deepEqual(reviewDiscoveryEvidenceLedger(combined, sources).errors, [], "An observation window must not inherit the measured delay's median statistic.");
  assert.deepEqual(reviewDiscoveryFidelity(output, combined, coverage.filter((item) => item.evidenceId !== "PERIOD"), sources).errors, []);
});

test("known retention duration needs a real boundary test and unknown legal behavior needs a precise gap", () => {
  const known = "Audit records are retained for five years.";
  const unknown = "Content deletion, legal holds, and encryption are not yet confirmed.";
  const text = `${known} ${unknown}`;
  const sources = [{ id: "S1", text }];
  const ledger = [
    { id: "Q1", sourceId: "S1", quote: known, kind: "requirement" as const, statement: known },
    { id: "Q2", sourceId: "S1", quote: unknown, kind: "open-question" as const, statement: unknown }
  ];
  const coverage = [
    { evidenceId: "Q1", disposition: "implemented", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] },
    { evidenceId: "Q2", disposition: "gap", storyIds: ["U1"], testIds: [], gapIds: ["G1"] }
  ];
  const valid = product(text);
  valid.gaps = [{ id: "G1", title: "Legal handling decisions", description: unknown, severity: "blocking", question: "Which content deletion, legal hold and encryption rules apply?", sourceIds: ["S1"] }];
  assert.deepEqual(reviewDiscoveryFidelity(valid, ledger, coverage, sources).errors, []);
  const noBoundary = structuredClone(valid);
  noBoundary.stories[0].testCases[0] = { id: "T1", title: "Valid record", type: "happy-path", steps: ["Create a record"], expectedResult: "The record is saved." };
  assert.match(reviewDiscoveryFidelity(noBoundary, ledger, coverage, sources).errors.join(" "), /retention boundary test/);
  const vagueGap = structuredClone(valid);
  vagueGap.gaps[0] = { ...vagueGap.gaps[0], title: "Confirm delivery", description: "Delivery needs approval.", question: "Can delivery proceed?" };
  assert.match(reviewDiscoveryFidelity(vagueGap, ledger, coverage, sources).errors.join(" "), /unresolved content deletion|unresolved legal holds|unresolved encryption/);
});

test("harmless pilot scope qualifiers retain the quantitative unit rather than inventing an office-region synonym", () => {
  const text = "The pilot will cover three regions.";
  const ledger = [{ id: "SCOPE", sourceId: "S1", quote: text, kind: "fact" as const, statement: text }];
  const sources = [{ id: "S1", text }];
  const coverage = [{ evidenceId: "SCOPE", disposition: "context", storyIds: [], testIds: [], gapIds: [] }];
  for (const qualifier of ["pilot", "selected", "named"]) {
    const output = product(`The discovery covers three ${qualifier} regions.`);
    assert.deepEqual(reviewDiscoveryFidelity(output, ledger, coverage, sources).errors, []);
  }
  assert.ok(reviewDiscoveryFidelity(product("The pilot covers three offices."), ledger, coverage, sources).errors.length > 0);
});

test("a proposed outcome explicitly not achieved is not mistaken for a claimed achieved result", () => {
  const text = "The proposed assignment target is under four business hours, not an achieved result.";
  const ledger = [{ id: "TARGET", sourceId: "S1", quote: text, kind: "proposal" as const, statement: text }];
  const sources = [{ id: "S1", text }];
  const coverage = [{ evidenceId: "TARGET", disposition: "proposal", storyIds: [], testIds: [], gapIds: [] }];
  assert.deepEqual(reviewDiscoveryEvidenceLedger(ledger, sources).errors, []);
  assert.deepEqual(reviewDiscoveryFidelity(product(text), ledger, coverage, sources).errors, []);
  assert.ok(reviewDiscoveryFidelity(product(text), ledger, [{ ...coverage[0], disposition: "context" }], sources).errors.length > 0, "The target-status metadata allowance must not turn a quantified proposal into context.");
  const achieved = text.replace("not an achieved", "an achieved");
  assert.ok(reviewDiscoveryFidelity(product(achieved), ledger, coverage, sources).errors.length > 0);
});

test("same-head self-policy shorthand is held for source-linked review while new objects or decision bans stay hard", () => {
  const text = "A user cannot approve their own policy exception.";
  const ledger = [{ id: "SELF", sourceId: "S1", quote: text, kind: "requirement" as const, statement: text }];
  const sources = [{ id: "S1", text }];
  const coverage = [{ evidenceId: "SELF", disposition: "implemented", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] }];
  const output = product(text);
  output.stories[0].testCases[1] = { id: "T2", title: "Block self approval of a policy exception", type: "negative", steps: ["Attempt approval of one's own policy exception"], expectedResult: "Approval is blocked and the policy exception remains pending." };
  output.businessRules = ["A user cannot approve their own exception."];
  const reviewed = reviewDiscoveryFidelity(output, ledger, coverage, sources);
  assert.deepEqual(reviewed.errors, []);
  assert.ok(reviewed.reviewIssues.some((issue) => issue.evidenceId === "SELF" && issue.sourceId === "S1"));
  const omittedObject = structuredClone(output);
  omittedObject.businessRules = [text];
  omittedObject.stories[0].testCases[1].title = "Prevent self approval";
  const omittedReview = reviewDiscoveryFidelity(omittedObject, ledger, coverage, sources);
  assert.deepEqual(omittedReview.errors, []);
  assert.ok(omittedReview.reviewIssues.some((issue) => issue.evidenceId === "SELF" && issue.sourceId === "S1" && /prevent self approval/.test(issue.message)));
  const unrelatedLedger = [{ id: "UNRELATED", sourceId: "S1", quote: text, kind: "fact" as const, statement: "Service requests have accountable owners." }];
  const unrelatedCoverage = [{ ...coverage[0], evidenceId: "UNRELATED" }];
  assert.ok(reviewDiscoveryFidelity(omittedObject, unrelatedLedger, unrelatedCoverage, sources).errors.some((error) => /self-decision restriction/.test(error)), "A source policy without a relevant ledger assertion cannot legitimize unanchored shorthand.");
  const ambiguous = structuredClone(output);
  ambiguous.businessRules = ["A user is not blocked from approving their own policy exception unless the authority is confirmed."];
  const ambiguousReview = reviewDiscoveryFidelity(ambiguous, ledger, coverage, sources);
  assert.deepEqual(ambiguousReview.errors, []);
  assert.ok(ambiguousReview.reviewIssues.some((issue) => issue.evidenceId === "SELF" && issue.sourceId === "S1"));
  for (const clause of ["A user cannot approve their own request.", "A user cannot approve or reject their own policy exception.", "A user cannot reject their own policy exception unless a supervisor authorizes it."]) {
    const changed = structuredClone(output);
    changed.businessRules = [clause];
    const failure = reviewDiscoveryFidelity(changed, ledger, coverage, sources);
    assert.ok(failure.errors.length > 0);
    assert.match(failure.errors.join(" "), /Offending clause:.*Source-supported restrictions:/);
  }
});

test("trusted review-gap quotations cannot substitute for visible measurements or precise unresolved-policy gaps", () => {
  const metric = "Median assignment time is 3.8 calendar days.";
  const unknown = "Content deletion and legal holds are not yet confirmed.";
  const sources = [{ id: "S1", text: `${metric} ${unknown}` }];
  const ledger = [
    { id: "METRIC", sourceId: "S1", quote: metric, kind: "fact" as const, statement: metric },
    { id: "UNKNOWN", sourceId: "S1", quote: unknown, kind: "open-question" as const, statement: unknown }
  ];
  const output = product("Manage records with the confirmed controls.");
  output.gaps = [{ id: "TRUSTED-HOLD", title: "Review interpretation", description: `${metric} ${unknown}`, question: "Confirm this source interpretation.", severity: "blocking", sourceIds: ["S1"] }];
  const coverage = ledger.map((item) => ({ evidenceId: item.id, disposition: "gap", storyIds: [], testIds: [], gapIds: ["TRUSTED-HOLD"] }));
  assert.deepEqual(reviewDiscoveryFidelity(output, ledger, coverage, sources).errors, [], "Ordinary user-visible discovery gaps retain their existing coverage behavior.");
  const guarded = reviewDiscoveryFidelity(output, ledger, coverage, sources, new Set(["TRUSTED-HOLD"]));
  assert.match(guarded.errors.join(" "), /quantified source fact/);
  assert.match(guarded.errors.join(" "), /unresolved content deletion|unresolved legal holds/);
});

test("redaction coverage recognizes explicit plural-channel and possessive grammar but not exposure or generic denial", () => {
  const text = "Sensitive requests may be viewed only by assigned service staff. Dashboard summaries and notification subject lines must not expose resident personal details.";
  const sources = [{ id: "S1", text }];
  const ledger = [{ id: "PRIVACY", sourceId: "S1", quote: text, statement: text, kind: "requirement" as const }];
  const coverage = [{ evidenceId: "PRIVACY", disposition: "implemented", storyIds: ["U1"], testIds: ["T1", "T2", "T3", "T4"], gapIds: [] }];
  const output = product(text);
  output.stories[0].testCases = [
    { id: "T1", title: "Assigned access", type: "happy-path", steps: ["Open an assigned sensitive request"], expectedResult: "The assigned staff member can read the request." },
    { id: "T2", title: "Deny unassigned access", type: "negative", steps: ["Open the sensitive request as an unassigned staff member"], expectedResult: "Access is denied and no sensitive request content is disclosed." },
    { id: "T3", title: "Personal details in dashboards", type: "edge", steps: ["Open dashboards containing request summaries"], expectedResult: "Dashboards contain no resident personal details." },
    { id: "T4", title: "Personal details in notifications", type: "edge", steps: ["Send notifications with subject lines"], expectedResult: "Residents' personal details are excluded from notifications." }
  ];
  assert.deepEqual(reviewDiscoveryFidelity(output, ledger, coverage, sources).errors, []);
  for (const expectedResult of [
    "Residents’ personal details are absent from dashboards.",
    "Personal details are removed from dashboards.",
    "Dashboards omit residents' personal details.",
    "Dashboards do not include personal details."
  ]) {
    const changed = structuredClone(output);
    changed.stories[0].testCases[2].expectedResult = expectedResult;
    assert.deepEqual(reviewDiscoveryFidelity(changed, ledger, coverage, sources).errors, []);
  }
  for (const expectedResult of [
    "Residents' personal details are displayed in dashboards.",
    "Personal details privacy is checked.",
    "Access is denied to the viewer role.",
    "Personal details are not removed from dashboards.",
    "Dashboards do not redact personal details."
  ]) {
    const changed = structuredClone(output);
    changed.stories[0].testCases[2].expectedResult = expectedResult;
    const errors = reviewDiscoveryFidelity(changed, ledger, coverage, sources).errors.join(" ");
    assert.match(errors, /dashboard personal-data redaction test/);
    assert.match(errors, /Closest channel tests: title=Personal details in dashboards; expectedResult=/);
    assert.ok(errors.length < 1000);
  }
  const noNegativePrivacy = structuredClone(output);
  noNegativePrivacy.stories[0].testCases[1] = { id: "T2", title: "Missing category", type: "negative", steps: ["Omit the category"], expectedResult: "Category validation appears." };
  assert.match(reviewDiscoveryFidelity(noNegativePrivacy, ledger, coverage, sources).errors.join(" "), /unauthorized sensitive-content access test/);
});

test("compound summaries isolate the self-approval prohibition from permitted rejection and unrelated audit work", () => {
  const rule = "A user cannot approve their own policy exception.";
  const ledger = [{ id: "SELF", sourceId: "S1", quote: rule, statement: rule, kind: "requirement" as const }];
  const output = product(rule);
  output.businessRules = ["Route policy exceptions to authorized approvers, enforce non-empty rationale for approval and rejection, prevent a user from approving their own policy exception, and preserve immutable decision history."];
  output.stories[0].testCases[1] = { id: "T2", title: "Prevent self approval of a policy exception", type: "negative", steps: ["Attempt to approve one's own policy exception"], expectedResult: "Approval is blocked and the exception remains pending." };
  const coverage = [{ evidenceId: "SELF", disposition: "implemented", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] }];
  assert.deepEqual(reviewDiscoveryFidelity(output, ledger, coverage, [{ id: "S1", text: rule }]).errors, []);
  output.businessRules = ["Block unauthorized request deletion, enforce non-empty rationale for approval and rejection, prevent a user from approving their own policy exception, and preserve immutable decision history."];
  assert.deepEqual(reviewDiscoveryFidelity(output, ledger, coverage, [{ id: "S1", text: rule }]).errors, [], "An earlier unrelated restriction cue must not redefine the later self-approval rule.");
  output.businessRules = ["A user cannot approve or reject their own policy exception."];
  assert.ok(reviewDiscoveryFidelity(output, ledger, coverage, [{ id: "S1", text: rule }]).errors.length > 0);
});

test("explicit absence of quoted seeded personal markers proves redaction without repeating the word personal", () => {
  const text = "Dashboard summaries and notification subject lines must not expose resident personal details.";
  const ledger = [{ id: "PRIVACY", sourceId: "S1", quote: text, statement: text, kind: "requirement" as const }];
  const output = product(text);
  output.stories[0].testCases[0] = { id: "T1", title: "Resident personal details in dashboards and notifications", type: "happy-path", steps: ["Seed the resident's personal details as 'Jane Example', \"555-0100\", and \"jane.example@example.test\"", "Inspect the dashboard summary and notification subject line"], expectedResult: "The dashboard summary and notification subject line do not contain 'Jane Example', \"555-0100\", or \"jane.example@example.test\"." };
  const coverage = [{ evidenceId: "PRIVACY", disposition: "implemented", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] }];
  const sources = [{ id: "S1", text }];
  assert.deepEqual(reviewDiscoveryFidelity(output, ledger, coverage, sources).errors, []);
  output.stories[0].testCases[0].steps.push('Select the saved view "Pilot Dashboard".');
  assert.deepEqual(reviewDiscoveryFidelity(output, ledger, coverage, sources).errors, [], "Unrelated UI labels are not seeded personal values that must disappear from output.");
  for (const expectedResult of [
    "The dashboard summary and notification subject line display 'Jane Example'.",
    "The dashboard summary and notification subject line are empty because no request was created.",
    "The dashboard summary and notification subject line do not contain 'Unshared Person'.",
    "The dashboard summary and notification subject line do not contain 'Jane Example'.",
    "Access is denied to the dashboard summary and notification subject line.",
    "The dashboard summary and notification subject line do not contain 'Jane Example', but \"555-0100\" is displayed."
  ]) {
    const changed = structuredClone(output);
    changed.stories[0].testCases[0].expectedResult = expectedResult;
    assert.ok(reviewDiscoveryFidelity(changed, ledger, coverage, sources).errors.some((error) => /personal-data redaction/.test(error)));
  }
});

test("retention boundary coverage accepts observable access but requires the actual source duration in its input", () => {
  const text = "Audit history retention is seven years.";
  const sources = [{ id: "S1", text }];
  const ledger = [{ id: "RETENTION", sourceId: "S1", quote: text, statement: text, kind: "requirement" as const }];
  const coverage = [{ evidenceId: "RETENTION", disposition: "implemented", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] }];
  const output = product(text);
  output.stories[0].testCases[0] = { id: "T1", title: "Audit history retention boundary", type: "happy-path", steps: ["Advance the audit record to immediately before seven years"], expectedResult: "The audit record remains accessible." };
  for (const expectedResult of ["The audit record remains accessible.", "The audit history is queryable.", "The audit record remains retrievable.", "The audit record is not deleted."]) {
    output.stories[0].testCases[0].expectedResult = expectedResult;
    assert.deepEqual(reviewDiscoveryFidelity(output, ledger, coverage, sources).errors, []);
  }
  for (const steps of [["Advance to immediately before five years"], ["Advance to immediately before the retention boundary"]]) {
    const changed = structuredClone(output);
    changed.stories[0].testCases[0].steps = steps;
    const errors = reviewDiscoveryFidelity(changed, ledger, coverage, sources).errors.join(" ");
    assert.match(errors, /source-duration retention boundary test/);
    assert.match(errors, /Closest retention tests: title=.*input=.*expectedResult=/);
    assert.ok(errors.length < 1000);
  }
  const deleted = structuredClone(output);
  deleted.stories[0].testCases[0].expectedResult = "The record is deleted before the boundary and is not accessible.";
  assert.match(reviewDiscoveryFidelity(deleted, ledger, coverage, sources).errors.join(" "), /source-duration retention boundary test/);
});

test("explicit nonachievement metadata can be unlinked context but cannot be implemented or declared achieved", () => {
  const text = "The business outcomes are targets, not achieved results.";
  const sources = [{ id: "S1", text }];
  const ledger = [{ id: "STATUS", sourceId: "S1", quote: text, statement: text, kind: "proposal" as const }];
  const coverage = [{ evidenceId: "STATUS", disposition: "context", storyIds: [], testIds: [], gapIds: [] }];
  assert.deepEqual(reviewDiscoveryFidelity(product(text), ledger, coverage, sources).errors, []);
  assert.ok(reviewDiscoveryFidelity(product(text), ledger, [{ ...coverage[0], disposition: "implemented", storyIds: ["U1"], testIds: ["T1", "T2"] }], sources).errors.length > 0);
  assert.ok(reviewDiscoveryFidelity(product("The business outcomes have been achieved."), ledger, [{ ...coverage[0], disposition: "proposal" }], sources).errors.length > 0);
  const dashboard = "A results dashboard is proposed and not yet approved.";
  assert.ok(reviewDiscoveryFidelity(product(dashboard), [{ ...ledger[0], quote: dashboard, statement: dashboard }], coverage, [{ id: "S1", text: dashboard }]).errors.length > 0, "Results as an implementation noun modifier is not target-status metadata.");
});

test("conditional approval prerequisites create review holds while direct approval of the same proposed metric stays hard", () => {
  const text = "Expansion to twelve regions is proposed after operating-model decisions.";
  const sources = [{ id: "S1", text }];
  const ledger = [{ id: "EXPANSION", sourceId: "S1", quote: text, statement: text, kind: "proposal" as const }];
  const coverage = [{ evidenceId: "EXPANSION", disposition: "proposal", storyIds: [], testIds: [], gapIds: [] }];
  for (const context of ["After confirmed operating-model decisions, expand service delivery to twelve regions.", "Agreed pilot scope informs expansion to twelve regions.", "Expansion to twelve regions requires governance that is confirmed."]) {
    const output = product(text);
    output.features[0].description = context;
    const reviewed = reviewDiscoveryFidelity(output, ledger, coverage, sources);
    assert.deepEqual(reviewed.errors, []);
    assert.ok(reviewed.reviewIssues.some((issue) => issue.evidenceId === "EXPANSION" && issue.sourceId === "S1"));
  }
  for (const context of ["Expansion to twelve regions is approved.", "Expansion to twelve regions has been achieved.", "The approved expansion covers twelve regions."]) {
    const output = product(text);
    output.features[0].description = context;
    assert.match(reviewDiscoveryFidelity(output, ledger, coverage, sources).errors.join(" "), /Offending metric context:/);
  }
});

test("a confirmed prerequisite in the full delivery-approach claim does not approve the proposed delivery itself", () => {
  const statement = "The delivery approach configures and proves a three-region pilot after definition and operating-model decisions.";
  const sources = [{ id: "S1", text: statement }];
  const ledger = [{ id: "E056", sourceId: "S1", quote: statement, statement, kind: "proposal" as const }];
  const coverage = [{ evidenceId: "E056", disposition: "proposal", storyIds: [], testIds: [], gapIds: [] }];
  const output = product(statement);
  output.features[0].description = "The delivery approach configures and proves a three-region pilot after confirmed operating-model decisions.";
  const reviewed = reviewDiscoveryFidelity(output, ledger, coverage, sources);
  assert.deepEqual(reviewed.errors, []);
  assert.ok(reviewed.reviewIssues.some((issue) => issue.evidenceId === "E056" && issue.sourceId === "S1"));
  for (const claim of ["The three-region delivery is approved.", "After confirmed operating-model decisions, the three-region delivery is approved.", "The delivery pilot in three regions is approved after confirmed operating-model decisions."]) {
    output.features[0].description = claim;
    assert.match(reviewDiscoveryFidelity(output, ledger, coverage, sources).errors.join(" "), /presents a proposed target as approved or achieved/);
  }
});

function reviewFutureReporting(context: string, statement = "Cross-region reporting follows once categories and metric definitions are stable.") {
  const value = product(statement);
  value.features[0].description = context;
  const ledger = [{ id: "VD-013", sourceId: "S1", quote: statement, statement, kind: "proposal" as const }];
  const coverage = [{ evidenceId: "VD-013", disposition: "proposal", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] }];
  return reviewDiscoveryFidelity(value, ledger, coverage, [{ id: "S1", text: statement }]);
}

test("the four live VD-013 configuration prerequisites remain source-linked owner holds, not definite reporting approval", () => {
  for (const context of [
    "Show volume, unassigned requests, aging buckets, reassignment rate, and cases/alerts when requests reach 80% of applicable SLA, using confirmed metric definitions.",
    "The story remains needs-input until per-category SLAs, calendars, pause/resume behavior, escalation owner, and metric definitions are confirmed.",
    "Display pilot management dashboard metrics using confirmed definitions",
    "Using confirmed metric definitions, the dashboard displays volume, unassigned requests, aging buckets, reassignment rate, and cases that reach 80% of applicable SLA."
  ]) {
    const result = reviewFutureReporting(context);
    assert.deepEqual(result.errors, [], context);
    assert.ok(result.reviewIssues.some((issue) => issue.evidenceId === "VD-013" && issue.sourceId === "S1"), "An unverified prerequisite must not disappear from human review.");
  }
});

test("a source-defined prerequisite stays distinct even when the output names its dependent reporting proposal", () => {
  for (const context of [
    "Cross-region reporting uses confirmed metric definitions.",
    "Cross-region reporting remains needs-input until categories and metric definitions are confirmed.",
    "The metric definitions are confirmed."
  ]) {
    const result = reviewFutureReporting(context);
    assert.deepEqual(result.errors, [], context);
    assert.ok(result.reviewIssues.some((issue) => issue.evidenceId === "VD-013" && issue.sourceId === "S1"));
  }
});

test("future-source prerequisites cannot hide independent direct reporting approval or achievement", () => {
  for (const context of [
    "Cross-region reporting is approved.",
    "Cross-region reporting has been achieved.",
    "The approved cross-region reporting uses stable definitions.",
    "Using confirmed metric definitions, cross-region reporting is approved.",
    "Cross-region reporting is approved using confirmed metric definitions.",
    "Cross-region reporting remains needs-input until categories and metric definitions are confirmed; cross-region reporting is approved.",
    "Cross-region reporting remains needs-input until categories and metric definitions are confirmed, and cross-region reporting is approved.",
    "Cross-region reporting remains needs-input until categories and metric definitions are confirmed but cross-region reporting has been achieved."
  ]) assert.match(reviewFutureReporting(context).errors.join(" "), /VD-013 presents proposed outcomes as approved or achieved/, context);
});

test("a one-word future proposal subject does not inherit its prerequisite as the claim head", () => {
  const statement = "Reporting follows once metric definitions are stable.";
  for (const context of ["Reporting is approved.", "Reporting has been achieved.", "Using confirmed metric definitions, reporting is approved."]) {
    assert.match(reviewFutureReporting(context, statement).errors.join(" "), /VD-013 presents proposed outcomes as approved or achieved/, context);
  }
  const conditional = reviewFutureReporting("If reporting is approved, a future reporting configuration can be assessed.", statement);
  assert.deepEqual(conditional.errors, []);
  assert.ok(conditional.reviewIssues.some((issue) => issue.evidenceId === "VD-013"));
});

test("the future-prerequisite distinction does not exempt independent definition proposals or achieved numeric targets", () => {
  for (const context of ["Metric definitions are confirmed.", "Using confirmed metric definitions, display the management view."]) {
    assert.match(reviewFutureReporting(context, "Metric definitions are proposed for owner review.").errors.join(" "), /VD-013 presents proposed outcomes as approved or achieved/);
  }
  const statement = "The request-to-assignment target under 4 business hours is proposed.";
  assert.match(reviewFutureReporting("Using confirmed definitions, the request-to-assignment target under 4 business hours has been achieved.", statement).errors.join(" "), /VD-013 presents a proposed target as approved or achieved/);
});
