import "server-only";
import type { AuditEventInput } from "@/lib/audit-event-types";
import type { ManagedAppUserInput } from "@/lib/admin-user-types";
import type { ActiveProgramReview } from "@/lib/active-program-types";
import type { AssistantServiceResponse } from "@/lib/assistant-types";
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

export async function listPrograms() {
  return getProgramRepository().listPrograms();
}

export async function getProgram(programId: string) {
  return getProgramRepository().getProgram(programId);
}

export async function upsertProgram(intake: ProgramIntake) {
  return getProgramRepository().upsertProgram(intake);
}

export async function listProgramUpdates(programId: string) {
  return getProgramRepository().listProgramUpdates(programId);
}

export async function listAllProgramUpdates() {
  return getProgramRepository().listAllProgramUpdates();
}

export async function createProgramUpdate(programId: string, review: ActiveProgramReview) {
  return getProgramRepository().createProgramUpdate(programId, review);
}

export async function listAssistantConversations(programId: string) {
  return getProgramRepository().listAssistantConversations(programId);
}

export async function createAssistantConversation(programId: string, prompt: string, response: AssistantServiceResponse) {
  return getProgramRepository().createAssistantConversation(programId, prompt, response);
}

export async function getLatestGuidedPlan(programId: string) {
  return getProgramRepository().getLatestGuidedPlan(programId);
}

export async function createGuidedPlan(programId: string) {
  return getProgramRepository().createGuidedPlan(programId);
}

export async function listLeadershipFeedback(programId: string) {
  return getProgramRepository().listLeadershipFeedback(programId);
}

export async function listAllLeadershipFeedback() {
  return getProgramRepository().listAllLeadershipFeedback();
}

export async function createLeadershipFeedback(programId: string, feedback: LeadershipReviewInput) {
  return getProgramRepository().createLeadershipFeedback(programId, feedback);
}

export async function listMeetingInputs(programId: string) {
  return getProgramRepository().listMeetingInputs(programId);
}

export async function createMeetingInput(
  programId: string,
  input: Omit<ProgramMeetingInput, "id" | "programId" | "programName" | "createdAt" | "updatedAt">
) {
  return getProgramRepository().createMeetingInput(programId, input);
}

export async function listRoleArtifacts(programId: string, artifactType?: RoleArtifactType) {
  return getProgramRepository().listRoleArtifacts(programId, artifactType);
}

export async function createRoleArtifact(programId: string, artifact: RoleArtifactDraft) {
  return getProgramRepository().createRoleArtifact(programId, artifact);
}

export async function listClientDecisionRequests(programId: string) {
  return getProgramRepository().listClientDecisionRequests(programId);
}

export async function createClientDecisionRequest(programId: string, input: ClientDecisionRequestInput) {
  return getProgramRepository().createClientDecisionRequest(programId, input);
}

export async function listGuidanceJustifications(programId: string) {
  return getProgramRepository().listGuidanceJustifications(programId);
}

export async function createGuidanceJustification(record: GuidanceJustificationRecord) {
  return getProgramRepository().createGuidanceJustification(record);
}

export async function listGuidanceFeedbackFlags(programId: string) {
  return getProgramRepository().listGuidanceFeedbackFlags(programId);
}

export async function createGuidanceFeedbackFlag(
  programId: string,
  flag: Omit<GuidanceFeedbackFlag, "id" | "programId" | "programName" | "createdAt" | "updatedAt" | "status">
) {
  return getProgramRepository().createGuidanceFeedbackFlag(programId, flag);
}

export async function reviewGuidanceFeedbackFlag(
  programId: string,
  flagId: string,
  review: { status: "approved" | "denied"; reviewedBy: string; leadershipDisposition: string }
) {
  return getProgramRepository().reviewGuidanceFeedbackFlag(programId, flagId, review);
}

export async function listOpenAIUsageRecords(programId: string) {
  return getProgramRepository().listOpenAIUsageRecords(programId);
}

export async function listAllOpenAIUsageRecords() {
  return getProgramRepository().listAllOpenAIUsageRecords();
}

export async function createOpenAIUsageRecord(programId: string, usage: OpenAIUsageRecordInput) {
  return getProgramRepository().createOpenAIUsageRecord(programId, usage);
}

export async function listAuditEvents(limit?: number) {
  return getProgramRepository().listAuditEvents(limit);
}

export async function createAuditEvent(input: AuditEventInput) {
  return getProgramRepository().createAuditEvent(input);
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
