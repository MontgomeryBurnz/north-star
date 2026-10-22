import { demoProgramId } from "./demo-mode.ts";

export const explorerRestrictionMessage = "Explorer mode is read-only. Uploads, changes, AI generation, paid research, and external actions are unavailable. Explore the saved fictional sample instead.";

// Explicit allowlist, not an HTTP-method shortcut: some existing GET routes
// invoke providers. Unknown/new endpoints fail closed for Explorer accounts.
const readPaths = new Set([
  "/api/me", "/api/programs", "/api/leadership/review-queue",
  "/api/client-portal/export/pdf"
]);
const programReadSuffixes = new Set([
  "bundle", "updates", "guided-plan", "leadership-feedback", "meeting-inputs",
  "client-decisions", "client-updates", "discovery-synthesis", "role-artifacts",
  "team-assignments", "leadership-signal", "guidance-justifications", "guidance-feedback-flags"
]);

export function isExplorerRequestAllowed(method: string, pathname: string) {
  if (method === "POST" && pathname === "/api/studio/export") return true;
  if (method !== "GET" && method !== "HEAD") return false;
  if (readPaths.has(pathname)) return true;
  const prefix = `/api/programs/${demoProgramId}/`;
  return pathname.startsWith(prefix) && programReadSuffixes.has(pathname.slice(prefix.length));
}

// UI affordance only. Authorization is independently enforced before route work.
export function isExplorerMutationLabel(label: string) {
  if (label.trim() === "Review gaps and add context") return false;
  return /\b(save|submit|upload|generate|regenerate|re-analyze|analyze|synthesize|approve|publish|send|invite|delete|remove|add|create|apply|reset|refresh|sync|start fresh|use my own|prepare refinement|request changes|new program|exit sample)\b/i.test(label);
}
