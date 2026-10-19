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
