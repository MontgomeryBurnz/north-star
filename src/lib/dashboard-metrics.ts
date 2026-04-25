import "server-only";

import { getLatestGuidedPlan, listProgramUpdates, listPrograms } from "@/lib/program-store";

export type DashboardCallout = {
  id: string;
  programId: string;
  programName: string;
  type: "risk" | "timeline" | "delivery";
  detail: string;
};

export type DashboardMetrics = {
  activePrograms: number;
  guidedPlans: number;
  actionableCallouts: number;
  callouts: DashboardCallout[];
};

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

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const programs = await listPrograms();

  const programViews = await Promise.all(
    programs.map(async (program) => {
      const [latestPlan, updates] = await Promise.all([getLatestGuidedPlan(program.id), listProgramUpdates(program.id)]);
      const latestUpdate = updates[0];
      const callouts: DashboardCallout[] = [];
      const riskSignal = firstSignal(
        firstNonEmpty(
          latestUpdate?.review.activeRisks,
          program.intake.risks,
          program.intake.blockers,
          latestPlan?.risksAndDecisions.items.find((item) => hasRiskSignal(item)),
          latestPlan?.leadershipChanges.items.find((item) => hasRiskSignal(item))
        ),
        ""
      );
      const timelineSignal = firstSignal(
        firstNonEmpty(
          latestUpdate?.review.planChanges,
          latestUpdate?.review.currentPhase,
          program.intake.currentStatus,
          latestPlan?.workPath.items.find((item) => hasTimelinePressure(item)),
          latestPlan?.planningApproach.items.find((item) => hasTimelinePressure(item))
        ),
        ""
      );
      const deliverySignal = firstSignal(
        firstNonEmpty(
          latestUpdate?.review.supportNeeded,
          latestUpdate?.review.decisionsPending,
          program.intake.decisionsNeeded,
          latestPlan?.risksAndDecisions.items.find((item) => hasDeliverySignal(item)),
          latestPlan?.leadershipChanges.items.find((item) => hasDeliverySignal(item))
        ),
        ""
      );

      if (riskSignal) {
        callouts.push({
          id: `${program.id}-risk`,
          programId: program.id,
          programName: program.intake.programName,
          type: "risk",
          detail: riskSignal
        });
      }

      if (timelineSignal && hasTimelinePressure(timelineSignal)) {
        callouts.push({
          id: `${program.id}-timeline`,
          programId: program.id,
          programName: program.intake.programName,
          type: "timeline",
          detail: timelineSignal
        });
      }

      if (deliverySignal) {
        callouts.push({
          id: `${program.id}-delivery`,
          programId: program.id,
          programName: program.intake.programName,
          type: "delivery",
          detail: deliverySignal
        });
      }

      return {
        hasGuidedPlan: Boolean(latestPlan),
        callouts
      };
    })
  );

  return {
    activePrograms: programs.length,
    guidedPlans: programViews.filter((view) => view.hasGuidedPlan).length,
    actionableCallouts: programViews.reduce((total, view) => total + view.callouts.length, 0),
    callouts: programViews.flatMap((view) => view.callouts).slice(0, 3)
  };
}
