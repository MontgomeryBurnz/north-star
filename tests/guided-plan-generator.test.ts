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
    artifacts: []
  }
};

test("generateLocalGuidedPlan includes custom team roles in Team Action Plans", () => {
  const plan = generateLocalGuidedPlan(program, []);
  assert.ok(plan.rolePlans);

  assert.deepEqual(
    plan.rolePlans.roles.map((rolePlan) => rolePlan.role),
    ["Product Management", "Delivery Lead"]
  );
  assert.ok(plan.rolePlans.roles.find((rolePlan) => rolePlan.role === "Delivery Lead")?.actionPlan.length);
});
