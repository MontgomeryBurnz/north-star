import test from "node:test";
import assert from "node:assert/strict";
import { generateLocalGuidedPlan } from "../src/lib/guided-plan-generator.ts";
import type { StoredProgram } from "../src/lib/program-intake-types.ts";

const program: StoredProgram = {
  id: "compass-compliance-hub-alpha",
  createdAt: "2026-04-28T10:00:00.000Z",
  updatedAt: "2026-04-28T10:00:00.000Z",
  intake: {
    programName: "Compass Compliance Hub Alpha",
    programOwner: "Alex",
    vision: "Create a governed compliance hub for alpha users.",
    sowSummary: "Build and validate compliance workflows.",
    outcomes: "Reduce compliance review friction.",
    stakeholders: "Delivery leads, compliance sponsors, implementation teams.",
    risks: "Adoption friction and unclear decision ownership.",
    constraints: "Alpha must remain usable while guidance evolves.",
    currentStatus: "Execution",
    decisionsNeeded: "Confirm the next checkpoint owner.",
    blockers: "",
    teamRoles: ["Product Management", "Delivery Lead"],
    teamFootprint: [
      {
        active: true,
        id: "product-management",
        owner: "Priya Product",
        responsibility: "Own roadmap scope and prioritization.",
        role: "Product Management"
      },
      {
        active: true,
        id: "delivery-lead",
        owner: "Dylan Delivery",
        responsibility: "Own delivery cadence, blockers, and sponsor-ready execution path.",
        role: "Delivery Lead"
      }
    ],
    artifacts: []
  }
};

test("generateLocalGuidedPlan includes custom team roles in Team Action Plans", () => {
  const plan = generateLocalGuidedPlan(program, []);
  assert.ok(plan.rolePlans);
  assert.ok(plan.programGuide);
  assert.match(plan.programGuide.sponsorReadout, /team|decision|sponsor|focus/i);

  assert.deepEqual(
    plan.rolePlans.roles.map((rolePlan) => rolePlan.role),
    ["Product Management", "Delivery Lead"]
  );
  const deliveryLeadPlan = plan.rolePlans.roles.find((rolePlan) => rolePlan.role === "Delivery Lead");
  assert.ok(deliveryLeadPlan?.actionPlan.length);
  assert.match(deliveryLeadPlan.keyFocusAreas.join("\n"), /Owner: Dylan Delivery/);
  assert.match(deliveryLeadPlan.keyFocusAreas.join("\n"), /Responsibility: Own delivery cadence/);
});

test("generateLocalGuidedPlan treats role update attachments as role-level signal", () => {
  const plan = generateLocalGuidedPlan(program, [
    {
      id: "update-1",
      programId: program.id,
      programName: program.intake.programName,
      createdAt: "2026-04-28T11:00:00.000Z",
      review: {
        programName: program.intake.programName,
        originalNorthStar: program.intake.vision,
        currentPhase: "Execution",
        progressSinceLastReview: "",
        planChanges: "",
        activeRisks: "",
        stakeholderTemperature: "",
        decisionsPending: "",
        deliveryHealth: "",
        supportNeeded: "",
        teamRoleUpdates: [
          {
            role: "Delivery Lead",
            updatedBy: "Alex",
            progressUpdate: "Checkpoint planning notes are attached for sponsor review.",
            changesObserved: "",
            activeRisks: "",
            blockers: "",
            decisionsNeeded: "",
            supportNeeded: "",
            status: "on-track",
            needsLeadershipAttention: false,
            attachments: [
              {
                id: "artifact-1",
                fileName: "checkpoint-notes.txt",
                mimeType: "text/plain",
                sizeBytes: 128,
                provider: "supabase",
                storageKey: "artifacts/artifact-1/checkpoint-notes.txt",
                createdAt: "2026-04-28T11:00:00.000Z"
              }
            ]
          }
        ],
        artifacts: []
      }
    }
  ]);

  const deliveryLeadPlan = plan.rolePlans?.roles.find((rolePlan) => rolePlan.role === "Delivery Lead");
  assert.ok(deliveryLeadPlan);
  assert.match(plan.sourceInputs.items.join("\n"), /role submissions/i);
  assert.match(plan.programGuide?.sponsorReadout ?? "", /Delivery Lead: Checkpoint planning notes/);
  assert.doesNotMatch(plan.programGuide?.sponsorReadout ?? "", /role update.*shaping/i);
  assert.match(deliveryLeadPlan.keyFocusAreas.join("\n"), /Operating posture/i);
});
