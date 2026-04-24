import { randomUUID } from "crypto";
import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { GuidedPlan, GuidedPlanRoleFocus } from "@/lib/guided-plan-types";
import type { LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import { buildDeliveryLeadershipSignal } from "@/lib/leadership-signal";
import type { StoredProgram } from "@/lib/program-intake-types";

function splitItems(value: string, fallback: string[]) {
  const items = value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  return items.length ? items : fallback;
}

function firstAvailable(...values: string[]) {
  return values.find((value) => value.trim())?.trim() ?? "";
}

function excerpt(value: string, limit = 180) {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, limit).trim()}...` : compacted;
}

function getArtifactSignals(program: StoredProgram) {
  return program.intake.artifacts
    .filter(
      (artifact) =>
        (artifact.extractionStatus === "extracted" || artifact.extractionStatus === "partial") && artifact.extractedText?.trim()
    )
    .map((artifact) => ({
      id: artifact.id,
      name: artifact.name,
      artifactType: artifact.artifactType,
      fileFormat: artifact.fileFormat,
      signal: excerpt(artifact.extractedText ?? "")
    }))
    .slice(0, 3);
}

function buildRoleCoverage(
  program: StoredProgram,
  latestUpdate: StoredProgramUpdate | undefined,
  leadershipSignalSummary: string
): GuidedPlanRoleFocus[] {
  const intake = program.intake;
  const review = latestUpdate?.review;
  const reviewedContext = intake.reviewedContext;
  const stakeholderFocus = firstAvailable(review?.stakeholderTemperature ?? "", reviewedContext?.stakeholders ?? "", intake.stakeholders);
  const riskFocus = firstAvailable(review?.activeRisks ?? "", reviewedContext?.risks ?? "", intake.risks, intake.blockers);
  const requirementFocus = firstAvailable(review?.supportNeeded ?? "", reviewedContext?.requirements ?? "", intake.constraints);
  const decisionFocus = firstAvailable(review?.decisionsPending ?? "", reviewedContext?.decisions ?? "", intake.decisionsNeeded);
  const progressFocus = firstAvailable(review?.progressSinceLastReview ?? "", intake.currentStatus, intake.sowSummary);
  const outcomeFocus = firstAvailable(reviewedContext?.outcomes ?? "", intake.outcomes, intake.vision);
  const outputFocus = firstAvailable(reviewedContext?.outputs ?? "", "Updated delivery plan, decision log, and risk posture.");

  return [
    {
      role: "Delivery Lead",
      areas: [
        `Own the next checkpoint, decision cadence, and delivery health against: ${excerpt(outcomeFocus, 110)}`,
        `Drive escalation and mitigation around: ${excerpt(riskFocus || "Top delivery risks and blockers.", 110)}`,
        `Keep leadership signal translated into an executable path: ${excerpt(leadershipSignalSummary, 110)}`
      ]
    },
    {
      role: "Business Analyst",
      areas: [
        `Turn ambiguity into clear requirements and traceability for: ${excerpt(requirementFocus || "critical requirements and constraints.", 110)}`,
        `Structure decisions, assumptions, and acceptance detail around: ${excerpt(decisionFocus || "the next unresolved decisions.", 110)}`,
        `Maintain the working source of truth for outputs such as: ${excerpt(outputFocus, 110)}`
      ]
    },
    {
      role: "Tech Lead",
      areas: [
        `Frame solution shape, dependencies, and implementation risk for: ${excerpt(requirementFocus || "the current scope and constraints.", 110)}`,
        `Make technical decision points explicit around: ${excerpt(decisionFocus || "architecture and delivery sequencing.", 110)}`,
        `Pressure-test feasibility against current program movement: ${excerpt(progressFocus || "latest delivery evidence.", 110)}`
      ]
    },
    {
      role: "UX",
      areas: [
        `Translate user and workflow impact into a usable service path for: ${excerpt(outcomeFocus || "the target outcome.", 110)}`,
        `Clarify experience risks tied to stakeholder expectations: ${excerpt(stakeholderFocus || "stakeholder alignment and user clarity.", 110)}`,
        `Support validation by defining what needs to be learned before scale.`
      ]
    },
    {
      role: "Communications & Change Mgmt",
      areas: [
        `Shape the message, adoption path, and stakeholder narrative around: ${excerpt(stakeholderFocus || "the stakeholder landscape.", 110)}`,
        `Prepare communications for program risk and change points such as: ${excerpt(riskFocus || "major delivery risks.", 110)}`,
        `Translate the plan into clear audience-specific updates, checkpoints, and readiness signals.`
      ]
    }
  ];
}

export function generateLocalGuidedPlan(
  program: StoredProgram,
  updates: StoredProgramUpdate[],
  leadershipFeedbacks: LeadershipReviewRecord[] = []
): GuidedPlan {
  const latestUpdate = updates[0];
  const latestLeadershipFeedback = leadershipFeedbacks[0];
  const intake = program.intake;
  const review = latestUpdate?.review;
  const reviewedContext = intake.reviewedContext;
  const now = new Date().toISOString();
  const northStar = firstAvailable(review?.originalNorthStar ?? "", intake.vision, intake.outcomes, "Clarify the healthiest path forward.");
  const activeRisks = firstAvailable(review?.activeRisks ?? "", reviewedContext?.risks ?? "", intake.risks, intake.blockers);
  const decisions = firstAvailable(review?.decisionsPending ?? "", reviewedContext?.decisions ?? "", intake.decisionsNeeded);
  const progress = firstAvailable(review?.progressSinceLastReview ?? "", intake.currentStatus);
  const supportNeeded = firstAvailable(review?.supportNeeded ?? "", reviewedContext?.requirements ?? "", intake.constraints);
  const stakeholders = firstAvailable(review?.stakeholderTemperature ?? "", reviewedContext?.stakeholders ?? "", intake.stakeholders);
  const leadershipGuidancePresent = Boolean(
    latestLeadershipFeedback?.feedback.leadershipGuidance?.trim() ||
      latestLeadershipFeedback?.feedback.feedbackToDeliveryLead?.trim()
  );
  const leadershipSignal = latestLeadershipFeedback
    ? {
        ...buildDeliveryLeadershipSignal(latestLeadershipFeedback),
        status: "incorporated" as const
      }
    : buildDeliveryLeadershipSignal(null);
  const leadershipSignalSummary = leadershipSignal.summary;
  const artifactSignals = getArtifactSignals(program);

  return {
    id: randomUUID(),
    programId: program.id,
    programName: intake.programName,
    createdAt: now,
    northStar,
    summary: `Guided plan generated from ${latestUpdate ? "the latest active-program update" : "the initial program intake"}.`,
    signalFromNoise: {
      title: "Signal From Noise",
      items: [
        `North star: ${northStar}`,
        `Most important delivery signal: ${firstAvailable(progress, "No progress update captured yet.")}`,
        `Primary noise or pressure: ${firstAvailable(activeRisks, "No active risk captured yet.")}`,
        ...(reviewedContext
          ? [`Reviewed context confidence: ${reviewedContext.confidence}. Use reviewed signals as the planning source of truth.`]
          : []),
        ...(leadershipGuidancePresent ? ["Leadership input has been incorporated into the current guidance path."] : []),
        ...(artifactSignals[0]
          ? [
              `Artifact signal from ${artifactSignals[0].name} (${artifactSignals[0].artifactType ?? "unclassified"} / ${
                artifactSignals[0].fileFormat ?? "unknown"
              }): ${artifactSignals[0].signal}`
            ]
          : [])
      ]
    },
    workPath: {
      title: "Recommended Work Path",
      items: [
        "Start with the decision or dependency that unlocks the next useful move.",
        `Use this decision as the next checkpoint: ${firstAvailable(decisions, "Define the next decision needed.")}`,
        leadershipGuidancePresent
          ? "Tighten the next checkpoint structure to reflect the latest leadership direction."
          : "Bring leadership feedback into the next checkpoint when it is available.",
        "Keep the plan narrow enough to validate progress before expanding scope."
      ]
    },
    planningApproach: {
      title: "Planning Approach",
      items: [
        "Translate the program context into workstreams, owners, decision gates, and outputs.",
        `Account for current change: ${firstAvailable(review?.planChanges ?? "", "No plan changes captured yet.")}`,
        artifactSignals.length
          ? `Use extracted artifact text as evidence before expanding scope: ${artifactSignals
              .map((artifact) => `${artifact.name} (${artifact.artifactType ?? "unclassified"})`)
              .join(", ")}.`
          : "Attach text artifacts when available so the plan can use source evidence.",
        "Review the plan after the next evidence-producing milestone."
      ]
    },
    keyOutcomes: {
      title: "Key Outcomes",
      items: splitItems(reviewedContext?.outcomes || intake.outcomes || northStar, [
        "Define the program outcome in measurable terms.",
        "Clarify what a healthy next phase looks like."
      ])
    },
    criticalRequirements: {
      title: "Critical Requirements",
      items: [
        ...splitItems(reviewedContext?.requirements || intake.constraints, ["Confirm timing, resource, and dependency constraints."]),
        `Stakeholder requirement: ${firstAvailable(stakeholders, "Clarify stakeholder alignment and decision rights.")}`
      ].slice(0, 4)
    },
    keyOutputs: {
      title: "Key Outputs",
      items: splitItems(reviewedContext?.outputs ?? "", [
        "Updated delivery plan",
        "Decision log",
        "Risk and mitigation view",
        "Next-step owner map"
      ])
    },
    risksAndDecisions: {
      title: "Risks And Decisions",
      items: [
        `Risk focus: ${firstAvailable(activeRisks, "Capture the top risks before generating final guidance.")}`,
        `Decision focus: ${firstAvailable(decisions, "Name the decision needed to move the path forward.")}`,
        latestLeadershipFeedback
          ? "Leadership review is on file and has been folded into the current risk and support posture."
          : "Leadership feedback has not been captured yet.",
        `Support needed: ${firstAvailable(supportNeeded, "Identify what support or escalation would improve delivery health.")}`
      ]
    },
    leadershipChanges: {
      title: "What Changed From Leadership Signal",
      items: latestLeadershipFeedback
        ? [
            `Leadership direction translated into plan language: ${leadershipSignal.highlights[0]?.replace(/^Direction:\s*/, "")}`,
            `Risk posture now emphasizes: ${leadershipSignal.highlights[1]?.replace(/^Risk posture:\s*/, "")}`,
            `Execution should account for: ${leadershipSignal.highlights[2]?.replace(/^Support emphasis:\s*/, "")}`,
            leadershipSignal.status === "incorporated"
              ? "This leadership signal is already reflected in the current guidance."
              : "Regenerate the plan after the next leadership update to keep guidance current."
          ]
        : [
            "No leadership signal is currently shaping this plan.",
            "Once leadership reviews the program, their direction will appear here in delivery-safe language.",
            "The generated plan will then show what changed without exposing raw leadership notes."
          ]
    },
    roleCoverage: {
      title: "Role Coverage",
      roles: buildRoleCoverage(program, latestUpdate, leadershipSignalSummary)
    },
    leadershipSignal,
    followUpQuestions: [
      "What decision would remove the most ambiguity this week?",
      "Which stakeholder needs alignment before the next move?",
      "What output would prove the program is moving toward the north star?"
    ],
    sourceRecordIds: [
      program.id,
      ...(latestUpdate ? [latestUpdate.id] : []),
      ...(latestLeadershipFeedback ? [latestLeadershipFeedback.id] : []),
      ...artifactSignals.map((artifact) => artifact.id)
    ]
  };
}
