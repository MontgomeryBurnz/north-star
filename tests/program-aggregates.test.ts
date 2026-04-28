import test from "node:test";
import assert from "node:assert/strict";
import { buildGuidedPlanBundle, buildLeadershipReviewQueueFromStore } from "../src/lib/program-aggregate-builders.ts";

test("buildGuidedPlanBundle returns the combined program context and derived leadership signal", async () => {
  const bundle = await buildGuidedPlanBundle(
    {
      async getProgram() {
        return {
          id: "program-1",
          createdAt: "2026-04-28T10:00:00.000Z",
          updatedAt: "2026-04-28T10:00:00.000Z",
          intake: {
            programName: "Compass Compliance Hub Alpha",
            programOwner: "Alex",
            vision: "Shape the alpha path.",
            sowSummary: "",
            outcomes: "",
            stakeholders: "",
            risks: "",
            constraints: "",
            currentStatus: "",
            decisionsNeeded: "",
            blockers: "",
            artifacts: []
          }
        };
      },
      async getLatestGuidedPlan() {
        return {
          id: "plan-1",
          programId: "program-1",
          programName: "Compass Compliance Hub Alpha",
          createdAt: "2026-04-28T10:00:00.000Z",
          northStar: "Keep the program aligned.",
          summary: "Current guided summary",
          sourceInputs: { title: "Inputs", items: [] },
          assistantDialogue: { title: "Guide", items: [] },
          signalFromNoise: { title: "Signal", items: [] },
          workPath: { title: "Path", items: [] },
          planningApproach: { title: "Approach", items: [] },
          keyOutcomes: { title: "Outcomes", items: [] },
          criticalRequirements: { title: "Requirements", items: [] },
          keyOutputs: { title: "Outputs", items: [] },
          risksAndDecisions: { title: "Risks", items: [] },
          leadershipChanges: { title: "Changes", items: [] },
          leadershipSignal: { status: "none", summary: "", highlights: [] },
          followUpQuestions: [],
          sourceRecordIds: ["feedback-1"]
        };
      },
      async listProgramUpdates() {
        return [
          {
            id: "update-1",
            programId: "program-1",
            programName: "Compass Compliance Hub Alpha",
            createdAt: "2026-04-28T10:00:00.000Z",
            review: {
              programName: "Compass Compliance Hub Alpha",
              originalNorthStar: "",
              currentPhase: "Execution",
              progressSinceLastReview: "Progress is visible.",
              planChanges: "",
              activeRisks: "",
              stakeholderTemperature: "",
              decisionsPending: "",
              deliveryHealth: "",
              supportNeeded: "",
              artifacts: []
            }
          }
        ];
      },
      async listLeadershipFeedback() {
        return [
          {
            id: "feedback-1",
            programId: "program-1",
            programName: "Compass Compliance Hub Alpha",
            createdAt: "2026-04-28T10:00:00.000Z",
            feedback: {
              programName: "Compass Compliance Hub Alpha",
              timelineSummary: "",
              progressHighlights: "",
              activeRisks: "",
              leadershipGuidance: "Tighten checkpoint discipline.",
              supportRequests: "",
              feedbackToDeliveryLead: ""
            },
            interpretation: {
              provider: "local",
              generatedAt: "2026-04-28T10:00:00.000Z",
              summary: "Leadership wants tighter checkpoint discipline.",
              deliveryLeadMessage: "Narrow the next checkpoint.",
              planImpacts: [],
              riskAdjustments: [],
              roleImpacts: []
            }
          }
        ];
      },
      async listAssistantConversations() {
        return [];
      },
      async listGuidanceJustifications() {
        return [
          {
            id: "justification-1",
            programId: "program-1",
            programName: "Compass Compliance Hub Alpha",
            guidedPlanId: "plan-1",
            summary: "Rationale",
            triggeredBy: ["leadership-feedback"],
            citations: [],
            createdAt: "2026-04-28T10:00:00.000Z"
          }
        ];
      },
      async listGuidanceFeedbackFlags() {
        return [];
      }
    },
    "program-1"
  );

  assert.equal(bundle.program?.intake.programName, "Compass Compliance Hub Alpha");
  assert.equal(bundle.leadershipSignal.status, "incorporated");
  assert.equal(bundle.justifications[0]?.id, "justification-1");
});

test("buildLeadershipReviewQueueFromStore groups feedback and updates by program", async () => {
  const queue = await buildLeadershipReviewQueueFromStore({
    async listPrograms() {
      return [
        {
          id: "program-1",
          createdAt: "2026-04-28T10:00:00.000Z",
          updatedAt: "2026-04-28T10:00:00.000Z",
          intake: {
            programName: "Compass Compliance Hub Alpha",
            programOwner: "Alex",
            vision: "",
            sowSummary: "",
            outcomes: "",
            stakeholders: "",
            risks: "",
            constraints: "",
            currentStatus: "",
            decisionsNeeded: "",
            blockers: "",
            leadershipReviewCadence: "weekly",
            artifacts: []
          }
        }
      ];
    },
    async listAllLeadershipFeedback() {
      return [];
    },
    async listAllProgramUpdates() {
      return [
        {
          id: "update-1",
          programId: "program-1",
          programName: "Compass Compliance Hub Alpha",
          createdAt: "2026-04-28T10:00:00.000Z",
          review: {
            programName: "Compass Compliance Hub Alpha",
            originalNorthStar: "",
            currentPhase: "",
            progressSinceLastReview: "",
            planChanges: "",
            activeRisks: "",
            stakeholderTemperature: "",
            decisionsPending: "",
            deliveryHealth: "",
            supportNeeded: "",
            teamRoleUpdates: [
              {
                role: "Business Analysis",
                updatedBy: "Taylor",
                progressUpdate: "",
                changesObserved: "",
                activeRisks: "",
                blockers: "",
                decisionsNeeded: "",
                supportNeeded: "",
                status: "at-risk",
                needsLeadershipAttention: true
              }
            ],
            artifacts: []
          }
        }
      ];
    }
  });

  assert.equal(queue.length, 1);
  assert.equal(queue[0]?.status, "due");
  assert.deepEqual(queue[0]?.attentionRoles, ["Business Analysis"]);
  assert.equal(queue[0]?.leadLabel, "Alex");
});
