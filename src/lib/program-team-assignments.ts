import type { ManagedAppUser } from "@/lib/admin-user-types";

export type ProgramTeamAssignmentSummary = {
  role: string;
  owners: string[];
};

function normalizeRoleKey(role: string) {
  return role.trim().toLowerCase();
}

export function buildProgramTeamAssignments({
  programId,
  roles,
  users
}: {
  programId: string;
  roles: string[];
  users: ManagedAppUser[];
}): ProgramTeamAssignmentSummary[] {
  const ownersByRole = new Map(roles.map((role) => [normalizeRoleKey(role), new Set<string>()]));
  const displayRoleByKey = new Map(roles.map((role) => [normalizeRoleKey(role), role]));

  for (const user of users) {
    if (user.credentialStatus === "disabled") continue;

    for (const assignment of user.assignments) {
      if (assignment.programId !== programId) continue;

      const roleKey = normalizeRoleKey(assignment.role);
      const owners = ownersByRole.get(roleKey);
      if (!owners) continue;

      owners.add(user.name.trim() || user.email);
    }
  }

  return Array.from(ownersByRole.entries()).map(([roleKey, owners]) => ({
    role: displayRoleByKey.get(roleKey) ?? roleKey,
    owners: Array.from(owners).sort((a, b) => a.localeCompare(b))
  }));
}
