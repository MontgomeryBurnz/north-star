import type { ActiveProgramReview, ActiveProgramUpdate } from "@/lib/active-program-types";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import type { GuidanceFeedbackFlag } from "@/lib/program-intelligence-types";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";

type MutationResult<TRecord> =
  | { ok: false; error: string }
  | { ok: true; record: TRecord; plan?: GuidedPlan | null; planRefresh?: PlanRefreshResult };

export type PlanRefreshResult = {
  error?: string;
  status: "current" | "failed" | "refreshed";
};

type ProgramLoopStore = {
  createProgramUpdate: (programId: string, review: ActiveProgramReview) => Promise<ActiveProgramUpdate>;
  createLeadershipFeedback: (programId: string, feedback: LeadershipReviewInput) => Promise<LeadershipReviewRecord>;
  createGuidanceFeedbackFlag: (
    programId: string,
    input: Pick<
      GuidanceFeedbackFlag,
      "guidanceJustificationId" | "citationId" | "targetType" | "targetLabel" | "targetRole" | "scope" | "userReason" | "userContext"
    >
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
      executiveSponsor: review.executiveSponsor ?? "",
      programLead: review.programLead ?? "",
      pmo: review.pmo ?? "",
      originalNorthStar: review.originalNorthStar ?? "",
      currentPhase: review.currentPhase ?? "",
      programCompletionPercent: review.programCompletionPercent ?? "",
      completionDelta: review.completionDelta ?? "",
      nextMilestoneName: review.nextMilestoneName ?? "",
      nextMilestoneDate: review.nextMilestoneDate ?? "",
      nextMilestonePriority: review.nextMilestonePriority ?? "",
      programStartDate: review.programStartDate ?? "",
      programTargetFinishDate: review.programTargetFinishDate ?? "",
      clientStatusNote: review.clientStatusNote ?? "",
      progressSinceLastReview: review.progressSinceLastReview ?? "",
      planChanges: review.planChanges ?? "",
      activeRisks: review.activeRisks ?? "",
      stakeholderTemperature: review.stakeholderTemperature ?? "",
      decisionsPending: review.decisionsPending ?? "",
      deliveryHealth: review.deliveryHealth ?? "",
      supportNeeded: review.supportNeeded ?? "",
      updateCadence: review.updateCadence === "biweekly" ? "biweekly" : "weekly",
      timelineScale: review.timelineScale === "month" || review.timelineScale === "week" ? review.timelineScale : "year",
      timelineYear: review.timelineYear ?? "",
      timelineMonth: review.timelineMonth ?? "",
      timelineWeek: review.timelineWeek ?? "",
      programMilestones: Array.isArray(review.programMilestones)
        ? review.programMilestones
            .map((milestone, index) => ({
              id: milestone.id || `milestone-${index}`,
              name: milestone.name?.trim() ?? "",
              date: milestone.date ?? "",
              status:
                milestone.status === "complete" || milestone.status === "current" || milestone.status === "next"
                  ? milestone.status
                  : "next",
              priority:
                milestone.priority === "High" || milestone.priority === "Medium" || milestone.priority === "Low"
                  ? milestone.priority
                  : undefined,
              note: milestone.note ?? ""
            }))
            .filter((milestone) => milestone.name || milestone.date || milestone.note)
        : [],
      cycleLabel: review.cycleLabel ?? "",
      cycleStartedAt: review.cycleStartedAt ?? "",
      programSynthesisNote: review.programSynthesisNote ?? "",
      lastUpdatedRole: review.lastUpdatedRole ?? "",
      teamRoleUpdates: Array.isArray(review.teamRoleUpdates) ? review.teamRoleUpdates : [],
      deliveryBoardItems: Array.isArray(review.deliveryBoardItems) ? review.deliveryBoardItems : [],
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
  Pick<
    GuidanceFeedbackFlag,
    "guidanceJustificationId" | "citationId" | "targetType" | "targetLabel" | "targetRole" | "scope" | "userReason" | "userContext"
  >
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

  const scope = flag.scope === "partial" ? "partial" : "whole";
  const targetType =
    flag.targetType === "team-action-plan" || flag.targetType === "source-citation" || flag.targetType === "whole-rationale"
      ? flag.targetType
      : scope === "whole"
        ? "whole-rationale"
        : "source-citation";

  return {
    ok: true,
    record: {
      guidanceJustificationId: flag.guidanceJustificationId,
      citationId: flag.citationId?.trim() || undefined,
      targetType,
      targetLabel: flag.targetLabel?.trim() || undefined,
      targetRole: flag.targetRole?.trim() || undefined,
      scope,
      userReason: flag.userReason,
      userContext: flag.userContext
    }
  };
}

function shouldCreateGuidedPlan(latestPlan: GuidedPlan | null, sourceRecordId: string) {
  return !latestPlan?.sourceRecordIds.includes(sourceRecordId);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Guided plan refresh failed.";
}

async function refreshGuidedPlanAfterMutation(
  store: Pick<ProgramLoopStore, "getLatestGuidedPlan" | "createGuidedPlan">,
  programId: string,
  sourceRecordId: string
): Promise<{ plan: GuidedPlan | null; planRefresh: PlanRefreshResult }> {
  let latestPlan: GuidedPlan | null = null;

  try {
    latestPlan = await store.getLatestGuidedPlan(programId);
  } catch (error) {
    return {
      plan: null,
      planRefresh: {
        error: getErrorMessage(error),
        status: "failed"
      }
    };
  }

  if (!shouldCreateGuidedPlan(latestPlan, sourceRecordId)) {
    return {
      plan: latestPlan,
      planRefresh: { status: "current" }
    };
  }

  try {
    const plan = await store.createGuidedPlan(programId);
    if (!plan) {
      return {
        plan: null,
        planRefresh: {
          error: "Guided plan was not created.",
          status: "failed"
        }
      };
    }

    return {
      plan,
      planRefresh: {
        status: plan.sourceRecordIds.includes(sourceRecordId) ? "refreshed" : "current"
      }
    };
  } catch (error) {
    return {
      plan: latestPlan,
      planRefresh: {
        error: getErrorMessage(error),
        status: "failed"
      }
    };
  }
}

export async function saveActiveProgramReview(
  store: Pick<ProgramLoopStore, "createProgramUpdate" | "getLatestGuidedPlan" | "createGuidedPlan">,
  programId: string,
  review: Partial<ActiveProgramReview>
): Promise<MutationResult<ActiveProgramUpdate>> {
  const normalized = normalizeReview(review);
  if (!normalized.ok) return normalized;

  const record = await store.createProgramUpdate(programId, normalized.record);
  const { plan, planRefresh } = await refreshGuidedPlanAfterMutation(store, programId, record.id);

  return { ok: true, record, plan, planRefresh };
}

export async function saveLeadershipReview(
  store: Pick<ProgramLoopStore, "createLeadershipFeedback" | "getLatestGuidedPlan" | "createGuidedPlan">,
  programId: string,
  review: Partial<LeadershipReviewInput>
): Promise<MutationResult<LeadershipReviewRecord>> {
  const normalized = normalizeLeadershipReview(review);
  if (!normalized.ok) return normalized;

  const record = await store.createLeadershipFeedback(programId, normalized.record);
  const { plan, planRefresh } = await refreshGuidedPlanAfterMutation(store, programId, record.id);

  return { ok: true, record, plan, planRefresh };
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
