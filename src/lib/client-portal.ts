import type { StoredProgramUpdate, TeamRoleUpdateStatus } from "./active-program-types.ts";
import type { GuidedPlan } from "./guided-plan-types.ts";
import type { LeadershipReviewRecord } from "./leadership-feedback-types.ts";
import type { StoredProgram } from "./program-intake-types.ts";
import { firstNonEmpty, firstSignal, normalizeWhitespace, splitSignals } from "./text-signals.ts";

export type ClientProgramPosture = "on-track" | "at-risk" | "blocked" | "watch";

export type ClientPortalProgram = {
  id: string;
  name: string;
  owner: string;
  phase: string;
  posture: ClientProgramPosture;
  postureLabel: string;
  updatedAt: string;
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
  };
  outcomes: string[];
  risks: string[];
  decisions: string[];
  recommendedPath: string[];
  timeline: Array<{
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
  latestLeadership?: LeadershipReviewRecord | null;
  latestPlan?: GuidedPlan | null;
  latestUpdate?: StoredProgramUpdate | null;
  program: StoredProgram;
};

const timelinePhases = ["Intake", "Plan", "Execute", "Stabilize"] as const;

function clean(value: string | undefined | null) {
  return normalizeWhitespace(value ?? "");
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

function buildTimeline(currentPhase: string) {
  const phaseText = currentPhase.toLowerCase();
  const currentIndex = Math.max(
    0,
    timelinePhases.findIndex((phase) => phaseText.includes(phase.toLowerCase()))
  );

  return timelinePhases.map((label, index) => ({
    label,
    status: index < currentIndex ? "complete" as const : index === currentIndex ? "current" as const : "next" as const
  }));
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

  return {
    id: input.program.id,
    name: firstNonEmpty(intake.programName, input.latestPlan?.programName, "Untitled program"),
    owner: firstNonEmpty(intake.programOwner, "Owner not set"),
    phase: currentPhase,
    posture,
    postureLabel: postureLabel(posture),
    updatedAt: input.latestUpdate?.updatedAt ?? input.latestUpdate?.createdAt ?? input.latestPlan?.createdAt ?? input.program.updatedAt,
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
    leadershipSignal: clean(
      firstNonEmpty(
        input.latestPlan?.leadershipSignal.summary,
        input.latestLeadership?.interpretation?.summary,
        input.latestLeadership?.feedback.leadershipGuidance,
        "No leadership signal has been captured yet."
      )
    ),
    assignedRoles: input.assignedRoles ?? [],
    metrics: {
      decisions: countSignals(decisions),
      risks: countSignals(risks),
      blockedRoles,
      atRiskRoles,
      teamRoles: roleUpdates.length || intake.teamRoles?.length || 0
    },
    outcomes,
    risks,
    decisions,
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
