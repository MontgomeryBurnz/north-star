import test from "node:test";
import assert from "node:assert/strict";
import { addProgramRoleToIntake, getProgramRoleNames, normalizeTeamFootprint, normalizeTeamRoles } from "../src/lib/team-roles.ts";
import type { ProgramIntake } from "../src/lib/program-intake-types.ts";

const baseIntake: ProgramIntake = {
  programName: "Compliance Hub",
  programOwner: "Delivery",
  vision: "",
  sowSummary: "",
  outcomes: "",
  stakeholders: "",
  risks: "",
  constraints: "",
  currentStatus: "",
  decisionsNeeded: "",
  blockers: "",
  artifacts: []
};

test("normalizeTeamRoles returns default coverage when no program roles are stored", () => {
  assert.deepEqual(normalizeTeamRoles(undefined), [
    "Product Management",
    "Business Analysis",
    "User Experience",
    "Application Development",
    "Data Engineering",
    "Change Management"
  ]);
});

test("addProgramRoleToIntake adds a new role and preserves default coverage", () => {
  const result = addProgramRoleToIntake(baseIntake, "  Scrum   Master  ");

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.role, "Scrum Master");
  assert.equal(result.roles.at(-1), "Scrum Master");
  assert.deepEqual(result.intake.teamRoles, result.roles);
  assert.equal(result.intake.teamFootprint?.at(-1)?.role, "Scrum Master");
  assert.equal(result.intake.teamFootprint?.at(-1)?.owner, "");
});

test("addProgramRoleToIntake rejects duplicate roles case-insensitively", () => {
  const result = addProgramRoleToIntake(
    {
      ...baseIntake,
      teamRoles: ["Delivery Lead"]
    },
    "delivery lead"
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.role, "Delivery Lead");
  assert.equal(result.error, "Delivery Lead is already part of this program.");
});

test("normalizeTeamFootprint stores role owner and responsibility as structured program data", () => {
  const footprint = normalizeTeamFootprint([
    {
      active: true,
      id: "product",
      owner: "Abi Ledesma",
      responsibility: "Own roadmap and feature sequencing.",
      role: " Product   Management "
    }
  ]);

  assert.deepEqual(footprint, [
    {
      active: true,
      id: "product",
      owner: "Abi Ledesma",
      responsibility: "Own roadmap and feature sequencing.",
      role: "Product Management"
    }
  ]);
});

test("getProgramRoleNames prefers active team footprint over legacy teamRoles", () => {
  assert.deepEqual(
    getProgramRoleNames({
      ...baseIntake,
      teamFootprint: [
        {
          active: true,
          id: "delivery-lead",
          owner: "Caitlin",
          responsibility: "Own delivery cadence.",
          role: "Delivery Lead"
        },
        {
          active: false,
          id: "legacy",
          owner: "",
          responsibility: "",
          role: "Legacy Role"
        }
      ],
      teamRoles: ["Product Management"]
    }),
    ["Delivery Lead"]
  );
});
