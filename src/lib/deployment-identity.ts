// Return only a Git SHA, never arbitrary environment content.
export function deploymentCommitSha(value: string | undefined): string | null {
  return value && /^[a-f\d]{40}$/i.test(value) ? value.toLowerCase() : null;
}
