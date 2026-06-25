import type { StoredProgram } from "@/lib/program-intake-types";

export const unassignedClientName = "Unassigned client";

export function normalizeClientName(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || unassignedClientName;
}

export function getProgramClientName(program: StoredProgram) {
  return normalizeClientName(program.intake.clientName);
}

export function compareClientNames(a: string, b: string) {
  if (a === b) return 0;
  if (a === unassignedClientName) return 1;
  if (b === unassignedClientName) return -1;
  return a.localeCompare(b);
}

