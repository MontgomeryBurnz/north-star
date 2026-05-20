import test from "node:test";
import assert from "node:assert/strict";
import type { ManagedAppUser } from "../src/lib/admin-user-types.ts";
import {
  appendUserActivationToken,
  createUserActivationToken,
  getUserActivationTokenRecords,
  isUserActivationTokenValid
} from "../src/lib/user-activation-token-core.ts";

function buildInvitedUser(overrides: Partial<ManagedAppUser> = {}): ManagedAppUser {
  return {
    id: "user-1",
    name: "Invited User",
    email: "invited@example.com",
    userType: "admin",
    credentialStatus: "invited",
    assignments: [],
    createdAt: "2026-05-20T12:00:00.000Z",
    updatedAt: "2026-05-20T12:00:00.000Z",
    ...overrides
  };
}

test("activation tokens preserve existing invite links when new setup links are generated", () => {
  const first = createUserActivationToken(new Date("2026-05-20T12:00:00.000Z"));
  const user = buildInvitedUser({
    activationTokenCreatedAt: first.createdAt,
    activationTokenExpiresAt: first.expiresAt,
    activationTokenHash: first.tokenHash
  });
  const second = createUserActivationToken(new Date("2026-05-20T12:05:00.000Z"));
  const activationTokens = appendUserActivationToken(user, second, new Date("2026-05-20T12:05:00.000Z"));
  const updatedUser = buildInvitedUser({
    activationTokenCreatedAt: second.createdAt,
    activationTokenExpiresAt: second.expiresAt,
    activationTokenHash: second.tokenHash,
    activationTokens
  });

  assert.equal(activationTokens.length, 2);
  assert.equal(isUserActivationTokenValid(updatedUser, first.token, new Date("2026-05-20T12:06:00.000Z")), true);
  assert.equal(isUserActivationTokenValid(updatedUser, second.token, new Date("2026-05-20T12:06:00.000Z")), true);
});

test("activation token lookup ignores expired historical setup links", () => {
  const expired = createUserActivationToken(new Date("2026-05-18T12:00:00.000Z"));
  const current = createUserActivationToken(new Date("2026-05-20T12:00:00.000Z"));
  const user = buildInvitedUser({
    activationTokenCreatedAt: current.createdAt,
    activationTokenExpiresAt: current.expiresAt,
    activationTokenHash: current.tokenHash,
    activationTokens: [
      {
        createdAt: expired.createdAt,
        expiresAt: expired.expiresAt,
        tokenHash: expired.tokenHash
      },
      {
        createdAt: current.createdAt,
        expiresAt: current.expiresAt,
        tokenHash: current.tokenHash
      }
    ]
  });

  assert.deepEqual(
    getUserActivationTokenRecords(user, new Date("2026-05-20T12:01:00.000Z")).map((token) => token.tokenHash),
    [current.tokenHash]
  );
  assert.equal(isUserActivationTokenValid(user, expired.token, new Date("2026-05-20T12:01:00.000Z")), false);
  assert.equal(isUserActivationTokenValid(user, current.token, new Date("2026-05-20T12:01:00.000Z")), true);
});
