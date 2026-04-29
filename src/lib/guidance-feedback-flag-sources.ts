export const teamActionPlanFlagSourcePrefix = "team-action-plan:";

export function normalizeGuidanceFlagSourceKey(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "role";
}

export function buildTeamActionPlanFlagSourceId(role: string) {
  return `${teamActionPlanFlagSourcePrefix}${normalizeGuidanceFlagSourceKey(role)}`;
}

export function isTeamActionPlanFlagSourceId(sourceId?: string): sourceId is string {
  return Boolean(sourceId?.startsWith(teamActionPlanFlagSourcePrefix));
}

export function roleFromTeamActionPlanFlagSourceId(sourceId?: string) {
  if (!isTeamActionPlanFlagSourceId(sourceId)) return "";

  return sourceId
    .slice(teamActionPlanFlagSourcePrefix.length)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
