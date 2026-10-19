import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryIntegrity } from "../src/lib/discovery-quality.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

function definition(): DiscoverySynthesis {
  return {
    executiveSummary: "Evidence-based service intake", evidenceSummary: "One source", capabilities: ["Intake"], painPoints: ["Duplicate entry"],
    businessRules: [], assumptions: [], gaps: [], readinessScore: 80, readinessNarrative: "For review", sourceCount: 1,
    generatedAt: "2026-10-18", provider: "openai",
    roadmap: [{ horizon: "Now", title: "Intake", outcome: "Complete requests", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "E1", title: "Intake", objective: "Complete requests", featureIds: ["F1"], sourceIds: ["S1"] }],
    features: [{ id: "F1", epicId: "E1", title: "Form", description: "Capture requests", outcome: "Complete requests", priority: "must", sourceIds: ["S1"] }],
    stories: [{ id: "U1", epicId: "E1", featureId: "F1", title: "Submit", story: "As a requester...", acceptanceCriteria: ["Required inputs are validated", "Submission returns a reference"], readiness: "ready", sourceIds: ["S1"],
      testCases: [
        { id: "T1", title: "Valid request", type: "happy-path", steps: ["Complete required fields", "Submit"], expectedResult: "Reference returned" },
        { id: "T2", title: "Missing answer", type: "negative", steps: ["Omit required answer", "Submit"], expectedResult: "Submission blocked" }
      ] }]
  };
}

test("accepts coherent evidence and test coverage", () => {
  assert.deepEqual(reviewDiscoveryIntegrity(definition(), ["S1"]), { errors: [], warnings: [] });
});

test("rejects fabricated citations, orphan hierarchy, and missing negative test coverage", () => {
  const value = definition();
  value.stories[0].sourceIds = ["unknown-source"];
  value.stories[0].featureId = "missing-feature";
  value.stories[0].testCases.pop();
  const { errors } = reviewDiscoveryIntegrity(value, ["S1"]);
  assert.ok(errors.some((error) => error.includes("unknown source")));
  assert.ok(errors.some((error) => error.includes("invalid epic or feature")));
  assert.ok(errors.some((error) => error.includes("negative or edge")));
});

test("rejects duplicate test identifiers and unmatched roadmap references", () => {
  const value = definition();
  value.stories[0].testCases[1].id = "T1";
  value.roadmap[0].featureIds = ["unknown-feature"];
  const { errors } = reviewDiscoveryIntegrity(value, ["S1"]);
  assert.ok(errors.includes("Duplicate test identifiers."));
  assert.ok(errors.some((error) => error.includes("Roadmap initiative")));
});
