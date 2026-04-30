import test from "node:test";
import assert from "node:assert/strict";
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
