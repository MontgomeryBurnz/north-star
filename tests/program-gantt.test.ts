import test from "node:test";
import assert from "node:assert/strict";
import { buildProgramGantt, phaseIndexFromLabel } from "../src/lib/program-gantt.ts";

test("phaseIndexFromLabel maps the known program phases", () => {
  assert.equal(phaseIndexFromLabel("Discovery"), 0);
  assert.equal(phaseIndexFromLabel("Planning"), 1);
  assert.equal(phaseIndexFromLabel("Build"), 2);
  assert.equal(phaseIndexFromLabel("Recovery"), 3);
  assert.equal(phaseIndexFromLabel("Launch"), 4);
  assert.equal(phaseIndexFromLabel("Unknown"), 2);
});

test("buildProgramGantt marks the current and completed phases from the latest update", () => {
  const phases = buildProgramGantt(
    {
      intake: {
        programName: "Alpha",
        programOwner: "",
        vision: "",
        sowSummary: "",
        outcomes: "",
        stakeholders: "",
        risks: "",
        constraints: "",
        currentStatus: "Discovery",
        decisionsNeeded: "",
        blockers: "",
        artifacts: []
      }
    },
    {
      review: {
        programName: "Alpha",
        originalNorthStar: "",
        currentPhase: "Recovery"
        ,
        progressSinceLastReview: "",
        planChanges: "",
        activeRisks: "",
        stakeholderTemperature: "",
        decisionsPending: "",
        deliveryHealth: "",
        supportNeeded: "",
        updateCadence: "weekly",
        cycleLabel: "",
        cycleStartedAt: "",
        programSynthesisNote: "",
        lastUpdatedRole: "",
        teamRoleUpdates: [],
        artifacts: []
      }
    }
  );

  assert.equal(phases[0]?.status, "completed");
  assert.equal(phases[1]?.status, "completed");
  assert.equal(phases[2]?.status, "completed");
  assert.equal(phases[3]?.status, "current");
  assert.equal(phases[4]?.status, "upcoming");
});
