import type {
  ActiveProgramReview,
  ActiveProgramUpdate,
  DeliveryBoardItem,
  DeliveryBoardStatus,
  TeamRoleUpdate,
  TeamRoleUpdateStatus
} from "@/lib/active-program-types";
import type { ProgramMeetingAttachment, ProgramMeetingInput } from "@/lib/program-intelligence-types";
import type { ProgramIntake } from "@/lib/program-intake-types";
import { normalizeTeamRoles } from "@/lib/team-roles";

export const emptyReview: ActiveProgramReview = {
  programName: "",
  originalNorthStar: "",
  currentPhase: "",
  progressSinceLastReview: "",
  planChanges: "",
  activeRisks: "",
  stakeholderTemperature: "",
  decisionsPending: "",
  deliveryHealth: "",
  supportNeeded: "",
  updateCadence: "weekly",
  cycleLabel: "",
  cycleStartedAt: "",
  programSynthesisNote: "",
  lastUpdatedRole: "",
  teamRoleUpdates: [],
  deliveryBoardItems: [],
  artifacts: []
};

export const emptyMeetingInputDraft = {
  title: "",
  sourceType: "meeting-notes" as ProgramMeetingInput["sourceType"],
  sourceProvider: "manual" as ProgramMeetingInput["sourceProvider"],
  capturedAt: "",
  summary: "",
  transcriptExcerpt: "",
  attachments: [] as ProgramMeetingAttachment[],
  extractedSignals: "",
  recommendedPlanAdjustments: ""
};

export type ExistingProgramOption = {
  id: string;
  label: string;
  source: "local";
  intake?: ProgramIntake;
  review: ActiveProgramReview;
};

export const reviewHistoryKey = "work-path-active-program-updates";
export const reviewDraftKey = "work-path-active-program-review";
export const intakeDraftKey = "work-path-program-intake";

export function normalizeProgramLabel(value: string) {
  return value.trim().toLowerCase();
}

function mapLegacyConfidenceToStatus(confidence?: string): TeamRoleUpdateStatus {
  if (confidence === "low") return "blocked";
  if (confidence === "medium") return "at-risk";
  return "on-track";
}

const deliveryBoardStatusSet = new Set<DeliveryBoardStatus>(["not-started", "in-progress", "needs-review", "blocked", "done"]);

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function readStoredUpdates(): ActiveProgramUpdate[] {
  const saved = window.localStorage.getItem(reviewHistoryKey);
  if (!saved) return [];

  try {
    return JSON.parse(saved) as ActiveProgramUpdate[];
  } catch {
    return [];
  }
}

export function writeStoredUpdates(updates: ActiveProgramUpdate[]) {
  window.localStorage.setItem(reviewHistoryKey, JSON.stringify(updates));
}

export function pruneStoredUpdates(validProgramIds: string[]) {
  const validIds = new Set(validProgramIds);
  const nextUpdates = readStoredUpdates().filter((update) => validIds.has(update.programId));
  writeStoredUpdates(nextUpdates);
  return nextUpdates;
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function isTextLikeMeetingFile(file: File) {
  return file.type.startsWith("text/") || /\.(txt|md|csv|rtf)$/i.test(file.name);
}

export function inferMeetingTitleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getProgramTeamRoles(intake?: ProgramIntake) {
  return normalizeTeamRoles(intake?.teamRoles);
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function buildCycleMetadata(cadence: ActiveProgramReview["updateCadence"], date = new Date()) {
  const start = startOfWeek(date);
  const weekStart = new Date(start);
  if (cadence === "biweekly") {
    const reference = new Date("2026-01-05T00:00:00.000Z");
    const diffDays = Math.floor((start.getTime() - reference.getTime()) / 86400000);
    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex % 2 !== 0) {
      weekStart.setDate(weekStart.getDate() - 7);
    }
  }

  const end = new Date(weekStart);
  end.setDate(end.getDate() + (cadence === "biweekly" ? 13 : 6));
  const label = `${cadence === "biweekly" ? "Bi-weekly" : "Weekly"} cycle of ${weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })}`;

  return {
    cycleLabel: label,
    cycleStartedAt: weekStart.toISOString(),
    cycleEndsAt: end.toISOString()
  };
}

export function buildTeamRoleUpdate(role: string, existing?: Partial<TeamRoleUpdate>): TeamRoleUpdate {
  const legacyConfidence = (existing as { confidence?: string } | undefined)?.confidence;
  return {
    role,
    updatedBy: existing?.updatedBy ?? "",
    progressUpdate: existing?.progressUpdate ?? "",
    changesObserved: existing?.changesObserved ?? "",
    activeRisks: existing?.activeRisks ?? "",
    blockers: existing?.blockers ?? "",
    decisionsNeeded: existing?.decisionsNeeded ?? "",
    supportNeeded: existing?.supportNeeded ?? "",
    status: existing?.status ?? mapLegacyConfidenceToStatus(legacyConfidence),
    needsLeadershipAttention: existing?.needsLeadershipAttention ?? false,
    lastUpdatedAt: existing?.lastUpdatedAt
  };
}

export function buildDeliveryBoardItem(existing: Partial<DeliveryBoardItem>, fallbackRole = ""): DeliveryBoardItem {
  const title = existing.title?.trim() ?? "";
  const role = existing.role?.trim() || fallbackRole;
  const createdAt = existing.createdAt || new Date().toISOString();

  return {
    id: existing.id || `delivery-${createdAt}-${title || role}`.replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase(),
    role,
    title,
    description: existing.description ?? "",
    owner: existing.owner ?? "",
    status: deliveryBoardStatusSet.has(existing.status as DeliveryBoardStatus) ? (existing.status as DeliveryBoardStatus) : "not-started",
    dueDate: existing.dueDate ?? "",
    latestNote: existing.latestNote ?? "",
    attachments: Array.isArray(existing.attachments) ? existing.attachments : [],
    createdAt,
    updatedAt: existing.updatedAt || createdAt
  };
}

function roleUpdatesMatch(current: TeamRoleUpdate | undefined, next: TeamRoleUpdate) {
  return Boolean(
    current &&
      current.role === next.role &&
      current.updatedBy === next.updatedBy &&
      current.progressUpdate === next.progressUpdate &&
      current.changesObserved === next.changesObserved &&
      current.activeRisks === next.activeRisks &&
      current.blockers === next.blockers &&
      current.decisionsNeeded === next.decisionsNeeded &&
      current.supportNeeded === next.supportNeeded &&
      current.status === next.status &&
      current.needsLeadershipAttention === next.needsLeadershipAttention &&
      current.lastUpdatedAt === next.lastUpdatedAt
  );
}

function normalizedMultilineText(value: string | undefined) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function normalizeStakeholderTemperature(value: string | undefined, intake?: ProgramIntake) {
  const stakeholderTemperature = value?.trim() ?? "";
  if (!stakeholderTemperature) return "";

  const stakeholderList = normalizedMultilineText(intake?.stakeholders);
  const temperatureLines = normalizedMultilineText(stakeholderTemperature);

  return stakeholderList && temperatureLines === stakeholderList ? "" : stakeholderTemperature;
}

export function normalizeTeamRoleUpdates(roleUpdates: TeamRoleUpdate[] | undefined, roles: string[]) {
  const byRole = new Map((roleUpdates ?? []).map((roleUpdate) => [normalizeProgramLabel(roleUpdate.role), roleUpdate]));
  return roles.map((role) => {
    const existingRoleUpdate = byRole.get(normalizeProgramLabel(role));
    const normalizedRoleUpdate = buildTeamRoleUpdate(role, existingRoleUpdate);
    return existingRoleUpdate && roleUpdatesMatch(existingRoleUpdate, normalizedRoleUpdate)
      ? existingRoleUpdate
      : normalizedRoleUpdate;
  });
}

export function normalizeDeliveryBoardItems(deliveryBoardItems: DeliveryBoardItem[] | undefined, roles: string[]) {
  const knownRoleByKey = new Map(roles.map((role) => [normalizeProgramLabel(role), role]));

  return (deliveryBoardItems ?? [])
    .map((item) => {
      const normalizedRole = knownRoleByKey.get(normalizeProgramLabel(item.role)) ?? item.role;
      return buildDeliveryBoardItem(item, normalizedRole);
    })
    .filter((item) => item.title || item.description || item.latestNote || item.attachments.length);
}

export function buildFallbackOwnershipSignature(
  roleUpdates: TeamRoleUpdate[] | undefined,
  roles: string[],
  assignedOwnersByRole: Record<string, string[]>
) {
  return normalizeTeamRoleUpdates(roleUpdates, roles)
    .filter((roleUpdate) => !(assignedOwnersByRole[normalizeProgramLabel(roleUpdate.role)]?.length))
    .map((roleUpdate) => `${normalizeProgramLabel(roleUpdate.role)}:${roleUpdate.updatedBy.trim()}`)
    .join("|");
}

export function joinRoleSignals(roleUpdates: TeamRoleUpdate[], selector: (role: TeamRoleUpdate) => string, fallback: string) {
  const items = roleUpdates
    .map((role) => {
      const value = selector(role).trim();
      return value ? `${role.role}: ${value}` : "";
    })
    .filter(Boolean);
  return items.length ? items.join("\n") : fallback;
}

export function hasRoleSubmission(roleUpdate: TeamRoleUpdate) {
  return Boolean(
    roleUpdate.status !== "on-track" ||
      roleUpdate.needsLeadershipAttention ||
      roleUpdate.progressUpdate.trim() ||
      roleUpdate.changesObserved.trim() ||
      roleUpdate.activeRisks.trim() ||
      roleUpdate.blockers.trim() ||
      roleUpdate.decisionsNeeded.trim() ||
      roleUpdate.supportNeeded.trim()
  );
}

function hasCapturedRoleSignal(review: ActiveProgramReview) {
  return review.teamRoleUpdates?.some(hasRoleSubmission) ?? false;
}

export function isOwnerOnlyRoleSnapshot(review: ActiveProgramReview) {
  return Boolean(review.lastUpdatedRole && !hasCapturedRoleSignal(review));
}

export function clearCycleReview(review: ActiveProgramReview, intake?: ProgramIntake) {
  const roles = getProgramTeamRoles(intake);
  const preservedOwners = normalizeTeamRoleUpdates(review.teamRoleUpdates, roles).map((roleUpdate) =>
    buildTeamRoleUpdate(roleUpdate.role, {
      updatedBy: roleUpdate.updatedBy,
      status: roleUpdate.status,
      needsLeadershipAttention: roleUpdate.needsLeadershipAttention
    })
  );

  return normalizeReview(
    {
      ...emptyReview,
      programName: review.programName,
      originalNorthStar: review.originalNorthStar,
      currentPhase: review.currentPhase,
      stakeholderTemperature: review.stakeholderTemperature,
      deliveryHealth: review.deliveryHealth,
      updateCadence: review.updateCadence ?? "weekly",
      teamRoleUpdates: preservedOwners,
      deliveryBoardItems: normalizeDeliveryBoardItems(review.deliveryBoardItems, roles),
      artifacts: review.artifacts
    },
    intake
  );
}

export function buildSynthesizedReview(review: ActiveProgramReview, roles: string[], lastUpdatedRole = ""): ActiveProgramReview {
  const normalizedRoleUpdates = normalizeTeamRoleUpdates(review.teamRoleUpdates, roles);
  const deliveryBoardItems = normalizeDeliveryBoardItems(review.deliveryBoardItems, roles);
  const touchedRoles = normalizedRoleUpdates.filter(hasRoleSubmission);
  const activeBoardItems = deliveryBoardItems.filter((item) => item.status !== "done");
  const cycleMetadata = buildCycleMetadata(review.updateCadence === "biweekly" ? "biweekly" : "weekly");
  const cadence: ActiveProgramReview["updateCadence"] = review.updateCadence === "biweekly" ? "biweekly" : "weekly";
  const synthesisParts = [
    touchedRoles.length
      ? `${touchedRoles.length} of ${roles.length} assigned team roles submitted updates`
      : "No team role submissions are on file",
    activeBoardItems.length ? `${activeBoardItems.length} active delivery board card${activeBoardItems.length === 1 ? "" : "s"} are driving weekly execution` : ""
  ].filter(Boolean);
  const programSynthesisNote = `${synthesisParts.join("; ")} in the current ${
    cadence === "biweekly" ? "bi-weekly" : "weekly"
  } cycle.`;

  return {
    ...review,
    updateCadence: cadence,
    cycleLabel: cycleMetadata.cycleLabel,
    cycleStartedAt: cycleMetadata.cycleStartedAt,
    programSynthesisNote,
    lastUpdatedRole: lastUpdatedRole || review.lastUpdatedRole || "",
    teamRoleUpdates: normalizedRoleUpdates,
    deliveryBoardItems,
    progressSinceLastReview: joinRoleSignals(
      normalizedRoleUpdates,
      (role) => role.progressUpdate,
      review.progressSinceLastReview || "No role-level progress updates captured yet."
    ),
    planChanges: joinRoleSignals(
      normalizedRoleUpdates,
      (role) => role.changesObserved,
      review.planChanges || "No role-level changes captured yet."
    ),
    activeRisks: joinRoleSignals(
      normalizedRoleUpdates,
      (role) => [role.activeRisks, role.blockers].filter(Boolean).join(" / "),
      review.activeRisks || "No role-level risks captured yet."
    ),
    decisionsPending: joinRoleSignals(
      normalizedRoleUpdates,
      (role) => role.decisionsNeeded,
      review.decisionsPending || "No role-level decisions captured yet."
    ),
    supportNeeded: joinRoleSignals(
      normalizedRoleUpdates,
      (role) => role.supportNeeded,
      review.supportNeeded || "No role-level support needs captured yet."
    )
  };
}

export function normalizeReview(review: ActiveProgramReview, intake?: ProgramIntake) {
  return buildSynthesizedReview(
    {
      ...emptyReview,
      ...review,
      stakeholderTemperature: normalizeStakeholderTemperature(review.stakeholderTemperature, intake),
      updateCadence: (review.updateCadence === "biweekly" ? "biweekly" : review.updateCadence ?? "weekly") as
        | "weekly"
        | "biweekly"
    },
    getProgramTeamRoles(intake),
    review.lastUpdatedRole ?? ""
  );
}

export function optionFromSavedIntake(savedIntake: ProgramIntake): ExistingProgramOption | null {
  if (!savedIntake.programName.trim()) return null;

  const roleAwareReview = normalizeReview(
    {
      ...emptyReview,
      programName: savedIntake.programName,
      originalNorthStar: savedIntake.vision || savedIntake.outcomes,
      currentPhase: "Newly captured",
      progressSinceLastReview: savedIntake.currentStatus,
      planChanges: "",
      activeRisks: savedIntake.risks,
      stakeholderTemperature: "",
      decisionsPending: savedIntake.decisionsNeeded,
      deliveryHealth: savedIntake.blockers,
      supportNeeded: savedIntake.constraints,
      updateCadence: savedIntake.leadershipReviewCadence === "biweekly" ? "biweekly" : "weekly",
      artifacts: savedIntake.artifacts
    },
    savedIntake
  );

  return {
    id: "local-saved-intake",
    label: savedIntake.programName,
    source: "local",
    intake: savedIntake,
    review: roleAwareReview
  };
}
