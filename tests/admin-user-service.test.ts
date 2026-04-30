import test from "node:test";
import assert from "node:assert/strict";
import { canAccessAdminSurface, canAccessLeadershipSurface } from "../src/lib/admin-user-types.ts";
import { buildManagedAppUserRecord } from "../src/lib/admin-user-service.ts";
import type { StoredProgram } from "../src/lib/program-intake-types.ts";

const program: StoredProgram = {
  id: "compliance-hub",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  intake: {
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
    teamRoles: ["Delivery Lead", "Business Analysis"],
    leadershipReviewCadence: "weekly",
    artifacts: []
  }
};

const platformProgram: StoredProgram = {
  ...program,
  id: "platform-modernization",
  intake: {
    ...program.intake,
    programName: "Platform Modernization",
    teamRoles: ["Tech Lead", "Data Engineering"]
  }
};

test("buildManagedAppUserRecord validates name and email", () => {
  const result = buildManagedAppUserRecord({
    idFactory: () => "id-1",
    input: {
      name: "",
      email: "bad-email"
    },
    now: "2026-04-29T12:00:00.000Z",
    programs: [program]
  });

  assert.equal(result.ok, false);
});

test("buildManagedAppUserRecord creates a primary role assignment for a program", () => {
  const result = buildManagedAppUserRecord({
    idFactory: () => "id-1",
    input: {
      name: "Jordan Lee",
      email: "Jordan.Lee@Example.com",
      userType: "delivery-lead",
      credentialStatus: "invited",
      assignment: {
        programId: "compliance-hub",
        role: "Delivery Lead",
        isPrimary: true
      }
    },
    now: "2026-04-29T12:00:00.000Z",
    programs: [program]
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.record.email, "jordan.lee@example.com");
  assert.equal(result.record.userType, "delivery-lead");
  assert.equal(result.record.credentialStatus, "invited");
  assert.equal(result.record.assignments.length, 1);
  assert.equal(result.record.assignments[0]?.programName, "Compliance Hub");
  assert.equal(result.record.assignments[0]?.isPrimary, true);
});

test("buildManagedAppUserRecord creates multiple program role assignments in one mutation", () => {
  const result = buildManagedAppUserRecord({
    idFactory: () => "id-1",
    input: {
      name: "Sam Rivera",
      email: "sam@example.com",
      userType: "team-member",
      assignments: [
        {
          programId: "compliance-hub",
          role: "Business Analysis",
          isPrimary: true
        },
        {
          programId: "platform-modernization",
          role: "Data Engineering"
        }
      ]
    },
    now: "2026-04-29T12:00:00.000Z",
    programs: [program, platformProgram]
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.record.assignments.length, 2);
  assert.deepEqual(
    result.record.assignments.map((assignment) => ({
      programName: assignment.programName,
      role: assignment.role,
      isPrimary: assignment.isPrimary
    })),
    [
      {
        programName: "Compliance Hub",
        role: "Business Analysis",
        isPrimary: true
      },
      {
        programName: "Platform Modernization",
        role: "Data Engineering",
        isPrimary: false
      }
    ]
  );
});

test("buildManagedAppUserRecord allows admin users without a program assignment", () => {
  const result = buildManagedAppUserRecord({
    idFactory: () => "admin-1",
    input: {
      name: "Admin User",
      email: "admin@example.com",
      userType: "admin",
      credentialStatus: "invited"
    },
    now: "2026-04-29T12:00:00.000Z",
    programs: [program]
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.record.userType, "admin");
  assert.equal(result.record.assignments.length, 0);
});

test("buildManagedAppUserRecord clears scoped assignments when a user becomes admin", () => {
  const existing = buildManagedAppUserRecord({
    idFactory: () => "user-1",
    input: {
      name: "Admin Candidate",
      email: "candidate@example.com",
      userType: "team-member",
      assignment: {
        programId: "compliance-hub",
        role: "Business Analysis"
      }
    },
    now: "2026-04-29T12:00:00.000Z",
    programs: [program]
  });

  assert.equal(existing.ok, true);
  if (!existing.ok) return;

  const updated = buildManagedAppUserRecord({
    existing: existing.record,
    idFactory: () => "unused",
    input: {
      name: "Admin Candidate",
      email: "candidate@example.com",
      userType: "admin"
    },
    now: "2026-04-29T13:00:00.000Z",
    programs: [program]
  });

  assert.equal(updated.ok, true);
  if (!updated.ok) return;

  assert.equal(updated.record.userType, "admin");
  assert.equal(updated.record.assignments.length, 0);
});

test("buildManagedAppUserRecord requires program assignment for scoped user types", () => {
  const result = buildManagedAppUserRecord({
    idFactory: () => "team-member-1",
    input: {
      name: "Scoped User",
      email: "scoped@example.com",
      userType: "team-member",
      credentialStatus: "invited"
    },
    now: "2026-04-29T12:00:00.000Z",
    programs: [program]
  });

  assert.deepEqual(result, {
    ok: false,
    error: "Select a program and program role for this user type."
  });
});

test("buildManagedAppUserRecord treats client users as program-scoped", () => {
  const result = buildManagedAppUserRecord({
    idFactory: () => "client-1",
    input: {
      name: "Client Sponsor",
      email: "sponsor@example.com",
      userType: "client",
      assignment: {
        programId: "compliance-hub",
        role: "Executive Sponsor"
      }
    },
    now: "2026-04-29T12:00:00.000Z",
    programs: [program]
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.record.userType, "client");
  assert.equal(result.record.assignments.length, 1);
  assert.equal(result.record.assignments[0]?.role, "Executive Sponsor");
});

test("managed user surfaces authorize admin and leadership roles correctly", () => {
  assert.equal(canAccessAdminSurface({ credentialStatus: "active", userType: "admin" }), true);
  assert.equal(canAccessAdminSurface({ credentialStatus: "active", userType: "leadership" }), false);
  assert.equal(canAccessLeadershipSurface({ credentialStatus: "active", userType: "admin" }), true);
  assert.equal(canAccessLeadershipSurface({ credentialStatus: "active", userType: "leadership" }), true);
  assert.equal(canAccessLeadershipSurface({ credentialStatus: "active", userType: "team-member" }), false);
  assert.equal(canAccessLeadershipSurface({ credentialStatus: "disabled", userType: "admin" }), false);
});

test("buildManagedAppUserRecord merges new assignments without dropping existing program roles", () => {
  const existing = buildManagedAppUserRecord({
    idFactory: () => "user-1",
    input: {
      name: "Jordan Lee",
      email: "jordan@example.com",
      assignment: {
        programId: "compliance-hub",
        role: "Delivery Lead",
        isPrimary: true
      }
    },
    now: "2026-04-29T12:00:00.000Z",
    programs: [program]
  });

  assert.equal(existing.ok, true);
  if (!existing.ok) return;

  const updated = buildManagedAppUserRecord({
    existing: existing.record,
    idFactory: () => "assignment-2",
    input: {
      name: "Jordan Lee",
      email: "jordan@example.com",
      assignment: {
        programId: "compliance-hub",
        role: "Business Analysis"
      }
    },
    now: "2026-04-29T13:00:00.000Z",
    programs: [program]
  });

  assert.equal(updated.ok, true);
  if (!updated.ok) return;

  assert.deepEqual(
    updated.record.assignments.map((assignment) => assignment.role).sort(),
    ["Business Analysis", "Delivery Lead"]
  );
});

test("buildManagedAppUserRecord replaces assignments when editing existing access", () => {
  const existing = buildManagedAppUserRecord({
    idFactory: () => "user-1",
    input: {
      name: "Jordan Lee",
      email: "jordan@example.com",
      userType: "delivery-lead",
      assignments: [
        {
          programId: "compliance-hub",
          role: "Delivery Lead",
          isPrimary: true
        },
        {
          programId: "platform-modernization",
          role: "Tech Lead"
        }
      ]
    },
    now: "2026-04-29T12:00:00.000Z",
    programs: [program, platformProgram]
  });

  assert.equal(existing.ok, true);
  if (!existing.ok) return;

  const updated = buildManagedAppUserRecord({
    existing: existing.record,
    idFactory: () => "replacement-assignment",
    input: {
      id: existing.record.id,
      name: "Jordan Lee",
      email: "jordan@example.com",
      userType: "delivery-lead",
      replaceAssignments: true,
      assignments: [
        {
          programId: "platform-modernization",
          role: "Tech Lead",
          isPrimary: true
        }
      ]
    },
    now: "2026-04-29T13:00:00.000Z",
    programs: [program, platformProgram]
  });

  assert.equal(updated.ok, true);
  if (!updated.ok) return;

  assert.equal(updated.record.assignments.length, 1);
  assert.equal(updated.record.assignments[0]?.programName, "Platform Modernization");
  assert.equal(updated.record.assignments[0]?.role, "Tech Lead");
  assert.equal(updated.record.assignments[0]?.isPrimary, true);
});

test("buildManagedAppUserRecord stores invitation and auth metadata", () => {
  const result = buildManagedAppUserRecord({
    idFactory: () => "id-1",
    input: {
      name: "Avery Morgan",
      email: "avery@example.com",
      credentialStatus: "invited",
      authUserId: "auth-user-1",
      invitedAt: "2026-04-29T14:00:00.000Z",
      lastAuthSyncAt: "2026-04-29T14:01:00.000Z",
      invitationError: "temporary issue",
      assignment: {
        programId: "compliance-hub",
        role: "Delivery Lead"
      }
    },
    now: "2026-04-29T14:02:00.000Z",
    programs: [program]
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.record.authUserId, "auth-user-1");
  assert.equal(result.record.invitedAt, "2026-04-29T14:00:00.000Z");
  assert.equal(result.record.lastAuthSyncAt, "2026-04-29T14:01:00.000Z");
  assert.equal(result.record.invitationError, "temporary issue");
});

test("buildManagedAppUserRecord can clear a stale invitation error", () => {
  const existing = buildManagedAppUserRecord({
    idFactory: () => "user-1",
    input: {
      name: "Avery Morgan",
      email: "avery@example.com",
      invitationError: "temporary issue",
      assignment: {
        programId: "compliance-hub",
        role: "Delivery Lead"
      }
    },
    now: "2026-04-29T14:00:00.000Z",
    programs: [program]
  });

  assert.equal(existing.ok, true);
  if (!existing.ok) return;

  const updated = buildManagedAppUserRecord({
    existing: existing.record,
    idFactory: () => "unused",
    input: {
      name: "Avery Morgan",
      email: "avery@example.com",
      invitationError: "",
      lastAuthSyncAt: "2026-04-29T14:05:00.000Z"
    },
    now: "2026-04-29T14:05:00.000Z",
    programs: [program]
  });

  assert.equal(updated.ok, true);
  if (!updated.ok) return;

  assert.equal(updated.record.invitationError, undefined);
  assert.equal(updated.record.lastAuthSyncAt, "2026-04-29T14:05:00.000Z");
  assert.equal(updated.record.assignments.length, 1);
});
