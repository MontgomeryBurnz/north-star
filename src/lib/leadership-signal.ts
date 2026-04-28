import type { GuidedPlan } from "./guided-plan-types.ts";
import type { DeliveryLeadershipSignal, LeadershipReviewRecord } from "./leadership-feedback-types.ts";
import { firstSignal, normalizeWhitespace } from "./text-signals.ts";

function cleanSignal(value: string) {
  return normalizeWhitespace(value);
}

export function buildDeliveryLeadershipSignal(
  feedback?: LeadershipReviewRecord | null,
  plan?: GuidedPlan | null
): DeliveryLeadershipSignal {
  if (!feedback) {
    return {
      status: "none",
      summary: "No leadership signal has been captured yet.",
      highlights: []
    };
  }

  const isIncorporated = Boolean(plan?.sourceRecordIds.includes(feedback.id));
  const direction = cleanSignal(
    firstSignal(
      feedback.interpretation?.deliveryLeadMessage ||
        feedback.interpretation?.summary ||
        feedback.feedback.leadershipGuidance ||
        feedback.feedback.feedbackToDeliveryLead,
      "Leadership direction is available and should shape the next checkpoint."
    )
  );
  const riskFocus = cleanSignal(
    firstSignal(
      feedback.interpretation?.riskAdjustments.join("; ") || feedback.feedback.activeRisks,
      "No specific leadership risk signal was captured."
    )
  );
  const supportFocus = cleanSignal(
    firstSignal(
      feedback.interpretation?.planImpacts.join("; ") || feedback.feedback.supportRequests,
      "No additional leadership support request is on file."
    )
  );

  return {
    status: isIncorporated ? "incorporated" : "new",
    summary: isIncorporated
      ? "Leadership input has been translated into the current delivery guidance."
      : "New leadership input is available. Regenerate the guided plan to incorporate it.",
    highlights: [
      `Direction: ${direction}`,
      `Risk posture: ${riskFocus}`,
      `Support emphasis: ${supportFocus}`
    ],
    updatedAt: feedback.updatedAt ?? feedback.createdAt,
    sourceFeedbackId: feedback.id
  };
}
