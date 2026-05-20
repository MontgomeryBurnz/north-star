import "server-only";
import { listManagedUsers } from "@/lib/program-store";
import {
  appendUserActivationToken,
  createUserActivationToken,
  getUserActivationTokenRecords,
  hashUserActivationToken,
  isUserActivationTokenValid
} from "@/lib/user-activation-token-core";

export {
  appendUserActivationToken,
  createUserActivationToken,
  getUserActivationTokenRecords,
  hashUserActivationToken,
  isUserActivationTokenValid
};

export async function findManagedUserByActivationToken(token: string) {
  const users = await listManagedUsers();
  return users.find((user) => isUserActivationTokenValid(user, token)) ?? null;
}
