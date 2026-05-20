import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { ManagedAppUser, ManagedUserActivationToken } from "@/lib/admin-user-types";

const activationTokenTtlHours = 48;
const maxActivationTokensPerUser = 5;

export function hashUserActivationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createUserActivationToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + activationTokenTtlHours * 60 * 60 * 1000).toISOString();

  return {
    createdAt: now.toISOString(),
    expiresAt,
    token,
    tokenHash: hashUserActivationToken(token)
  };
}

function isTokenRecordUsable(token: ManagedUserActivationToken, now: Date) {
  return Boolean(
    /^[0-9a-f]{64}$/i.test(token.tokenHash) &&
      !Number.isNaN(new Date(token.expiresAt).getTime()) &&
      new Date(token.expiresAt) > now
  );
}

export function getUserActivationTokenRecords(user: ManagedAppUser, now = new Date()): ManagedUserActivationToken[] {
  const records = Array.isArray(user.activationTokens) ? user.activationTokens : [];
  const tokensByHash = new Map<string, ManagedUserActivationToken>();

  for (const token of records) {
    if (isTokenRecordUsable(token, now)) {
      tokensByHash.set(token.tokenHash, token);
    }
  }

  if (user.activationTokenHash && user.activationTokenCreatedAt && user.activationTokenExpiresAt) {
    const legacyToken = {
      createdAt: user.activationTokenCreatedAt,
      expiresAt: user.activationTokenExpiresAt,
      tokenHash: user.activationTokenHash
    };

    if (isTokenRecordUsable(legacyToken, now)) {
      tokensByHash.set(legacyToken.tokenHash, legacyToken);
    }
  }

  return Array.from(tokensByHash.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function appendUserActivationToken(
  user: ManagedAppUser,
  activation: ReturnType<typeof createUserActivationToken>,
  now = new Date()
) {
  const nextToken = {
    createdAt: activation.createdAt,
    expiresAt: activation.expiresAt,
    tokenHash: activation.tokenHash
  };
  const activeTokens = getUserActivationTokenRecords(user, now).filter((token) => token.tokenHash !== nextToken.tokenHash);

  return [...activeTokens, nextToken].slice(-maxActivationTokensPerUser);
}

function hashesMatch(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isUserActivationTokenValid(user: ManagedAppUser, token: string, now = new Date()) {
  const submittedHash = hashUserActivationToken(token);

  if (!token) return false;

  return getUserActivationTokenRecords(user, now).some((record) => hashesMatch(submittedHash, record.tokenHash));
}
