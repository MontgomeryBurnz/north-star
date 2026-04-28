import "server-only";

import {
  buildGuidedPlanBundle,
  buildLeadershipReviewQueueFromStore,
  type ProgramAggregateStore,
  type GuidedPlanBundle
} from "@/lib/program-aggregate-builders";
import {
  getLatestGuidedPlan,
  getProgram,
  listAllLeadershipFeedback,
  listAllProgramUpdates,
  listAssistantConversations,
  listGuidanceFeedbackFlags,
  listGuidanceJustifications,
  listLeadershipFeedback,
  listProgramUpdates,
  listPrograms
} from "@/lib/program-store";

const programAggregateStore: ProgramAggregateStore = {
  getProgram,
  getLatestGuidedPlan,
  listProgramUpdates,
  listLeadershipFeedback,
  listAssistantConversations,
  listGuidanceJustifications,
  listGuidanceFeedbackFlags,
  listPrograms,
  listAllLeadershipFeedback,
  listAllProgramUpdates
};

export async function getGuidedPlanBundle(programId: string): Promise<GuidedPlanBundle> {
  return buildGuidedPlanBundle(programAggregateStore, programId);
}

export async function getLeadershipReviewQueue() {
  return buildLeadershipReviewQueueFromStore(programAggregateStore);
}
