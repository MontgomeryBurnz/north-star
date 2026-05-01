type VercelEnv = Record<string, string | undefined>;

export function getVercelHostFromUrl(value: string | undefined) {
  if (!value?.trim()) return "";
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname;
  } catch {
    return value.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }
}

export function inferVercelTeamSlugFromHost(host: string) {
  const slug = host.replace(/\.vercel\.app$/, "");
  const match = slug.match(/-git-[^-]+-(.+)$/);
  return match?.[1];
}

export function inferVercelProjectName(env: VercelEnv = process.env) {
  const explicit =
    env.NORTHSTAR_VERCEL_PROJECT_NAME?.trim() ||
    env.VERCEL_PROJECT_NAME?.trim() ||
    env.VERCEL_GIT_REPO_SLUG?.trim();
  if (explicit) return explicit;

  const deploymentHost = getVercelHostFromUrl(env.VERCEL_URL);
  const productionHost = getVercelHostFromUrl(env.VERCEL_PROJECT_PRODUCTION_URL);
  const host = deploymentHost.endsWith(".vercel.app")
    ? deploymentHost
    : productionHost.endsWith(".vercel.app")
      ? productionHost
      : deploymentHost || productionHost;
  if (!host || !host.endsWith(".vercel.app")) return "north-star";

  const slug = host.replace(/\.vercel\.app$/, "");
  const gitIndex = slug.indexOf("-git-");
  return gitIndex > 0 ? slug.slice(0, gitIndex) : slug;
}

export function inferVercelTeamSlug(env: VercelEnv = process.env) {
  const deploymentHost = getVercelHostFromUrl(env.VERCEL_URL);
  const productionHost = getVercelHostFromUrl(env.VERCEL_PROJECT_PRODUCTION_URL);

  return (
    env.NORTHSTAR_VERCEL_TEAM_SLUG?.trim() ||
    env.VERCEL_TEAM_SLUG?.trim() ||
    inferVercelTeamSlugFromHost(deploymentHost || productionHost) ||
    undefined
  );
}
