export function getNorthStarPromptCacheKey(workflow: string, identity?: string) {
  const normalizedWorkflow = workflow.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  const normalizedIdentity = (identity?.trim() || "global").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");

  return `north-star:${normalizedWorkflow}:${normalizedIdentity}`.slice(0, 64);
}
