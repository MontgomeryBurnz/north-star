import "server-only";

import { getLatestGuidedPlan, listLeadershipFeedback, listProgramUpdates, listPrograms } from "@/lib/program-store";
import { firstNonEmpty, firstSignal } from "@/lib/text-signals";

export type DashboardCallout = {
  id: string;
  programId: string;
  programName: string;
  type: "risk" | "timeline" | "delivery" | "decision";
  detail: string;
};

export type DashboardDueProgram = {
  programId: string;
  programName: string;
  cadence: "weekly" | "biweekly";
  status: "due" | "overdue";
  detail: string;
};

export type DashboardMetrics = {
  activePrograms: number;
  guidedPlans: number;
  riskCount: number;
  decisionCount: number;
  leadershipReviewsDue: number;
  duePrograms: DashboardDueProgram[];
  actionableCallouts: number;
  callouts: DashboardCallout[];
  riskHelp: string;
  decisionHelp: string;
  leadershipReviewHelp: string;
  actionableCalloutsHelp: string;
};

function differenceInDays(later: Date, earlier: Date) {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

function inferReviewCadence(reviewDates: string[]): "weekly" | "biweekly" {
  if (reviewDates.length < 2) return "weekly";
  const latest = new Date(reviewDates[0]);
  const previous = new Date(reviewDates[1]);
  return differenceInDays(latest, previous) >= 10 ? "biweekly" : "weekly";
}

function formatDueProgramDetail(cadence: "weekly" | "biweekly", latestReview: string | null) {
  if (!latestReview) {
    return `No ${cadence === "weekly" ? "weekly" : "bi-weekly"} review on file.`;
  }

  const daysSinceReview = differenceInDays(new Date(), new Date(latestReview));
  return `${cadence === "weekly" ? "Weekly" : "Bi-weekly"} review last saved ${daysSinceReview}d ago.`;
}

function hasTimelinePressure(value: string) {
  return /\b(delay|delayed|slip|slipped|behind|timeline|milestone|deadline|schedule|late|blocked|stalled|recovery)\b/i.test(value);
}

function hasRiskSignal(value: string) {
  return /\b(risk|issue|blocker|blocked|constraint|dependency|escalat|pressure|unclear|concern)\b/i.test(value);
}

function hasDeliverySignal(value: string) {
  return /\b(decision|support|owner|ownership|approval|action|next step|checkpoint|escalat)\b/i.test(value);
}

function classifyCalloutType(value: string): DashboardCallout["type"] | null {
  if (/^\s*risk:/i.test(value)) {
    return "risk";
  }

  if (/^\s*decision needed:/i.test(value)) {
    return "decision";
  }

  if (hasTimelinePressure(value)) {
    return "timeline";
  }

  if (hasRiskSignal(value)) {
    return "risk";
  }

  if (hasDeliverySignal(value)) {
    return "delivery";
  }

  return null;
}

function uniqueCallouts(callouts: DashboardCallout[]) {
  const seen = new Set<string>();
  return callouts.filter((callout) => {
    const key = `${callout.programId}:${callout.type}:${callout.detail}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const programs = await listPrograms();

  const programViews = await Promise.all(
    programs.map(async (program) => {
      const [latestPlan, updates, leadershipFeedback] = await Promise.all([
        getLatestGuidedPlan(program.id),
        listProgramUpdates(program.id),
        listLeadershipFeedback(program.id)
      ]);
      const latestUpdate = updates[0];
      const callouts: DashboardCallout[] = [];
      const candidateSignals = [
        ...(latestPlan?.risksAndDecisions.items ?? []),
        latestUpdate?.review.activeRisks,
        latestUpdate?.review.planChanges,
        latestUpdate?.review.supportNeeded,
        latestUpdate?.review.decisionsPending,
        latestUpdate?.review.currentPhase,
        program.intake.risks,
        program.intake.blockers,
        program.intake.decisionsNeeded,
        program.intake.currentStatus
      ]
        .flatMap((value) => (typeof value === "string" ? [value] : []))
        .map((value) => firstSignal(value, ""))
        .filter(Boolean);

      candidateSignals.forEach((detail, index) => {
        const type = classifyCalloutType(detail);
        if (!type) {
          return;
        }

        callouts.push({
          id: `${program.id}-${type}-${index}`,
          programId: program.id,
          programName: program.intake.programName,
          type,
          detail
        });
      });

      return {
        hasGuidedPlan: Boolean(latestPlan),
        callouts: uniqueCallouts(callouts),
        reviewDueItem: (() => {
          const cadence = program.intake.leadershipReviewCadence ?? inferReviewCadence(leadershipFeedback.map((entry) => entry.createdAt));
          const cadenceDays = cadence === "weekly" ? 7 : 14;
          const latestReview = leadershipFeedback[0];
          if (!latestReview) {
            return {
              programId: program.id,
              programName: program.intake.programName,
              cadence,
              status: "due" as const,
              detail: formatDueProgramDetail(cadence, null)
            };
          }

          const daysSinceReview = differenceInDays(new Date(), new Date(latestReview.createdAt));
          if (daysSinceReview < cadenceDays - 1) {
            return null;
          }

          return {
            programId: program.id,
            programName: program.intake.programName,
            cadence,
            status: daysSinceReview >= cadenceDays ? ("overdue" as const) : ("due" as const),
            detail: formatDueProgramDetail(cadence, latestReview.createdAt)
          };
        })()
      };
    })
  );

  const allCallouts = programViews.flatMap((view) => view.callouts);
  const riskCallouts = allCallouts.filter((callout) => callout.type === "risk");
  const decisionCallouts = allCallouts.filter((callout) => callout.type === "decision");
  const duePrograms = programViews
    .map((view) => view.reviewDueItem)
    .filter((item): item is DashboardDueProgram => Boolean(item))
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "overdue" ? -1 : 1;
      }

      return a.programName.localeCompare(b.programName);
    });
  const leadershipReviewsDue = duePrograms.length;
  const duePreview = duePrograms.slice(0, 3).map((item) => item.programName).join(", ");

  return {
    activePrograms: programs.length,
    guidedPlans: programViews.filter((view) => view.hasGuidedPlan).length,
    riskCount: riskCallouts.length,
    decisionCount: decisionCallouts.length,
    leadershipReviewsDue,
    duePrograms,
    actionableCallouts: allCallouts.length,
    callouts: allCallouts.slice(0, 3),
    riskHelp: "Counts individual risk items from the latest guided plan and unresolved update signals when present.",
    decisionHelp:
      "Counts explicit decision-needed items from the latest guided plan and unresolved decisions captured in the latest active-program update.",
    leadershipReviewHelp:
      leadershipReviewsDue
        ? `Programs due now: ${duePreview}${duePrograms.length > 3 ? ", and more." : "."}`
        : "No programs are due for a leadership review right now.",
    actionableCalloutsHelp:
      "Counts individual items from the latest guided plan's Risks and Decisions section, plus unresolved items captured in the latest active-program update when present."
  };
}
