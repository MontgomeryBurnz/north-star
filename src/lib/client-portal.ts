import type { DeliveryBoardItem, DeliveryBoardStatus, StoredProgramUpdate, TeamRoleUpdate, TeamRoleUpdateStatus } from "./active-program-types.ts";
import type { GuidedPlan } from "./guided-plan-types.ts";
import type { LeadershipReviewRecord } from "./leadership-feedback-types.ts";
import type { ClientDecisionRequest } from "./program-intelligence-types.ts";
import type { StoredProgram } from "./program-intake-types.ts";
import { firstNonEmpty, firstSignal, normalizeWhitespace, splitSignals } from "./text-signals.ts";

export type ClientProgramPosture = "on-track" | "at-risk" | "blocked" | "watch";
export type ClientProgramStatusSignal = "GREEN" | "AMBER" | "RED" | "WATCH";
export type ClientPortalPriority = "High" | "Medium" | "Low";
export type ClientPortalRiskTrend = "Worse" | "Stable" | "Better";

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

export type ClientPortalProgram = {
  id: string;
  name: string;
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
    status: string;
  }>;
  milestones: Array<{
    dateLabel: string;
    name: string;
    note: string;
    status: "complete" | "current" | "next";
  }>;
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
  dateLabel: string;
  id: string;
  priority: ClientPortalPriority;
  programId: string;
  programName: string;
  title: string;
};

export type ClientPortalPortfolioRisk = {
  description: string;
  id: string;
  mitigationOwner: string;
  programId: string;
  programName: string;
  severity: "High" | "Medium" | "Low" | "Dependency";
  trend: ClientPortalRiskTrend;
};

export type ClientPortalRoadmapRow = {
  markerLabel: string;
  markerPosition: number;
  markerTone: ClientProgramPosture;
  programId: string;
  programName: string;
  segments: Array<{
    label: "Discover" | "Plan" | "Execute" | "Stabilize" | "Value";
    state: "complete" | "current" | "next";
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
    delayed: number;
    averageCompletionPercent: number;
    decisions: number;
    risks: number;
    healthScore: number;
  };
  upcomingMilestones: ClientPortalPortfolioMilestone[];
  keyRisks: ClientPortalPortfolioRisk[];
  roadmap: ClientPortalRoadmapRow[];
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

function statusSignal(posture: ClientProgramPosture): ClientProgramStatusSignal {
  if (posture === "on-track") return "GREEN";
  if (posture === "at-risk") return "AMBER";
  if (posture === "blocked") return "RED";
  return "WATCH";
}

function completionDelta(posture: ClientProgramPosture) {
  if (posture === "on-track") return "+6%";
  if (posture === "watch") return "+2%";
  if (posture === "at-risk") return "-3%";
  return "-8%";
}

function parsePercent(value: string | undefined | null) {
  const parsed = Number(clean(value).replace(/%$/, ""));
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
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

function riskTrend(posture: ClientProgramPosture): ClientPortalRiskTrend {
  if (posture === "blocked" || posture === "at-risk") return "Worse";
  if (posture === "watch") return "Stable";
  return "Better";
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
      owner: firstNonEmpty(roleUpdate?.updatedBy, `${role} lead`),
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

function stakeholderByKeyword(stakeholders: string | undefined, keyword: string, fallback: string) {
  const signals = splitSignals(stakeholders ?? "", "")
    .map(clean)
    .filter(Boolean);
  return signals.find((signal) => signal.toLowerCase().includes(keyword)) ?? fallback;
}

function buildExecutiveStatusHighlights(input: {
  completion: { phaseCompletionPercent: number; programCompletionPercent: number };
  phase: string;
  posture: ClientProgramPosture;
  postureLabel: string;
  risks: string[];
}) {
  const riskSignal = firstMeaningful(...input.risks);
  const riskMovement =
    input.posture === "blocked"
      ? "requires immediate sponsor attention"
      : input.posture === "at-risk"
        ? "is elevated and needs active mitigation"
        : input.posture === "watch"
          ? "should stay visible through the next checkpoint"
          : "remains contained this cycle";

  return [
    `${input.postureLabel} in ${input.phase || "current phase"}`,
    `Program complete ${input.completion.programCompletionPercent}% · phase ${input.completion.phaseCompletionPercent}%`,
    riskSignal ? `Risk exposure ${riskMovement}: ${conciseSignal(riskSignal, 86)}` : `Risk exposure ${riskMovement}`
  ];
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
    "Recent accomplishments will populate after the team submits role updates or delivery board movement.",
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
      ...activeBoardItems,
      ...domainDecisionSignals,
      ...input.decisions
    ],
    "Upcoming work will sharpen after the next team update, delivery board card, or leadership decision is captured.",
    4
  );
}

function buildExecutiveRisks(input: {
  owner: string;
  posture: ClientProgramPosture;
  risks: string[];
  review: StoredProgramUpdate["review"] | undefined;
}) {
  const riskRows = input.risks.filter(isMeaningfulSignal).map((risk, index) => ({
    severity: (input.posture === "blocked" || (input.posture === "at-risk" && index === 0) ? "High" : "Medium") as "High" | "Medium",
    description: risk,
    mitigation: firstMeaningful(input.review?.supportNeeded, input.review?.programSynthesisNote, "Confirm mitigation owner and timing in the next operating review."),
    owner: input.owner,
    target: "Next checkpoint"
  }));

  const blockedBoardRows = (input.review?.deliveryBoardItems ?? [])
    .filter((item) => item.status === "blocked")
    .slice(0, 2)
    .map((item) => ({
      severity: "Dependency" as const,
      description: `${item.role || "Team"} blocked on ${item.title}.`,
      mitigation: firstMeaningful(item.latestNote, item.description, "Resolve blocker and confirm dependency path."),
      owner: firstNonEmpty(item.owner, input.owner),
      target: formatDateLabel(item.dueDate) || "Next checkpoint"
    }));

  return [...riskRows, ...blockedBoardRows].slice(0, 4);
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
  return rows.length ? rows : [{ title: "No executive decision is currently pending.", meta: "Continue monitoring through the next update cycle." }];
}

function workstreamPercent(statusLabel: string) {
  const label = statusLabel.toLowerCase();
  if (label.includes("blocked")) return 25;
  if (label.includes("risk")) return 52;
  if (label.includes("track")) return 82;
  return 38;
}

function buildWorkstreams(domainSummaries: ClientPortalDomainSummary[]) {
  return domainSummaries.slice(0, 8).map((domain) => ({
    name: domain.role,
    note: conciseSignal(domain.pursuit, 110),
    owner: domain.owner,
    percent: workstreamPercent(domain.statusLabel),
    status: domain.statusLabel
  }));
}

function buildMilestones(input: {
  completion: { phaseCompletionPercent: number; programCompletionPercent: number };
  decisions: string[];
  phase: string;
  program: StoredProgram;
  recommendedPath: string[];
  review: StoredProgramUpdate["review"] | undefined;
}) {
  const boardItems = (input.review?.deliveryBoardItems ?? [])
    .filter((item) => item.dueDate && item.status !== "done")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextBoardItem = boardItems[0];
  const createdLabel = formatDateLabel(input.program.createdAt) || "Captured";
  const updatedLabel = formatDateLabel(input.program.updatedAt) || "Current";
  const explicitMilestoneName = clean(input.review?.nextMilestoneName);
  const explicitMilestoneDate = formatDateLabel(input.review?.nextMilestoneDate);
  const explicitMilestonePriority = priorityFromReview(input.review?.nextMilestonePriority);
  const checkpointName = explicitMilestoneName || nextBoardItem?.title || firstSignal(input.recommendedPath.join("\n"), input.phase || "Current checkpoint");
  const checkpointNote = explicitMilestoneName
    ? `${explicitMilestonePriority ?? "Current"} priority checkpoint`
    : nextBoardItem
    ? `${nextBoardItem.role || "Team"} · ${deliveryBoardStatusLabel(nextBoardItem.status)}`
    : firstSignal(input.decisions.join("\n"), "Confirm the next decision, milestone, or delivery checkpoint.");

  return [
    {
      dateLabel: createdLabel,
      name: "Planning Complete",
      note: "Intake, intended outcomes, and source context captured.",
      status: "complete" as const
    },
    {
      dateLabel: updatedLabel,
      name: "Design Finalized",
      note: "Current delivery structure, domain ownership, and working plan are established.",
      status: input.completion.programCompletionPercent > 35 ? "complete" as const : "current" as const
    },
    {
      dateLabel: explicitMilestoneDate || (nextBoardItem ? formatDateLabel(nextBoardItem.dueDate) || "Next" : "Next"),
      name: checkpointName,
      note: checkpointNote,
      status: "current" as const
    },
    {
      dateLabel: "Next",
      name: "Pilot Readiness",
      note: "Validate readiness, dependencies, and stakeholder acceptance path.",
      status: "next" as const
    },
    {
      dateLabel: "Next",
      name: "Cutover Readiness",
      note: "Confirm execution conditions, operational support, and decision coverage.",
      status: "next" as const
    },
    {
      dateLabel: "Next",
      name: "Go-Live",
      note: "Move from delivery execution into launch, adoption, and value realization.",
      status: "next" as const
    }
  ];
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
  const computedCompletion = getCompletionMetrics(currentPhase, posture);
  const completion = {
    ...computedCompletion,
    programCompletionPercent: parsePercent(review?.programCompletionPercent) ?? computedCompletion.programCompletionPercent
  };
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
  const executiveStatusHighlights = buildExecutiveStatusHighlights({
    completion,
    phase: currentPhase,
    posture,
    postureLabel: postureLabel(posture),
    risks
  });
  const recentAccomplishments = buildRecentAccomplishments({
    domainSummaries,
    plan: input.latestPlan,
    review
  });
  const upcomingWork = buildUpcomingWork({
    decisions,
    domainSummaries,
    plan: input.latestPlan,
    recommendedPath,
    review
  });
  const workstreams = buildWorkstreams(domainSummaries);
  const milestones = buildMilestones({
    completion,
    decisions,
    phase: currentPhase,
    program: input.program,
    recommendedPath,
    review
  });
  const nextMilestone = milestones.find((milestone) => milestone.status === "current") ?? milestones.find((milestone) => milestone.status === "next") ?? {
    dateLabel: "Next",
    name: "Next checkpoint",
    note: "Confirm the next meaningful checkpoint.",
    status: "next" as const
  };
  const owner = firstNonEmpty(intake.programOwner, "Owner not set");
  const explicitMilestonePriority = priorityFromReview(review?.nextMilestonePriority);
  const statusNote = conciseSignal(
    firstMeaningful(
      review?.clientStatusNote,
      review?.deliveryHealth,
      review?.programSynthesisNote,
      progressUpdates[0],
      executiveOverview,
      "Current program posture will sharpen after the next role update."
    ),
    138
  );

  return {
    id: input.program.id,
    name: firstNonEmpty(intake.programName, input.latestPlan?.programName, "Untitled program"),
    owner,
    executiveSponsor: firstNonEmpty(review?.executiveSponsor, stakeholderByKeyword(intake.stakeholders, "sponsor", "Executive sponsor")),
    programLead: firstNonEmpty(review?.programLead, owner),
    pmo: firstNonEmpty(review?.pmo, stakeholderByKeyword(intake.stakeholders, "pmo", "PMO")),
    phase: currentPhase,
    posture,
    postureLabel: postureLabel(posture),
    statusSignal: statusSignal(posture),
    completionDelta: firstNonEmpty(review?.completionDelta, completionDelta(posture)),
    statusNote,
    updatedAt: input.latestUpdate?.updatedAt ?? input.latestUpdate?.createdAt ?? input.latestPlan?.createdAt ?? input.program.updatedAt,
    executiveOverview,
    executiveSummary: clean(
      firstNonEmpty(
        review?.clientStatusNote,
        input.latestPlan?.summary,
        review?.programSynthesisNote,
        intake.sowSummary,
        "Program summary is still being developed."
      )
    ),
    nextMilestone: {
      dateLabel: nextMilestone.dateLabel,
      name: nextMilestone.name,
      priority: explicitMilestonePriority ?? priorityFromPosture(posture)
    },
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
    executiveStatusHighlights,
    recentAccomplishments,
    upcomingWork,
    executiveRisks: buildExecutiveRisks({
      owner: firstNonEmpty(intake.programOwner, "Program owner"),
      posture,
      risks,
      review
    }),
    leadershipDecisions: buildLeadershipDecisions({
      decisions,
      owner: firstNonEmpty(intake.programOwner, "Program owner"),
      review
    }),
    workstreams,
    milestones,
    risks,
    decisions,
    clientDecisions: input.clientDecisions ?? [],
    recommendedPath,
    timeline: buildTimeline(currentPhase)
  };
}

function roadmapStateForIndex(program: ClientPortalProgram, index: number) {
  const marker = program.metrics.programCompletionPercent;
  const thresholds = [15, 35, 68, 86, 100];
  if (marker >= thresholds[index]) return "complete" as const;
  if (index === thresholds.findIndex((threshold) => marker < threshold)) return "current" as const;
  return "next" as const;
}

function buildPortfolioRoadmap(programs: ClientPortalProgram[]): ClientPortalRoadmapRow[] {
  const segmentLabels = ["Discover", "Plan", "Execute", "Stabilize", "Value"] as const;

  return programs.map((program) => ({
    markerLabel: program.nextMilestone.name,
    markerPosition: Math.max(8, Math.min(94, program.metrics.programCompletionPercent)),
    markerTone: program.posture,
    programId: program.id,
    programName: program.name,
    segments: segmentLabels.map((label, index) => ({
      label,
      state: roadmapStateForIndex(program, index)
    }))
  }));
}

function buildPortfolioMilestones(programs: ClientPortalProgram[]): ClientPortalPortfolioMilestone[] {
  return programs
    .map((program) => ({
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
      program.executiveRisks.slice(0, 2).map((risk, index) => ({
        description: risk.description,
        id: `${program.id}-risk-${index}`,
        mitigationOwner: risk.owner,
        programId: program.id,
        programName: program.name,
        severity: risk.severity,
        trend: riskTrend(program.posture)
      }))
    )
    .sort((a, b) => {
      const severityWeight = { High: 0, Dependency: 1, Medium: 2, Low: 3 };
      return severityWeight[a.severity] - severityWeight[b.severity];
    })
    .slice(0, 6);
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
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    programs,
    metrics: {
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
    },
    upcomingMilestones: buildPortfolioMilestones(programs),
    keyRisks: buildPortfolioRisks(programs),
    roadmap: buildPortfolioRoadmap(programs)
  };
}
