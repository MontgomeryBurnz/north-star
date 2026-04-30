import "server-only";
import type { User } from "@supabase/supabase-js";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import { listManagedUsers, upsertManagedUser } from "@/lib/program-store";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function matchManagedUser(users: ManagedAppUser[], authUser: Pick<User, "id" | "email">) {
  const email = normalizeEmail(authUser.email);
  return users.find((user) => user.authUserId === authUser.id || (email && user.email === email)) ?? null;
}

export async function syncManagedUserFromAuthUser(authUser: Pick<User, "id" | "email">) {
  const managedUsers = await listManagedUsers();
  const managedUser = matchManagedUser(managedUsers, authUser);

  if (!managedUser || managedUser.credentialStatus === "disabled") {
    return managedUser;
  }

  if (managedUser.credentialStatus === "active" && managedUser.authUserId === authUser.id) {
    return managedUser;
  }

  return upsertManagedUser({
    id: managedUser.id,
    name: managedUser.name,
    email: managedUser.email,
    userType: managedUser.userType,
    credentialStatus: "active",
    authUserId: authUser.id,
    lastAuthSyncAt: new Date().toISOString(),
    invitationError: ""
  });
}

export async function getCurrentManagedUser() {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  return syncManagedUserFromAuthUser(authUser);
}
