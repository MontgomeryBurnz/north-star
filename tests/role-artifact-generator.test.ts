import assert from "node:assert/strict";
import test from "node:test";
import { generateLocalGuidedPlan } from "../src/lib/guided-plan-generator.ts";
import { generateLocalRoleArtifactDraft } from "../src/lib/role-artifact-generator.ts";
import { roleArtifactDefinitions } from "../src/lib/role-artifact-types.ts";
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
    teamRoles: ["Product Management", "Business Analysis", "User Experience"],
    artifacts: []
  }
};

const latestPlan = generateLocalGuidedPlan(program, []);

test("generateLocalRoleArtifactDraft supports the starter role artifact types", () => {
  for (const definition of roleArtifactDefinitions) {
    const artifact = generateLocalRoleArtifactDraft({
      artifactType: definition.type,
      program,
      latestPlan,
      updates: [],
      leadershipFeedbacks: [],
      assistantConversations: [],
      meetingInputs: []
    });

    assert.equal(artifact.artifactType, definition.type);
    assert.equal(artifact.role, definition.role);
    assert.equal(artifact.title, definition.title);
    assert.ok(artifact.summary.includes(program.intake.programName));
    assert.deepEqual(artifact.tables[0]?.columns, definition.primaryColumns);
    assert.ok(artifact.tables[0]?.rows.length);
    assert.ok(artifact.sections.length);
    assert.ok(artifact.iterationPrompts.length);
  }
});

test("generateLocalRoleArtifactDraft incorporates iteration feedback", () => {
  const artifact = generateLocalRoleArtifactDraft({
    artifactType: "ux-user-journey",
    program,
    latestPlan,
    updates: [],
    leadershipFeedbacks: [],
    assistantConversations: [],
    meetingInputs: [],
    feedback: "Emphasize mobile alpha tester friction."
  });

  assert.ok(
    artifact.sections.some((section) =>
      section.items.some((item) => item.includes("mobile alpha tester friction"))
    )
  );
});
