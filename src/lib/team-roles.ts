import type { ProgramIntake } from "./program-intake-types.ts";

export const defaultTeamRoles = [
  "Product Management",
  "Business Analysis",
  "User Experience",
  "Application Development",
  "Data Engineering",
  "Change Management"
] as const;

function normalizeRoleName(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function normalizeTeamRoles(roles: Array<string | null | undefined> | undefined, fallback: readonly string[] = defaultTeamRoles) {
  const source = roles?.length ? roles : fallback;
  const rolesByKey = new Map<string, string>();

  for (const role of source) {
    const normalized = normalizeRoleName(role);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (!rolesByKey.has(key)) {
      rolesByKey.set(key, normalized);
    }
  }

  return Array.from(rolesByKey.values());
}

export type ProgramRoleAddResult =
  | {
      ok: true;
      intake: ProgramIntake;
      role: string;
      roles: string[];
    }
  | {
      ok: false;
      error: string;
      role?: string;
      roles: string[];
    };

export function addProgramRoleToIntake(intake: ProgramIntake, rawRole: string | null | undefined): ProgramRoleAddResult {
  const role = normalizeRoleName(rawRole);
  const roles = normalizeTeamRoles(intake.teamRoles);

  if (!role) {
    return {
      ok: false,
      error: "Enter a role name before adding it to the program.",
      roles
    };
  }

  const duplicate = roles.find((existingRole) => existingRole.toLowerCase() === role.toLowerCase());
  if (duplicate) {
    return {
      ok: false,
      error: `${duplicate} is already part of this program.`,
      role: duplicate,
      roles
    };
  }

  const nextRoles = [...roles, role];
  return {
    ok: true,
    intake: {
      ...intake,
      teamRoles: nextRoles
    },
    role,
    roles: nextRoles
  };
}
