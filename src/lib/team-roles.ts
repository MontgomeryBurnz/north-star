import type { ProgramIntake, ProgramTeamFootprintRole } from "./program-intake-types.ts";

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

function normalizeRoleId(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `role-${Date.now()}`
  );
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

export function normalizeTeamFootprint(
  footprint: Array<Partial<ProgramTeamFootprintRole> | null | undefined> | undefined,
  fallbackRoles?: Array<string | null | undefined>
) {
  const rolesByKey = new Map<string, ProgramTeamFootprintRole>();
  const fallback = normalizeTeamRoles(fallbackRoles, defaultTeamRoles);

  for (const item of footprint ?? []) {
    const role = normalizeRoleName(item?.role);
    if (!role) continue;

    const key = role.toLowerCase();
    if (rolesByKey.has(key)) continue;

    rolesByKey.set(key, {
      active: item?.active !== false,
      id: normalizeRoleName(item?.id) || normalizeRoleId(role),
      owner: normalizeRoleName(item?.owner),
      responsibility: normalizeRoleName(item?.responsibility),
      role
    });
  }

  if (!rolesByKey.size) {
    for (const role of fallback) {
      rolesByKey.set(role.toLowerCase(), {
        active: true,
        id: normalizeRoleId(role),
        owner: "",
        responsibility: "",
        role
      });
    }
  }

  return Array.from(rolesByKey.values());
}

export function getProgramTeamFootprint(intake: ProgramIntake | undefined) {
  if (!intake) return normalizeTeamFootprint(undefined);
  return normalizeTeamFootprint(intake.teamFootprint, intake.teamRoles);
}

export function getProgramRoleNames(intake: ProgramIntake | undefined) {
  return getProgramTeamFootprint(intake)
    .filter((item) => item.active !== false)
    .map((item) => item.role);
}

export function getProgramRoleOwnerMap(intake: ProgramIntake | undefined) {
  const ownersByRole: Record<string, string[]> = {};

  for (const item of getProgramTeamFootprint(intake)) {
    if (item.active === false || !item.owner.trim()) continue;
    ownersByRole[item.role.trim().toLowerCase()] = [item.owner.trim()];
  }

  return ownersByRole;
}

export function getProgramRoleResponsibilityMap(intake: ProgramIntake | undefined) {
  const responsibilitiesByRole: Record<string, string> = {};

  for (const item of getProgramTeamFootprint(intake)) {
    if (item.active === false || !item.responsibility.trim()) continue;
    responsibilitiesByRole[item.role.trim().toLowerCase()] = item.responsibility.trim();
  }

  return responsibilitiesByRole;
}

export function syncProgramTeamFootprint(intake: ProgramIntake): ProgramIntake {
  const teamFootprint = normalizeTeamFootprint(intake.teamFootprint, intake.teamRoles);
  const teamRoles = teamFootprint.filter((item) => item.active !== false).map((item) => item.role);

  return {
    ...intake,
    teamFootprint,
    teamRoles
  };
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
  const footprint = getProgramTeamFootprint(intake);
  const roles = footprint.filter((item) => item.active !== false).map((item) => item.role);

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
  const nextFootprint = [
    ...footprint,
    {
      active: true,
      id: normalizeRoleId(role),
      owner: "",
      responsibility: "",
      role
    }
  ];
  return {
    ok: true,
    intake: {
      ...intake,
      teamFootprint: nextFootprint,
      teamRoles: nextRoles
    },
    role,
    roles: nextRoles
  };
}
