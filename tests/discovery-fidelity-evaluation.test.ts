import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryEvidenceLedger, reviewDiscoveryFidelity } from "../src/lib/discovery-fidelity.ts";
import { reviewDiscoveryIntegrity } from "../src/lib/discovery-quality.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

type Evidence = { id: string; sourceId: string; quote: string; kind: "fact" | "requirement" | "proposal" | "open-question"; statement: string };
type Coverage = { evidenceId: string; disposition: "implemented" | "context" | "proposal" | "gap"; storyIds: string[]; testIds: string[]; gapIds: string[] };

function definition(sourceText: string): DiscoverySynthesis {
  return {
    executiveSummary: sourceText,
    evidenceSummary: sourceText,
    capabilities: ["Process service requests with evidence-backed controls."],
    painPoints: ["Current service requests need consistent handling."],
    businessRules: [], assumptions: [], gaps: [], readinessScore: 70,
    readinessNarrative: "Review the evidence before implementation commitment.",
    sourceCount: 1, generatedAt: "2026-10-19T00:00:00.000Z", provider: "openai",
    roadmap: [{ horizon: "Now", title: "Controlled requests", outcome: "Apply confirmed controls", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "E1", title: "Requests", objective: "Apply confirmed controls", featureIds: ["F1"], sourceIds: ["SRC1"] }],
    features: [{ id: "F1", epicId: "E1", title: "Request controls", description: "Implement the confirmed controls", outcome: "Consistent request handling", priority: "must", sourceIds: ["SRC1"] }],
    stories: [{
      id: "U1", epicId: "E1", featureId: "F1", title: "Controlled request handling",
      story: "As a coordinator, I want confirmed controls enforced so that requests follow approved policy.",
      acceptanceCriteria: ["Confirmed request rules are applied.", "Invalid operations return a validation result without changing the request."],
      sourceIds: ["SRC1"], readiness: "needs-input",
      testCases: [
        { id: "T1", title: "Valid operation", type: "happy-path", steps: ["Configure the confirmed rule", "Perform the permitted operation"], expectedResult: "The permitted operation completes." },
        { id: "T2", title: "Invalid operation", type: "negative", steps: ["Perform an invalid operation"], expectedResult: "Validation prevents the operation." }
      ]
    }]
  };
}

function row(evidenceId: string, disposition: Coverage["disposition"] = "context"): Coverage {
  return { evidenceId, disposition, storyIds: disposition === "implemented" ? ["U1"] : [], testIds: disposition === "implemented" ? ["T1", "T2"] : [], gapIds: [] };
}

function replaceVisible(synthesis: DiscoverySynthesis, before: string, after: string): DiscoverySynthesis {
  return JSON.parse(JSON.stringify(synthesis).replaceAll(before, after)) as DiscoverySynthesis;
}

function review(synthesis: DiscoverySynthesis, ledger: Evidence[], coverage: Coverage[], text: string) {
  return reviewDiscoveryFidelity(synthesis, ledger, coverage, [{ id: "SRC1", text }]);
}

const metricQuotes = [
  "Median request-to-assignment time is 3.8 calendar days.",
  "Requests reassigned after initial routing account for 27% of requests.",
  "Requests missing a required detail at triage account for 31% of requests.",
  "A target below 4 business hours is proposed and requires calendar approval."
];
const metricSource = metricQuotes.join(" ");
const metricLedger: Evidence[] = metricQuotes.map((quote, index) => ({
  id: `M${index + 1}`, sourceId: "SRC1", quote,
  kind: index === 3 ? "proposal" : "fact", statement: quote
}));
const metricCoverage = metricLedger.map((item) => row(item.id, item.kind === "proposal" ? "proposal" : "context"));

test("evidence ledger accepts verbatim evidence and rejects fabricated quotations, unknown sources, and duplicate IDs", () => {
  const sources = [{ id: "SRC1", text: metricSource }];
  assert.deepEqual(reviewDiscoveryEvidenceLedger(metricLedger, sources).errors, []);
  for (const mutate of [
    (ledger: Evidence[]) => { ledger[0].quote = "Average request-to-assignment time is 3.8 business days."; },
    (ledger: Evidence[]) => { ledger[0].statement = ledger[0].statement.replace("Median", "Average"); },
    (ledger: Evidence[]) => { ledger[0].statement = ledger[0].statement.replace("calendar days", "business days"); },
    (ledger: Evidence[]) => { ledger[0].sourceId = "UNKNOWN"; },
    (ledger: Evidence[]) => { ledger[1].id = ledger[0].id; }
  ]) {
    const ledger = structuredClone(metricLedger);
    mutate(ledger);
    assert.ok(reviewDiscoveryEvidenceLedger(ledger, sources).errors.length > 0,
      `Invalid ledger mutation must be rejected: ${JSON.stringify(ledger[0])}`);
  }
});

test("one mixed table quotation can support distinct atomic baseline and proposed-target claims without merging their status", () => {
  const quote = "Requests reassigned after initial routing | 27% | Proposed target below 10%; product owner to confirm";
  const source = `Measure | Current baseline | Target or decision\n${quote}`;
  const ledger: Evidence[] = [
    { id: "BASELINE", sourceId: "SRC1", quote, kind: "fact", statement: "Requests reassigned after initial routing account for 27% of requests." },
    { id: "TARGET", sourceId: "SRC1", quote, kind: "proposal", statement: "A target below 10% reassignment is proposed and requires product-owner confirmation." }
  ];
  const value = definition(ledger.map((item) => item.statement).join(" "));
  value.assumptions = [ledger[1].statement];
  const coverage = [row("BASELINE"), row("TARGET", "proposal")];
  assert.deepEqual(reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: source }]).errors, []);
  assert.deepEqual(review(value, ledger, coverage, source).errors, []);

  for (const omittedId of ["BASELINE", "TARGET"]) {
    const changed = ledger.filter((item) => item.id !== omittedId);
    assert.ok(reviewDiscoveryEvidenceLedger(changed, [{ id: "SRC1", text: source }]).errors.length > 0,
      "A broad quote containing both values does not replace an omitted atomic measurement statement.");
  }
  const changedComparator = structuredClone(ledger);
  changedComparator[1].statement = changedComparator[1].statement.replace("below 10%", "at most 10%");
  assert.ok(reviewDiscoveryEvidenceLedger(changedComparator, [{ id: "SRC1", text: source }]).errors.length > 0,
    "Atomicity does not permit changing a strict target comparator.");
});

test("a source-backed fact reporting a proposed target normalizes cautiously without relaxing final proposal or readiness checks", () => {
  const text = "A reassignment target below 10% is proposed and awaits sponsor approval.";
  const ledger: Evidence[] = [{ id: "P1", sourceId: "SRC1", quote: text, kind: "fact", statement: text }];
  const value = definition(text);
  value.assumptions = [text];
  const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text }]);
  assert.deepEqual(reviewed.errors, []);
  assert.equal(reviewed.ledger[0].kind, "proposal");
  assert.equal(reviewed.ledger[0].quote, text);
  assert.equal(reviewed.ledger[0].statement, text);
  assert.equal(ledger[0].kind, "fact", "Normalization must not mutate the caller's model envelope.");
  assert.deepEqual(reviewDiscoveryFidelity(value, reviewed.ledger, [row("P1", "proposal")], [{ id: "SRC1", text }]).errors, []);
  assert.ok(reviewDiscoveryFidelity(value, reviewed.ledger, [row("P1", "context")], [{ id: "SRC1", text }]).errors.length > 0);

  value.stories[0].readiness = "ready";
  const mappedProposal = [{ ...row("P1", "proposal"), storyIds: ["U1"], testIds: ["T1", "T2"] }];
  assert.ok(reviewDiscoveryFidelity(value, reviewed.ledger, mappedProposal, [{ id: "SRC1", text }]).errors.length > 0,
    "A normalized proposal must still prevent a dependent story from being declared ready.");
});

test("an explicitly unconfirmed decision normalizes to an open question and still requires a precise gap", () => {
  const text = "The pilot approval authority is unconfirmed and must be decided by the sponsor.";
  const ledger: Evidence[] = [{ id: "D1", sourceId: "SRC1", quote: text, kind: "fact", statement: text }];
  const value = definition(text);
  value.gaps = [{ id: "G1", title: "Pilot approval authority", severity: "blocking", description: text, question: "Who may approve policy exceptions in the pilot?", sourceIds: ["SRC1"] }];
  const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text }]);
  assert.deepEqual(reviewed.errors, []);
  assert.equal(reviewed.ledger[0].kind, "open-question");
  const coverage = [{ ...row("D1", "gap"), gapIds: ["G1"] }];
  assert.deepEqual(reviewDiscoveryFidelity(value, reviewed.ledger, coverage, [{ id: "SRC1", text }]).errors, []);
  assert.ok(reviewDiscoveryFidelity(value, reviewed.ledger, [row("D1", "gap")], [{ id: "SRC1", text }]).errors.length > 0);
});

test("a source obligation to decide SLA policy is not mistaken for settled SLA policy", () => {
  const quote = "Exact per-category SLA, business calendar, pause/resume behavior, and escalation owner require decisions.";
  const statement = "The business calendar and SLA calculation rules remain unconfirmed.";
  const ledger: Evidence[] = [{ id: "D1", sourceId: "SRC1", quote, kind: "open-question", statement }];
  const value = definition(statement);
  value.gaps = [{ id: "G1", title: "SLA calendar and pause/resume rules", severity: "blocking", description: quote, question: "Which business calendar, pause/resume rules, and escalation owner apply to the per-category SLA?", sourceIds: ["SRC1"] }];
  const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: quote }]);
  assert.deepEqual(reviewed.errors, []);
  assert.equal(reviewed.ledger[0].kind, "open-question");
  assert.deepEqual(reviewDiscoveryFidelity(value, reviewed.ledger, [{ ...row("D1", "gap"), gapIds: ["G1"] }], [{ id: "SRC1", text: quote }]).errors, []);
});

test("a sponsor-confirmation prerequisite backed by unresolved authority remains a decision gap, not settled authority", () => {
  const quote = "The proposed pilot design uses one compliance administrator, but the executive sponsor has not approved cross-region approval authority.";
  const statement = "The executive sponsor must confirm cross-region approval authority before the governed approval story is committed.";
  const ledger: Evidence[] = [{ id: "A1", sourceId: "SRC1", quote, kind: "requirement", statement }];
  const value = definition(statement);
  value.gaps = [{ id: "G1", title: "Cross-region approval authority", severity: "blocking", description: quote, question: "Who does the executive sponsor authorize to approve policy exceptions across the pilot regions?", sourceIds: ["SRC1"] }];
  const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: quote }]);
  assert.deepEqual(reviewed.errors, []);
  assert.equal(reviewed.ledger[0].kind, "open-question");
  assert.equal(reviewed.ledger[0].statement, statement);
  assert.deepEqual(reviewDiscoveryFidelity(value, reviewed.ledger, [{ ...row("A1", "gap"), gapIds: ["G1"] }], [{ id: "SRC1", text: quote }]).errors, []);
  value.stories[0].readiness = "ready";
  assert.ok(reviewDiscoveryFidelity(value, reviewed.ledger, [{ ...row("A1", "gap"), storyIds: ["U1"], gapIds: ["G1"] }], [{ id: "SRC1", text: quote }]).errors.length > 0,
    "The decision prerequisite still prevents a dependent story from being marked ready.");
});

test("an open pilot-category decision remains open when faithfully phrased as not decided", () => {
  const quote = "Required pilot categories and their SLA targets are an open decision.";
  const statement = "Required pilot categories and their SLA targets are not decided.";
  const ledger: Evidence[] = [{ id: "E022", sourceId: "SRC1", quote, kind: "open-question", statement }];
  const value = definition(statement);
  value.gaps = [{ id: "G1", title: "Pilot categories and SLA targets", severity: "blocking", description: statement, question: "Which pilot categories and corresponding SLA targets are approved?", sourceIds: ["SRC1"] }];
  const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: quote }]);
  assert.deepEqual(reviewed.errors, []);
  assert.equal(reviewed.ledger[0].kind, "open-question");
  assert.deepEqual(reviewDiscoveryFidelity(value, reviewed.ledger, [{ ...row("E022", "gap"), gapIds: ["G1"] }], [{ id: "SRC1", text: quote }]).errors, []);
});

test("indicative planning horizons explicitly described as not committed are not promoted to release commitments", () => {
  const quote = "Indicative planning windows: 0–30 days validate blueprint and policy, 31–60 days pilot configuration and validation, 61–120 days assess scale-up. These are planning horizons, not committed release dates.";
  const statements = [
    "The 0–30 day horizon is for validating blueprint and policy, not a committed release date.",
    "The 31–60 day horizon is for pilot configuration and validation, not a committed release date.",
    "The 61–120 day horizon is for assessing scale-up, not a committed release date."
  ];
  const ledger: Evidence[] = statements.map((statement, index) => ({ id: `E${62 + index}`, sourceId: "SRC1", quote, kind: "proposal", statement }));
  const value = definition(statements.join(" "));
  value.assumptions = statements;
  const coverage = ledger.map((item) => row(item.id, "proposal"));
  const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: quote }]);
  assert.deepEqual(reviewed.errors, []);
  assert.deepEqual(reviewDiscoveryFidelity(value, reviewed.ledger, coverage, [{ id: "SRC1", text: quote }]).errors, []);
  const committed = replaceVisible(value, "not a committed release date", "a committed release date");
  assert.ok(reviewDiscoveryFidelity(committed, reviewed.ledger, coverage, [{ id: "SRC1", text: quote }]).errors.length > 0,
    "Removing the explicit noncommitment must still be rejected.");
});

test("a metric statement may retain its same-source baseline period from the header without importing unrelated context", () => {
  const header = "FICTIONAL TRAINING WORKBOOK — Request volume and aging, eight-week baseline.";
  const quote = "Median request-to-assignment time | 3.8 calendar days";
  const source = `${header}\n${quote}`;
  const ledger: Evidence[] = [
    { id: "HEADER", sourceId: "SRC1", quote: header, kind: "fact", statement: "The request-volume baseline observation period is eight weeks." },
    { id: "E029", sourceId: "SRC1", quote, kind: "fact", statement: "The median request-to-assignment time is 3.8 calendar days during the eight-week baseline." }
  ];
  assert.deepEqual(reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: source }]).errors, []);

  const differentSource = structuredClone(ledger);
  differentSource[0].sourceId = "SRC2";
  assert.ok(reviewDiscoveryEvidenceLedger(differentSource, [{ id: "SRC1", text: quote }, { id: "SRC2", text: header }]).errors.length > 0,
    "A period from a different source cannot silently qualify this measurement.");

  const unrelatedHeader = "A governance checkpoint occurs after eight weeks.";
  const unrelatedContext = structuredClone(ledger);
  unrelatedContext[0] = { id: "HEADER", sourceId: "SRC1", quote: unrelatedHeader, kind: "fact", statement: unrelatedHeader };
  assert.ok(reviewDiscoveryEvidenceLedger(unrelatedContext, [{ id: "SRC1", text: `${unrelatedHeader}\n${quote}` }]).errors.length > 0,
    "An unrelated same-source duration is not evidence of the measurement's baseline period.");
});

test("region counts retain their unit through pilot, selected, and named qualifiers without treating offices as regions", () => {
  const quote = "The pilot will cover three regions.";
  for (const qualifier of ["pilot", "selected", "named"]) {
    const statement = `Delivery begins in three ${qualifier} regions.`;
    const ledger: Evidence[] = [{ id: "REGIONS", sourceId: "SRC1", quote, kind: "fact", statement }];
    const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: quote }]);
    assert.deepEqual(reviewed.errors, []);
    const value = definition(statement);
    assert.deepEqual(reviewDiscoveryFidelity(value, reviewed.ledger, [row("REGIONS")], [{ id: "SRC1", text: quote }]).errors, []);
    for (const changed of [
      replaceVisible(value, `three ${qualifier} regions`, `four ${qualifier} regions`),
      replaceVisible(value, `three ${qualifier} regions`, `three ${qualifier} offices`)
    ]) {
      assert.ok(reviewDiscoveryFidelity(changed, reviewed.ledger, [row("REGIONS")], [{ id: "SRC1", text: quote }]).errors.length > 0,
        "A qualifier does not permit changing the count or substituting a different organizational unit.");
    }
  }
});

test("a target explicitly described as not achieved is distinct from a claim of achieved results", () => {
  const quote = "An assignment-time target under 4 business hours is proposed. Outcomes are targets, not achieved results.";
  const ledger: Evidence[] = [{ id: "TARGET", sourceId: "SRC1", quote, kind: "proposal", statement: "An assignment-time target under 4 business hours is proposed." }];
  const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: quote }]);
  assert.deepEqual(reviewed.errors, []);
  for (const qualification of ["not achieved", "not an achieved result", "not the achieved outcome"]) {
    const value = definition(`The assignment-time target under 4 business hours is ${qualification}.`);
    assert.deepEqual(reviewDiscoveryFidelity(value, reviewed.ledger, [row("TARGET", "proposal")], [{ id: "SRC1", text: quote }]).errors, []);
  }
  const achieved = definition("The assignment-time target under 4 business hours has been achieved.");
  assert.ok(reviewDiscoveryFidelity(achieved, reviewed.ledger, [row("TARGET", "proposal")], [{ id: "SRC1", text: quote }]).errors.length > 0,
    "An actual achieved-outcome claim remains a hard contradiction of a merely proposed target.");
});

test("confirmation required for each record deletion is a confirmed workflow rule, not an unresolved product decision", () => {
  for (const text of [
    "Record deletion requires confirmation from the record owner before the delete operation proceeds.",
    "A record owner must confirm each deletion request before the delete operation proceeds."
  ]) {
    const ledger: Evidence[] = [{ id: "R1", sourceId: "SRC1", quote: text, kind: "requirement", statement: text }];
    const value = definition(text);
    value.businessRules = [text];
    value.stories[0].acceptanceCriteria = [text, "A deletion without record-owner confirmation leaves the record unchanged."];
    value.stories[0].readiness = "ready";
    value.stories[0].testCases = [
      { id: "T1", title: "Delete after record-owner confirmation", type: "happy-path", steps: ["Request record deletion", "Confirm the deletion as the record owner", "Complete the delete operation"], expectedResult: "The confirmed record is deleted." },
      { id: "T2", title: "Block deletion without record-owner confirmation", type: "negative", steps: ["Request record deletion", "Do not obtain record-owner confirmation", "Attempt the delete operation"], expectedResult: "The operation is blocked and the record remains unchanged." }
    ];
    const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text }]);
    assert.deepEqual(reviewed.errors, []);
    assert.equal(reviewed.ledger[0].kind, "requirement");
    assert.deepEqual(reviewDiscoveryFidelity(value, reviewed.ledger, [row("R1", "implemented")], [{ id: "SRC1", text }]).errors, []);
  }
});

test("approved proposal and candidate business nouns do not make a confirmed workflow obligation uncertain", () => {
  for (const text of [
    "An approved grant proposal must be archived before the application is closed.",
    "A candidate must submit an application before an interview is scheduled."
  ]) {
    const ledger: Evidence[] = [{ id: "R1", sourceId: "SRC1", quote: text, kind: "requirement", statement: text }];
    const value = definition(text);
    value.businessRules = [text];
    value.stories[0].acceptanceCriteria = [text, "The workflow is blocked when its confirmed prerequisite is missing."];
    value.stories[0].readiness = "ready";
    const reviewed = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text }]);
    assert.deepEqual(reviewed.errors, []);
    assert.equal(reviewed.ledger[0].kind, "requirement");
    assert.deepEqual(reviewDiscoveryFidelity(value, reviewed.ledger, [row("R1", "implemented")], [{ id: "SRC1", text }]).errors, []);
  }
});

test("a proposed authority rewritten as settled cannot be repaired merely by relabeling internal metadata", () => {
  const quote = "A single compliance administrator is proposed to approve exceptions across the pilot regions; sponsor approval is pending.";
  for (const kind of ["fact", "requirement"] as const) {
    const ledger: Evidence[] = [{ id: "A1", sourceId: "SRC1", quote, kind, statement: "A single compliance administrator is authorized to approve exceptions across the pilot regions." }];
    assert.ok(reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: quote }]).errors.length > 0,
      "Settled authority is not supported by a source that only proposes it.");
  }
  const confirmedQuote = "Reassignments require a reason.";
  const inventedProposal: Evidence[] = [{ id: "R1", sourceId: "SRC1", quote: confirmedQuote, kind: "requirement", statement: "A reassignment reason is proposed as an optional workflow step." }];
  assert.ok(reviewDiscoveryEvidenceLedger(inventedProposal, [{ id: "SRC1", text: confirmedQuote }]).errors.length > 0,
    "A confirmed source obligation must not become optional because the model inserted a proposal qualifier.");
});

test("ambiguous authority alignment produces source-linked review issues without claiming an explicit approval contradiction", () => {
  const quote = "One compliance administrator is proposed to pilot approvals; sponsor approval pending.";
  const statement = "One compliance administrator manages pilot approvals.";
  const ledger: Evidence[] = [{ id: "A1", sourceId: "SRC1", quote, kind: "fact", statement }];
  const sources = [{ id: "SRC1", text: quote }];
  const reviewed = reviewDiscoveryEvidenceLedger(ledger, sources);
  assert.deepEqual(reviewed.errors, []);
  assert.ok(reviewed.reviewIssues.some((issue) => issue.evidenceId === "A1" && issue.sourceId === "SRC1" && issue.message.trim().length > 0));
  assert.equal(reviewed.ledger[0].quote, quote);
  assert.equal(reviewed.ledger[0].statement, statement);
  const value = definition(statement);
  const final = reviewDiscoveryFidelity(value, reviewed.ledger, [row("A1")], sources);
  assert.deepEqual(final.errors, []);
  assert.ok(final.reviewIssues.some((issue) => issue.evidenceId === "A1" && issue.sourceId === "SRC1"),
    "Final validation must preserve the review issue so the service can impose its provisional hold.");

  const explicitApproval = [{ ...ledger[0], statement: "One compliance administrator is authorized to manage pilot approvals." }];
  assert.ok(reviewDiscoveryEvidenceLedger(explicitApproval, sources).errors.length > 0,
    "An explicit claim of approved authority remains a hard failure, not a review warning.");
});

test("metric fidelity accepts exact baselines but rejects changed statistic, calendar basis, and omitted quantitative facts", () => {
  const valid = definition(metricSource);
  valid.assumptions = [metricQuotes[3]];
  assert.deepEqual(review(valid, metricLedger, metricCoverage, metricSource).errors, []);
  const adversarial = [
    replaceVisible(valid, "Median", "Average"),
    replaceVisible(valid, "3.8 calendar days", "3.8 business days"),
    replaceVisible(valid, metricQuotes[1], ""),
    replaceVisible(valid, "31%", "13%")
  ];
  for (const output of adversarial) {
    assert.deepEqual(reviewDiscoveryIntegrity(output, ["SRC1"]).errors, [], "The structural-only baseline accepts this semantic defect.");
    assert.ok(review(output, metricLedger, metricCoverage, metricSource).errors.length > 0,
      "Valid citations and hierarchy must not excuse changed or missing source metrics.");
  }
});

test("omitting a source metric from both the ledger and coverage cannot conceal its loss", () => {
  const ledger = metricLedger.filter((item) => item.id !== "M2");
  const coverage = metricCoverage.filter((item) => item.evidenceId !== "M2");
  const changed = definition(metricSource.replace(metricQuotes[1], ""));
  changed.assumptions = [metricQuotes[3]];
  const ledgerReview = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: metricSource }]);
  const fidelityReview = review(changed, ledger, coverage, metricSource);
  assert.ok(ledgerReview.errors.length + fidelityReview.errors.length > 0,
    "Completeness must be checked against source evidence, not only against model-selected ledger rows.");
});

test("a selectively shortened source quote cannot strip the statistic before a metric is rewritten", () => {
  const ledger = structuredClone(metricLedger);
  ledger[0].quote = "3.8 calendar days";
  ledger[0].statement = "Average request-to-assignment time is 3.8 calendar days.";
  const changed = replaceVisible(definition(metricSource), "Median", "Average");
  changed.assumptions = [metricQuotes[3]];
  const ledgerReview = reviewDiscoveryEvidenceLedger(ledger, [{ id: "SRC1", text: metricSource }]);
  const fidelityReview = review(changed, ledger, metricCoverage, metricSource);
  assert.ok(ledgerReview.errors.length + fidelityReview.errors.length > 0,
    "The original source's statistic cannot be discarded by choosing a narrower but technically verbatim quote.");
});

test("separate supported metrics can share a value without inheriting each other's statistic or calendar basis", () => {
  const assignment = "Median request-to-assignment time is 3.8 calendar days.";
  const completion = "Average request-to-completion time is 3.8 business days.";
  const value = definition(`${assignment} ${completion}`);
  value.sourceCount = 2;
  const ledger: Evidence[] = [
    { id: "M1", sourceId: "SRC1", quote: assignment, kind: "fact", statement: assignment },
    { id: "M2", sourceId: "SRC2", quote: completion, kind: "fact", statement: completion }
  ];
  assert.deepEqual(reviewDiscoveryFidelity(value, ledger, [row("M1"), row("M2")], [{ id: "SRC1", text: assignment }, { id: "SRC2", text: completion }]).errors, []);
});

test("a proposed target cannot become an approved or achieved fact merely because the coverage matrix claims it", () => {
  const valid = definition(metricSource);
  valid.assumptions = [metricQuotes[3]];
  assert.deepEqual(review(valid, metricLedger, metricCoverage, metricSource).errors, []);
  const changed = replaceVisible(valid, metricQuotes[3], "The approved target below 4 business hours has been achieved.");
  const falseCoverage = structuredClone(metricCoverage);
  falseCoverage[3] = row("M4", "context");
  assert.deepEqual(reviewDiscoveryIntegrity(changed, ["SRC1"]).errors, []);
  assert.ok(review(changed, metricLedger, falseCoverage, metricSource).errors.length > 0);
});

const selfRule = "A user cannot approve their own policy exception.";
const selfLedger: Evidence[] = [{ id: "R1", sourceId: "SRC1", quote: selfRule, kind: "requirement", statement: selfRule }];

function selfApprovalDefinition() {
  const value = definition(selfRule);
  value.businessRules = [selfRule];
  value.stories[0].title = "Enforce policy-exception self-approval restriction";
  value.stories[0].story = "As a compliance approver, I want approval of my own policy exception blocked so that the confirmed separation-of-duties rule is enforced.";
  value.stories[0].acceptanceCriteria = [
    "An authorized approver may approve a policy exception raised by another user.",
    selfRule
  ];
  value.stories[0].testCases = [
    { id: "T1", title: "Approve another user's policy exception", type: "happy-path", steps: ["Create a policy exception as User A", "Sign in as authorized approver User B", "Approve User A's policy exception"], expectedResult: "The approval is recorded." },
    { id: "T2", title: "Block self-approval of a policy exception", type: "negative", steps: ["Create a policy exception as User A", "Sign in as authorized approver User A", "Attempt to approve the same policy exception"], expectedResult: "Approval is blocked and the policy exception remains pending." }
  ];
  return value;
}

test("self-approval fidelity preserves the source's action and object scope rather than broadening policy", () => {
  const valid = selfApprovalDefinition();
  const coverage = [row("R1", "implemented")];
  assert.deepEqual(review(valid, selfLedger, coverage, selfRule).errors, []);
  for (const [before, after] of [
    ["cannot approve their own policy exception", "cannot approve or reject their own policy exception"],
    ["policy exception", "request"]
  ]) {
    const changed = replaceVisible(valid, before, after);
    assert.deepEqual(reviewDiscoveryIntegrity(changed, ["SRC1"]).errors, []);
    assert.ok(review(changed, selfLedger, coverage, selfRule).errors.length > 0,
      "A restriction must not gain a new prohibited action or a broader object scope.");
  }
});

test("same-head self-policy shorthand becomes a final source-linked review issue while broader objects and new prohibited actions remain hard", () => {
  const value = selfApprovalDefinition();
  value.stories[0].acceptanceCriteria[1] = "A user cannot approve their own exception.";
  const result = review(value, selfLedger, [row("R1", "implemented")], selfRule);
  assert.deepEqual(result.errors, []);
  assert.ok(result.reviewIssues.some((issue) => issue.evidenceId === "R1" && issue.sourceId === "SRC1" && /own exception/.test(issue.message)),
    "The final issue must identify both the evidence and the ambiguous visible clause for the service review hold.");
  const unrelatedFact = "Each request has a reference.";
  const withContext: Evidence[] = [{ id: "UNRELATED", sourceId: "SRC1", quote: unrelatedFact, kind: "fact", statement: unrelatedFact }, ...selfLedger];
  const multiClaim = reviewDiscoveryFidelity(value, withContext, [row("UNRELATED"), row("R1", "implemented")], [{ id: "SRC1", text: `${unrelatedFact} ${selfRule}` }]);
  assert.deepEqual(multiClaim.errors, []);
  assert.ok(multiClaim.reviewIssues.some((issue) => issue.evidenceId === "R1" && issue.sourceId === "SRC1"),
    "The review hold must cite the actual policy assertion rather than an unrelated first assertion from the same source.");
  for (const clause of [
    "A user cannot approve their own request.",
    "A user cannot approve or reject their own policy exception."
  ]) {
    const changed = selfApprovalDefinition();
    changed.stories[0].acceptanceCriteria[1] = clause;
    assert.ok(review(changed, selfLedger, [row("R1", "implemented")], selfRule).errors.length > 0,
      "A genuinely broader object or an added rejection prohibition cannot be downgraded to a review warning.");
  }
});

test("a generic negative test does not satisfy an explicit self-approval scenario", () => {
  const valid = selfApprovalDefinition();
  const coverage = [row("R1", "implemented")];
  assert.deepEqual(review(valid, selfLedger, coverage, selfRule).errors, []);
  valid.stories[0].testCases[1] = {
    id: "T2", title: "Required category is missing", type: "negative",
    steps: ["Omit the service category", "Submit the request"], expectedResult: "Submission is rejected with a category validation message."
  };
  assert.deepEqual(reviewDiscoveryIntegrity(valid, ["SRC1"]).errors, []);
  assert.ok(review(valid, selfLedger, coverage, selfRule).errors.length > 0);
});

test("rejecting an unauthorized self-approval attempt is not a new prohibition on policy-exception rejection", () => {
  const value = selfApprovalDefinition();
  value.stories[0].testCases[1].expectedResult = "The self-approval attempt is rejected and no approval decision is recorded.";
  assert.deepEqual(review(value, selfLedger, [row("R1", "implemented")], selfRule).errors, []);
});

test("distinct source-backed self-decision rules do not falsely broaden each other's scope", () => {
  const publicationRule = "A user cannot publish their own compliance report.";
  const value = selfApprovalDefinition();
  value.executiveSummary = `${selfRule} ${publicationRule}`;
  value.evidenceSummary = value.executiveSummary;
  value.businessRules.push(publicationRule);
  value.sourceCount = 2;
  value.epics[0].sourceIds.push("SRC2");
  value.features[0].sourceIds.push("SRC2");
  value.stories.push({
    id: "U2", epicId: "E1", featureId: "F1", title: "Enforce compliance-report publication separation",
    story: "As a compliance reviewer, I want self-publication of my compliance report prevented so that the confirmed publication policy is enforced.",
    acceptanceCriteria: ["An authorized reviewer can publish a compliance report authored by another user.", publicationRule],
    sourceIds: ["SRC2"], readiness: "needs-input",
    testCases: [
      { id: "T3", title: "Publish another user's compliance report", type: "happy-path", steps: ["Create a compliance report as User A", "Sign in as authorized reviewer User B", "Publish User A's report"], expectedResult: "The compliance report is published." },
      { id: "T4", title: "Block self-publishing of a compliance report", type: "negative", steps: ["Create a compliance report as User A", "Attempt to publish the report as the same user"], expectedResult: "Publication is blocked and the report remains unpublished." }
    ]
  });
  const ledger: Evidence[] = [...selfLedger, { id: "R2", sourceId: "SRC2", quote: publicationRule, kind: "requirement", statement: publicationRule }];
  const coverage: Coverage[] = [row("R1", "implemented"), { evidenceId: "R2", disposition: "implemented", storyIds: ["U2"], testIds: ["T3", "T4"], gapIds: [] }];
  assert.deepEqual(reviewDiscoveryIntegrity(value, ["SRC1", "SRC2"]).errors, []);
  assert.deepEqual(reviewDiscoveryFidelity(value, ledger, coverage, [{ id: "SRC1", text: selfRule }, { id: "SRC2", text: publicationRule }]).errors, []);
});

test("coverage references must resolve and source-backed obligations cannot disappear behind a claimed matrix row", () => {
  const valid = selfApprovalDefinition();
  const coverage = [row("R1", "implemented")];
  assert.deepEqual(review(valid, selfLedger, coverage, selfRule).errors, []);
  for (const changed of [
    [],
    [{ ...coverage[0], storyIds: ["UNKNOWN"] }],
    [{ ...coverage[0], testIds: ["UNKNOWN"] }],
    [coverage[0], coverage[0]],
    [{ ...coverage[0], evidenceId: "UNKNOWN" }]
  ]) {
    assert.ok(review(valid, selfLedger, changed, selfRule).errors.length > 0);
  }
});

function redactionDefinition(dashboardResult: string, notificationResult: string) {
  const text = "Dashboard summaries and notification subject lines must not expose resident personal details.";
  const ledger: Evidence[] = [{ id: "REDACTION", sourceId: "SRC1", quote: text, kind: "requirement", statement: text }];
  const value = definition(text);
  value.businessRules = [text];
  value.stories[0].acceptanceCriteria = ["Dashboard summaries omit resident personal details.", "Notification subject lines omit resident personal details."];
  value.stories[0].testCases = [
    { id: "T1", title: "Privacy-safe dashboards", type: "happy-path", steps: ["Create a request containing resident personal details", "Open dashboards as an authorized operations leader"], expectedResult: dashboardResult },
    { id: "T2", title: "Privacy-safe notifications", type: "edge", steps: ["Create a request containing resident personal details", "Trigger status notifications", "Inspect notifications' subject lines"], expectedResult: notificationResult }
  ];
  return { value, ledger, text, coverage: [row("REDACTION", "implemented")] };
}

test("redaction outcomes accept explicit no-resident-details and excluded-details grammar with plural channels", () => {
  for (const [dashboardResult, notificationResult] of [
    ["Dashboards show no resident personal details.", "Notifications contain no resident personal details in their subject lines."],
    ["Personal details are excluded from dashboards.", "Resident personal details are excluded from notifications' subject lines."]
  ]) {
    const fixture = redactionDefinition(dashboardResult, notificationResult);
    assert.deepEqual(review(fixture.value, fixture.ledger, fixture.coverage, fixture.text).errors, []);
  }
});

test("redaction requires a nonexposure result rather than actual exposure, a privacy mention, or generic role denial", () => {
  const fixture = redactionDefinition("Dashboards show no resident personal details.", "Notifications contain no resident personal details in their subject lines.");
  assert.deepEqual(review(fixture.value, fixture.ledger, fixture.coverage, fixture.text).errors, []);
  for (const index of [0, 1]) {
    for (const expectedResult of [
      "Resident personal details are displayed in the summary.",
      "Personal details are not excluded from the summary.",
      "Privacy checks complete successfully.",
      "Access is denied to an unauthorized role.",
      "Redaction is configured but resident personal details remain visible."
    ]) {
      const changed = structuredClone(fixture.value);
      changed.stories[0].testCases[index].expectedResult = expectedResult;
      assert.deepEqual(reviewDiscoveryIntegrity(changed, ["SRC1"]).errors, []);
      assert.ok(review(changed, fixture.ledger, fixture.coverage, fixture.text).errors.length > 0,
        `A channel lacks a verified redaction outcome: ${expectedResult}`);
    }
  }
});

test("privacy coverage needs an actual unauthorized-access scenario, not only an unrelated negative test", () => {
  const text = "Sensitive requests may be viewed only by assigned service staff. Dashboard summaries must not expose resident personal details.";
  const ledger: Evidence[] = [{ id: "P1", sourceId: "SRC1", quote: text, kind: "requirement", statement: text }];
  const value = definition(text);
  value.businessRules = [text];
  value.stories[0].acceptanceCriteria = ["Assigned staff can view sensitive request details; unassigned staff receive access denied without request content.", "Dashboard summaries omit resident personal details."];
  value.stories[0].testCases = [
    { id: "T1", title: "Assigned staff can view sensitive content", type: "happy-path", steps: ["Create a sensitive request", "Assign Staff A", "Open the request as Staff A"], expectedResult: "Assigned Staff A can view the sensitive request." },
    { id: "T2", title: "Unassigned staff cannot view sensitive content", type: "negative", steps: ["Create a sensitive request assigned to Staff A", "Open its direct URL as unassigned Staff B"], expectedResult: "Access is denied and no sensitive request content is disclosed." },
    { id: "T3", title: "Redact the dashboard summary", type: "edge", steps: ["Create a sensitive request with resident personal details", "Open the dashboard summary"], expectedResult: "The dashboard summary does not expose resident personal details." }
  ];
  const coverage = [{ ...row("P1", "implemented"), testIds: ["T1", "T2", "T3"] }];
  assert.deepEqual(review(value, ledger, coverage, text).errors, []);
  value.stories[0].testCases[1] = { id: "T2", title: "Required category is missing", type: "negative", steps: ["Submit without a category"], expectedResult: "Category validation appears." };
  assert.deepEqual(reviewDiscoveryIntegrity(value, ["SRC1"]).errors, []);
  assert.ok(review(value, ledger, coverage, text).errors.length > 0);
});

test("audit tests must verify the required event fields rather than merely mention an audit event", () => {
  const text = "An approval or rejection must append an immutable audit event containing actor, timestamp, prior state, new state, and rationale.";
  const ledger: Evidence[] = [{ id: "A1", sourceId: "SRC1", quote: text, kind: "requirement", statement: text }];
  const value = definition(text);
  value.businessRules = [text];
  value.stories[0].acceptanceCriteria = [text, "Audit events cannot be edited or deleted through application functions."];
  value.stories[0].testCases = [
    { id: "T1", title: "Record an approval in audit history", type: "happy-path", steps: ["Approve a policy exception with a rationale", "Inspect the appended audit history event"], expectedResult: "The immutable audit event records actor, timestamp, prior state, new state, and rationale." },
    { id: "T2", title: "Prevent audit modification", type: "negative", steps: ["Attempt to edit or delete an existing audit event"], expectedResult: "The operation is denied and the immutable event remains unchanged." },
    { id: "T3", title: "Record a permitted rejection in audit history", type: "happy-path", steps: ["Sign in as an authorized approver", "Reject a policy exception raised by another user with a rationale", "Inspect the appended audit history event"], expectedResult: "The policy exception is rejected and the immutable audit event records actor, timestamp, prior state, new state, and rationale." }
  ];
  const coverage = [{ ...row("A1", "implemented"), testIds: ["T1", "T2", "T3"] }];
  assert.deepEqual(review(value, ledger, coverage, text).errors, []);
  value.stories[0].testCases[0].expectedResult = "An audit event is created.";
  value.stories[0].testCases[2].expectedResult = "The policy exception is rejected and an audit event is created.";
  assert.deepEqual(reviewDiscoveryIntegrity(value, ["SRC1"]).errors, []);
  assert.ok(review(value, ledger, coverage, text).errors.length > 0);
});

test("SLA coverage includes the threshold boundary and missing-configuration behavior", () => {
  const text = "Alert when a request reaches 80% of its applicable SLA. When an SLA is not configured, show a configuration gap rather than inventing a target.";
  const ledger: Evidence[] = [{ id: "SLA1", sourceId: "SRC1", quote: text, kind: "requirement", statement: text }];
  const value = definition(text);
  value.businessRules = [text];
  value.stories[0].acceptanceCriteria = ["A request is flagged at 80% of the configured applicable SLA and is not flagged below that threshold.", "A missing SLA shows a configuration gap without an invented target."];
  value.stories[0].testCases = [
    { id: "T1", title: "Flag a request at 80% of its SLA", type: "happy-path", steps: ["Configure an SLA", "Advance elapsed service time to exactly 80% of the SLA"], expectedResult: "The request is flagged for intervention at 80%." },
    { id: "T2", title: "Do not flag below the SLA boundary", type: "negative", steps: ["Configure an SLA", "Set elapsed service time to just below 80% of the SLA"], expectedResult: "The request is not flagged before it reaches the 80% threshold." },
    { id: "T3", title: "Handle missing SLA configuration", type: "edge", steps: ["Create a request in a category without an SLA", "Open the intervention view"], expectedResult: "A missing-configuration gap is visible and no SLA target or percentage is invented." },
    { id: "T4", title: "Keep an alert above the SLA threshold", type: "edge", steps: ["Configure an SLA", "Set elapsed service time just above 80% of the SLA"], expectedResult: "The request remains flagged above the 80% threshold." }
  ];
  const coverage = [{ ...row("SLA1", "implemented"), testIds: ["T1", "T2", "T3", "T4"] }];
  assert.deepEqual(review(value, ledger, coverage, text).errors, []);
  const baseline = ["Service-level reporting baseline: reassigned requests account for 27% of requests.", "Incomplete requests account for 31% of requests."];
  const sourceWithBaselines = `${baseline.join(" ")} ${text}`;
  const withBaselines = structuredClone(value);
  withBaselines.executiveSummary = sourceWithBaselines;
  withBaselines.evidenceSummary = sourceWithBaselines;
  const baselineLedger: Evidence[] = baseline.map((quote, index) => ({ id: `B${index + 1}`, sourceId: "SRC1", quote, kind: "fact", statement: quote }));
  assert.deepEqual(review(withBaselines, [...ledger, ...baselineLedger], [...coverage, row("B1"), row("B2")], sourceWithBaselines).errors, [],
    "Baseline percentages near an SLA discussion must not be mistaken for the intervention threshold.");
  for (const index of [1, 2, 3]) {
    const changed = structuredClone(value);
    changed.stories[0].testCases[index] = { id: `T${index + 1}`, title: "Required category is missing", type: "negative", steps: ["Submit without a category"], expectedResult: "Category validation appears." };
    assert.deepEqual(reviewDiscoveryIntegrity(changed, ["SRC1"]).errors, []);
    assert.ok(review(changed, ledger, coverage, text).errors.length > 0);
  }
});
