import type { StudioRevision } from "./studio-collaboration-types.ts";
import { studioWorkflow } from "./studio-workflow.ts";

export type StudioRevisionChange = {
  section: string; id: string; kind: "added" | "removed" | "changed";
  fields: { field: string; before: string; after: string }[];
};
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
  return JSON.stringify(value) ?? "";
}
function display(value: unknown): string {
  if (value === undefined) return "Not present";
  if (Array.isArray(value) && value.every(item => typeof item === "string")) return value.map((item, index) => `${index + 1}. ${item}`).join("\n") || "None recorded";
  if (Array.isArray(value) && value.every(item => item && typeof item === "object" && "expectedResult" in item && "steps" in item)) return value.map(item => `${item.id} · ${item.title} (${item.type})\n${item.steps.map((step: string, index: number) => `${index + 1}. ${step}`).join("\n")}\nExpected: ${item.expectedResult}`).join("\n\n");
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
/** Pure comparison of saved snapshots: no model, similarity guesses or writes. */
export function compareStudioRevisions(before: StudioRevision, after: StudioRevision) {
  const changes: StudioRevisionChange[] = [];
  const compare = (section: string, left: Record<string, unknown>[], right: Record<string, unknown>[], key: string) => {
    const a = new Map(left.map(item => [String(item[key]), item]));
    const b = new Map(right.map(item => [String(item[key]), item]));
    for (const id of new Set([...a.keys(), ...b.keys()])) {
      const prior = a.get(id), next = b.get(id);
      if (canonical(prior) === canonical(next)) continue;
      const fields = [...new Set([...Object.keys(prior ?? {}), ...Object.keys(next ?? {})])]
        .filter(field => canonical(prior?.[field]) !== canonical(next?.[field]))
        .map(field => ({ field, before: display(prior?.[field]), after: display(next?.[field]) }));
      changes.push({ section, id, kind: !prior ? "added" : !next ? "removed" : "changed", fields });
    }
  };
  const top = (revision: StudioRevision) => {
    const { roadmap: _roadmap, epics: _epics, features: _features, stories: _stories, gaps: _gaps, ...analysis } = revision.synthesis;
    return { id: "package", title: revision.title, resolutionNotes: revision.resolutionNotes, selectedOutputs: revision.selectedOutputs,
      externalResearch: revision.externalResearch, researchTopic: revision.researchTopic, analysis };
  };
  compare("Package and analysis", [top(before)], [top(after)], "id");
  compare("Roadmap", before.synthesis.roadmap.map((item, index) => ({ ...item, slot: index + 1 })), after.synthesis.roadmap.map((item, index) => ({ ...item, slot: index + 1 })), "slot");
  for (const [section, field] of [["Epics", "epics"], ["Features", "features"], ["Stories, criteria and tests", "stories"], ["Discovery gaps", "gaps"]] as const) {
    compare(section, before.synthesis[field], after.synthesis[field], "id");
  }
  // Include raw source changes for internal review. External projections must
  // never be passed to this helper or offered comparison controls.
  compare("Source evidence", before.sources.map(item => ({ ...item })), after.sources.map(item => ({ ...item })), "id");
  compare("Managed gap decisions", studioWorkflow(before).gaps, studioWorkflow(after).gaps, "gapId");
  compare("Saved refinements", studioWorkflow(before).refinements, studioWorkflow(after).refinements, "id");
  return {
    before: { id: before.id, number: before.number }, after: { id: after.id, number: after.number }, changes,
    counts: { added: changes.filter(item => item.kind === "added").length, removed: changes.filter(item => item.kind === "removed").length, changed: changes.filter(item => item.kind === "changed").length },
    priorApprovedStoryIds: before.items.filter(item => item.review.status === "approved").map(item => item.storyId),
    pendingStoryIds: after.items.filter(item => item.review.status !== "approved").map(item => item.storyId)
  };
}
