import type {
  DeliveryBoardItem,
  DeliveryBoardStatus,
  ProgramTimelineMilestone,
  ProgramTimelineScale,
  StoredProgramUpdate,
  TeamRoleUpdate,
  TeamRoleUpdateStatus
} from "./active-program-types.ts";
import type {
  ClientPortalOverallStatus,
  ClientPortalRoadmapItem,
  ClientPortalUpdateRecord
} from "./client-portal-update-types.ts";
import type { GuidedPlan } from "./guided-plan-types.ts";
import type { ClientDecisionRequest } from "./program-intelligence-types.ts";
import type { ProgramTeamFootprintRole, StoredProgram } from "./program-intake-types.ts";
import { sanitizeClientPortalUpdateForDisplay } from "./client-safe-copy.ts";
import { compareClientNames, getProgramClientName } from "./client-portfolio.ts";
import { getProgramRoleNames } from "./team-roles.ts";
import { firstNonEmpty, firstSignal, normalizeWhitespace, splitSignals } from "./text-signals.ts";

export type ClientProgramPosture = "on-track" | "at-risk" | "blocked" | "watch";
export type ClientProgramStatusSignal = "GREEN" | "AMBER" | "RED" | "WATCH";
export type ClientPortalPriority = "High" | "Medium" | "Low";

export type ClientPortalDomainSummary = {
  owner: string;
  role: string;
  pursuit: string;
  risksOrBlockers: string;
  decisionsOrOutcomes: string;
  statusLabel: string;
  attachments: number;
  updatedAt?: string;
};

export type ClientPortalComponentRoadmapItem = ClientPortalRoadmapItem & {
  endLabel: string;
  startLabel: string;
};

export type ClientPortalProgram = {
  id: string;
  name: string;
  clientName: string;
  owner: string;
  executiveSponsor: string;
  programLead: string;
  pmo: string;
  phase: string;
  posture: ClientProgramPosture;
  postureLabel: string;
  statusSignal: ClientProgramStatusSignal;
  completionDelta: string;
  statusNote: string;
  updatedAt: string;
  executiveOverview: string;
  executiveSummary: string;
  nextMilestone: {
    dateLabel: string;
    name: string;
    priority: ClientPortalPriority;
  };
  nextDecision: string;
  topRisk: string;
  primaryOutcome: string;
  northStar: string;
  leadershipSignal: string;
  assignedRoles: string[];
  metrics: {
    completionBasis: string;
    completionScheduleLabel: string;
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
  clientRoadmapItems: ClientPortalComponentRoadmapItem[];
  domainSummaries: ClientPortalDomainSummary[];
  executiveStatusHighlights: string[];
  recentAccomplishments: string[];
  upcomingWork: string[];
  executiveRisks: Array<{
    severity: "High" | "Medium" | "Low" | "Dependency";
    description: string;
    mitigation: string;
    owner: string;
    target: string;
  }>;
  leadershipDecisions: Array<{
    title: string;
    meta: string;
  }>;
  workstreams: Array<{
    name: string;
    note: string;
    owner: string;
    percent: number;
    percentBasis: string;
    scheduleLabel: string;
    taskCount: number;
    completedTaskCount: number;
    blockedTaskCount: number;
    status: string;
  }>;
  milestones: Array<{
    dateLabel: string;
    name: string;
    note: string;
    priority?: ClientPortalPriority;
    status: "complete" | "current" | "next";
  }>;
  hasPublishedTimeline: boolean;
  timelineScale: ProgramTimelineScale;
  timelineScaleLabel: string;
  timelineWindowLabel: string;
  roadmapWindowLabels: string[];
  roadmapCurrentWindowIndex: number;
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

export type ClientPortalPortfolioMilestone = {
  clientName: string;
  dateLabel: string;
  id: string;
  priority: ClientPortalPriority;
  programId: string;
  programName: string;
  title: string;
};

export type ClientPortalPortfolioRisk = {
  clientName: string;
  description: string;
  id: string;
  programId: string;
  programName: string;
};

export type ClientPortalRoadmapRow = {
  clientName: string;
  markerLabel: string;
  markerPosition: number;
  markerTone: ClientProgramPosture;
  windowMode: ProgramTimelineScale;
  timeframeLabel: string;
  windowLabels: string[];
  currentWindowIndex: number;
  programId: string;
  programName: string;
  segments: Array<{
    label: string;
    state: "complete" | "current" | "next";
  }>;
};

export type ClientPortalPortfolioMetrics = {
  totalPrograms: number;
  onTrack: number;
  atRisk: number;
  blocked: number;
  watch: number;
  delayed: number;
  averageCompletionPercent: number;
  decisions: number;
  risks: number;
  healthScore: number;
};

export type ClientPortalClientPortfolio = {
  clientName: string;
  programIds: string[];
  metrics: ClientPortalPortfolioMetrics;
  upcomingMilestones: ClientPortalPortfolioMilestone[];
  keyRisks: ClientPortalPortfolioRisk[];
  roadmap: ClientPortalRoadmapRow[];
};

export type ClientPortalPortfolio = {
  generatedAt: string;
  programs: ClientPortalProgram[];
  clients: ClientPortalClientPortfolio[];
  metrics: ClientPortalPortfolioMetrics;
  upcomingMilestones: ClientPortalPortfolioMilestone[];
  keyRisks: ClientPortalPortfolioRisk[];
  roadmap: ClientPortalRoadmapRow[];
};

export type ClientPortalProgramInput = {
  assignedRoles?: string[];
  clientDecisions?: ClientDecisionRequest[];
  generatedAt?: string;
  latestClientUpdate?: ClientPortalUpdateRecord | null;
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
  /^n\/?a$/i,
  /^none$/i,
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

function explicitClientRiskSignals(value: string | undefined | null, limit = 3) {
  return splitSignals(value ?? "", "")
    .map(clean)
    .filter(isMeaningfulSignal)
    .slice(0, limit);
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

function statusSignal(posture: ClientProgramPosture): ClientProgramStatusSignal {
  if (posture === "on-track") return "GREEN";
  if (posture === "at-risk") return "AMBER";
  if (posture === "blocked") return "RED";
  return "WATCH";
}

function postureFromClientOverallStatus(status: ClientPortalOverallStatus | undefined): ClientProgramPosture | null {
  if (status === "green") return "on-track";
  if (status === "amber") return "at-risk";
  if (status === "red") return "blocked";
  return null;
}

function parsePercent(value: string | undefined | null) {
  const normalized = clean(value).replace(/%$/, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function parseClientDate(value: string | undefined | null) {
  if (!value) return null;
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Date.UTC(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3])))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function formatClientDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", timeZone: "UTC" }).format(date);
}

function priorityFromPosture(posture: ClientProgramPosture): ClientPortalPriority {
  if (posture === "blocked" || posture === "at-risk") return "High";
  if (posture === "watch") return "Medium";
  return "Low";
}

function priorityFromReview(value: string | undefined | null): ClientPortalPriority | null {
  const normalized = clean(value).toLowerCase();
  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";
  if (normalized === "low") return "Low";
  return null;
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
  teamFootprint: ProgramTeamFootprintRole[] | undefined;
  teamRoles: string[] | undefined;
}) {
  const roleUpdatesByRole = new Map(input.roleUpdates.map((roleUpdate) => [normalizeRoleKey(roleUpdate.role), roleUpdate]));
  const rolePlansByRole = new Map(
    (input.plan?.rolePlans?.roles ?? []).map((rolePlan) => [normalizeRoleKey(rolePlan.role), rolePlan])
  );
  const footprintByRole = new Map(
    (input.teamFootprint ?? []).filter((item) => item.active !== false).map((item) => [normalizeRoleKey(item.role), item])
  );
  const roleNames = [
    ...new Set([
      ...input.roleUpdates.map((roleUpdate) => roleUpdate.role),
      ...(input.teamFootprint ?? []).filter((item) => item.active !== false).map((item) => item.role),
      ...(input.teamRoles ?? []),
      ...(input.plan?.rolePlans?.roles ?? []).map((rolePlan) => rolePlan.role)
    ].map(clean).filter(Boolean))
  ];

  const visibleRoleNames = roleNames.length ? roleNames : ["Program team"];

  return visibleRoleNames.slice(0, 8).map((role) => {
    const roleUpdate = roleUpdatesByRole.get(normalizeRoleKey(role));
    const rolePlan = rolePlansByRole.get(normalizeRoleKey(role));
    const footprint = footprintByRole.get(normalizeRoleKey(role));

    return {
      role,
      owner: firstNonEmpty(roleUpdate?.updatedBy, footprint?.owner, `${role} lead`),
      pursuit: firstNonEmpty(
        roleUpdate?.progressUpdate,
        roleUpdate?.changesObserved,
        footprint?.responsibility,
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
    input.review?.clientStatusNote,
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
  if (!clean(currentPhase) || currentPhase === "Phase not set") return [];

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
  if (!clean(currentPhase) || currentPhase === "Phase not set") return -1;
  const phaseText = currentPhase.toLowerCase();
  const matchedIndex = timelinePhases.findIndex((phase) => phaseText.includes(phase.toLowerCase()));
  if (matchedIndex >= 0) return matchedIndex;
  return Math.min(timelinePhases.length - 1, roadmapPhaseIndex(currentPhase));
}

function roadmapPhaseIndex(currentPhase: string) {
  const phaseText = currentPhase.toLowerCase();
  if (hasKeyword(phaseText, ["value", "benefit", "realization", "operate", "steady state"])) return 4;
  if (hasKeyword(phaseText, ["stabil", "launch", "readiness", "pilot", "recovery"])) return 3;
  if (hasKeyword(phaseText, ["execute", "execution", "build", "develop", "delivery", "implement"])) return 2;
  if (hasKeyword(phaseText, ["plan", "design", "requirement", "roadmap", "scope"])) return 1;
  if (hasKeyword(phaseText, ["discover", "discovery", "intake", "capture", "newly"])) return 0;
  return 0;
}

function clientPhaseLabel(currentPhase: string) {
  const phase = clean(currentPhase);
  if (!phase || phase === "Phase not set") return "Phase not set";

  const phaseText = phase.toLowerCase();
  if (hasKeyword(phaseText, ["value", "benefit", "realization", "operate", "steady state"])) return "Value";
  if (hasKeyword(phaseText, ["stabil", "launch", "readiness", "pilot", "recovery"])) return "Stabilize";
  if (hasKeyword(phaseText, ["execute", "execution", "build", "develop", "delivery", "implement"])) return "Execute";
  if (hasKeyword(phaseText, ["plan", "design", "requirement", "roadmap", "scope"])) return "Plan";
  if (hasKeyword(phaseText, ["discover", "discovery", "intake", "capture", "newly"])) return "Intake";
  if (phase.length <= 32 && !/[.!?]/.test(phase)) return phase;
  return timelinePhases[Math.max(0, roadmapPhaseIndex(phase))] ?? "Discovery";
}

function getScheduleCompletionPercent(input: {
  generatedAt?: string;
  programStartDate?: string | null;
  programTargetFinishDate?: string | null;
  updateTimestamp?: string;
}) {
  const startDate = parseClientDate(input.programStartDate);
  const finishDate = parseClientDate(input.programTargetFinishDate);
  if (!startDate || !finishDate || finishDate.getTime() <= startDate.getTime()) return null;

  const basisDate = parseClientDate(input.generatedAt) ?? parseClientDate(input.updateTimestamp) ?? new Date();
  if (basisDate.getTime() <= startDate.getTime()) {
    return {
      basis: "Schedule",
      percent: 0,
      scheduleLabel: `${formatClientDate(startDate)} -> ${formatClientDate(finishDate)}`
    };
  }
  if (basisDate.getTime() >= finishDate.getTime()) {
    return {
      basis: "Schedule",
      percent: 100,
      scheduleLabel: `${formatClientDate(startDate)} -> ${formatClientDate(finishDate)}`
    };
  }

  const elapsed = basisDate.getTime() - startDate.getTime();
  const duration = finishDate.getTime() - startDate.getTime();
  return {
    basis: "Schedule",
    percent: Math.max(1, Math.min(99, Math.round((elapsed / duration) * 100))),
    scheduleLabel: `${formatClientDate(startDate)} -> ${formatClientDate(finishDate)}`
  };
}

function parseRoadmapMonthStart(value: string | undefined | null) {
  const cleaned = clean(value);
  const monthMatch = cleaned.match(/^(\d{4})-(\d{2})$/);
  if (!monthMatch) return parseClientDate(cleaned);
  return new Date(Date.UTC(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1));
}

function parseRoadmapMonthEnd(value: string | undefined | null) {
  const cleaned = clean(value);
  const monthMatch = cleaned.match(/^(\d{4})-(\d{2})$/);
  if (!monthMatch) return parseClientDate(cleaned);
  return new Date(Date.UTC(Number(monthMatch[1]), Number(monthMatch[2]), 0));
}

function roadmapItemDateProgress(item: ClientPortalComponentRoadmapItem, basisDate: Date) {
  const startDate = parseRoadmapMonthStart(item.startMonth);
  const finishDate = parseRoadmapMonthEnd(item.endMonth);
  if (!startDate || !finishDate || finishDate.getTime() <= startDate.getTime()) return null;

  if (basisDate.getTime() <= startDate.getTime()) return 0;
  if (basisDate.getTime() >= finishDate.getTime()) return 95;

  const elapsed = basisDate.getTime() - startDate.getTime();
  const duration = finishDate.getTime() - startDate.getTime();
  return Math.max(5, Math.min(95, Math.round((elapsed / duration) * 100)));
}

function roadmapItemProgress(item: ClientPortalComponentRoadmapItem, basisDate: Date) {
  if (item.status === "complete") return 100;
  if (item.status === "planned") return 0;
  return roadmapItemDateProgress(item, basisDate) ?? 50;
}

function getRoadmapCompletionPercent(input: {
  clientRoadmapItems?: ClientPortalComponentRoadmapItem[];
  generatedAt?: string;
  updateTimestamp?: string;
}) {
  const items = input.clientRoadmapItems?.filter((item) => item.title && item.startMonth && item.endMonth) ?? [];
  if (!items.length) return null;

  const basisDate = parseClientDate(input.generatedAt) ?? parseClientDate(input.updateTimestamp) ?? new Date();
  const itemProgress = items.map((item) => roadmapItemProgress(item, basisDate));
  const completeCount = items.filter((item) => item.status === "complete").length;
  const activeCount = items.filter((item) => item.status === "in-progress" || item.status === "at-risk" || item.status === "blocked").length;

  return {
    basis: "Roadmap items",
    percent: Math.max(0, Math.min(100, Math.round(itemProgress.reduce((sum, value) => sum + value, 0) / items.length))),
    scheduleLabel: `${completeCount}/${items.length} complete${activeCount ? ` · ${activeCount} active` : ""}`
  };
}

function getCompletionMetrics(input: {
  clientRoadmapItems?: ClientPortalComponentRoadmapItem[];
  currentPhase: string;
  generatedAt?: string;
  manualCompletionPercent?: string | null;
  posture: ClientProgramPosture;
  programStartDate?: string | null;
  programTargetFinishDate?: string | null;
  updateTimestamp?: string;
}) {
  const { currentPhase, posture } = input;
  const phaseIndex = getCurrentPhaseIndex(currentPhase);
  const phaseCompletionPercent = phaseIndex >= 0 ? Math.round(((phaseIndex + 1) / timelinePhases.length) * 100) : 0;
  const roadmapCompletion = getRoadmapCompletionPercent(input);
  if (roadmapCompletion) {
    return {
      completionBasis: roadmapCompletion.basis,
      completionScheduleLabel: roadmapCompletion.scheduleLabel,
      phaseCompletionPercent,
      programCompletionPercent: roadmapCompletion.percent
    };
  }

  const scheduleCompletion = getScheduleCompletionPercent(input);
  if (scheduleCompletion) {
    return {
      completionBasis: scheduleCompletion.basis,
      completionScheduleLabel: scheduleCompletion.scheduleLabel,
      phaseCompletionPercent,
      programCompletionPercent: scheduleCompletion.percent
    };
  }

  const manualCompletionPercent = parsePercent(input.manualCompletionPercent);
  if (manualCompletionPercent !== null) {
    return {
      completionBasis: "Manual override",
      completionScheduleLabel: "Program dates not used",
      phaseCompletionPercent,
      programCompletionPercent: manualCompletionPercent
    };
  }

  const postureAdjustment = posture === "on-track" ? 0 : posture === "watch" ? -4 : posture === "at-risk" ? -9 : -15;
  const programCompletionPercent = phaseCompletionPercent
    ? Math.max(5, Math.min(98, phaseCompletionPercent + postureAdjustment))
    : 0;

  return {
    completionBasis: phaseCompletionPercent ? "Phase estimate" : "Not set",
    completionScheduleLabel: "Add start and target finish dates",
    phaseCompletionPercent,
    programCompletionPercent
  };
}

function uniqueMeaningfulSignals(values: Array<string | undefined | null>, fallback: string, limit = 4) {
  const seen = new Set<string>();
  const signals = values
    .flatMap((value) => splitSignals(value ?? "", ""))
    .map(clean)
    .filter(isMeaningfulSignal)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);

  return signals.length ? signals : [fallback];
}

function formatDateLabel(value: string | undefined | null) {
  if (!value) return "";
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short" }).format(date);
}

function formatMonthLabel(value: string | undefined | null) {
  if (!value) return "";
  const monthMatch = value.match(/^(\d{4})-(\d{2})$/);
  if (!monthMatch) return value;
  const date = new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function buildClientRoadmapItems(update: ClientPortalUpdateRecord | null | undefined): ClientPortalComponentRoadmapItem[] {
  if (!update) return [];
  const safeUpdate = sanitizeClientPortalUpdateForDisplay(update);

  return (safeUpdate.clientRoadmapItems ?? [])
    .map((item, index) => ({
      ...item,
      category: clean(item.category) || "Roadmap",
      endLabel: formatMonthLabel(item.endMonth) || clean(item.endMonth),
      id: clean(item.id) || `${safeUpdate.programId}-client-roadmap-${index}`,
      note: clean(item.note),
      owner: clean(item.owner),
      startLabel: formatMonthLabel(item.startMonth) || clean(item.startMonth),
      title: clean(item.title)
    }))
    .filter((item) => item.category && item.title && item.startMonth && item.endMonth)
    .slice(0, 24);
}

function formatShortDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(date);
}

function fiscalYearSuffix(value: string) {
  const match = value.trim().match(/^FY\s*(\d{2,4})$/i);
  if (!match) return null;
  return match[1].length === 2 ? Number(match[1]) : Number(match[1].slice(-2));
}

function nextYearLabel(value: string) {
  const trimmed = value.trim();
  const fiscalSuffix = fiscalYearSuffix(trimmed);
  if (fiscalSuffix !== null && Number.isFinite(fiscalSuffix)) {
    return `FY${String(fiscalSuffix + 1).padStart(2, "0")}`;
  }

  const numericYear = Number(trimmed);
  if (Number.isInteger(numericYear) && numericYear > 1900) return String(numericYear + 1);
  return `${trimmed} +1`;
}

function deriveYearWindowLabels(year: string) {
  const base = year.trim() || "Program Year";
  return [`Q1 ${base}`, `Q2 ${base}`, `Q3 ${base}`, `Q4 ${base}`, `Q1 ${nextYearLabel(base)}`];
}

function deriveMonthWindowLabels(month: string) {
  const monthMatch = month.match(/^(\d{4})-(\d{2})$/);
  if (!monthMatch) return ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

  const start = new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
  if (Number.isNaN(start.getTime())) return ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];

  return Array.from({ length: 5 }, (_, index) => {
    const week = new Date(start);
    week.setDate(start.getDate() + index * 7);
    return formatShortDateLabel(week);
  });
}

function deriveWeekWindowLabels(weekStart: string) {
  if (!weekStart) return ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const dateOnlyMatch = weekStart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const start = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(weekStart);
  if (Number.isNaN(start.getTime())) return ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return formatShortDateLabel(day);
  });
}

function currentWindowIndexFromDate(dateValue: string | undefined, scale: ProgramTimelineScale, fallback = 2) {
  if (!dateValue) return fallback;
  const dateOnlyMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return fallback;

  if (scale === "year") return Math.max(0, Math.min(4, Math.floor(date.getMonth() / 3)));
  if (scale === "month") return Math.max(0, Math.min(4, Math.floor((date.getDate() - 1) / 7)));
  return Math.max(0, Math.min(4, Math.max(0, date.getDay() - 1)));
}

function buildRoadmapWindow(review: StoredProgramUpdate["review"] | undefined, currentMilestoneDate?: string) {
  const scale: ProgramTimelineScale =
    review?.timelineScale === "month" || review?.timelineScale === "week" ? review.timelineScale : "year";

  if (scale === "week") {
    const timeframeLabel = review?.timelineWeek ? `Week of ${formatDateLabel(review.timelineWeek)}` : "Program Week";
    return {
      currentWindowIndex: currentWindowIndexFromDate(currentMilestoneDate || review?.timelineWeek, scale),
      scale,
      scaleLabel: "Week",
      timeframeLabel,
      windowLabels: deriveWeekWindowLabels(review?.timelineWeek ?? "")
    };
  }

  if (scale === "month") {
    const timeframeLabel = formatMonthLabel(review?.timelineMonth) || "Program Month";
    return {
      currentWindowIndex: currentWindowIndexFromDate(currentMilestoneDate, scale),
      scale,
      scaleLabel: "Month",
      timeframeLabel,
      windowLabels: deriveMonthWindowLabels(review?.timelineMonth ?? "")
    };
  }

  const timeframeLabel = review?.timelineYear?.trim() || "Program Year";
  return {
    currentWindowIndex: currentWindowIndexFromDate(currentMilestoneDate, scale),
    scale,
    scaleLabel: "Year",
    timeframeLabel,
    windowLabels: deriveYearWindowLabels(timeframeLabel)
  };
}

function hasPublishedTimeline(review: StoredProgramUpdate["review"] | undefined) {
  const explicitWindow = Boolean(clean(review?.timelineYear) || clean(review?.timelineMonth) || clean(review?.timelineWeek));
  const explicitNextMilestone = Boolean(clean(review?.nextMilestoneName) || clean(review?.nextMilestoneDate));
  const explicitProgramMilestone = (review?.programMilestones ?? []).some(
    (milestone) => clean(milestone.name) || clean(milestone.date) || clean(milestone.note)
  );

  return explicitWindow || explicitNextMilestone || explicitProgramMilestone;
}

function stakeholderByKeyword(stakeholders: string | undefined, keyword: string, fallback: string) {
  const signals = splitSignals(stakeholders ?? "", "")
    .map(clean)
    .filter(Boolean);
  return signals.find((signal) => signal.toLowerCase().includes(keyword)) ?? fallback;
}

function buildExecutiveStatusHighlights(input: {
  completion: { phaseCompletionPercent: number; programCompletionPercent: number };
  completionDelta: string;
  phase: string;
  posture: ClientProgramPosture;
  postureLabel: string;
  risks: string[];
  statusNote: string;
}) {
  const riskSignal = firstMeaningful(...input.risks);
  const highlights = [
    input.phase && input.phase !== "Phase not set" ? `${input.postureLabel} in ${input.phase}` : "",
    input.completion.programCompletionPercent
      ? `Program complete ${input.completion.programCompletionPercent}%${input.completionDelta ? ` · ${input.completionDelta}` : ""}`
      : "",
    input.statusNote && !riskSignal ? input.statusNote : "",
    riskSignal ? `Risk exposure: ${conciseSignal(riskSignal, 96)}` : ""
  ].filter(isMeaningfulSignal);

  return highlights.length ? highlights : ["Executive highlights will appear after a reviewed client update is published."];
}

function buildRecentAccomplishments(input: {
  domainSummaries: ClientPortalDomainSummary[];
  plan: GuidedPlan | null | undefined;
  review: StoredProgramUpdate["review"] | undefined;
}) {
  const completedBoardItems = (input.review?.deliveryBoardItems ?? [])
    .filter((item) => item.status === "done" || item.status === "needs-review")
    .map((item) => `${item.role || "Team"} moved ${item.title} to ${deliveryBoardStatusLabel(item.status)}.`);
  const domainSignals = input.domainSummaries
    .filter((domain) => isMeaningfulSignal(domain.pursuit))
    .map((domain) => `${domain.role}: ${conciseSignal(domain.pursuit, 94)}`);

  return uniqueMeaningfulSignals(
    [
      input.review?.progressSinceLastReview,
      input.review?.planChanges,
      ...completedBoardItems,
      ...domainSignals,
      input.plan?.summary
    ],
    "Recent accomplishments will populate after a reviewed client update is published.",
    4
  );
}

function buildUpcomingWork(input: {
  decisions: string[];
  domainSummaries: ClientPortalDomainSummary[];
  plan: GuidedPlan | null | undefined;
  recommendedPath: string[];
  review: StoredProgramUpdate["review"] | undefined;
}) {
  const activeBoardItems = (input.review?.deliveryBoardItems ?? [])
    .filter((item) => item.status !== "done" && isMeaningfulSignal(item.title))
    .map((item) => `${item.role || "Team"}: ${item.title}`);
  const domainDecisionSignals = input.domainSummaries
    .filter((domain) => isMeaningfulSignal(domain.decisionsOrOutcomes))
    .map((domain) => `${domain.role}: ${conciseSignal(domain.decisionsOrOutcomes, 88)}`);

  return uniqueMeaningfulSignals(
    [
      input.plan?.programGuide?.nextStep,
      ...input.recommendedPath,
      input.review?.supportNeeded,
      input.review?.planChanges,
      ...activeBoardItems,
      ...domainDecisionSignals,
      ...input.decisions
    ],
    "Upcoming work will sharpen after a reviewed client update is published.",
    4
  );
}

function buildExecutiveRisks(input: {
  owner: string;
  posture: ClientProgramPosture;
  risks: string[];
}) {
  const riskRows = input.risks.filter(isMeaningfulSignal).map((risk, index) => ({
    severity: (input.posture === "blocked" || (input.posture === "at-risk" && index === 0) ? "High" : "Medium") as "High" | "Medium",
    description: risk,
    mitigation: "",
    owner: input.owner,
    target: ""
  }));

  return riskRows.slice(0, 4);
}

function buildLeadershipDecisions(input: {
  decisions: string[];
  owner: string;
  review: StoredProgramUpdate["review"] | undefined;
}) {
  const decisionRows = input.decisions.filter(isMeaningfulSignal).map((decision) => ({
    title: decision,
    meta: `Owner: ${input.owner} · Due: next steering cycle`
  }));

  const boardReviewRows = (input.review?.deliveryBoardItems ?? [])
    .filter((item) => item.status === "needs-review")
    .slice(0, 2)
    .map((item) => ({
      title: `Review ${item.title}.`,
      meta: `Owner: ${firstNonEmpty(item.owner, input.owner)} · Due: ${formatDateLabel(item.dueDate) || "next checkpoint"}`
    }));

  const rows = [...decisionRows, ...boardReviewRows].slice(0, 3);
  return rows;
}

function deliveryTaskDateProgress(item: DeliveryBoardItem, basisDate: Date) {
  const startDate = parseClientDate(item.startDate);
  const finishDate = parseClientDate(item.dueDate);
  if (!startDate || !finishDate || finishDate.getTime() <= startDate.getTime()) return null;

  if (basisDate.getTime() <= startDate.getTime()) return 0;
  if (basisDate.getTime() >= finishDate.getTime()) return item.status === "done" ? 100 : 95;

  const elapsed = basisDate.getTime() - startDate.getTime();
  const duration = finishDate.getTime() - startDate.getTime();
  return Math.max(5, Math.min(95, Math.round((elapsed / duration) * 100)));
}

function deliveryTaskProgress(item: DeliveryBoardItem, basisDate: Date) {
  if (item.status === "done") return 100;
  if (item.status === "needs-review") return 90;
  if (item.status === "not-started") return 0;

  const dateProgress = deliveryTaskDateProgress(item, basisDate);
  if (typeof dateProgress === "number") {
    return item.status === "blocked" ? Math.min(60, Math.max(10, dateProgress)) : dateProgress;
  }

  if (item.status === "blocked") return 35;
  if (item.status === "in-progress") return 50;
  return 0;
}

function deliveryTaskAppliesToRole(item: DeliveryBoardItem, role: string) {
  const roleKey = normalizeRoleKey(role);
  return normalizeRoleKey(item.role) === roleKey || (item.sharedRoles ?? []).some((sharedRole) => normalizeRoleKey(sharedRole) === roleKey);
}

function workstreamStatusFromTasks(tasks: DeliveryBoardItem[]) {
  if (!tasks.length) return "No linked tasks";
  if (tasks.some((item) => item.status === "blocked")) return "Blocked";
  if (tasks.some((item) => item.status === "needs-review")) return "Needs review";
  if (tasks.every((item) => item.status === "done")) return "Done";
  if (tasks.some((item) => item.status === "in-progress")) return "In progress";
  return "Not started";
}

function workstreamScheduleLabel(tasks: DeliveryBoardItem[]) {
  const startDates = tasks.map((item) => parseClientDate(item.startDate)).filter((date): date is Date => Boolean(date));
  const finishDates = tasks.map((item) => parseClientDate(item.dueDate)).filter((date): date is Date => Boolean(date));
  const earliestStart = startDates.sort((first, second) => first.getTime() - second.getTime())[0];
  const latestFinish = finishDates.sort((first, second) => second.getTime() - first.getTime())[0];

  if (earliestStart && latestFinish) return `${formatClientDate(earliestStart)} -> ${formatClientDate(latestFinish)}`;
  if (earliestStart) return `Starts ${formatClientDate(earliestStart)}`;
  if (latestFinish) return `Finish ${formatClientDate(latestFinish)}`;
  return "No task dates captured";
}

function buildWorkstreams(
  domainSummaries: ClientPortalDomainSummary[],
  deliveryBoardItems: DeliveryBoardItem[] | undefined,
  updateTimestamp: string | undefined
) {
  const basisDate = parseClientDate(updateTimestamp) ?? new Date();

  return domainSummaries.slice(0, 8).map((domain) => {
    const roleTasks = (deliveryBoardItems ?? []).filter((item) => deliveryTaskAppliesToRole(item, domain.role));
    if (!roleTasks.length) {
      return {
        name: domain.role,
        note: conciseSignal(domain.pursuit, 110),
        owner: domain.owner,
        percent: 0,
        percentBasis: "No delivery board tasks linked",
        scheduleLabel: "No task dates captured",
        taskCount: 0,
        completedTaskCount: 0,
        blockedTaskCount: 0,
        status: "No linked tasks"
      };
    }

    const completedTaskCount = roleTasks.filter((item) => item.status === "done").length;
    const blockedTaskCount = roleTasks.filter((item) => item.status === "blocked").length;
    const totalProgress = roleTasks.reduce((sum, item) => sum + deliveryTaskProgress(item, basisDate), 0);
    const percent = Math.round(totalProgress / roleTasks.length);
    const priorityTask =
      roleTasks.find((item) => item.status === "blocked") ??
      roleTasks.find((item) => item.status === "needs-review") ??
      roleTasks.find((item) => item.status === "in-progress") ??
      roleTasks[0];

    return {
      name: domain.role,
      note: conciseSignal(firstMeaningful(priorityTask.latestNote, priorityTask.description, priorityTask.title, domain.pursuit), 110),
      owner: firstNonEmpty(priorityTask.owner, domain.owner),
      percent,
      percentBasis: `${completedTaskCount}/${roleTasks.length} tasks done`,
      scheduleLabel: workstreamScheduleLabel(roleTasks),
      taskCount: roleTasks.length,
      completedTaskCount,
      blockedTaskCount,
      status: workstreamStatusFromTasks(roleTasks)
    };
  });
}

function buildMilestones(review: StoredProgramUpdate["review"] | undefined) {
  const reviewMilestones = buildReviewMilestones(review?.programMilestones);
  const explicitMilestoneName = clean(review?.nextMilestoneName);
  const explicitMilestoneDate = formatDateLabel(review?.nextMilestoneDate);
  const explicitMilestonePriority = priorityFromReview(review?.nextMilestonePriority);
  const explicitMilestone = explicitMilestoneName
    ? {
        dateLabel: explicitMilestoneDate || "Date not captured",
        name: explicitMilestoneName,
        note: `${explicitMilestonePriority ?? "Priority not set"} priority checkpoint`,
        priority: explicitMilestonePriority ?? undefined,
        status: "current" as const
      }
    : null;

  if (reviewMilestones.length) {
    const hasExplicitMilestone = explicitMilestone
      ? reviewMilestones.some(
          (milestone) =>
            milestone.name.toLowerCase() === explicitMilestone.name.toLowerCase() &&
            milestone.dateLabel.toLowerCase() === explicitMilestone.dateLabel.toLowerCase()
        )
      : true;
    return (explicitMilestone && !hasExplicitMilestone ? [...reviewMilestones, explicitMilestone] : reviewMilestones).slice(0, 6);
  }

  return explicitMilestone ? [explicitMilestone] : [];
}

function buildReviewMilestones(programMilestones: ProgramTimelineMilestone[] | undefined): ClientPortalProgram["milestones"] {
  return (programMilestones ?? [])
    .map((milestone) => ({
      dateLabel: formatDateLabel(milestone.date) || "Date not captured",
      name: clean(milestone.name),
      note: clean(milestone.note) || `${milestone.priority ?? "Program"} checkpoint`,
      priority: priorityFromReview(milestone.priority) ?? undefined,
      status: milestone.status
    }))
    .filter((milestone) => milestone.name || milestone.note)
    .slice(0, 6);
}

function clientPortalUpdateToReview(update: ClientPortalUpdateRecord | null | undefined): StoredProgramUpdate["review"] | undefined {
  if (!update) return undefined;
  const safeUpdate = sanitizeClientPortalUpdateForDisplay(update);

  return {
    programName: safeUpdate.programName,
    executiveSponsor: safeUpdate.executiveSponsor ?? "",
    programLead: safeUpdate.programLead ?? "",
    pmo: safeUpdate.pmo ?? "",
    originalNorthStar: safeUpdate.originalNorthStar ?? "",
    currentPhase: safeUpdate.currentPhase,
    programCompletionPercent: safeUpdate.programCompletionPercent ?? "",
    completionDelta: safeUpdate.completionDelta ?? "",
    nextMilestoneName: safeUpdate.nextMilestoneName ?? "",
    nextMilestoneDate: safeUpdate.nextMilestoneDate ?? "",
    nextMilestonePriority: safeUpdate.nextMilestonePriority ?? "",
    programStartDate: safeUpdate.programStartDate ?? "",
    programTargetFinishDate: safeUpdate.programTargetFinishDate ?? "",
    clientStatusNote: safeUpdate.clientStatusNote,
    progressSinceLastReview: safeUpdate.progressSinceLastReview,
    planChanges: safeUpdate.upcomingWork,
    activeRisks: safeUpdate.activeRisks,
    stakeholderTemperature: "",
    decisionsPending: safeUpdate.decisionsPending,
    deliveryHealth: safeUpdate.deliveryHealth,
    supportNeeded: safeUpdate.supportNeeded ?? "",
    timelineScale: safeUpdate.timelineScale ?? "year",
    timelineYear: safeUpdate.timelineYear ?? "",
    timelineMonth: safeUpdate.timelineMonth ?? "",
    timelineWeek: safeUpdate.timelineWeek ?? "",
    programMilestones: safeUpdate.programMilestones ?? [],
    programSynthesisNote: safeUpdate.executiveOverview,
    teamRoleUpdates: safeUpdate.domainUpdates.map((domain) => ({
      role: domain.role,
      updatedBy: domain.owner,
      progressUpdate: domain.pursuit,
      changesObserved: "",
      activeRisks: domain.risksOrBlockers,
      blockers: "",
      decisionsNeeded: domain.decisionsOrOutcomes,
      supportNeeded: "",
      status: domain.status,
      needsLeadershipAttention: domain.status === "blocked",
      attachments: [],
      lastUpdatedAt: safeUpdate.updatedAt
    })),
    deliveryBoardItems: safeUpdate.deliveryBoardItems ?? [],
    artifacts: []
  };
}

export function buildClientPortalProgram(input: ClientPortalProgramInput): ClientPortalProgram {
  const clientUpdate = input.latestClientUpdate;
  const review = clientPortalUpdateToReview(clientUpdate);
  const intake = input.program.intake;
  const plan = null as GuidedPlan | null;
  const roleUpdates = review?.teamRoleUpdates ?? [];
  const risks = explicitClientRiskSignals(review?.activeRisks);
  const decisions = visibleSignals(
    firstNonEmpty(review?.decisionsPending),
    "No published executive decision is currently pending."
  );
  const outcomes = clientUpdate
    ? visibleSignals(firstNonEmpty(review?.supportNeeded, review?.progressSinceLastReview), "", 4).filter(Boolean)
    : [];
  const recommendedPath = clientUpdate ? visibleSignals(review?.supportNeeded, "", 4).filter(Boolean) : [];
  const currentPhase = clientPhaseLabel(
    firstNonEmpty(review?.currentPhase, clientUpdate ? "Phase not set" : intake.currentStatus, "Phase not set")
  );
  const { atRiskRoles, blockedRoles } = deriveRoleStatusCounts(roleUpdates);
  const posture =
    postureFromClientOverallStatus(clientUpdate?.overallStatus) ??
    derivePosture({
      deliveryHealth: firstNonEmpty(review?.deliveryHealth, intake.currentStatus),
      riskText: risks.join(" "),
      roleUpdates
    });
  const updateTimestamp = clientUpdate?.updatedAt ?? clientUpdate?.createdAt;
  const clientRoadmapItems = buildClientRoadmapItems(clientUpdate);
  const completion = getCompletionMetrics({
    clientRoadmapItems,
    currentPhase,
    generatedAt: input.generatedAt,
    manualCompletionPercent: review?.programCompletionPercent,
    posture,
    programStartDate: review?.programStartDate,
    programTargetFinishDate: review?.programTargetFinishDate,
    updateTimestamp
  });
  const domainSummaries = buildDomainSummaries({
    plan,
    roleUpdates,
    teamFootprint: intake.teamFootprint,
    teamRoles: intake.teamRoles
  });
  const leadershipSignal = clean(
    firstNonEmpty(
      review?.supportNeeded,
      review?.decisionsPending,
      "No client-facing leadership signal has been published yet."
    )
  );
  const progressUpdates = buildProgressUpdates({
    domainSummaries,
    plan,
    recommendedPath,
    review,
    risks,
    decisions,
    intakeStatus: clientUpdate ? intake.currentStatus : undefined
  });
  const executiveOverview = buildClientExecutiveOverview({
    phase: currentPhase,
    postureLabel: postureLabel(posture),
    plan,
    review,
    domainSummaries,
    risks,
    decisions,
    recommendedPath,
    leadershipSummary: leadershipSignal,
    intakeSummary: clientUpdate ? intake.sowSummary : undefined
  });
  const completionDeltaSignal = clean(review?.completionDelta);
  const statusNote = conciseSignal(
    firstMeaningful(
      review?.clientStatusNote,
      plan?.programGuide?.sponsorReadout,
      plan?.summary,
      review?.programSynthesisNote,
      progressUpdates[0],
      executiveOverview,
      "Publish a reviewed client update to show current program posture."
    ),
    138
  );
  const executiveStatusHighlights = buildExecutiveStatusHighlights({
    completion,
    completionDelta: completionDeltaSignal,
    phase: currentPhase,
    posture,
    postureLabel: postureLabel(posture),
    risks,
    statusNote
  });
  const recentAccomplishments = buildRecentAccomplishments({
    domainSummaries,
    plan,
    review
  });
  const upcomingWork = buildUpcomingWork({
    decisions,
    domainSummaries,
    plan,
    recommendedPath,
    review
  });
  const workstreams = buildWorkstreams(domainSummaries, review?.deliveryBoardItems, updateTimestamp);
  const milestones = buildMilestones(review);
  const explicitMilestoneName = clean(review?.nextMilestoneName);
  const nextMilestone = (explicitMilestoneName
    ? milestones.find((milestone) => milestone.name === explicitMilestoneName)
    : undefined)
    ?? milestones.find((milestone) => milestone.status === "current" && !milestone.name.toLowerCase().endsWith(" update"))
    ?? milestones.find((milestone) => milestone.status === "next")
    ?? milestones.find((milestone) => milestone.status === "current")
    ?? {
    dateLabel: "",
    name: "No milestone captured",
    note: "Add a next milestone or delivery board due date in Program Hub.",
    status: "next" as const
  };
  const owner = firstNonEmpty(intake.programOwner, "Owner not set");
  const explicitMilestonePriority = priorityFromReview(review?.nextMilestonePriority);
  const currentMilestoneDate =
    review?.programMilestones?.find((milestone) => milestone.status === "current" && milestone.date)?.date ??
    review?.programMilestones?.find((milestone) => milestone.status === "next" && milestone.date)?.date ??
    review?.nextMilestoneDate;
  const roadmapWindow = buildRoadmapWindow(review, currentMilestoneDate);
  const roadmapCurrentWindowIndex =
    roadmapWindow.scale === "year" ? roadmapPhaseIndex(currentPhase) : roadmapWindow.currentWindowIndex;
  const hasTimeline = hasPublishedTimeline(review);

  return {
    id: input.program.id,
    name: firstNonEmpty(intake.programName, "Untitled program"),
    clientName: getProgramClientName(input.program),
    owner,
    executiveSponsor: firstNonEmpty(review?.executiveSponsor, stakeholderByKeyword(intake.stakeholders, "sponsor", "Executive sponsor")),
    programLead: firstNonEmpty(review?.programLead, owner),
    pmo: firstNonEmpty(review?.pmo, stakeholderByKeyword(intake.stakeholders, "pmo", "PMO")),
    phase: currentPhase,
    posture,
    postureLabel: postureLabel(posture),
    statusSignal: statusSignal(posture),
    completionDelta: completionDeltaSignal,
    statusNote,
    updatedAt: clientUpdate?.updatedAt ?? clientUpdate?.createdAt ?? input.program.updatedAt,
    executiveOverview,
    executiveSummary: clean(
      firstNonEmpty(
        review?.clientStatusNote,
        plan?.programGuide?.sponsorReadout,
        plan?.summary,
        review?.programSynthesisNote,
        "Publish a reviewed client update to show the executive summary."
      )
    ),
    nextMilestone: {
      dateLabel: nextMilestone.dateLabel,
      name: nextMilestone.name,
      priority: nextMilestone.priority ?? explicitMilestonePriority ?? priorityFromPosture(posture)
    },
    nextDecision: firstSignal(decisions.join("\n"), "No executive decision is currently pending."),
    topRisk: firstSignal(risks.join("\n"), "No active executive risk has been captured yet."),
    primaryOutcome: firstSignal(outcomes.join("\n"), "No client-facing outcome has been published yet."),
    northStar: clean(firstNonEmpty(review?.originalNorthStar, "Publish a reviewed client update to show the north star.")),
    leadershipSignal,
    assignedRoles: input.assignedRoles ?? [],
    metrics: {
      completionBasis: completion.completionBasis,
      completionScheduleLabel: completion.completionScheduleLabel,
      decisions: countSignals(decisions),
      risks: countSignals(risks),
      blockedRoles,
      atRiskRoles,
      teamRoles: roleUpdates.length || getProgramRoleNames(intake).length,
      phaseCompletionPercent: completion.phaseCompletionPercent,
      programCompletionPercent: completion.programCompletionPercent
    },
    outcomes,
    progressUpdates,
    clientRoadmapItems,
    domainSummaries,
    executiveStatusHighlights,
    recentAccomplishments,
    upcomingWork,
    executiveRisks: buildExecutiveRisks({
      owner: firstNonEmpty(intake.programOwner, "Program owner"),
      posture,
      risks
    }),
    leadershipDecisions: buildLeadershipDecisions({
      decisions,
      owner: firstNonEmpty(intake.programOwner, "Program owner"),
      review
    }),
    workstreams,
    milestones,
    hasPublishedTimeline: hasTimeline,
    timelineScale: roadmapWindow.scale,
    timelineScaleLabel: roadmapWindow.scaleLabel,
    timelineWindowLabel: roadmapWindow.timeframeLabel,
    roadmapWindowLabels: roadmapWindow.windowLabels,
    roadmapCurrentWindowIndex,
    risks,
    decisions,
    clientDecisions: input.clientDecisions ?? [],
    recommendedPath,
    timeline: buildTimeline(currentPhase)
  };
}

function clampRoadmapIndex(index: number, segmentCount: number) {
  return Math.max(0, Math.min(Math.max(0, segmentCount - 1), index));
}

function roadmapMarkerPosition(currentIndex: number, segmentCount: number) {
  if (!segmentCount) return 50;
  return ((currentIndex + 0.5) / segmentCount) * 100;
}

function roadmapStateForIndex(currentIndex: number, index: number) {
  if (index < currentIndex) return "complete" as const;
  if (index === currentIndex) return "current" as const;
  return "next" as const;
}

function buildPortfolioRoadmap(programs: ClientPortalProgram[]): ClientPortalRoadmapRow[] {
  const phaseSegmentLabels = ["Discover", "Plan", "Execute", "Stabilize", "Value"] as const;

  return programs.filter((program) => program.hasPublishedTimeline).map((program) => {
    const segmentLabels = program.timelineScale === "year" ? [...phaseSegmentLabels] : program.roadmapWindowLabels;
    const currentWindowIndex = clampRoadmapIndex(program.roadmapCurrentWindowIndex, segmentLabels.length);

    return {
      clientName: program.clientName,
      markerLabel: program.nextMilestone.name,
      markerPosition: roadmapMarkerPosition(currentWindowIndex, segmentLabels.length),
      markerTone: program.posture,
      windowMode: program.timelineScale,
      timeframeLabel: program.timelineWindowLabel,
      windowLabels: program.roadmapWindowLabels,
      currentWindowIndex,
      programId: program.id,
      programName: program.name,
      segments: segmentLabels.map((label, index) => ({
        label,
        state: roadmapStateForIndex(currentWindowIndex, index)
      }))
    };
  });
}

function buildPortfolioMilestones(programs: ClientPortalProgram[]): ClientPortalPortfolioMilestone[] {
  return programs
    .filter((program) => program.nextMilestone.name !== "No milestone captured")
    .map((program) => ({
      clientName: program.clientName,
      dateLabel: program.nextMilestone.dateLabel,
      id: `${program.id}-next-milestone`,
      priority: program.nextMilestone.priority,
      programId: program.id,
      programName: program.name,
      title: program.nextMilestone.name
    }))
    .slice(0, 6);
}

function buildPortfolioRisks(programs: ClientPortalProgram[]): ClientPortalPortfolioRisk[] {
  return programs
    .flatMap((program) =>
      program.risks
        .filter(isMeaningfulSignal)
        .slice(0, 2)
        .map((risk, index) => ({
          clientName: program.clientName,
          description: risk,
          id: `${program.id}-risk-${index}`,
          programId: program.id,
          programName: program.name
        }))
    )
    .slice(0, 6);
}

function buildPortfolioMetrics(programs: ClientPortalProgram[]): ClientPortalPortfolioMetrics {
  const totalPrograms = programs.length;
  const onTrack = programs.filter((program) => program.posture === "on-track").length;
  const atRisk = programs.filter((program) => program.posture === "at-risk").length;
  const blocked = programs.filter((program) => program.posture === "blocked").length;
  const watch = programs.filter((program) => program.posture === "watch").length;
  const delayed = programs.filter(
    (program) =>
      program.posture === "blocked" ||
      program.posture === "watch" ||
      (program.posture === "at-risk" && program.metrics.programCompletionPercent < 60)
  ).length;
  const averageCompletionPercent = totalPrograms
    ? Math.round(programs.reduce((total, program) => total + program.metrics.programCompletionPercent, 0) / totalPrograms)
    : 0;
  const weightedHealth = programs.reduce((total, program) => {
    if (program.posture === "on-track") return total + 100;
    if (program.posture === "watch") return total + 72;
    if (program.posture === "at-risk") return total + 46;
    return total + 18;
  }, 0);

  return {
    totalPrograms,
    onTrack,
    atRisk,
    blocked,
    watch,
    delayed,
    averageCompletionPercent,
    decisions: programs.reduce((total, program) => total + program.metrics.decisions, 0),
    risks: programs.reduce((total, program) => total + program.metrics.risks, 0),
    healthScore: totalPrograms ? Math.round(weightedHealth / totalPrograms) : 0
  };
}

function buildClientPortfolioGroups(programs: ClientPortalProgram[]): ClientPortalClientPortfolio[] {
  const clientNames = Array.from(new Set(programs.map((program) => program.clientName))).sort(compareClientNames);

  return clientNames.map((clientName) => {
    const clientPrograms = programs.filter((program) => program.clientName === clientName);

    return {
      clientName,
      programIds: clientPrograms.map((program) => program.id),
      metrics: buildPortfolioMetrics(clientPrograms),
      upcomingMilestones: buildPortfolioMilestones(clientPrograms),
      keyRisks: buildPortfolioRisks(clientPrograms),
      roadmap: buildPortfolioRoadmap(clientPrograms)
    };
  });
}

export function buildClientPortalPortfolio(input: {
  generatedAt?: string;
  programs: ClientPortalProgramInput[];
}): ClientPortalPortfolio {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const programs = input.programs.map((programInput) => buildClientPortalProgram({ ...programInput, generatedAt }));

  return {
    generatedAt,
    programs,
    clients: buildClientPortfolioGroups(programs),
    metrics: buildPortfolioMetrics(programs),
    upcomingMilestones: buildPortfolioMilestones(programs),
    keyRisks: buildPortfolioRisks(programs),
    roadmap: buildPortfolioRoadmap(programs)
  };
}
