import "server-only";
import type { AuditActor } from "@/lib/audit-event-types";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import type { LeadershipAccessContext } from "@/lib/leadership-auth";

export function auditActorFromManagedUser(user: ManagedAppUser | null | undefined): AuditActor | undefined {
  if (!user) return undefined;

  return {
    email: user.email,
    name: user.name,
    userId: user.id,
    userType: user.userType
  };
}

export function auditActorFromAccess(access: LeadershipAccessContext): AuditActor | undefined {
  if (!access.authorized) return undefined;

  if (access.identity.type === "managed-user") {
    return {
      email: access.identity.user.email,
      name: access.identity.user.name,
      userId: access.identity.user.id,
      userType: access.identity.user.userType
    };
  }

  if (access.identity.type === "supabase-user") {
    return {
      email: access.identity.user.email ?? undefined,
      name: access.identity.user.user_metadata?.full_name ?? access.identity.user.email ?? undefined,
      userId: access.identity.user.id,
      userType: "supabase"
    };
  }

  return {
    name: "Protected admin session",
    userType: "env-session"
  };
}

export function buildSystemAuditActor(): AuditActor {
  return {
    name: "North Star",
    userType: "system"
  };
}
