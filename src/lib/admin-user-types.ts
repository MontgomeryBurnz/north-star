export const appUserTypes = ["admin", "leadership", "delivery-lead", "team-member", "client", "viewer"] as const;

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

export type ManagedAppUser = {
  id: string;
  name: string;
  email: string;
  userType: AppUserType;
  credentialStatus: AppUserCredentialStatus;
  authUserId?: string;
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
    "id" | "name" | "email" | "userType" | "credentialStatus" | "authUserId" | "invitedAt" | "lastAuthSyncAt" | "invitationError"
  >
> & {
  assignment?: ManagedProgramAssignmentInput;
  assignments?: ManagedProgramAssignmentInput[];
  replaceAssignments?: boolean;
};

export function isProgramScopedUserType(userType: AppUserType) {
  return userType !== "admin";
}
