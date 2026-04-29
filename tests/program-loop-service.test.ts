import test from "node:test";
import assert from "node:assert/strict";
import type { ActiveProgramUpdate } from "../src/lib/active-program-types.ts";
import type { GuidedPlan } from "../src/lib/guided-plan-types.ts";
import type { GuidanceFeedbackFlag } from "../src/lib/program-intelligence-types.ts";
import type { LeadershipReviewRecord } from "../src/lib/leadership-feedback-types.ts";
import { buildTeamActionPlanFlagSourceId } from "../src/lib/guidance-feedback-flag-sources.ts";
import { createGovernanceFlag, saveActiveProgramReview, saveLeadershipReview } from "../src/lib/program-loop-service.ts";

function buildPlan(sourceRecordIds: string[]): GuidedPlan {
  return {
    id: "plan-1",
    programId: "program-1",
    programName: "Compass Compliance Hub Alpha",
    createdAt: "2026-04-28T10:00:00.000Z",
    northStar: "Tighten delivery posture around a governed compliance rollout.",
    summary: "Summary",
    sourceInputs: { title: "Inputs", items: [] },
    assistantDialogue: { title: "Dialogue", items: [] },
    signalFromNoise: { title: "Signal", items: [] },
    workPath: { title: "Work path", items: [] },
    planningApproach: { title: "Approach", items: [] },
    keyOutcomes: { title: "Outcomes", items: [] },
    criticalRequirements: { title: "Requirements", items: [] },
    keyOutputs: { title: "Outputs", items: [] },
    risksAndDecisions: { title: "Risks", items: [] },
    leadershipChanges: { title: "Changes", items: [] },
    leadershipSignal: { status: "none", summary: "", highlights: [] },
    followUpQuestions: [],
    sourceRecordIds
  };
}

test("saveActiveProgramReview normalizes input and regenerates the plan when the new update is not present", async () => {
  let createGuidedPlanCalls = 0;

  const result = await saveActiveProgramReview(
    {
      async createProgramUpdate(programId, review) {
        assert.equal(programId, "program-1");
        return {
          id: "update-1",
          programId,
          programName: review.programName,
          createdAt: "2026-04-28T10:00:00.000Z",
          review
        } satisfies ActiveProgramUpdate;
      },
      async getLatestGuidedPlan() {
        return buildPlan(["older-source"]);
      },
      async createGuidedPlan() {
        createGuidedPlanCalls += 1;
        return buildPlan(["update-1"]);
      }
    },
    "program-1",
    {
      programName: "Compass Compliance Hub Alpha",
      currentPhase: "Execution"
    }
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.record.review.updateCadence, "weekly");
  assert.deepEqual(result.record.review.teamRoleUpdates, []);
  assert.equal(result.plan?.sourceRecordIds.includes("update-1"), true);
  assert.equal(createGuidedPlanCalls, 1);
});

test("saveLeadershipReview reuses the latest guided plan when the new feedback is already present", async () => {
  let createGuidedPlanCalls = 0;

  const result = await saveLeadershipReview(
    {
      async createLeadershipFeedback(programId, feedback) {
        assert.equal(programId, "program-1");
        return {
          id: "feedback-1",
          programId,
          programName: feedback.programName,
          createdAt: "2026-04-28T10:00:00.000Z",
          feedback
        } satisfies LeadershipReviewRecord;
      },
      async getLatestGuidedPlan() {
        return buildPlan(["feedback-1"]);
      },
      async createGuidedPlan() {
        createGuidedPlanCalls += 1;
        return buildPlan(["feedback-1"]);
      }
    },
    "program-1",
    {
      programName: "Compass Compliance Hub Alpha",
      leadershipGuidance: "Tighten the next checkpoint and reduce decision lag."
    }
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.record.feedback.timelineSummary, "");
  assert.equal(result.plan?.sourceRecordIds[0], "feedback-1");
  assert.equal(createGuidedPlanCalls, 0);
});

test("createGovernanceFlag validates required fields and normalizes scope and citation", async () => {
  const invalid = await createGovernanceFlag(
    {
      async createGuidanceFeedbackFlag() {
        throw new Error("should not be called");
      }
    },
    "program-1",
    {
      guidanceJustificationId: "justification-1",
      userReason: "",
      userContext: ""
    }
  );

  assert.equal(invalid.ok, false);
  if (invalid.ok) return;
  assert.equal(invalid.error, "A flag reason is required.");

  const valid = await createGovernanceFlag(
    {
      async createGuidanceFeedbackFlag(programId, flag) {
        assert.equal(programId, "program-1");
        assert.equal(flag.scope, "partial");
        assert.equal(flag.citationId, "citation-1");
        return {
          id: "flag-1",
          programId,
          programName: "Compass Compliance Hub Alpha",
          status: "pending",
          createdAt: "2026-04-28T10:00:00.000Z",
          updatedAt: "2026-04-28T10:00:00.000Z",
          ...flag
        } satisfies GuidanceFeedbackFlag;
      }
    },
    "program-1",
    {
      guidanceJustificationId: "justification-1",
      citationId: " citation-1 ",
      scope: "partial",
      userReason: "The rationale overstates the delivery risk.",
      userContext: "The dependency is already confirmed."
    }
  );

  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  assert.equal(valid.record.citationId, "citation-1");
  assert.equal(valid.record.targetType, "source-citation");
});

test("createGovernanceFlag preserves Team Action Plan dispute metadata", async () => {
  const sourceId = buildTeamActionPlanFlagSourceId("Scrum Master");
  const result = await createGovernanceFlag(
    {
      async createGuidanceFeedbackFlag(programId, flag) {
        assert.equal(programId, "program-1");
        assert.equal(flag.citationId, sourceId);
        assert.equal(flag.targetType, "team-action-plan");
        assert.equal(flag.targetLabel, "Scrum Master Team Action Plan");
        assert.equal(flag.targetRole, "Scrum Master");
        return {
          id: "flag-2",
          programId,
          programName: "Compass Compliance Hub Alpha",
          status: "pending",
          createdAt: "2026-04-28T10:00:00.000Z",
          updatedAt: "2026-04-28T10:00:00.000Z",
          ...flag
        } satisfies GuidanceFeedbackFlag;
      }
    },
    "program-1",
    {
      guidanceJustificationId: "justification-1",
      citationId: sourceId,
      targetType: "team-action-plan",
      targetLabel: " Scrum Master Team Action Plan ",
      targetRole: " Scrum Master ",
      scope: "partial",
      userReason: "The action plan assigns facilitation work to the wrong role.",
      userContext: "This team uses the Scrum Master as the owner for ceremony health and impediment removal."
    }
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.record.targetType, "team-action-plan");
});
