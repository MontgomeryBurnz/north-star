import "server-only";

import { getLatestGuidedPlan, listLeadershipFeedback, listProgramUpdates, listPrograms } from "@/lib/program-store";

export type DashboardCallout = {
  id: string;
  programId: string;
  programName: string;
  type: "risk" | "timeline" | "delivery" | "decision";
  detail: string;
};

export type DashboardMetrics = {
  activePrograms: number;
  guidedPlans: number;
  riskCount: number;
  decisionCount: number;
  leadershipReviewsDue: number;
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

function firstSignal(value: string, fallback: string) {
  return (
    value
      .split(/\n|,|;/)
      .map((item) => item.trim())
      .filter(Boolean)[0] ?? fallback
  );
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0) ?? "";
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
        leadershipReviewDue: (() => {
          const cadence = program.intake.leadershipReviewCadence ?? inferReviewCadence(leadershipFeedback.map((entry) => entry.createdAt));
          const cadenceDays = cadence === "weekly" ? 7 : 14;
          const latestReview = leadershipFeedback[0];
          if (!latestReview) return true;
          return differenceInDays(new Date(), new Date(latestReview.createdAt)) >= cadenceDays - 1;
        })()
      };
    })
  );

  const allCallouts = programViews.flatMap((view) => view.callouts);
  const riskCallouts = allCallouts.filter((callout) => callout.type === "risk");
  const decisionCallouts = allCallouts.filter((callout) => callout.type === "decision");
  const leadershipReviewsDue = programViews.filter((view) => view.leadershipReviewDue).length;

  return {
    activePrograms: programs.length,
    guidedPlans: programViews.filter((view) => view.hasGuidedPlan).length,
    riskCount: riskCallouts.length,
    decisionCount: decisionCallouts.length,
    leadershipReviewsDue,
    actionableCallouts: allCallouts.length,
    callouts: allCallouts.slice(0, 3),
    riskHelp: "Counts individual risk items from the latest guided plan and unresolved update signals when present.",
    decisionHelp:
      "Counts explicit decision-needed items from the latest guided plan and unresolved decisions captured in the latest active-program update.",
    leadershipReviewHelp:
      "Counts programs whose leadership review is due this week based on the saved weekly or bi-weekly cadence for that program.",
    actionableCalloutsHelp:
      "Counts individual items from the latest guided plan's Risks and Decisions section, plus unresolved items captured in the latest active-program update when present."
  };
}
