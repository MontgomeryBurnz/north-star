import type { DeliveryBoardItem, DeliveryBoardStatus, StoredProgramUpdate, TeamRoleUpdate, TeamRoleUpdateStatus } from "./active-program-types.ts";
import type { GuidedPlan } from "./guided-plan-types.ts";
import type { LeadershipReviewRecord } from "./leadership-feedback-types.ts";
import type { ClientDecisionRequest } from "./program-intelligence-types.ts";
import type { StoredProgram } from "./program-intake-types.ts";
import { firstNonEmpty, firstSignal, normalizeWhitespace, splitSignals } from "./text-signals.ts";

export type ClientProgramPosture = "on-track" | "at-risk" | "blocked" | "watch";

export type ClientPortalDomainSummary = {
  role: string;
  pursuit: string;
  risksOrBlockers: string;
  decisionsOrOutcomes: string;
  statusLabel: string;
  attachments: number;
  updatedAt?: string;
};

export type ClientPortalProgram = {
  id: string;
  name: string;
  owner: string;
  phase: string;
  posture: ClientProgramPosture;
  postureLabel: string;
  updatedAt: string;
  executiveOverview: string;
  executiveSummary: string;
  nextDecision: string;
  topRisk: string;
  primaryOutcome: string;
  northStar: string;
  leadershipSignal: string;
  assignedRoles: string[];
  metrics: {
    decisions: number;
    risks: number;
    blockedRoles: number;
    atRiskRoles: number;
    teamRoles: number;
    phaseCompletionPercent: number;
    programCompletionPercent: number;
  };
  outcomes: string[];
  progressUpdates: string[];
  domainSummaries: ClientPortalDomainSummary[];
  risks: string[];
  decisions: string[];
  clientDecisions: ClientDecisionRequest[];
  recommendedPath: string[];
  timeline: Array<{
    detail: string;
    label: string;
    status: "complete" | "current" | "next";
  }>;
};

export type ClientPortalPortfolio = {
  generatedAt: string;
  programs: ClientPortalProgram[];
  metrics: {
    totalPrograms: number;
    onTrack: number;
    atRisk: number;
    blocked: number;
    watch: number;
    decisions: number;
    risks: number;
    healthScore: number;
  };
};

export type ClientPortalProgramInput = {
  assignedRoles?: string[];
  clientDecisions?: ClientDecisionRequest[];
  latestLeadership?: LeadershipReviewRecord | null;
  latestPlan?: GuidedPlan | null;
  latestUpdate?: StoredProgramUpdate | null;
  program: StoredProgram;
};

const timelinePhases = ["Intake", "Plan", "Execute", "Stabilize"] as const;

const timelineDetails: Record<(typeof timelinePhases)[number], string> = {
  Intake: "Scope, outcomes, stakeholders, and source context are established.",
  Plan: "Guidance, sequencing, owners, and decision path are shaped.",
  Execute: "Teams deliver against the current plan while risks are actively managed.",
  Stabilize: "Launch readiness, adoption, controls, and operating handoff are tightened."
};

function clean(value: string | undefined | null) {
  return normalizeWhitespace(value ?? "");
}

const weakSignalPatterns = [
  /^no\s+/i,
  /not captured/i,
  /still being/i,
  /still needs/i,
  /waiting for/i,
  /awaiting/i,
  /guided plan generated/i,
  /initial intake only/i,
  /should capture/i,
  /will sharpen after/i,
  /is still being developed/i
];

function isMeaningfulSignal(value: string | undefined | null) {
  const cleaned = clean(value);
  return Boolean(cleaned) && !weakSignalPatterns.some((pattern) => pattern.test(cleaned));
}

function firstMeaningful(...values: Array<string | null | undefined>) {
  return values.map(clean).find(isMeaningfulSignal) ?? "";
}

function conciseSignal(value: string | undefined | null, limit = 96) {
  const cleaned = clean(value)
    .replace(/^domain movement:\s*/i, "")
    .replace(/^delivery board:\s*/i, "")
    .replace(/^executive attention:\s*/i, "")
    .replace(/^next path:\s*/i, "");
  if (cleaned.length <= limit) return cleaned;

  const truncated = cleaned.slice(0, limit).replace(/\s+\S*$/, "").trim();
  return truncated ? `${truncated}...` : cleaned.slice(0, limit).trim();
}

function visibleSignals(value: string | undefined | null, fallback: string, limit = 3) {
  return splitSignals(value ?? "", fallback).map(clean).filter(Boolean).slice(0, limit);
}

function planItems(section: { items: string[] } | undefined, fallback: string, limit = 3) {
  const items = section?.items.map(clean).filter(Boolean) ?? [];
  return (items.length ? items : [fallback]).slice(0, limit);
}

function countSignals(values: string[]) {
  return values.filter((value) => value && !value.toLowerCase().startsWith("no ")).length;
}

function hasKeyword(value: string, keywords: string[]) {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function deriveRoleStatusCounts(roleUpdates: Array<{ status: TeamRoleUpdateStatus }> | undefined) {
  const blockedRoles = roleUpdates?.filter((role) => role.status === "blocked").length ?? 0;
  const atRiskRoles = roleUpdates?.filter((role) => role.status === "at-risk").length ?? 0;
  return { atRiskRoles, blockedRoles };
}

function derivePosture(input: {
  deliveryHealth: string;
  riskText: string;
  roleUpdates?: Array<{ status: TeamRoleUpdateStatus }>;
}): ClientProgramPosture {
  const { atRiskRoles, blockedRoles } = deriveRoleStatusCounts(input.roleUpdates);
  const combined = `${input.deliveryHealth} ${input.riskText}`;

  if (blockedRoles || hasKeyword(combined, ["blocked", "critical", "stalled"])) return "blocked";
  if (atRiskRoles || hasKeyword(combined, ["at risk", "risk", "delayed", "dependency", "concern"])) return "at-risk";
  if (hasKeyword(combined, ["watch", "monitor", "unknown", "awaiting"])) return "watch";
  return "on-track";
}

function postureLabel(posture: ClientProgramPosture) {
  if (posture === "on-track") return "On track";
  if (posture === "at-risk") return "At risk";
  if (posture === "blocked") return "Blocked";
  return "Watch";
}

function roleStatusLabel(status: TeamRoleUpdateStatus | undefined) {
  if (status === "blocked") return "Blocked";
  if (status === "at-risk") return "At risk";
  if (status === "on-track") return "On track";
  return "Awaiting update";
}

function deliveryBoardStatusLabel(status: DeliveryBoardStatus | undefined) {
  if (status === "not-started") return "Not started";
  if (status === "in-progress") return "In progress";
  if (status === "needs-review") return "Needs review";
  if (status === "blocked") return "Blocked";
  if (status === "done") return "Done";
  return "Unstated";
}

function normalizeRoleKey(role: string) {
  return role.trim().toLowerCase();
}

function firstRolePlanSignal(values: string[] | undefined) {
  return values?.map(clean).find(Boolean) ?? "";
}

function buildDomainSummaries(input: {
  plan: GuidedPlan | null | undefined;
  roleUpdates: TeamRoleUpdate[];
  teamRoles: string[] | undefined;
}) {
  const roleUpdatesByRole = new Map(input.roleUpdates.map((roleUpdate) => [normalizeRoleKey(roleUpdate.role), roleUpdate]));
  const rolePlansByRole = new Map(
    (input.plan?.rolePlans?.roles ?? []).map((rolePlan) => [normalizeRoleKey(rolePlan.role), rolePlan])
  );
  const roleNames = [
    ...new Set([
      ...input.roleUpdates.map((roleUpdate) => roleUpdate.role),
      ...(input.teamRoles ?? []),
      ...(input.plan?.rolePlans?.roles ?? []).map((rolePlan) => rolePlan.role)
    ].map(clean).filter(Boolean))
  ];

  const visibleRoleNames = roleNames.length ? roleNames : ["Program team"];

  return visibleRoleNames.slice(0, 8).map((role) => {
    const roleUpdate = roleUpdatesByRole.get(normalizeRoleKey(role));
    const rolePlan = rolePlansByRole.get(normalizeRoleKey(role));

    return {
      role,
      pursuit: firstNonEmpty(
        roleUpdate?.progressUpdate,
        roleUpdate?.changesObserved,
        firstRolePlanSignal(rolePlan?.actionPlan),
        firstRolePlanSignal(rolePlan?.keyFocusAreas),
        "No current pursuit has been captured for this domain yet."
      ),
      risksOrBlockers: firstNonEmpty(
        roleUpdate?.activeRisks,
        roleUpdate?.blockers,
        firstRolePlanSignal(rolePlan?.risksAndMitigations),
        "No active blocker has been captured for this domain."
      ),
      decisionsOrOutcomes: firstNonEmpty(
        roleUpdate?.decisionsNeeded,
        roleUpdate?.supportNeeded,
        firstRolePlanSignal(rolePlan?.keyOutcomes),
        "No decision or outcome has been captured for this domain."
      ),
      statusLabel: roleStatusLabel(roleUpdate?.status),
      attachments: roleUpdate?.attachments?.length ?? 0,
      updatedAt: roleUpdate?.lastUpdatedAt
    };
  });
}

function buildDomainMovementSignal(domainSummaries: ClientPortalDomainSummary[]) {
  const movingDomains = domainSummaries
    .filter((domain) => isMeaningfulSignal(domain.pursuit))
    .slice(0, 3)
    .map((domain) => `${domain.role}: ${conciseSignal(domain.pursuit, 64)}`);

  return movingDomains.length ? `Focus: ${movingDomains.join("; ")}.` : "";
}

function buildDeliveryBoardProgressSignal(items: DeliveryBoardItem[] | undefined) {
  const activeItems = (items ?? [])
    .filter((item) => item.status !== "done" && isMeaningfulSignal(item.title))
    .slice(0, 2)
    .map((item) => {
      const dueDate = item.dueDate ? `, due ${item.dueDate}` : "";
      return `${item.role || "Team"}: ${conciseSignal(item.title, 58)} (${deliveryBoardStatusLabel(item.status)}${dueDate})`;
    });

  return activeItems.length ? `Board: ${activeItems.join("; ")}.` : "";
}

function buildExecutiveAttentionSignals(risks: string[], decisions: string[]) {
  const risk = risks.find(isMeaningfulSignal);
  const decision = decisions.find(isMeaningfulSignal);

  return [
    risk ? `Risk: ${conciseSignal(risk, 92)}.` : "",
    decision ? `Decision: ${conciseSignal(decision, 92)}.` : ""
  ].filter(Boolean);
}

function buildNextPathSignal(plan: GuidedPlan | null | undefined, recommendedPath: string[]) {
  const nextPath = firstMeaningful(plan?.programGuide?.nextStep, ...recommendedPath);
  return nextPath ? `Next: ${conciseSignal(nextPath, 100)}.` : "";
}

function buildProgressUpdates(input: {
  domainSummaries: ClientPortalDomainSummary[];
  plan: GuidedPlan | null | undefined;
  recommendedPath: string[];
  review: StoredProgramUpdate["review"] | undefined;
  risks: string[];
  decisions: string[];
  intakeStatus: string | undefined;
}) {
  const synthesizedSignals = [
    buildDomainMovementSignal(input.domainSummaries),
    buildDeliveryBoardProgressSignal(input.review?.deliveryBoardItems),
    ...buildExecutiveAttentionSignals(input.risks, input.decisions),
    buildNextPathSignal(input.plan, input.recommendedPath)
  ]
    .map(clean)
    .filter(isMeaningfulSignal)
    .slice(0, 4);

  if (synthesizedSignals.length) return synthesizedSignals;

  return visibleSignals(
    firstNonEmpty(
      input.review?.progressSinceLastReview,
      input.plan?.sourceInputs.items.join("\n"),
      input.intakeStatus,
      input.plan?.summary
    ),
    "No current progress update has been captured yet.",
    4
  );
}

function buildClientExecutiveOverview(input: {
  phase: string;
  postureLabel: string;
  plan: GuidedPlan | null | undefined;
  review: StoredProgramUpdate["review"] | undefined;
  domainSummaries: ClientPortalDomainSummary[];
  risks: string[];
  decisions: string[];
  recommendedPath: string[];
  leadershipSummary: string;
  intakeSummary: string | undefined;
}) {
  const focus = firstMeaningful(
    input.plan?.programGuide?.focus,
    input.review?.programSynthesisNote,
    buildDomainMovementSignal(input.domainSummaries),
    input.review?.progressSinceLastReview
  );
  const why = firstMeaningful(
    input.plan?.programGuide?.whyItMatters,
    input.risks[0],
    input.plan?.keyOutcomes.items[0],
    input.leadershipSummary
  );
  const next = firstMeaningful(input.plan?.programGuide?.nextStep, input.recommendedPath[0], input.decisions[0]);
  const attention = firstMeaningful(input.risks[0], input.decisions[0], why);
  const sponsorReadout = conciseSignal(firstMeaningful(input.plan?.programGuide?.sponsorReadout), 180);

  if (focus && why && next) {
    return clean(
      `${input.postureLabel} in ${input.phase}. Focus: ${conciseSignal(focus, 82)}. ${
        attention ? `Watch: ${conciseSignal(attention, 82)}. ` : ""
      }Next: ${conciseSignal(next, 82)}.`
    );
  }

  return clean(
    firstMeaningful(
      sponsorReadout,
      input.plan?.summary,
      input.review?.programSynthesisNote,
      input.intakeSummary,
      "The executive update will sharpen after role updates, delivery board movement, or leadership feedback are captured."
    )
  );
}

function buildTimeline(currentPhase: string) {
  const phaseText = currentPhase.toLowerCase();
  const currentIndex = Math.max(
    0,
    timelinePhases.findIndex((phase) => phaseText.includes(phase.toLowerCase()))
  );

  return timelinePhases.map((label, index) => ({
    detail: timelineDetails[label],
    label,
    status: index < currentIndex ? "complete" as const : index === currentIndex ? "current" as const : "next" as const
  }));
}

function getCurrentPhaseIndex(currentPhase: string) {
  const phaseText = currentPhase.toLowerCase();
  const matchedIndex = timelinePhases.findIndex((phase) => phaseText.includes(phase.toLowerCase()));
  return matchedIndex >= 0 ? matchedIndex : 0;
}

function getCompletionMetrics(currentPhase: string, posture: ClientProgramPosture) {
  const phaseIndex = getCurrentPhaseIndex(currentPhase);
  const phaseCompletionPercent = Math.round(((phaseIndex + 1) / timelinePhases.length) * 100);
  const postureAdjustment = posture === "on-track" ? 0 : posture === "watch" ? -4 : posture === "at-risk" ? -9 : -15;
  const programCompletionPercent = Math.max(5, Math.min(98, phaseCompletionPercent + postureAdjustment));

  return {
    phaseCompletionPercent,
    programCompletionPercent
  };
}

export function buildClientPortalProgram(input: ClientPortalProgramInput): ClientPortalProgram {
  const review = input.latestUpdate?.review;
  const intake = input.program.intake;
  const roleUpdates = review?.teamRoleUpdates ?? [];
  const risks = visibleSignals(
    firstNonEmpty(review?.activeRisks, input.latestPlan?.risksAndDecisions.items.join("\n"), intake.risks),
    "No active executive risk has been captured yet."
  );
  const decisions = visibleSignals(
    firstNonEmpty(review?.decisionsPending, intake.decisionsNeeded),
    "No executive decision is currently pending."
  );
  const outcomes = planItems(input.latestPlan?.keyOutcomes, firstSignal(intake.outcomes, "Outcome detail is still being shaped."));
  const recommendedPath = planItems(
    input.latestPlan?.workPath,
    "Use the next operating cycle to confirm ownership, remove blockers, and tighten decision timing."
  );
  const currentPhase = clean(firstNonEmpty(review?.currentPhase, intake.currentStatus, "Plan"));
  const { atRiskRoles, blockedRoles } = deriveRoleStatusCounts(roleUpdates);
  const posture = derivePosture({
    deliveryHealth: firstNonEmpty(review?.deliveryHealth, intake.currentStatus),
    riskText: risks.join(" "),
    roleUpdates
  });
  const completion = getCompletionMetrics(currentPhase, posture);
  const domainSummaries = buildDomainSummaries({
    plan: input.latestPlan,
    roleUpdates,
    teamRoles: intake.teamRoles
  });
  const leadershipSignal = clean(
    firstNonEmpty(
      input.latestPlan?.leadershipSignal.summary,
      input.latestLeadership?.interpretation?.summary,
      input.latestLeadership?.feedback.leadershipGuidance,
      "No leadership signal has been captured yet."
    )
  );
  const progressUpdates = buildProgressUpdates({
    domainSummaries,
    plan: input.latestPlan,
    recommendedPath,
    review,
    risks,
    decisions,
    intakeStatus: intake.currentStatus
  });
  const executiveOverview = buildClientExecutiveOverview({
    phase: currentPhase,
    postureLabel: postureLabel(posture),
    plan: input.latestPlan,
    review,
    domainSummaries,
    risks,
    decisions,
    recommendedPath,
    leadershipSummary: leadershipSignal,
    intakeSummary: intake.sowSummary
  });

  return {
    id: input.program.id,
    name: firstNonEmpty(intake.programName, input.latestPlan?.programName, "Untitled program"),
    owner: firstNonEmpty(intake.programOwner, "Owner not set"),
    phase: currentPhase,
    posture,
    postureLabel: postureLabel(posture),
    updatedAt: input.latestUpdate?.updatedAt ?? input.latestUpdate?.createdAt ?? input.latestPlan?.createdAt ?? input.program.updatedAt,
    executiveOverview,
    executiveSummary: clean(
      firstNonEmpty(
        input.latestPlan?.summary,
        review?.programSynthesisNote,
        intake.sowSummary,
        "Program summary is still being developed."
      )
    ),
    nextDecision: firstSignal(decisions.join("\n"), "No executive decision is currently pending."),
    topRisk: firstSignal(risks.join("\n"), "No active executive risk has been captured yet."),
    primaryOutcome: firstSignal(outcomes.join("\n"), "Outcome detail is still being shaped."),
    northStar: clean(firstNonEmpty(input.latestPlan?.northStar, review?.originalNorthStar, intake.vision, "North star not captured yet.")),
    leadershipSignal,
    assignedRoles: input.assignedRoles ?? [],
    metrics: {
      decisions: countSignals(decisions),
      risks: countSignals(risks),
      blockedRoles,
      atRiskRoles,
      teamRoles: roleUpdates.length || intake.teamRoles?.length || 0,
      phaseCompletionPercent: completion.phaseCompletionPercent,
      programCompletionPercent: completion.programCompletionPercent
    },
    outcomes,
    progressUpdates,
    domainSummaries,
    risks,
    decisions,
    clientDecisions: input.clientDecisions ?? [],
    recommendedPath,
    timeline: buildTimeline(currentPhase)
  };
}

export function buildClientPortalPortfolio(input: {
  generatedAt?: string;
  programs: ClientPortalProgramInput[];
}): ClientPortalPortfolio {
  const programs = input.programs.map(buildClientPortalProgram);
  const totalPrograms = programs.length;
  const onTrack = programs.filter((program) => program.posture === "on-track").length;
  const atRisk = programs.filter((program) => program.posture === "at-risk").length;
  const blocked = programs.filter((program) => program.posture === "blocked").length;
  const watch = programs.filter((program) => program.posture === "watch").length;
  const weightedHealth = programs.reduce((total, program) => {
    if (program.posture === "on-track") return total + 100;
    if (program.posture === "watch") return total + 72;
    if (program.posture === "at-risk") return total + 46;
    return total + 18;
  }, 0);

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    programs,
    metrics: {
      totalPrograms,
      onTrack,
      atRisk,
      blocked,
      watch,
      decisions: programs.reduce((total, program) => total + program.metrics.decisions, 0),
      risks: programs.reduce((total, program) => total + program.metrics.risks, 0),
      healthScore: totalPrograms ? Math.round(weightedHealth / totalPrograms) : 0
    }
  };
}
