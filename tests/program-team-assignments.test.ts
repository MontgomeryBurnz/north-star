import test from "node:test";
import assert from "node:assert/strict";
import { buildProgramTeamAssignments } from "../src/lib/program-team-assignments.ts";
import type { ManagedAppUser } from "../src/lib/admin-user-types.ts";

function user(input: Partial<ManagedAppUser>): ManagedAppUser {
  return {
    id: input.id ?? "user-1",
    name: input.name ?? "Jordan Lee",
    email: input.email ?? "jordan@example.com",
    userType: input.userType ?? "team-member",
    credentialStatus: input.credentialStatus ?? "active",
    assignments: input.assignments ?? [],
    createdAt: input.createdAt ?? "2026-04-30T00:00:00.000Z",
    updatedAt: input.updatedAt ?? "2026-04-30T00:00:00.000Z"
  };
}

test("buildProgramTeamAssignments groups active users by program role", () => {
  const assignments = buildProgramTeamAssignments({
    programId: "compliance-hub",
    roles: ["Delivery Lead", "Business Analysis", "Scrum Master"],
    users: [
      user({
        name: "Jordan Lee",
        assignments: [
          {
            id: "assignment-1",
            programId: "compliance-hub",
            programName: "Compliance Hub",
            role: "Delivery Lead",
            isPrimary: true,
            createdAt: "2026-04-30T00:00:00.000Z",
            updatedAt: "2026-04-30T00:00:00.000Z"
          }
        ]
      }),
      user({
        id: "user-2",
        name: "Avery Chen",
        email: "avery@example.com",
        assignments: [
          {
            id: "assignment-2",
            programId: "compliance-hub",
            programName: "Compliance Hub",
            role: "Business Analysis",
            isPrimary: false,
            createdAt: "2026-04-30T00:00:00.000Z",
            updatedAt: "2026-04-30T00:00:00.000Z"
          }
        ]
      })
    ]
  });

  assert.deepEqual(assignments, [
    { role: "Delivery Lead", owners: ["Jordan Lee"] },
    { role: "Business Analysis", owners: ["Avery Chen"] },
    { role: "Scrum Master", owners: [] }
  ]);
});

test("buildProgramTeamAssignments ignores disabled users and other programs", () => {
  const assignments = buildProgramTeamAssignments({
    programId: "compliance-hub",
    roles: ["Delivery Lead"],
    users: [
      user({
        name: "Disabled User",
        credentialStatus: "disabled",
        assignments: [
          {
            id: "assignment-1",
            programId: "compliance-hub",
            programName: "Compliance Hub",
            role: "Delivery Lead",
            isPrimary: true,
            createdAt: "2026-04-30T00:00:00.000Z",
            updatedAt: "2026-04-30T00:00:00.000Z"
          }
        ]
      }),
      user({
        id: "user-2",
        name: "Other Program User",
        email: "other@example.com",
        assignments: [
          {
            id: "assignment-2",
            programId: "other-program",
            programName: "Other Program",
            role: "Delivery Lead",
            isPrimary: false,
            createdAt: "2026-04-30T00:00:00.000Z",
            updatedAt: "2026-04-30T00:00:00.000Z"
          }
        ]
      })
    ]
  });

  assert.deepEqual(assignments, [{ role: "Delivery Lead", owners: [] }]);
});
