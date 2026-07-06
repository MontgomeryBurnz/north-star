export const appUserTypes = [
  "admin",
  "leadership",
  "delivery-lead",
  "team-member",
  "client-dashboard-contributor",
  "client",
  "viewer"
] as const;

export const appUserCredentialStatuses = ["not-invited", "invited", "active", "disabled"] as const;

export type AppUserType = (typeof appUserTypes)[number];

export type AppUserCredentialStatus = (typeof appUserCredentialStatuses)[number];

export type ManagedProgramAssignment = {
  id: string;
  programId: string;
  programName: string;
  role: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ManagedUserActivationToken = {
  createdAt: string;
  expiresAt: string;
  tokenHash: string;
};

export type ManagedAppUser = {
  id: string;
  name: string;
  email: string;
  userType: AppUserType;
  credentialStatus: AppUserCredentialStatus;
  authUserId?: string;
  activationTokenCreatedAt?: string;
  activationTokenExpiresAt?: string;
  activationTokenHash?: string;
  activationTokens?: ManagedUserActivationToken[];
  invitedAt?: string;
  lastAuthSyncAt?: string;
  invitationError?: string;
  assignments: ManagedProgramAssignment[];
  createdAt: string;
  updatedAt: string;
};

export type ManagedProgramAssignmentInput = Partial<
  Pick<ManagedProgramAssignment, "id" | "programId" | "programName" | "role" | "isPrimary">
>;

export type ManagedAppUserInput = Partial<
  Pick<
    ManagedAppUser,
    | "id"
    | "name"
    | "email"
    | "userType"
    | "credentialStatus"
    | "authUserId"
    | "activationTokenCreatedAt"
    | "activationTokenExpiresAt"
    | "activationTokenHash"
    | "activationTokens"
    | "invitedAt"
    | "lastAuthSyncAt"
    | "invitationError"
  >
> & {
  assignment?: ManagedProgramAssignmentInput;
  assignments?: ManagedProgramAssignmentInput[];
  replaceAssignments?: boolean;
};

export function isProgramScopedUserType(userType: AppUserType) {
  return userType !== "admin";
}

export function isClientDashboardOnlyUserType(userType: AppUserType) {
  return userType === "client-dashboard-contributor";
}

export function isExternalOnlyUserType(userType: AppUserType) {
  return userType === "client" || isClientDashboardOnlyUserType(userType);
}

export function shouldScopeManagedUserPrograms(
  user: Pick<ManagedAppUser, "credentialStatus" | "userType"> | null | undefined
) {
  return Boolean(user && user.userType !== "admin");
}

export function getAssignedProgramIdSet(user: Pick<ManagedAppUser, "assignments"> | null | undefined) {
  return new Set((user?.assignments ?? []).map((assignment) => assignment.programId));
}

export function hasAssignedProgram(
  user: Pick<ManagedAppUser, "assignments"> | null | undefined,
  programId: string
) {
  return getAssignedProgramIdSet(user).has(programId);
}

export function canAccessAdminSurface(user: Pick<ManagedAppUser, "credentialStatus" | "userType"> | null | undefined) {
  return Boolean(user && user.credentialStatus === "active" && user.userType === "admin");
}

export function hasActiveUserCredentials(user: Pick<ManagedAppUser, "credentialStatus"> | null | undefined) {
  return Boolean(user && user.credentialStatus === "active");
}

export function requiresUserSetup(user: Pick<ManagedAppUser, "credentialStatus"> | null | undefined) {
  return Boolean(user && (user.credentialStatus === "invited" || user.credentialStatus === "not-invited"));
}

export function canAccessLeadershipSurface(user: Pick<ManagedAppUser, "credentialStatus" | "userType"> | null | undefined) {
  return Boolean(
    user &&
      user.credentialStatus === "active" &&
      (user.userType === "admin" || user.userType === "leadership")
  );
}

export function canAccessProgramScope(
  user: Pick<ManagedAppUser, "assignments" | "credentialStatus" | "userType"> | null | undefined,
  programId: string
) {
  if (!user || user.credentialStatus !== "active") return false;
  if (user.userType === "admin") return true;
  if (isExternalOnlyUserType(user.userType)) return false;
  return hasAssignedProgram(user, programId);
}

export function canAccessClientDashboardScope(
  user: Pick<ManagedAppUser, "assignments" | "credentialStatus" | "userType"> | null | undefined,
  programId: string
) {
  if (!user || user.credentialStatus !== "active") return false;
  if (user.userType === "admin") return true;
  return hasAssignedProgram(user, programId);
}

export function canAccessClientDashboardUpdateSurface(
  user: Pick<ManagedAppUser, "credentialStatus" | "userType"> | null | undefined
) {
  return Boolean(
    user &&
      user.credentialStatus === "active" &&
      (user.userType === "admin" ||
        user.userType === "leadership" ||
        user.userType === "delivery-lead" ||
        user.userType === "team-member" ||
        user.userType === "client-dashboard-contributor")
  );
}
