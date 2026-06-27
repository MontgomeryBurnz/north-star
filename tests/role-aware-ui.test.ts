import test from "node:test";
import assert from "node:assert/strict";
import { buildRoleAwareUiProfile } from "../src/lib/role-aware-ui.ts";
import type { ManagedAppUser } from "../src/lib/admin-user-types.ts";

function user(input: Partial<ManagedAppUser>): ManagedAppUser {
  return {
    assignments: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    credentialStatus: "active",
    email: "user@example.com",
    id: "user-1",
    name: "User",
    updatedAt: "2026-01-01T00:00:00.000Z",
    userType: "team-member",
    ...input
  };
}

test("role-aware UI centers the assigned role for the selected program only", () => {
  const profile = buildRoleAwareUiProfile(
    user({
      assignments: [
        {
          createdAt: "2026-01-01T00:00:00.000Z",
          id: "assignment-1",
          isPrimary: true,
          programId: "program-a",
          programName: "Program A",
          role: "Product Management",
          updatedAt: "2026-01-01T00:00:00.000Z"
        },
        {
          createdAt: "2026-01-01T00:00:00.000Z",
          id: "assignment-2",
          isPrimary: false,
          programId: "program-b",
          programName: "Program B",
          role: "Data Engineering",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    }),
    "program-b",
    ["Product Management", "Data Engineering", "User Experience"]
  );

  assert.equal(profile.mode, "assigned-role");
  assert.equal(profile.defaultRole, "Data Engineering");
  assert.equal(profile.roleOptions[0], "Data Engineering");
  assert.match(profile.summary, /Data Engineering/);
});

test("admin role-aware UI keeps full context visible", () => {
  const profile = buildRoleAwareUiProfile(
    user({
      assignments: [],
      userType: "admin"
    }),
    "program-a",
    ["Product Management", "Data Engineering"]
  );

  assert.equal(profile.mode, "admin");
  assert.equal(profile.isAdmin, true);
  assert.deepEqual(profile.roleOptions, ["Product Management", "Data Engineering"]);
  assert.match(profile.summary, /full program context/);
});

test("unassigned scoped users keep available roles without a false default", () => {
  const profile = buildRoleAwareUiProfile(
    user({
      assignments: [],
      userType: "leadership"
    }),
    "program-a",
    ["Delivery Lead", "UX"]
  );

  assert.equal(profile.mode, "unassigned");
  assert.equal(profile.defaultRole, null);
  assert.deepEqual(profile.roleOptions, ["Delivery Lead", "UX"]);
  assert.match(profile.summary, /No role assignment/);
});
