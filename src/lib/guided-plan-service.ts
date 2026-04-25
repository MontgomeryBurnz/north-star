import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { AssistantConversationTurn } from "@/lib/assistant-conversation-types";
import { localGuidedPlanProvider } from "@/lib/guided-plan-local-provider";
import { openaiGuidedPlanProvider } from "@/lib/guided-plan-openai-provider";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import type { LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import type { ProgramMeetingInput } from "@/lib/program-intelligence-types";
import type { StoredProgram } from "@/lib/program-intake-types";

export type GuidedPlanProviderId = "local" | "openai";

export type GuidedPlanGenerationContext = {
  program: StoredProgram;
  updates: StoredProgramUpdate[];
  leadershipFeedbacks: LeadershipReviewRecord[];
  assistantConversations: AssistantConversationTurn[];
  meetingInputs: ProgramMeetingInput[];
};

export type GuidedPlanProvider = {
  id: GuidedPlanProviderId;
  generatePlan(context: GuidedPlanGenerationContext): Promise<GuidedPlan>;
};

const providers: Record<GuidedPlanProviderId, GuidedPlanProvider> = {
  local: localGuidedPlanProvider,
  openai: openaiGuidedPlanProvider
};

export function getConfiguredGuidedPlanProvider(): GuidedPlanProviderId {
  const configured = process.env.GUIDED_PLAN_PROVIDER?.trim();
  if (configured === "openai" || configured === "local") {
    return configured;
  }

  return process.env.ASSISTANT_PROVIDER === "openai" ? "openai" : "local";
}

function selectProvider() {
  return providers[getConfiguredGuidedPlanProvider()];
}

export async function generateGuidedPlan(context: GuidedPlanGenerationContext): Promise<GuidedPlan> {
  return selectProvider().generatePlan(context);
}
