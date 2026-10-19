import "server-only";
import type { AuditEventInput } from "@/lib/audit-event-types";
import type { ManagedAppUserInput } from "@/lib/admin-user-types";
import type { ActiveProgramReview } from "@/lib/active-program-types";
import type { ClientPortalUpdateInput } from "@/lib/client-portal-update-types";
import type { LeadershipReviewInput } from "@/lib/leadership-feedback-types";
import type {
  ClientDecisionRequestInput,
  GuidanceFeedbackFlag,
  GuidanceJustificationRecord,
  OpenAIUsageRecordInput,
  ProgramMeetingInput
} from "@/lib/program-intelligence-types";
import type { ProgramIntake } from "@/lib/program-intake-types";
import { getProgramRepository } from "@/lib/program-repository";
import type { RoleArtifactDraft, RoleArtifactType } from "@/lib/role-artifact-types";
import { isDemoMode } from "@/lib/demo-session";

async function getWorkspaceRepository() {
  if (await isDemoMode()) {
    const { getDemoProgramRepository } = await import("@/lib/demo-program-repository");
    return getDemoProgramRepository();
  }
  return getProgramRepository();
}

export async function listPrograms() {
  return (await getWorkspaceRepository()).listPrograms();
}

export async function getProgram(programId: string) {
  return (await getWorkspaceRepository()).getProgram(programId);
}

export async function upsertProgram(intake: ProgramIntake) {
  return (await getWorkspaceRepository()).upsertProgram(intake);
}

export async function listProgramUpdates(programId: string) {
  return (await getWorkspaceRepository()).listProgramUpdates(programId);
}

export async function listAllProgramUpdates() {
  return (await getWorkspaceRepository()).listAllProgramUpdates();
}

export async function createProgramUpdate(programId: string, review: ActiveProgramReview) {
  return (await getWorkspaceRepository()).createProgramUpdate(programId, review);
}

export async function deleteProgramUpdatesByTag(programId: string, tag: string) {
  return (await getWorkspaceRepository()).deleteProgramUpdatesByTag(programId, tag);
}

export async function getLatestGuidedPlan(programId: string) {
  return (await getWorkspaceRepository()).getLatestGuidedPlan(programId);
}

export async function createGuidedPlan(programId: string) {
  return (await getWorkspaceRepository()).createGuidedPlan(programId);
}

export async function listLeadershipFeedback(programId: string) {
  return (await getWorkspaceRepository()).listLeadershipFeedback(programId);
}

export async function listAllLeadershipFeedback() {
  return (await getWorkspaceRepository()).listAllLeadershipFeedback();
}

export async function createLeadershipFeedback(programId: string, feedback: LeadershipReviewInput) {
  return (await getWorkspaceRepository()).createLeadershipFeedback(programId, feedback);
}

export async function listMeetingInputs(programId: string) {
  return (await getWorkspaceRepository()).listMeetingInputs(programId);
}

export async function createMeetingInput(
  programId: string,
  input: Omit<ProgramMeetingInput, "id" | "programId" | "programName" | "createdAt" | "updatedAt">
) {
  return (await getWorkspaceRepository()).createMeetingInput(programId, input);
}

export async function listRoleArtifacts(programId: string, artifactType?: RoleArtifactType) {
  return (await getWorkspaceRepository()).listRoleArtifacts(programId, artifactType);
}

export async function createRoleArtifact(programId: string, artifact: RoleArtifactDraft) {
  return (await getWorkspaceRepository()).createRoleArtifact(programId, artifact);
}

export async function listClientDecisionRequests(programId: string) {
  return (await getWorkspaceRepository()).listClientDecisionRequests(programId);
}

export async function createClientDecisionRequest(programId: string, input: ClientDecisionRequestInput) {
  return (await getWorkspaceRepository()).createClientDecisionRequest(programId, input);
}

export async function listClientPortalUpdates(programId: string) {
  return (await getWorkspaceRepository()).listClientPortalUpdates(programId);
}

export async function createClientPortalUpdate(programId: string, input: ClientPortalUpdateInput) {
  return (await getWorkspaceRepository()).createClientPortalUpdate(programId, input);
}

export async function deleteClientPortalUpdatesByTag(programId: string, tag: string) {
  return (await getWorkspaceRepository()).deleteClientPortalUpdatesByTag(programId, tag);
}

export async function listGuidanceJustifications(programId: string) {
  return (await getWorkspaceRepository()).listGuidanceJustifications(programId);
}

export async function createGuidanceJustification(record: GuidanceJustificationRecord) {
  return (await getWorkspaceRepository()).createGuidanceJustification(record);
}

export async function listGuidanceFeedbackFlags(programId: string) {
  return (await getWorkspaceRepository()).listGuidanceFeedbackFlags(programId);
}

export async function createGuidanceFeedbackFlag(
  programId: string,
  flag: Omit<GuidanceFeedbackFlag, "id" | "programId" | "programName" | "createdAt" | "updatedAt" | "status">
) {
  return (await getWorkspaceRepository()).createGuidanceFeedbackFlag(programId, flag);
}

export async function reviewGuidanceFeedbackFlag(
  programId: string,
  flagId: string,
  review: { status: "approved" | "denied"; reviewedBy: string; leadershipDisposition: string }
) {
  return (await getWorkspaceRepository()).reviewGuidanceFeedbackFlag(programId, flagId, review);
}

export async function listOpenAIUsageRecords(programId: string) {
  return (await getWorkspaceRepository()).listOpenAIUsageRecords(programId);
}

export async function listAllOpenAIUsageRecords() {
  return (await getWorkspaceRepository()).listAllOpenAIUsageRecords();
}

export async function createOpenAIUsageRecord(programId: string, usage: OpenAIUsageRecordInput) {
  return (await getWorkspaceRepository()).createOpenAIUsageRecord(programId, usage);
}

export async function listAuditEvents(limit?: number) {
  return (await getWorkspaceRepository()).listAuditEvents(limit);
}

export async function createAuditEvent(input: AuditEventInput) {
  return (await getWorkspaceRepository()).createAuditEvent(input);
}

export async function listManagedUsers() {
  return getProgramRepository().listManagedUsers();
}

export async function upsertManagedUser(input: ManagedAppUserInput) {
  return getProgramRepository().upsertManagedUser(input);
}

export async function deleteManagedUser(userId: string) {
  return getProgramRepository().deleteManagedUser(userId);
}
