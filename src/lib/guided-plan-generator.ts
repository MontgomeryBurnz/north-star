import { randomUUID } from "crypto";
import type { StoredProgramUpdate } from "./active-program-types.ts";
import type { AssistantConversationTurn } from "./assistant-conversation-types.ts";
import type { GuidedPlan, GuidedPlanRolePlan } from "./guided-plan-types.ts";
import type { LeadershipReviewRecord } from "./leadership-feedback-types.ts";
import { buildDeliveryLeadershipSignal } from "./leadership-signal.ts";
import type { ProgramMeetingInput } from "./program-intelligence-types.ts";
import type { StoredProgram } from "./program-intake-types.ts";

const defaultTeamRoles = [
  "Product Management",
  "Business Analysis",
  "User Experience",
  "Application Development",
  "Data Engineering",
  "Change Management"
] as const;

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

function sourceLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
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

function getTeamRoleUpdates(update: StoredProgramUpdate | undefined) {
  return update?.review.teamRoleUpdates?.filter(
    (role) =>
      role.role.trim() &&
      (role.status !== "on-track" ||
        role.needsLeadershipAttention ||
        role.progressUpdate.trim() ||
        role.changesObserved.trim() ||
        role.activeRisks.trim() ||
        role.blockers.trim() ||
        role.decisionsNeeded.trim() ||
        role.supportNeeded.trim())
  ) ?? [];
}

function formatRoleStatus(status: string) {
  if (status === "on-track") return "On track";
  if (status === "at-risk") return "At risk";
  if (status === "blocked") return "Blocked";
  return "Unstated";
}

function buildRoleStatusSummary(roleUpdates: ReturnType<typeof getTeamRoleUpdates>) {
  return roleUpdates
    .map((roleUpdate) => {
      const details = [
        `status ${formatRoleStatus(roleUpdate.status)}`,
        roleUpdate.needsLeadershipAttention ? "needs leadership attention" : "",
        firstAvailable(roleUpdate.activeRisks, roleUpdate.blockers, roleUpdate.decisionsNeeded)
      ]
        .filter(Boolean)
        .join("; ");
      return `${roleUpdate.role}: ${excerpt(details, 110)}`;
    })
    .slice(0, 4);
}

function buildRolePlans(
  program: StoredProgram,
  latestUpdate: StoredProgramUpdate | undefined,
  leadershipSignalSummary: string,
  leadershipRoleImpacts: Map<string, string>
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
  const roleNames = Array.from(
    new Set((intake.teamRoles?.length ? intake.teamRoles : [...defaultTeamRoles]).map((role) => role.trim()).filter(Boolean))
  );
  const roleUpdateMap = new Map(
    getTeamRoleUpdates(latestUpdate).map((roleUpdate) => [roleUpdate.role.toLowerCase(), roleUpdate])
  );

  return roleNames.map((role) => {
    const roleUpdate = roleUpdateMap.get(role.toLowerCase());
    const roleProgress = firstAvailable(roleUpdate?.progressUpdate ?? "", progressFocus);
    const roleChange = firstAvailable(roleUpdate?.changesObserved ?? "", mitigationFocus);
    const roleRisk = firstAvailable(roleUpdate?.activeRisks ?? "", roleUpdate?.blockers ?? "", riskFocus);
    const roleDecision = firstAvailable(roleUpdate?.decisionsNeeded ?? "", decisionFocus);
    const roleSupport = firstAvailable(roleUpdate?.supportNeeded ?? "", requirementFocus);
    const roleStatusLabel = formatRoleStatus(roleUpdate?.status ?? "on-track");
    const roleEscalation = roleUpdate?.needsLeadershipAttention
      ? "Leadership attention is requested from this role's current signal."
      : "No leadership escalation is currently requested from this role.";

    if (role === "Product Management") {
      return {
        role,
        actionPlan: [
          `Lock the product path around: ${excerpt(outcomeFocus, 110)}`,
          `Turn the next major decision into a product checkpoint: ${excerpt(roleDecision || "define the next product decision.", 110)}`,
          `Absorb leadership direction into scope posture: ${excerpt(leadershipRoleImpacts.get(role) || leadershipSignalSummary, 110)}`
        ],
        keyFocusAreas: [
          `Operating posture: ${roleStatusLabel}. ${roleEscalation}`,
          `Outcome clarity and sequencing across stakeholder expectations: ${excerpt(stakeholderFocus || "stakeholder alignment.", 110)}`,
          `Product scope choices under current constraints: ${excerpt(roleSupport || "requirements and constraints.", 110)}`
        ],
        keyOutcomes: [
          `A product path that is narrow enough to execute and clear enough to align around: ${excerpt(roleProgress || "current product progress.", 110)}`,
          `Clear decision framing for the next stage of work: ${excerpt(roleDecision || "next unresolved decision.", 110)}`
        ],
        risksAndMitigations: [`Risk: ${excerpt(roleRisk || "scope and delivery ambiguity.", 110)}`, `Mitigation: ${excerpt(roleChange, 110)}`]
      };
    }

    if (role === "Business Analysis") {
      return {
        role,
        actionPlan: [
          `Translate ambiguity into structured requirements for: ${excerpt(roleSupport || "critical requirements and constraints.", 110)}`,
          `Clarify assumptions, traceability, and decision-ready detail around: ${excerpt(roleDecision || "the next unresolved decisions.", 110)}`,
          `Maintain the working source of truth for: ${excerpt(outputFocus, 110)}`,
          `Reflect leadership translation in the requirement path: ${excerpt(leadershipRoleImpacts.get(role) || leadershipSignalSummary, 110)}`
        ],
        keyFocusAreas: [
          `Operating posture: ${roleStatusLabel}. ${roleEscalation}`,
          "Requirements breakdown, acceptance logic, and dependency tracing.",
          `Decision support and process clarity tied to: ${excerpt(roleProgress || "current delivery evidence.", 110)}`
        ],
        keyOutcomes: [
          "Decision-ready requirements and reduced interpretation risk across the team.",
          "A maintained record of assumptions, scope boundaries, and required outputs."
        ],
        risksAndMitigations: [
          `Risk: hidden requirement gaps or unresolved ownership in ${excerpt(roleRisk || stakeholderFocus || "stakeholder expectations.", 110)}`,
          "Mitigation: tighten requirement reviews, decision logs, and traceability before execution expands."
        ]
      };
    }

    if (role === "User Experience") {
      return {
        role,
        actionPlan: [
          `Translate the desired outcome into a usable workflow and experience path for: ${excerpt(outcomeFocus || "the target outcome.", 110)}`,
          `Define validation points for experience-risk areas tied to: ${excerpt(stakeholderFocus || "stakeholder and user expectations.", 110)}`,
          `Keep user flow decisions visible before execution hardens: ${excerpt(leadershipRoleImpacts.get(role) || "protect workflow clarity and review usability.", 110)}`
        ],
        keyFocusAreas: [
          `Operating posture: ${roleStatusLabel}. ${roleEscalation}`,
          "Workflow clarity, experience validation, and handoff simplification.",
          `User-facing risk areas embedded in: ${excerpt(roleRisk || "delivery complexity and ambiguity.", 110)}`
        ],
        keyOutcomes: [
          "A validated experience path that supports the operational north star.",
          "Clearer handoffs and reduced workflow confusion."
        ],
        risksAndMitigations: [
          "Risk: the team optimizes for delivery speed while experience friction remains unresolved.",
          "Mitigation: define explicit validation checkpoints and workflow success criteria before scale."
        ]
      };
    }

    if (role === "Application Development") {
      return {
        role,
        actionPlan: [
          `Frame implementation sequencing and dependency handling for: ${excerpt(roleSupport || "the current scope and constraints.", 110)}`,
          `Make engineering decision points explicit around: ${excerpt(roleDecision || "architecture and delivery sequencing.", 110)}`,
          `Pressure-test feasibility against current evidence: ${excerpt(roleProgress || "latest delivery movement.", 110)}`,
          `Apply leadership direction to build sequencing: ${excerpt(leadershipRoleImpacts.get(role) || leadershipSignalSummary, 110)}`
        ],
        keyFocusAreas: [
          `Operating posture: ${roleStatusLabel}. ${roleEscalation}`,
          "Build sequencing, dependency removal, integration risk, and quality gates.",
          `Execution risk tied to: ${excerpt(roleRisk || "the current delivery posture.", 110)}`
        ],
        keyOutcomes: [
          "An executable build path with clear owners, gates, and technical decisions.",
          "Reduced rework through earlier dependency and implementation clarity."
        ],
        risksAndMitigations: [
          `Risk: technical execution stalls on unresolved dependencies or unclear ownership in ${excerpt(roleDecision || "the build path.", 110)}`,
          "Mitigation: isolate decision gates, confirm owners early, and sequence work to produce evidence fast."
        ]
      };
    }

    if (role === "Data Engineering") {
      return {
        role,
        actionPlan: [
          `Clarify data movement, data quality, and integration dependencies for: ${excerpt(roleSupport || "the scoped solution path.", 110)}`,
          `Turn data dependencies into explicit execution checkpoints around: ${excerpt(roleDecision || "the next technical decision.", 110)}`,
          `Make data readiness visible before downstream build work accelerates: ${excerpt(leadershipRoleImpacts.get(role) || "surface the evidence required before scale.", 110)}`
        ],
        keyFocusAreas: [
          `Operating posture: ${roleStatusLabel}. ${roleEscalation}`,
          "Data sourcing, transformation ownership, quality controls, and dependency sequencing.",
          `Operational risk tied to data flow and evidence quality: ${excerpt(roleRisk || "current delivery risk.", 110)}`
        ],
        keyOutcomes: [
          "A clear path for data readiness, integration, and operational reliability.",
          "Earlier visibility into dependency risk across the delivery plan."
        ],
        risksAndMitigations: [
          "Risk: downstream teams execute against incomplete or unstable data assumptions.",
          "Mitigation: expose data dependencies early, assign ownership, and verify quality before expansion."
        ]
      };
    }

    if (role === "Change Management") {
      return {
        role,
        actionPlan: [
          `Shape the communication and adoption path around: ${excerpt(stakeholderFocus || "the stakeholder landscape.", 110)}`,
          `Prepare change messaging for risk and decision points such as: ${excerpt(roleRisk || "major delivery risks.", 110)}`,
          `Translate the plan into audience-specific readiness checkpoints and support actions: ${excerpt(leadershipRoleImpacts.get(role) || leadershipSignalSummary, 110)}`
        ],
        keyFocusAreas: [
          `Operating posture: ${roleStatusLabel}. ${roleEscalation}`,
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
      };
    }

    return {
      role,
      actionPlan: [
        `Define how ${role} contributes to the current delivery path around: ${excerpt(outcomeFocus || "the current program outcome.", 110)}`,
        `Give ${role} explicit ownership for the next material move: ${excerpt(decisionFocus || "the next unresolved decision or dependency.", 110)}`,
        `Apply leadership and operator context to ${role}: ${excerpt(leadershipRoleImpacts.get(role) || leadershipSignalSummary || progressFocus || "tighten the next role-specific checkpoint.", 110)}`
      ],
      keyFocusAreas: [
        `Operating posture: ${roleStatusLabel}. ${roleEscalation}`,
        `${role} focus should stay aligned to: ${excerpt(roleSupport || "requirements, constraints, and evidence quality.", 110)}`,
        `${role} should monitor pressure in: ${excerpt(roleRisk || "active program risk and delivery ambiguity.", 110)}`
      ],
      keyOutcomes: [
        `${role} has a clear, near-term contribution to the guided plan and team execution path: ${excerpt(roleProgress || "no role-specific progress was captured yet.", 110)}`,
        `${role} decisions and outputs are visible enough to reduce ambiguity for the rest of the team.`
      ],
      risksAndMitigations: [
        `Risk: ${excerpt(roleRisk || `${role} is present in the team shape but not yet translated into explicit guidance.`, 110)}`,
        `Mitigation: ${excerpt(roleChange || `define ${role}'s ownership, expected outputs, and decision checkpoints before the next review.`, 110)}`
      ]
    };
  });
}

export function generateLocalGuidedPlan(
  program: StoredProgram,
  updates: StoredProgramUpdate[],
  leadershipFeedbacks: LeadershipReviewRecord[] = [],
  assistantConversations: AssistantConversationTurn[] = [],
  meetingInputs: ProgramMeetingInput[] = []
): GuidedPlan {
  const latestUpdate = updates[0];
  const latestLeadershipFeedback = leadershipFeedbacks[0];
  const latestAssistantConversation = assistantConversations[0];
  const latestMeetingInput = meetingInputs[0];
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
  const leadershipInterpretation = latestLeadershipFeedback?.interpretation;
  const leadershipRoleImpacts = new Map(
    (leadershipInterpretation?.roleImpacts ?? []).map((item) => [item.role, item.focus])
  );
  const teamRoleUpdates = getTeamRoleUpdates(latestUpdate);
  const roleStatusSummary = buildRoleStatusSummary(teamRoleUpdates);
  const escalatedRoleUpdates = teamRoleUpdates.filter((roleUpdate) => roleUpdate.needsLeadershipAttention);
  const artifactSignals = getArtifactSignals(program);
  const latestArtifactSignal = artifactSignals[0];
  const sourceSummaryParts = [
    artifactSignals.length ? sourceLabel(artifactSignals.length, "upload") : "",
    latestUpdate ? "latest active-program update" : "",
    teamRoleUpdates.length ? sourceLabel(teamRoleUpdates.length, "role submission") : "",
    latestLeadershipFeedback ? "latest leadership feedback" : "",
    latestAssistantConversation
      ? sourceLabel(assistantConversations.length, "guide dialogue turn", "guide dialogue turns")
      : "",
    latestMeetingInput ? sourceLabel(meetingInputs.length, "meeting input") : ""
  ].filter(Boolean);
  const sourceSummary = sourceSummaryParts.length ? sourceSummaryParts.join(", ") : "initial intake only";
  const sourceInputItems = [
    artifactSignals.length
      ? `Uploads influencing this plan: ${artifactSignals
          .map((artifact) => `${artifact.name} (${artifact.artifactType ?? "unclassified"})`)
          .join(", ")}.`
      : "No extracted uploads are influencing this plan yet. Add an artifact with parsed text to ground the guidance.",
    latestUpdate
      ? `Active-program update shaping this plan: ${excerpt(
          firstAvailable(
            review?.programSynthesisNote ?? "",
            review?.progressSinceLastReview ?? "",
            review?.planChanges ?? "",
            review?.activeRisks ?? "",
            "Latest delivery update is on file."
          ),
          140
        )}`
      : "No active-program update is on file yet. Add one when program conditions change so the guidance can regenerate against current reality.",
    teamRoleUpdates.length
      ? `Team role submissions shaping this plan: ${teamRoleUpdates
          .slice(0, 3)
          .map(
            (roleUpdate) =>
              `${roleUpdate.role}: ${excerpt(
                `${firstAvailable(roleUpdate.progressUpdate, roleUpdate.activeRisks, roleUpdate.decisionsNeeded)} (${formatRoleStatus(roleUpdate.status)}${roleUpdate.needsLeadershipAttention ? ", leadership attention" : ""})`,
                84
              )}`
          )
          .join(" / ")}`
      : "No role-specific team submissions are on file yet. Capture role updates through Active Program so the guided plan reflects what each function is seeing this cycle.",
    latestLeadershipFeedback
      ? `Leadership feedback shaping this plan: ${excerpt(
          firstAvailable(
            leadershipInterpretation?.deliveryLeadMessage ?? "",
            leadershipInterpretation?.summary ?? "",
            latestLeadershipFeedback.feedback.feedbackToDeliveryLead,
            latestLeadershipFeedback.feedback.leadershipGuidance,
            leadershipInterpretation?.riskAdjustments.join(" ") ?? "",
            latestLeadershipFeedback.feedback.activeRisks,
            "Leadership review is on file."
          ),
          140
        )}`
      : "No leadership feedback is on file yet. Once entered, leadership signal will be translated into plan changes and role-level direction.",
    latestAssistantConversation
      ? `Guide dialogue shaping this plan: ${excerpt(
          `${latestAssistantConversation.prompt} ${latestAssistantConversation.response.answer}`,
          140
        )}`
      : "No guide dialogue is on file yet. Use Guide to capture operator context that should influence the next plan.",
    latestMeetingInput
      ? `Meeting context shaping this plan: ${excerpt(
          `${latestMeetingInput.title}. ${latestMeetingInput.summary} ${latestMeetingInput.recommendedPlanAdjustments.join(" ")}`,
          160
        )}`
      : "No meeting-derived program input is on file yet. Upload or link meeting context when recurring delivery discussions should influence guidance."
  ];

  return {
    id: randomUUID(),
    programId: program.id,
    programName: intake.programName,
    createdAt: now,
    northStar,
    summary: `Guided plan generated from the current intake and refreshed directly by ${sourceSummary}.`,
    sourceInputs: {
      title: "Fresh Inputs Driving This Plan",
      items: sourceInputItems
    },
    assistantDialogue: {
      title: "Guide Dialogue Shaping This Plan",
      items: latestAssistantConversation
        ? [
            `Latest operator prompt: ${excerpt(latestAssistantConversation.prompt, 140)}`,
            `Latest Guide response influencing this plan: ${excerpt(latestAssistantConversation.response.answer, 140)}`,
            `Dialogue history on file: ${sourceLabel(
              assistantConversations.length,
              "turn"
            )}. Guide dialogue is treated as a grounded planning input for this program.`
          ]
        : [
            "No guide dialogue is on file yet for this program.",
            "Use Guide to capture delivery-lead context, open questions, or operator judgment that should influence the next plan refresh."
          ]
    },
    signalFromNoise: {
      title: "Signal From Noise",
      items: [
        `North star: ${northStar}`,
        `Most important delivery signal: ${firstAvailable(progress, "No progress update captured yet.")}`,
        `Primary noise or pressure: ${firstAvailable(activeRisks, "No active risk captured yet.")}`,
        ...(reviewedContext
          ? [`Reviewed context confidence: ${reviewedContext.confidence}. Use reviewed signals as the planning source of truth.`]
          : []),
        ...(leadershipGuidancePresent
          ? [
              `Leadership input translated for delivery: ${excerpt(
                leadershipInterpretation?.deliveryLeadMessage ?? leadershipSignal.summary,
                140
              )}`
            ]
          : []),
        ...(latestArtifactSignal
          ? [
              `Artifact signal from ${latestArtifactSignal.name} (${latestArtifactSignal.artifactType ?? "unclassified"} / ${
                latestArtifactSignal.fileFormat ?? "unknown"
              }): ${latestArtifactSignal.signal}`
            ]
          : []),
        ...(latestAssistantConversation
          ? [`Guide dialogue signal: ${excerpt(latestAssistantConversation.response.answer, 140)}`]
          : []),
        ...(teamRoleUpdates.length
          ? [
              `Team status signal: ${roleStatusSummary.slice(0, 2).join(" / ")}`
            ]
          : []),
        ...(escalatedRoleUpdates.length
          ? [
              `Leadership attention signal: ${escalatedRoleUpdates
                .slice(0, 2)
                .map((roleUpdate) => `${roleUpdate.role} flagged ${excerpt(firstAvailable(roleUpdate.activeRisks, roleUpdate.blockers, roleUpdate.decisionsNeeded, roleUpdate.supportNeeded), 90)}`)
                .join(" / ")}`
            ]
          : []),
        ...(latestMeetingInput ? [`Meeting signal: ${excerpt(latestMeetingInput.summary, 140)}`] : [])
      ]
    },
    workPath: {
      title: "Recommended Work Path",
      items: [
        "Start with the decision or dependency that unlocks the next useful move.",
        `Use this decision as the next checkpoint: ${firstAvailable(decisions, "Define the next decision needed.")}`,
        leadershipGuidancePresent
          ? `Tighten the next checkpoint structure to reflect the latest leadership direction: ${excerpt(
              leadershipInterpretation?.summary ?? leadershipSignal.summary,
              110
            )}`
          : "Bring leadership feedback into the next checkpoint when it is available.",
        "Keep the plan narrow enough to validate progress before expanding scope."
      ]
    },
    planningApproach: {
      title: "Planning Approach",
      items: [
        "Translate the program context into workstreams, owners, decision gates, and outputs.",
        `Account for current change: ${firstAvailable(review?.planChanges ?? "", "No plan changes captured yet.")}`,
        ...(leadershipInterpretation?.planImpacts.length
          ? leadershipInterpretation.planImpacts.slice(0, 2).map((item) => `Leadership-adjusted planning impact: ${item}`)
          : []),
        ...(latestAssistantConversation
          ? [
              `Assistant dialogue adjustment: ${excerpt(
                `${latestAssistantConversation.prompt} ${latestAssistantConversation.response.answer}`,
                140
              )}`
            ]
          : []),
        ...(latestMeetingInput
          ? [
              `Meeting-derived adjustment: ${excerpt(
                latestMeetingInput.recommendedPlanAdjustments.join(" ") || latestMeetingInput.summary,
                140
              )}`
            ]
          : []),
        ...(teamRoleUpdates.length
          ? [
              `Role-derived adjustment: ${teamRoleUpdates
                .slice(0, 2)
                .map(
                  (roleUpdate) =>
                    `${roleUpdate.role}: ${excerpt(
                      `${firstAvailable(roleUpdate.changesObserved, roleUpdate.supportNeeded, roleUpdate.decisionsNeeded)} (${formatRoleStatus(roleUpdate.status)}${roleUpdate.needsLeadershipAttention ? ", leadership attention" : ""})`,
                      110
                    )}`
                )
                .join(" / ")}`
            ]
          : []),
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
        ...(roleStatusSummary.length
          ? [`Role risk posture: ${roleStatusSummary.join(" / ")}`]
          : []),
        ...(escalatedRoleUpdates.length
          ? [
              `Leadership attention requested by: ${escalatedRoleUpdates
                .map((roleUpdate) => `${roleUpdate.role} (${formatRoleStatus(roleUpdate.status)})`)
                .join(", ")}.`
            ]
          : []),
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
            `Leadership direction translated into plan language: ${firstAvailable(
              leadershipInterpretation?.summary ?? "",
              leadershipSignal.highlights[0]?.replace(/^Direction:\s*/, "")
            )}`,
            ...((leadershipInterpretation?.planImpacts ?? []).slice(0, 2).map((item) => `Plan update: ${item}`)),
            `Risk posture now emphasizes: ${firstAvailable(
              leadershipInterpretation?.riskAdjustments.join("; ") ?? "",
              leadershipSignal.highlights[1]?.replace(/^Risk posture:\s*/, "")
            )}`,
            `Execution should account for: ${firstAvailable(
              leadershipInterpretation?.deliveryLeadMessage ?? "",
              leadershipSignal.highlights[2]?.replace(/^Support emphasis:\s*/, "")
            )}`,
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
      title: "Team Action Plans",
      roles: buildRolePlans(program, latestUpdate, leadershipSignalSummary, leadershipRoleImpacts)
    },
    leadershipSignal,
    followUpQuestions: [
      "What decision or consideration would remove the most ambiguity this week?",
      "Which stakeholder, team role, or dependency needs alignment before the next move?",
      "What evidence would prove the program is still moving toward true north?",
      "What new upload, update, leadership signal, assistant dialogue, or team role should be added before the next plan refresh?"
    ],
    sourceRecordIds: [
      program.id,
      ...(latestUpdate ? [latestUpdate.id] : []),
      ...(latestLeadershipFeedback ? [latestLeadershipFeedback.id] : []),
      ...(latestAssistantConversation ? [latestAssistantConversation.id] : []),
      ...(latestMeetingInput ? [latestMeetingInput.id] : []),
      ...artifactSignals.map((artifact) => artifact.id)
    ]
  };
}
