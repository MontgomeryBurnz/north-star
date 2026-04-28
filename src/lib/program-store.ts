import "server-only";
import type { ActiveProgramReview } from "@/lib/active-program-types";
import type { AssistantServiceResponse } from "@/lib/assistant-types";
import type { LeadershipReviewInput } from "@/lib/leadership-feedback-types";
import type { GuidanceFeedbackFlag, GuidanceJustificationRecord, ProgramMeetingInput } from "@/lib/program-intelligence-types";
import type { ProgramIntake } from "@/lib/program-intake-types";
import { getProgramRepository } from "@/lib/program-repository";

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
