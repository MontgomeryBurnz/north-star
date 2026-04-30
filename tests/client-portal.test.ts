import assert from "node:assert/strict";
import test from "node:test";
import { buildClientPortalPortfolio, buildClientPortalProgram } from "../src/lib/client-portal.ts";
import type { StoredProgramUpdate } from "../src/lib/active-program-types.ts";
import type { GuidedPlan } from "../src/lib/guided-plan-types.ts";
import type { StoredProgram } from "../src/lib/program-intake-types.ts";

const program: StoredProgram = {
  id: "compliance-hub",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
  intake: {
    programName: "Compliance Hub",
    programOwner: "Delivery Lead",
    vision: "Make compliance review faster and safer.",
    sowSummary: "Build a compliance workflow for alpha launch.",
    outcomes: "Reduce manual review time\nImprove evidence quality",
    stakeholders: "",
    risks: "API dependency",
    constraints: "",
    currentStatus: "Execute",
    decisionsNeeded: "Approve alpha launch criteria",
    blockers: "",
    teamRoles: ["Product Management", "Engineering"],
    artifacts: []
  }
};

const update: StoredProgramUpdate = {
  id: "update-1",
  programId: "compliance-hub",
  programName: "Compliance Hub",
  createdAt: "2026-04-29T00:00:00.000Z",
  updatedAt: "2026-04-29T00:00:00.000Z",
  review: {
    programName: "Compliance Hub",
    originalNorthStar: "Launch compliant alpha workflows.",
    currentPhase: "Execute",
    progressSinceLastReview: "Intake rules are complete.",
    planChanges: "",
    activeRisks: "iTrade API timing could delay release.",
    stakeholderTemperature: "",
    decisionsPending: "Confirm launch readiness owner.",
    deliveryHealth: "At risk",
    supportNeeded: "",
    teamRoleUpdates: [
      {
        role: "Engineering",
        updatedBy: "Tech Lead",
        progressUpdate: "Dependency remains open.",
        changesObserved: "",
        activeRisks: "API timing",
        blockers: "",
        decisionsNeeded: "",
        supportNeeded: "",
        status: "at-risk",
        needsLeadershipAttention: false
      }
    ],
    artifacts: []
  }
};

const plan: GuidedPlan = {
  id: "plan-1",
  programId: "compliance-hub",
  programName: "Compliance Hub",
  createdAt: "2026-04-29T00:00:00.000Z",
  northStar: "Ship a controlled compliance alpha.",
  summary: "Compliance Hub is progressing, with API timing as the executive risk.",
  sourceInputs: { title: "Inputs", items: [] },
  assistantDialogue: { title: "Guide", items: [] },
  signalFromNoise: { title: "Signal", items: [] },
  workPath: { title: "Path", items: ["Lock API timing", "Confirm launch readiness", "Prepare sponsor readout"] },
  planningApproach: { title: "Planning", items: [] },
  keyOutcomes: { title: "Outcomes", items: ["Alpha workflow ready for sponsor validation"] },
  criticalRequirements: { title: "Requirements", items: [] },
  keyOutputs: { title: "Outputs", items: [] },
  risksAndDecisions: { title: "Risks", items: ["API timing requires escalation"] },
  leadershipChanges: { title: "Leadership", items: [] },
  leadershipSignal: {
    status: "incorporated",
    summary: "Leadership input is incorporated.",
    highlights: []
  },
  followUpQuestions: [],
  sourceRecordIds: []
};

test("buildClientPortalProgram creates executive posture from program signals", () => {
  const portalProgram = buildClientPortalProgram({
    assignedRoles: ["Executive Sponsor"],
    latestPlan: plan,
    latestUpdate: update,
    program
  });

  assert.equal(portalProgram.posture, "at-risk");
  assert.equal(portalProgram.metrics.risks, 1);
  assert.equal(portalProgram.metrics.decisions, 1);
  assert.equal(portalProgram.assignedRoles[0], "Executive Sponsor");
  assert.equal(portalProgram.primaryOutcome, "Alpha workflow ready for sponsor validation");
  assert.equal(portalProgram.metrics.phaseCompletionPercent, 75);
  assert.equal(portalProgram.metrics.programCompletionPercent, 66);
  assert.equal(portalProgram.progressUpdates[0], "Intake rules are complete.");
});

test("buildClientPortalPortfolio rolls program posture into portfolio metrics", () => {
  const portfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [{ latestPlan: plan, latestUpdate: update, program }]
  });

  assert.equal(portfolio.metrics.totalPrograms, 1);
  assert.equal(portfolio.metrics.atRisk, 1);
  assert.equal(portfolio.metrics.healthScore, 46);
});
