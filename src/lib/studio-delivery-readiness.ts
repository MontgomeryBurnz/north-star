import type { DiscoverySynthesis, DiscoveryUserStory } from "./discovery-studio-types.ts";
import type { ProgramArtifact } from "./program-intake-types.ts";
import type { StudioCollaborationItem, StudioManagedPackageView, StudioPackageView } from "./studio-collaboration-types.ts";

export type DeliveryCategory = "ready-for-review" | "approved-for-handoff" | "needs-refinement";
export type DeliveryAssessment = { storyId: string; category: DeliveryCategory; reasons: string[] };
export type DeliveryTarget = "jira" | "ado";

/** Deterministic presentation of existing evidence, not another model call or an approval. */
export function assessStudioDelivery(synthesis: DiscoverySynthesis, sources: ProgramArtifact[], items: StudioCollaborationItem[] = [], options: { preparedExample?: boolean; currentRevision?: boolean } = {}): DeliveryAssessment[] {
  const sourceIds = new Set(sources.filter(source => source.extractedText?.trim()).map(source => source.id));
  return synthesis.stories.map(story => {
    const state = items.find(item => item.id === story.id);
    const reasons: string[] = [];
    if (story.readiness !== "ready") reasons.push("Discovery marks this story as needing information or decisions.");
    if (synthesis.quality?.status === "provisional") reasons.push("Package validation is provisional; resolve its review findings first.");
    else if (!options.preparedExample && (synthesis.provider !== "openai" || synthesis.quality?.status !== "reviewed")) reasons.push("Completed evidence validation has not been established for this package.");
    if (state?.review.status === "changes-requested") reasons.push(state.review.note || "A reviewer requested changes; regenerate and review a new revision.");
    const feature = synthesis.features.find(feature => feature.id === story.featureId);
    const epic = synthesis.epics.find(epic => epic.id === story.epicId);
    if (!feature || !epic || feature.epicId !== epic.id || !epic.featureIds.includes(feature.id)) reasons.push("The epic/feature/story relationship needs correction.");
    if (!story.sourceIds.length || story.sourceIds.some(id => !sourceIds.has(id))) reasons.push("Readable evidence is missing for one or more story references.");
    if (story.acceptanceCriteria.filter(value => value.trim()).length < 2) reasons.push("At least two substantive acceptance criteria are required for review.");
    if (story.testCases.length < 2 || !story.testCases.some(test => test.type === "happy-path") || !story.testCases.some(test => test.type !== "happy-path") || story.testCases.some(test => !test.steps.length || !test.expectedResult.trim())) reasons.push("Happy-path and negative/edge tests with steps and expected results need review.");
    const category: DeliveryCategory = reasons.length ? "needs-refinement" : state?.review.status === "approved" && options.currentRevision === true ? "approved-for-handoff" : "ready-for-review";
    return { storyId: story.id, category, reasons };
  });
}

export function buildStudioPackageReview(synthesis: DiscoverySynthesis, sources: ProgramArtifact[], preparedExample = false) {
  const assessments = assessStudioDelivery(synthesis, sources, [], { preparedExample });
  const inventory = new Map((synthesis.sources ?? []).map(source => [source.id, source]));
  const coveredSources = sources.filter(source => Boolean(source.extractedText?.trim()) && inventory.has(source.id)).length;
  return {
    assessments, coveredSources, suppliedSources: sources.length,
    excerptSources: sources.filter(source => inventory.get(source.id)?.coverage === "excerpt").length,
    counts: { horizons: synthesis.roadmap.length, epics: synthesis.epics.length, features: synthesis.features.length, stories: synthesis.stories.length,
      criteria: synthesis.stories.reduce((sum, story) => sum + story.acceptanceCriteria.length, 0), tests: synthesis.stories.reduce((sum, story) => sum + story.testCases.length, 0),
      readyForReview: assessments.filter(item => item.category === "ready-for-review").length, refinement: assessments.filter(item => item.category === "needs-refinement").length,
      blockingGaps: synthesis.gaps.filter(gap => gap.severity === "blocking").length },
    gaps: synthesis.gaps.map(gap => {
      // Only an explicit GAP-ID in a roadmap dependency establishes a recorded link.
      // Shared source IDs are an investigative aid, never a proven delivery blocker.
      const linkedRoadmap = synthesis.roadmap.filter(item => item.dependencies.some(dependency => dependency.split(/[^A-Za-z0-9_-]+/).includes(gap.id)));
      const featureIds = new Set(linkedRoadmap.flatMap(item => item.featureIds));
      return { ...gap, roadmapTitles: linkedRoadmap.map(item => item.title), linkedStoryIds: synthesis.stories.filter(story => featureIds.has(story.featureId)).map(story => story.id),
        relatedStoryIds: synthesis.stories.filter(story => story.sourceIds.some(id => gap.sourceIds.includes(id))).map(story => story.id) };
    })
  };
}

/** Internal, local planning document only. This is NOT an executable Jira/ADO payload. */
export function buildStudioHandoffPreview(view: StudioPackageView, target: DeliveryTarget, selectedStoryIds: string[]) {
  if (!view.canManage) throw new Error("Full delivery previews are available only to the package owner or an administrator.");
  if (!["jira", "ado"].includes(target)) throw new Error("Choose a supported delivery preview.");
  const current = view.revision.id === view.headRevisionId;
  const approved = new Set(assessStudioDelivery(view.revision.synthesis, view.revision.sources, view.items, { preparedExample: view.revision.provenance === "prepared-example", currentRevision: current }).filter(item => item.category === "approved-for-handoff").map(item => item.storyId));
  if (!selectedStoryIds.length || new Set(selectedStoryIds).size !== selectedStoryIds.length || selectedStoryIds.some(id => !approved.has(id))) throw new Error("Select only approved work from the latest revision for the handoff preview.");
  return { schemaVersion: 1, kind: "northstar-delivery-planning-preview", connected: false, executableImport: false, target,
    packageId: view.id, revisionId: view.revision.id, revisionNumber: view.revision.number, packageVersion: view.version, provenance: view.revision.provenance,
    notice: "Not sent. Validate destination process, permissions, required fields, dependencies, and test tooling before integration. Parent context does not approve sibling work. Raw discovery text and discussions are excluded.",
    workItems: selectedStoryIds.map(id => {
      const story = view.revision.synthesis.stories.find(story => story.id === id)!;
      return buildStudioStoryPreview(view, story, target);
    }) };
}

export function buildStudioStoryPreview(view: StudioManagedPackageView, story: DiscoveryUserStory, target: DeliveryTarget) {
  const synthesis = view.revision.synthesis;
  const epic = synthesis.epics.find(epic => epic.id === story.epicId);
  const feature = synthesis.features.find(feature => feature.id === story.featureId);
  const sourceMap = new Map(view.revision.sources.map(source => [source.id, source.name]));
  return { id: story.id, proposedType: target === "jira" ? "Story" : "User Story", title: story.title, description: story.story,
    parentContext: { epic: epic ? { id: epic.id, title: epic.title } : null, feature: feature ? { id: feature.id, title: feature.title } : null,
      mapping: target === "jira" ? "Epic → Story; feature retained as context unless the destination supports a configured feature hierarchy." : "Epic → Feature → User Story (Agile process preview; other processes require mapping)." },
    acceptanceCriteria: [...story.acceptanceCriteria], testCoverage: story.testCases.map(test => ({ ...test, steps: [...test.steps] })),
    roadmapDependenciesToReview: [...new Set(synthesis.roadmap.filter(item => item.featureIds.includes(story.featureId)).flatMap(item => item.dependencies))],
    evidenceReferences: story.sourceIds.map(id => ({ id, name: sourceMap.get(id) ?? "Unresolved reference" })),
    review: { ...view.items.find(item => item.id === story.id)?.review } };
}
