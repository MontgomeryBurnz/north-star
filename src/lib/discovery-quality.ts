import type { DiscoverySynthesis } from "./discovery-studio-types.ts";

type BuildDefinition = Pick<DiscoverySynthesis, "epics" | "features" | "stories" | "roadmap" | "gaps">;

export function reviewDiscoveryIntegrity(synthesis: BuildDefinition, allowedSourceIds: string[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sources = new Set(allowedSourceIds);
  const epics = new Map(synthesis.epics.map((item) => [item.id, item]));
  const features = new Map(synthesis.features.map((item) => [item.id, item]));

  for (const [label, items] of [
    ["epic", synthesis.epics], ["feature", synthesis.features], ["story", synthesis.stories], ["gap", synthesis.gaps],
    ["test", synthesis.stories.flatMap((story) => story.testCases)]
  ] as const) {
    if (new Set(items.map((item) => item.id)).size !== items.length) errors.push(`Duplicate ${label} identifiers.`);
  }

  for (const item of [...synthesis.epics, ...synthesis.features, ...synthesis.stories, ...synthesis.gaps]) {
    if (item.sourceIds.some((id) => !sources.has(id))) errors.push(`${item.id} cites an unknown source.`);
    if (!item.sourceIds.length && !item.id.startsWith("GAP-")) errors.push(`${item.id} has no evidence citation.`);
  }

  for (const epic of synthesis.epics) {
    if (!epic.featureIds.length) errors.push(`${epic.id} has no features.`);
    if (epic.featureIds.some((id) => features.get(id)?.epicId !== epic.id)) errors.push(`${epic.id} contains an invalid feature relationship.`);
  }
  for (const feature of synthesis.features) {
    if (!epics.get(feature.epicId)?.featureIds.includes(feature.id)) errors.push(`${feature.id} is not linked to its parent epic.`);
    if (!synthesis.stories.some((story) => story.featureId === feature.id)) warnings.push(`${feature.id} still needs story decomposition.`);
  }
  for (const item of synthesis.roadmap) {
    if (!item.featureIds.length || item.featureIds.some((id) => !features.has(id))) errors.push(`Roadmap initiative “${item.title}” has invalid feature references.`);
  }
  for (const story of synthesis.stories) {
    if (!epics.has(story.epicId) || features.get(story.featureId)?.epicId !== story.epicId) errors.push(`${story.id} has an invalid epic or feature reference.`);
    if (!story.testCases.some((test) => test.type === "happy-path") || !story.testCases.some((test) => test.type !== "happy-path")) {
      errors.push(`${story.id} needs both a happy-path and a negative or edge test.`);
    }
    if (story.acceptanceCriteria.length < 2) errors.push(`${story.id} needs at least two testable acceptance criteria.`);
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function aggregateDiscoveryUsage(usages: NonNullable<DiscoverySynthesis["modelUsage"]>[]) {
  if (!usages.length) return undefined;
  const latest = usages[usages.length - 1];
  return {
    ...latest,
    inputTokens: usages.reduce((sum, item) => sum + item.inputTokens, 0),
    cachedInputTokens: usages.reduce((sum, item) => sum + (item.cachedInputTokens ?? 0), 0),
    outputTokens: usages.reduce((sum, item) => sum + item.outputTokens, 0),
    totalTokens: usages.reduce((sum, item) => sum + item.totalTokens, 0),
    reasoningOutputTokens: usages.reduce((sum, item) => sum + (item.reasoningOutputTokens ?? 0), 0),
    estimatedCostUsd: usages.reduce((sum, item) => sum + (item.estimatedCostUsd ?? 0), 0),
    estimatedCachedInputSavingsUsd: usages.reduce((sum, item) => sum + (item.estimatedCachedInputSavingsUsd ?? 0), 0)
  };
}
