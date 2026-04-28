import type { ActiveProgramReview, ActiveProgramUpdate } from "@/lib/active-program-types";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import type { GuidanceFeedbackFlag } from "@/lib/program-intelligence-types";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";

type MutationResult<TRecord> =
  | { ok: false; error: string }
  | { ok: true; record: TRecord; plan?: GuidedPlan | null };

type ProgramLoopStore = {
  createProgramUpdate: (programId: string, review: ActiveProgramReview) => Promise<ActiveProgramUpdate>;
  createLeadershipFeedback: (programId: string, feedback: LeadershipReviewInput) => Promise<LeadershipReviewRecord>;
  createGuidanceFeedbackFlag: (
    programId: string,
    input: Pick<GuidanceFeedbackFlag, "guidanceJustificationId" | "citationId" | "scope" | "userReason" | "userContext">
  ) => Promise<GuidanceFeedbackFlag>;
  getLatestGuidedPlan: (programId: string) => Promise<GuidedPlan | null>;
  createGuidedPlan: (programId: string) => Promise<GuidedPlan | null>;
};

function normalizeReview(review: Partial<ActiveProgramReview>): MutationResult<ActiveProgramReview> {
  if (!review.programName?.trim()) {
    return { ok: false, error: "Program name is required." };
  }

  return {
    ok: true,
    record: {
      programName: review.programName,
      originalNorthStar: review.originalNorthStar ?? "",
      currentPhase: review.currentPhase ?? "",
      progressSinceLastReview: review.progressSinceLastReview ?? "",
      planChanges: review.planChanges ?? "",
      activeRisks: review.activeRisks ?? "",
      stakeholderTemperature: review.stakeholderTemperature ?? "",
      decisionsPending: review.decisionsPending ?? "",
      deliveryHealth: review.deliveryHealth ?? "",
      supportNeeded: review.supportNeeded ?? "",
      updateCadence: review.updateCadence === "biweekly" ? "biweekly" : "weekly",
      cycleLabel: review.cycleLabel ?? "",
      cycleStartedAt: review.cycleStartedAt ?? "",
      programSynthesisNote: review.programSynthesisNote ?? "",
      lastUpdatedRole: review.lastUpdatedRole ?? "",
      teamRoleUpdates: Array.isArray(review.teamRoleUpdates) ? review.teamRoleUpdates : [],
      artifacts: review.artifacts ?? []
    }
  };
}

function normalizeLeadershipReview(review: Partial<LeadershipReviewInput>): MutationResult<LeadershipReviewInput> {
  if (!review.programName?.trim()) {
    return { ok: false, error: "Program name is required." };
  }

  return {
    ok: true,
    record: {
      programName: review.programName,
      timelineSummary: review.timelineSummary ?? "",
      progressHighlights: review.progressHighlights ?? "",
      activeRisks: review.activeRisks ?? "",
      leadershipGuidance: review.leadershipGuidance ?? "",
      supportRequests: review.supportRequests ?? "",
      feedbackToDeliveryLead: review.feedbackToDeliveryLead ?? ""
    }
  };
}

function normalizeGuidanceFlag(flag: Partial<GuidanceFeedbackFlag>): MutationResult<
  Pick<GuidanceFeedbackFlag, "guidanceJustificationId" | "citationId" | "scope" | "userReason" | "userContext">
> {
  if (!flag.guidanceJustificationId?.trim()) {
    return { ok: false, error: "Guidance justification is required." };
  }

  if (!flag.userReason?.trim()) {
    return { ok: false, error: "A flag reason is required." };
  }

  if (!flag.userContext?.trim()) {
    return { ok: false, error: "User context is required." };
  }

  return {
    ok: true,
    record: {
      guidanceJustificationId: flag.guidanceJustificationId,
      citationId: flag.citationId?.trim() || undefined,
      scope: flag.scope === "partial" ? "partial" : "whole",
      userReason: flag.userReason,
      userContext: flag.userContext
    }
  };
}

function shouldCreateGuidedPlan(latestPlan: GuidedPlan | null, sourceRecordId: string) {
  return !latestPlan?.sourceRecordIds.includes(sourceRecordId);
}

export async function saveActiveProgramReview(
  store: Pick<ProgramLoopStore, "createProgramUpdate" | "getLatestGuidedPlan" | "createGuidedPlan">,
  programId: string,
  review: Partial<ActiveProgramReview>
): Promise<MutationResult<ActiveProgramUpdate>> {
  const normalized = normalizeReview(review);
  if (!normalized.ok) return normalized;

  const record = await store.createProgramUpdate(programId, normalized.record);
  const latestPlan = await store.getLatestGuidedPlan(programId);
  const plan = shouldCreateGuidedPlan(latestPlan, record.id) ? await store.createGuidedPlan(programId) : latestPlan;

  return { ok: true, record, plan };
}

export async function saveLeadershipReview(
  store: Pick<ProgramLoopStore, "createLeadershipFeedback" | "getLatestGuidedPlan" | "createGuidedPlan">,
  programId: string,
  review: Partial<LeadershipReviewInput>
): Promise<MutationResult<LeadershipReviewRecord>> {
  const normalized = normalizeLeadershipReview(review);
  if (!normalized.ok) return normalized;

  const record = await store.createLeadershipFeedback(programId, normalized.record);
  const latestPlan = await store.getLatestGuidedPlan(programId);
  const plan = shouldCreateGuidedPlan(latestPlan, record.id) ? await store.createGuidedPlan(programId) : latestPlan;

  return { ok: true, record, plan };
}

export async function createGovernanceFlag(
  store: Pick<ProgramLoopStore, "createGuidanceFeedbackFlag">,
  programId: string,
  flag: Partial<GuidanceFeedbackFlag>
): Promise<MutationResult<GuidanceFeedbackFlag>> {
  const normalized = normalizeGuidanceFlag(flag);
  if (!normalized.ok) return normalized;

  const record = await store.createGuidanceFeedbackFlag(programId, normalized.record);
  return { ok: true, record };
}
