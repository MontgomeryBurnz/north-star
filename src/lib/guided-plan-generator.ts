import { randomUUID } from "crypto";
import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { GuidedPlan, GuidedPlanRolePlan } from "@/lib/guided-plan-types";
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

function buildRolePlans(
  program: StoredProgram,
  latestUpdate: StoredProgramUpdate | undefined,
  leadershipSignalSummary: string
): GuidedPlanRolePlan[] {
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
  const mitigationFocus = firstAvailable(review?.planChanges ?? "", "Tighten ownership, sequence key decisions, and reduce ambiguity early.");

  return [
    {
      role: "Product Management",
      actionPlan: [
        `Lock the product path around: ${excerpt(outcomeFocus, 110)}`,
        `Turn the next major decision into a product checkpoint: ${excerpt(decisionFocus || "define the next product decision.", 110)}`,
        `Absorb leadership direction into scope posture: ${excerpt(leadershipSignalSummary, 110)}`
      ],
      keyFocusAreas: [
        `Outcome clarity and sequencing across stakeholder expectations: ${excerpt(stakeholderFocus || "stakeholder alignment.", 110)}`,
        `Product scope choices under current constraints: ${excerpt(requirementFocus || "requirements and constraints.", 110)}`
      ],
      keyOutcomes: [
        "A product path that is narrow enough to execute and clear enough to align around.",
        `Clear decision framing for the next stage of work: ${excerpt(decisionFocus || "next unresolved decision.", 110)}`
      ],
      risksAndMitigations: [
        `Risk: ${excerpt(riskFocus || "scope and delivery ambiguity.", 110)}`,
        `Mitigation: ${excerpt(mitigationFocus, 110)}`
      ]
    },
    {
      role: "Business Analysis",
      actionPlan: [
        `Translate ambiguity into structured requirements for: ${excerpt(requirementFocus || "critical requirements and constraints.", 110)}`,
        `Clarify assumptions, traceability, and decision-ready detail around: ${excerpt(decisionFocus || "the next unresolved decisions.", 110)}`,
        `Maintain the working source of truth for: ${excerpt(outputFocus, 110)}`
      ],
      keyFocusAreas: [
        "Requirements breakdown, acceptance logic, and dependency tracing.",
        `Decision support and process clarity tied to: ${excerpt(progressFocus || "current delivery evidence.", 110)}`
      ],
      keyOutcomes: [
        "Decision-ready requirements and reduced interpretation risk across the team.",
        "A maintained record of assumptions, scope boundaries, and required outputs."
      ],
      risksAndMitigations: [
        `Risk: hidden requirement gaps or unresolved ownership in ${excerpt(stakeholderFocus || "stakeholder expectations.", 110)}`,
        "Mitigation: tighten requirement reviews, decision logs, and traceability before execution expands."
      ]
    },
    {
      role: "User Experience",
      actionPlan: [
        `Translate the desired outcome into a usable workflow and experience path for: ${excerpt(outcomeFocus || "the target outcome.", 110)}`,
        `Define validation points for experience-risk areas tied to: ${excerpt(stakeholderFocus || "stakeholder and user expectations.", 110)}`,
        "Keep user flow decisions visible before execution hardens."
      ],
      keyFocusAreas: [
        "Workflow clarity, experience validation, and handoff simplification.",
        `User-facing risk areas embedded in: ${excerpt(riskFocus || "delivery complexity and ambiguity.", 110)}`
      ],
      keyOutcomes: [
        "A validated experience path that supports the operational north star.",
        "Clearer handoffs and reduced workflow confusion."
      ],
      risksAndMitigations: [
        "Risk: the team optimizes for delivery speed while experience friction remains unresolved.",
        "Mitigation: define explicit validation checkpoints and workflow success criteria before scale."
      ]
    },
    {
      role: "Application Development",
      actionPlan: [
        `Frame implementation sequencing and dependency handling for: ${excerpt(requirementFocus || "the current scope and constraints.", 110)}`,
        `Make engineering decision points explicit around: ${excerpt(decisionFocus || "architecture and delivery sequencing.", 110)}`,
        `Pressure-test feasibility against current evidence: ${excerpt(progressFocus || "latest delivery movement.", 110)}`
      ],
      keyFocusAreas: [
        "Build sequencing, dependency removal, integration risk, and quality gates.",
        `Execution risk tied to: ${excerpt(riskFocus || "the current delivery posture.", 110)}`
      ],
      keyOutcomes: [
        "An executable build path with clear owners, gates, and technical decisions.",
        "Reduced rework through earlier dependency and implementation clarity."
      ],
      risksAndMitigations: [
        `Risk: technical execution stalls on unresolved dependencies or unclear ownership in ${excerpt(decisionFocus || "the build path.", 110)}`,
        "Mitigation: isolate decision gates, confirm owners early, and sequence work to produce evidence fast."
      ]
    },
    {
      role: "Data Engineering",
      actionPlan: [
        `Clarify data movement, data quality, and integration dependencies for: ${excerpt(requirementFocus || "the scoped solution path.", 110)}`,
        `Turn data dependencies into explicit execution checkpoints around: ${excerpt(decisionFocus || "the next technical decision.", 110)}`,
        "Make data readiness visible before downstream build work accelerates."
      ],
      keyFocusAreas: [
        "Data sourcing, transformation ownership, quality controls, and dependency sequencing.",
        `Operational risk tied to data flow and evidence quality: ${excerpt(riskFocus || "current delivery risk.", 110)}`
      ],
      keyOutcomes: [
        "A clear path for data readiness, integration, and operational reliability.",
        "Earlier visibility into dependency risk across the delivery plan."
      ],
      risksAndMitigations: [
        "Risk: downstream teams execute against incomplete or unstable data assumptions.",
        "Mitigation: expose data dependencies early, assign ownership, and verify quality before expansion."
      ]
    },
    {
      role: "Change Management",
      actionPlan: [
        `Shape the communication and adoption path around: ${excerpt(stakeholderFocus || "the stakeholder landscape.", 110)}`,
        `Prepare change messaging for risk and decision points such as: ${excerpt(riskFocus || "major delivery risks.", 110)}`,
        "Translate the plan into audience-specific readiness checkpoints and support actions."
      ],
      keyFocusAreas: [
        "Stakeholder readiness, adoption path, communications cadence, and resistance signals.",
        `Leadership-sensitive changes embedded in the plan: ${excerpt(leadershipSignalSummary, 110)}`
      ],
      keyOutcomes: [
        "A clearer adoption path and less noise across stakeholders as the plan evolves.",
        "Delivery messaging that stays aligned to leadership intent and program reality."
      ],
      risksAndMitigations: [
        "Risk: the program path changes faster than stakeholder understanding and adoption.",
        "Mitigation: maintain targeted updates, readiness checkpoints, and role-specific communications."
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
    rolePlans: {
      title: "Role Action Plans",
      roles: buildRolePlans(program, latestUpdate, leadershipSignalSummary)
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
