import type {
  AppUserCredentialStatus,
  AppUserType,
  ManagedAppUser,
  ManagedAppUserInput,
  ManagedProgramAssignment,
  ManagedProgramAssignmentInput
} from "./admin-user-types.ts";
import { appUserCredentialStatuses, appUserTypes, isProgramScopedUserType } from "./admin-user-types.ts";
import type { StoredProgram } from "./program-intake-types.ts";

type BuildManagedUserRecordInput = {
  existing?: ManagedAppUser;
  idFactory: () => string;
  input: ManagedAppUserInput;
  now: string;
  programs: StoredProgram[];
};

export type ManagedUserMutationResult =
  | { ok: true; record: ManagedAppUser }
  | { ok: false; error: string };

function normalizeEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeText(value: string | undefined) {
  return value?.trim() ?? "";
}

function isAppUserType(value: unknown): value is AppUserType {
  return typeof value === "string" && appUserTypes.includes(value as AppUserType);
}

function isCredentialStatus(value: unknown): value is AppUserCredentialStatus {
  return typeof value === "string" && appUserCredentialStatuses.includes(value as AppUserCredentialStatus);
}

function getProgramById(programs: StoredProgram[], programId: string) {
  return programs.find((program) => program.id === programId);
}

function normalizeAssignment(
  assignment: ManagedProgramAssignmentInput,
  programs: StoredProgram[],
  now: string,
  idFactory: () => string,
  existing?: ManagedProgramAssignment
): ManagedProgramAssignment | null {
  const programId = normalizeText(assignment.programId);
  const role = normalizeText(assignment.role);
  const program = getProgramById(programs, programId);

  if (!programId || !role || !program) return null;

  return {
    id: existing?.id ?? assignment.id ?? idFactory(),
    programId,
    programName: normalizeText(assignment.programName) || program.intake.programName || "Untitled program",
    role,
    isPrimary: assignment.isPrimary ?? existing?.isPrimary ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

function assignmentKey(assignment: Pick<ManagedProgramAssignment, "programId" | "role">) {
  return `${assignment.programId}::${assignment.role.trim().toLowerCase()}`;
}

function mergeAssignments(input: {
  assignments: ManagedProgramAssignmentInput[];
  existingAssignments: ManagedProgramAssignment[];
  idFactory: () => string;
  now: string;
  programs: StoredProgram[];
}) {
  const existingByKey = new Map(input.existingAssignments.map((assignment) => [assignmentKey(assignment), assignment]));
  const mergedByKey = new Map(input.existingAssignments.map((assignment) => [assignmentKey(assignment), assignment]));

  for (const assignmentInput of input.assignments) {
    const normalized = normalizeAssignment(
      assignmentInput,
      input.programs,
      input.now,
      input.idFactory,
      existingByKey.get(`${normalizeText(assignmentInput.programId)}::${normalizeText(assignmentInput.role).toLowerCase()}`)
    );

    if (normalized) {
      mergedByKey.set(assignmentKey(normalized), normalized);
    }
  }

  const assignments = Array.from(mergedByKey.values());
  const hasPrimary = assignments.some((assignment) => assignment.isPrimary);

  return assignments
    .map((assignment, index) => ({
      ...assignment,
      isPrimary: hasPrimary ? assignment.isPrimary : index === 0
    }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.programName.localeCompare(b.programName));
}

export function buildManagedAppUserRecord({
  existing,
  idFactory,
  input,
  now,
  programs
}: BuildManagedUserRecordInput): ManagedUserMutationResult {
  const email = normalizeEmail(input.email ?? existing?.email);
  const name = normalizeText(input.name ?? existing?.name);

  if (!name) {
    return { ok: false, error: "User name is required." };
  }

  if (!email || !email.includes("@")) {
    return { ok: false, error: "A valid user email is required." };
  }

  const userType = isAppUserType(input.userType) ? input.userType : existing?.userType ?? "team-member";
  const credentialStatus = isCredentialStatus(input.credentialStatus)
    ? input.credentialStatus
    : existing?.credentialStatus ?? "not-invited";
  const assignmentInputs = [input.assignment, ...(input.assignments ?? [])].filter(
    (assignment): assignment is ManagedProgramAssignmentInput => Boolean(assignment)
  );
  const assignments = isProgramScopedUserType(userType)
    ? mergeAssignments({
        assignments: assignmentInputs,
        existingAssignments: input.replaceAssignments ? [] : existing?.assignments ?? [],
        idFactory,
        now,
        programs
      })
    : [];

  if (isProgramScopedUserType(userType) && assignments.length === 0) {
    return { ok: false, error: "Select a program and program role for this user type." };
  }

  return {
    ok: true,
    record: {
      id: existing?.id ?? input.id ?? idFactory(),
      name,
      email,
      userType,
      credentialStatus,
      authUserId: normalizeText(input.authUserId) || existing?.authUserId,
      invitedAt: normalizeText(input.invitedAt) || existing?.invitedAt,
      lastAuthSyncAt: normalizeText(input.lastAuthSyncAt) || existing?.lastAuthSyncAt,
      invitationError: input.invitationError === "" ? undefined : normalizeText(input.invitationError) || existing?.invitationError,
      assignments,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
  };
}
