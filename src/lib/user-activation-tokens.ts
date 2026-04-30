import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import { listManagedUsers } from "@/lib/program-store";

const activationTokenTtlHours = 48;

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

function hashesMatch(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isUserActivationTokenValid(user: ManagedAppUser, token: string, now = new Date()) {
  const tokenHash = user.activationTokenHash;
  const expiresAt = user.activationTokenExpiresAt;

  if (!token || !tokenHash || !expiresAt) return false;
  if (Number.isNaN(new Date(expiresAt).getTime()) || new Date(expiresAt) <= now) return false;
  return hashesMatch(hashUserActivationToken(token), tokenHash);
}

export async function findManagedUserByActivationToken(token: string) {
  const users = await listManagedUsers();
  return users.find((user) => isUserActivationTokenValid(user, token)) ?? null;
}
