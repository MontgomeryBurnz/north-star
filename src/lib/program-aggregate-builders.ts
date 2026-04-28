import type { StoredProgramUpdate } from "./active-program-types.ts";
import type { AssistantConversationTurn } from "./assistant-conversation-types.ts";
import type { GuidedPlan } from "./guided-plan-types.ts";
import { buildDeliveryLeadershipSignal } from "./leadership-signal.ts";
import { buildLeadershipReviewQueue } from "./leadership-review-queue.ts";
import type { DeliveryLeadershipSignal, LeadershipReviewRecord } from "./leadership-feedback-types.ts";
import type { GuidanceFeedbackFlag, GuidanceJustificationRecord } from "./program-intelligence-types.ts";
import type { StoredProgram } from "./program-intake-types.ts";

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

export type ProgramAggregateStore = {
  getProgram: (programId: string) => Promise<StoredProgram | null>;
  getLatestGuidedPlan: (programId: string) => Promise<GuidedPlan | null>;
  listProgramUpdates: (programId: string) => Promise<StoredProgramUpdate[]>;
  listLeadershipFeedback: (programId: string) => Promise<LeadershipReviewRecord[]>;
  listAssistantConversations: (programId: string) => Promise<AssistantConversationTurn[]>;
  listGuidanceJustifications: (programId: string) => Promise<GuidanceJustificationRecord[]>;
  listGuidanceFeedbackFlags: (programId: string) => Promise<GuidanceFeedbackFlag[]>;
  listPrograms: () => Promise<StoredProgram[]>;
  listAllLeadershipFeedback: () => Promise<LeadershipReviewRecord[]>;
  listAllProgramUpdates: () => Promise<StoredProgramUpdate[]>;
};

export async function buildGuidedPlanBundle(
  store: Pick<
    ProgramAggregateStore,
    | "getProgram"
    | "getLatestGuidedPlan"
    | "listProgramUpdates"
    | "listLeadershipFeedback"
    | "listAssistantConversations"
    | "listGuidanceJustifications"
    | "listGuidanceFeedbackFlags"
  >,
  programId: string
): Promise<GuidedPlanBundle> {
  const [program, plan, updates, feedbacks, assistantConversations, justifications, flags] = await Promise.all([
    store.getProgram(programId),
    store.getLatestGuidedPlan(programId),
    store.listProgramUpdates(programId),
    store.listLeadershipFeedback(programId),
    store.listAssistantConversations(programId),
    store.listGuidanceJustifications(programId),
    store.listGuidanceFeedbackFlags(programId)
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

export async function buildLeadershipReviewQueueFromStore(
  store: Pick<ProgramAggregateStore, "listPrograms" | "listAllLeadershipFeedback" | "listAllProgramUpdates">
) {
  const [programs, allFeedback, allUpdates] = await Promise.all([
    store.listPrograms(),
    store.listAllLeadershipFeedback(),
    store.listAllProgramUpdates()
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
