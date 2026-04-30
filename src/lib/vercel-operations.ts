import "server-only";
import type {
  VercelDeploymentSummary,
  VercelOperationsSnapshot,
  VercelOperationsWindowKey,
  VercelSpendForecast
} from "@/lib/vercel-operations-types";

type VercelDeploymentApiRecord = {
  uid?: string;
  url?: string | null;
  state?: string;
  target?: string | null;
  createdAt?: number;
  meta?: Record<string, unknown>;
};

type VercelDeploymentsResponse = {
  deployments?: VercelDeploymentApiRecord[];
};

type VercelOperationsInput = {
  windowKey?: VercelOperationsWindowKey;
  now?: Date;
};

const dayInMs = 24 * 60 * 60 * 1000;

function asMoney(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function asPositiveNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getVercelToken() {
  return process.env.VERCEL_API_TOKEN?.trim() || process.env.VERCEL_TOKEN?.trim();
}

function getTeamSlugFromHost(host: string) {
  const slug = host.replace(/\.vercel\.app$/, "");
  const match = slug.match(/-git-.+-([^.]+)$/);
  return match?.[1];
}

function getHostFromUrl(value: string | undefined) {
  if (!value?.trim()) return "";
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname;
  } catch {
    return value.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }
}

function inferProjectName() {
  const explicit =
    process.env.NORTHSTAR_VERCEL_PROJECT_NAME?.trim() ||
    process.env.VERCEL_PROJECT_NAME?.trim() ||
    process.env.VERCEL_GIT_REPO_SLUG?.trim();
  if (explicit) return explicit;

  const host = getHostFromUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL);
  if (!host) return undefined;

  const slug = host.replace(/\.vercel\.app$/, "");
  const gitIndex = slug.indexOf("-git-");
  return gitIndex > 0 ? slug.slice(0, gitIndex) : slug;
}

function getVercelConfig() {
  const deploymentHost = getHostFromUrl(process.env.VERCEL_URL);
  const productionHost = getHostFromUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);

  return {
    token: getVercelToken(),
    projectId: process.env.NORTHSTAR_VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_ID?.trim() || undefined,
    projectName: inferProjectName(),
    teamId: process.env.NORTHSTAR_VERCEL_TEAM_ID?.trim() || process.env.VERCEL_TEAM_ID?.trim() || undefined,
    teamSlug:
      process.env.NORTHSTAR_VERCEL_TEAM_SLUG?.trim() ||
      process.env.VERCEL_TEAM_SLUG?.trim() ||
      getTeamSlugFromHost(deploymentHost || productionHost) ||
      undefined
  };
}

function getWindow(input: VercelOperationsInput = {}) {
  const now = input.now ?? new Date();
  const windowKey = input.windowKey ?? "last-30-days";
  const days = windowKey === "last-7-days" ? 7 : 30;
  const start = new Date(now.getTime() - (days - 1) * dayInMs);

  return {
    windowKey,
    label: `Last ${days} days`,
    start,
    end: now,
    since: start.getTime(),
    until: now.getTime()
  };
}

function getRuntimeSnapshot() {
  return {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    region: process.env.VERCEL_REGION ?? "unknown",
    deploymentUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "",
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? "unknown",
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown"
  };
}

function getSpendForecast(): VercelSpendForecast {
  const observedSpendUsd = asMoney(process.env.VERCEL_OBSERVED_SPEND_USD);
  const observedDays = asPositiveNumber(process.env.VERCEL_OBSERVED_SPEND_DAYS);
  const fixedMonthlySpendUsd = asMoney(process.env.VERCEL_FIXED_MONTHLY_SPEND_USD);
  const monthlyBudgetUsd = asMoney(process.env.VERCEL_MONTHLY_BUDGET_USD);
  const variableThirtyDaySpendUsd = observedSpendUsd !== null && observedDays ? (observedSpendUsd / observedDays) * 30 : null;
  const projectedThirtyDaySpendUsd =
    variableThirtyDaySpendUsd !== null || fixedMonthlySpendUsd !== null
      ? (variableThirtyDaySpendUsd ?? 0) + (fixedMonthlySpendUsd ?? 0)
      : null;

  return {
    configured: projectedThirtyDaySpendUsd !== null || monthlyBudgetUsd !== null,
    observedSpendUsd,
    observedDays,
    fixedMonthlySpendUsd,
    monthlyBudgetUsd,
    projectedThirtyDaySpendUsd,
    projectedNinetyDaySpendUsd: projectedThirtyDaySpendUsd !== null ? projectedThirtyDaySpendUsd * 3 : null,
    basisLabel:
      projectedThirtyDaySpendUsd !== null
        ? "Admin-configured Vercel spend inputs"
        : "Connect Vercel usage export or set VERCEL_OBSERVED_SPEND_USD / VERCEL_OBSERVED_SPEND_DAYS"
  };
}

function getStringMeta(meta: Record<string, unknown> | undefined, key: string) {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeDeployment(record: VercelDeploymentApiRecord): VercelDeploymentSummary | null {
  if (!record.uid || !record.url) return null;

  return {
    id: record.uid,
    url: `https://${record.url}`,
    state: record.state ?? "UNKNOWN",
    target: record.target ?? "unknown",
    createdAt: new Date(record.createdAt ?? Date.now()).toISOString(),
    gitBranch: getStringMeta(record.meta, "githubCommitRef"),
    gitSha: getStringMeta(record.meta, "githubCommitSha")
  };
}

function summarizeDeployments(records: VercelDeploymentApiRecord[]) {
  const deployments = records
    .map(normalizeDeployment)
    .filter((deployment): deployment is VercelDeploymentSummary => Boolean(deployment));

  return {
    total: deployments.length,
    ready: deployments.filter((deployment) => deployment.state === "READY").length,
    error: deployments.filter((deployment) => deployment.state === "ERROR").length,
    building: deployments.filter((deployment) => ["BUILDING", "INITIALIZING", "QUEUED"].includes(deployment.state)).length,
    canceled: deployments.filter((deployment) => deployment.state === "CANCELED").length,
    latest: deployments[0] ?? null
  };
}

async function fetchVercelDeployments(input: {
  projectId?: string;
  projectName?: string;
  teamId?: string;
  teamSlug?: string;
  token: string;
  since: number;
  until: number;
}) {
  const params = new URLSearchParams({
    limit: "20",
    since: String(input.since),
    until: String(input.until)
  });

  if (input.projectId) {
    params.set("projectId", input.projectId);
  } else if (input.projectName) {
    params.set("app", input.projectName);
  }

  if (input.teamId) params.set("teamId", input.teamId);
  if (!input.teamId && input.teamSlug) params.set("slug", input.teamSlug);

  const response = await fetch(`https://api.vercel.com/v6/deployments?${params.toString()}`, {
    headers: {
      authorization: `Bearer ${input.token}`,
      "content-type": "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Vercel deployments sync failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as VercelDeploymentsResponse;
}

export async function getVercelOperationsSnapshot(
  input: VercelOperationsInput = {}
): Promise<VercelOperationsSnapshot> {
  const window = getWindow(input);
  const config = getVercelConfig();
  const runtime = getRuntimeSnapshot();
  const spend = getSpendForecast();
  const base = {
    source: "vercel-deployments-api" as const,
    windowKey: window.windowKey,
    windowLabel: window.label,
    windowStart: window.start.toISOString(),
    windowEnd: window.end.toISOString(),
    syncedAt: new Date().toISOString(),
    projectId: config.projectId,
    projectName: config.projectName,
    teamId: config.teamId,
    teamSlug: config.teamSlug,
    runtime,
    spend
  };

  if (!config.token || (!config.projectId && !config.projectName)) {
    return {
      ...base,
      configured: false,
      connected: false,
      deployments: null,
      observability: {
        deploymentApi: "not-configured",
        runtimeLogs: "not-configured",
        webAnalytics: "not-instrumented",
        speedInsights: "not-instrumented"
      },
      error: "Add VERCEL_API_TOKEN plus NORTHSTAR_VERCEL_PROJECT_ID or NORTHSTAR_VERCEL_PROJECT_NAME to sync Vercel deployment statistics."
    };
  }

  try {
    const payload = await fetchVercelDeployments({
      projectId: config.projectId,
      projectName: config.projectName,
      teamId: config.teamId,
      teamSlug: config.teamSlug,
      token: config.token,
      since: window.since,
      until: window.until
    });

    return {
      ...base,
      configured: true,
      connected: true,
      deployments: summarizeDeployments(payload.deployments ?? []),
      observability: {
        deploymentApi: "connected",
        runtimeLogs: "available-with-token",
        webAnalytics: "not-instrumented",
        speedInsights: "not-instrumented"
      }
    };
  } catch (error) {
    return {
      ...base,
      configured: true,
      connected: false,
      deployments: null,
      observability: {
        deploymentApi: "error",
        runtimeLogs: config.token ? "available-with-token" : "not-configured",
        webAnalytics: "not-instrumented",
        speedInsights: "not-instrumented"
      },
      error: error instanceof Error ? error.message : "Vercel operations sync failed."
    };
  }
}
