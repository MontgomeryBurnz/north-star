import type { ManagedAppUser, ManagedProgramAssignment } from "@/lib/admin-user-types";

export type RoleAwareUiProfile = {
  assignedRole: string | null;
  assignment: ManagedProgramAssignment | null;
  defaultRole: string | null;
  isAdmin: boolean;
  isScoped: boolean;
  mode: "admin" | "assigned-role" | "unassigned";
  roleOptions: string[];
  summary: string;
};

function normalizeRole(value: string) {
  return value.trim().toLowerCase();
}

function uniqueRoles(roles: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const role of roles) {
    const trimmed = role.trim();
    const key = normalizeRole(trimmed);
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    next.push(trimmed);
  }

  return next;
}

export function getProgramAssignmentForUser(
  user: Pick<ManagedAppUser, "assignments" | "userType"> | null | undefined,
  programId: string
) {
  if (!user || !programId) return null;
  return user.assignments.find((assignment) => assignment.programId === programId) ?? null;
}

export function buildRoleAwareUiProfile(
  user: Pick<ManagedAppUser, "assignments" | "userType"> | null | undefined,
  programId: string,
  availableRoles: string[]
): RoleAwareUiProfile {
  const isAdmin = user?.userType === "admin";
  const assignment = getProgramAssignmentForUser(user, programId);
  const assignedRole = assignment?.role?.trim() || null;
  const canonicalAssignedRole =
    (assignedRole && availableRoles.find((role) => normalizeRole(role) === normalizeRole(assignedRole))) || assignedRole;
  const defaultRole = canonicalAssignedRole ?? null;
  const roleOptions = uniqueRoles(defaultRole ? [defaultRole, ...availableRoles] : availableRoles);

  if (isAdmin) {
    return {
      assignedRole: null,
      assignment: null,
      defaultRole,
      isAdmin: true,
      isScoped: false,
      mode: "admin",
      roleOptions,
      summary: "Admin view: full program context is visible."
    };
  }

  if (assignment && defaultRole) {
    return {
      assignedRole: defaultRole,
      assignment,
      defaultRole,
      isAdmin: false,
      isScoped: true,
      mode: "assigned-role",
      roleOptions,
      summary: `Role-aware view: ${defaultRole} is centered for this program.`
    };
  }

  return {
    assignedRole: null,
    assignment: null,
    defaultRole: null,
    isAdmin: false,
    isScoped: Boolean(user),
    mode: "unassigned",
    roleOptions,
    summary: user ? "No role assignment is mapped for this program yet." : "Sign in to apply role-aware defaults."
  };
}
