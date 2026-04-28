import "server-only";

import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { AssistantConversationTurn } from "@/lib/assistant-conversation-types";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import { buildDeliveryLeadershipSignal } from "@/lib/leadership-signal";
import { buildLeadershipReviewQueue, type ReviewQueueItem } from "@/lib/leadership-review-queue";
import type { DeliveryLeadershipSignal, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import type { GuidanceFeedbackFlag, GuidanceJustificationRecord } from "@/lib/program-intelligence-types";
import type { StoredProgram } from "@/lib/program-intake-types";
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

export type GuidedPlanBundle = {
  program: StoredProgram | null;
  plan: GuidedPlan | null;
  updates: StoredProgramUpdate[];
  assistantConversations: AssistantConversationTurn[];
  leadershipSignal: DeliveryLeadershipSignal;
  justifications: GuidanceJustificationRecord[];
  flags: GuidanceFeedbackFlag[];
  fetchedAt: string;
};

export async function getGuidedPlanBundle(programId: string): Promise<GuidedPlanBundle> {
  const [program, plan, updates, feedbacks, assistantConversations, justifications, flags] = await Promise.all([
    getProgram(programId),
    getLatestGuidedPlan(programId),
    listProgramUpdates(programId),
    listLeadershipFeedback(programId),
    listAssistantConversations(programId),
    listGuidanceJustifications(programId),
    listGuidanceFeedbackFlags(programId)
  ]);

  return {
    program,
    plan,
    updates,
    assistantConversations,
    leadershipSignal: buildDeliveryLeadershipSignal(feedbacks[0] ?? null, plan),
    justifications,
    flags,
    fetchedAt: new Date().toISOString()
  };
}

export async function getLeadershipReviewQueue() {
  const [programs, allFeedback, allUpdates] = await Promise.all([
    listPrograms(),
    listAllLeadershipFeedback(),
    listAllProgramUpdates()
  ]);

  return buildLeadershipReviewQueue({
    programs,
    feedbackByProgramId: groupByProgramId(allFeedback),
    updatesByProgramId: groupByProgramId(allUpdates)
  });
}

function groupByProgramId<T extends { programId: string }>(records: T[]) {
  const map = new Map<string, T[]>();
  for (const record of records) {
    const current = map.get(record.programId);
    if (current) {
      current.push(record);
    } else {
      map.set(record.programId, [record]);
    }
  }
  return map;
}
