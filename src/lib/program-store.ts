import "server-only";
import type { ActiveProgramReview } from "@/lib/active-program-types";
import type { AssistantServiceResponse } from "@/lib/assistant-types";
import type { LeadershipReviewInput } from "@/lib/leadership-feedback-types";
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

export async function createLeadershipFeedback(programId: string, feedback: LeadershipReviewInput) {
  return getProgramRepository().createLeadershipFeedback(programId, feedback);
}
