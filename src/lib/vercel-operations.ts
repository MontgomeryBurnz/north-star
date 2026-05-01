import "server-only";
import type {
  VercelDeploymentSummary,
  VercelOperationsSnapshot,
  VercelOperationsWindowKey,
  VercelSetupItem,
  VercelSpendForecast
} from "@/lib/vercel-operations-types";
import { inferVercelProjectName, inferVercelTeamSlug, getVercelHostFromUrl } from "@/lib/vercel-project-inference";

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

type VercelBillingChargeRecord = {
  BilledCost?: number | string;
  EffectiveCost?: number | string;
  ServiceName?: string;
  ServiceCategory?: string;
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

function isDisabled(value: string | undefined) {
  return ["0", "false", "no", "off"].includes((value ?? "").trim().toLowerCase());
}

function getVercelToken() {
  return process.env.NORTHSTAR_VERCEL_API_TOKEN?.trim() || process.env.VERCEL_API_TOKEN?.trim() || process.env.VERCEL_TOKEN?.trim();
}

function getVercelConfig() {
  return {
    token: getVercelToken(),
    projectId: process.env.NORTHSTAR_VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_ID?.trim() || undefined,
    projectName: inferVercelProjectName(),
    teamId: process.env.NORTHSTAR_VERCEL_TEAM_ID?.trim() || process.env.VERCEL_TEAM_ID?.trim() || undefined,
    teamSlug: inferVercelTeamSlug()
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
    deploymentUrl: process.env.VERCEL_URL ? `https://${getVercelHostFromUrl(process.env.VERCEL_URL)}` : "",
    productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${getVercelHostFromUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)}` : "",
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? "unknown",
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown"
  };
}

function getConfiguredSpendForecast(): VercelSpendForecast {
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
    billingConnected: false,
    chargeCount: 0,
    observedSpendUsd,
    observedDays,
    fixedMonthlySpendUsd,
    monthlyBudgetUsd,
    projectedThirtyDaySpendUsd,
    projectedNinetyDaySpendUsd: projectedThirtyDaySpendUsd !== null ? projectedThirtyDaySpendUsd * 3 : null,
    basisLabel:
      projectedThirtyDaySpendUsd !== null
        ? "Admin-configured Vercel spend inputs"
        : "Set fixed monthly spend or observed overage inputs",
    serviceBreakdown: []
  };
}

function getObservabilityInstrumentation() {
  return {
    webAnalytics: !isDisabled(process.env.NORTHSTAR_VERCEL_WEB_ANALYTICS_ENABLED),
    speedInsights: !isDisabled(process.env.NORTHSTAR_VERCEL_SPEED_INSIGHTS_ENABLED)
  };
}

function makeSetupItem(input: Omit<VercelSetupItem, "status"> & { ready: boolean }): VercelSetupItem {
  const { ready, ...item } = input;
  return {
    ...item,
    status: ready ? "ready" : "missing"
  };
}

function getConfigurationSnapshot(input: {
  config: ReturnType<typeof getVercelConfig>;
  spend: VercelSpendForecast;
  instrumentation: ReturnType<typeof getObservabilityInstrumentation>;
}) {
  const hasProjectReference = Boolean(input.config.projectId || input.config.projectName);
  const hasSpendRunRate = Boolean(input.spend.projectedThirtyDaySpendUsd !== null || input.spend.monthlyBudgetUsd !== null);
  const deploymentTelemetryReady = Boolean(input.config.token && hasProjectReference);
  const observabilityReady = Boolean(input.instrumentation.webAnalytics && input.instrumentation.speedInsights);
  const setupItems = [
    makeSetupItem({
      key: "NORTHSTAR_VERCEL_API_TOKEN",
      label: "Vercel API token",
      description: "Allows Admin to sync deployment telemetry and billing charges for the North Star project.",
      impact: "deployment-telemetry",
      ready: Boolean(input.config.token)
    }),
    makeSetupItem({
      key: "NORTHSTAR_VERCEL_PROJECT_ID or NORTHSTAR_VERCEL_PROJECT_NAME",
      label: "Project reference",
      description: "Scopes deployment telemetry to this Vercel project instead of the whole account.",
      impact: "deployment-telemetry",
      ready: hasProjectReference
    }),
    makeSetupItem({
      key: "/v1/billing/charges",
      label: "Live billing charges",
      description: "Pulls current Vercel usage and cost from the billing charges API for forecast reconciliation.",
      impact: "spend-forecast",
      ready: input.spend.billingConnected
    }),
    makeSetupItem({
      key: "VERCEL_FIXED_MONTHLY_SPEND_USD or VERCEL_OBSERVED_SPEND_USD",
      label: "Manual forecast fallback",
      description: "Optional fallback when billing API access is unavailable or a fixed subscription baseline needs to be overlaid.",
      impact: "spend-forecast",
      ready:
        input.spend.billingConnected ||
        input.spend.fixedMonthlySpendUsd !== null ||
        Boolean(input.spend.observedSpendUsd !== null && input.spend.observedDays)
    }),
    makeSetupItem({
      key: "@vercel/analytics",
      label: "Web Analytics instrumentation",
      description: "The app shell includes Vercel Web Analytics for page-level usage events.",
      impact: "observability",
      ready: input.instrumentation.webAnalytics
    }),
    makeSetupItem({
      key: "@vercel/speed-insights",
      label: "Speed Insights instrumentation",
      description: "The app shell includes Vercel Speed Insights for Core Web Vitals.",
      impact: "observability",
      ready: input.instrumentation.speedInsights
    })
  ];

  return {
    deploymentTelemetryReady,
    spendForecastReady: hasSpendRunRate,
    observabilityReady,
    missingSetupKeys: setupItems.filter((item) => item.status === "missing").map((item) => item.key),
    setupItems
  };
}

function getMissingTelemetryMessage(configuration: ReturnType<typeof getConfigurationSnapshot>) {
  const missing = configuration.setupItems
    .filter((item) => item.impact === "deployment-telemetry" && item.status === "missing")
    .map((item) => item.label.toLowerCase());

  if (!missing.length) return undefined;
  return `Connect ${missing.join(" and ")} to sync Vercel deployment statistics.`;
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
    const errorPayload = (await response.json().catch(() => null)) as { error?: { message?: string }; message?: string } | null;
    const message = errorPayload?.error?.message || errorPayload?.message || `HTTP ${response.status}`;
    throw new Error(`Vercel deployments sync failed: ${message}`);
  }

  return (await response.json()) as VercelDeploymentsResponse;
}

function parseMoneyValue(value: number | string | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseJsonLines(text: string): VercelBillingChargeRecord[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as VercelBillingChargeRecord);
}

function summarizeBillingCharges(input: {
  charges: VercelBillingChargeRecord[];
  days: number;
  monthlyBudgetUsd: number | null;
}): VercelSpendForecast {
  const byService = new Map<string, { category: string; spendUsd: number }>();
  let observedSpendUsd = 0;

  for (const charge of input.charges) {
    const spendUsd = parseMoneyValue(charge.EffectiveCost ?? charge.BilledCost);
    observedSpendUsd += spendUsd;

    const name = charge.ServiceName?.trim() || charge.ServiceCategory?.trim() || "Vercel service";
    const category = charge.ServiceCategory?.trim() || "Uncategorized";
    const existing = byService.get(name);
    if (existing) {
      existing.spendUsd += spendUsd;
    } else {
      byService.set(name, { category, spendUsd });
    }
  }

  const projectedThirtyDaySpendUsd = input.days > 0 ? (observedSpendUsd / input.days) * 30 : observedSpendUsd;
  const serviceBreakdown = [...byService.entries()]
    .map(([name, value]) => ({ name, category: value.category, spendUsd: value.spendUsd }))
    .sort((a, b) => b.spendUsd - a.spendUsd)
    .slice(0, 6);

  return {
    configured: true,
    billingConnected: true,
    chargeCount: input.charges.length,
    observedSpendUsd,
    observedDays: input.days,
    fixedMonthlySpendUsd: null,
    monthlyBudgetUsd: input.monthlyBudgetUsd,
    projectedThirtyDaySpendUsd,
    projectedNinetyDaySpendUsd: projectedThirtyDaySpendUsd * 3,
    basisLabel: "Live Vercel billing charges",
    serviceBreakdown
  };
}

async function fetchVercelBillingCharges(input: {
  teamId?: string;
  teamSlug?: string;
  token: string;
  from: Date;
  to: Date;
}) {
  const params = new URLSearchParams({
    from: input.from.toISOString(),
    to: input.to.toISOString()
  });

  if (input.teamId) params.set("teamId", input.teamId);
  if (!input.teamId && input.teamSlug) params.set("slug", input.teamSlug);

  const response = await fetch(`https://api.vercel.com/v1/billing/charges?${params.toString()}`, {
    headers: {
      authorization: `Bearer ${input.token}`,
      "content-type": "application/json"
    },
    cache: "no-store"
  });

  const text = await response.text();

  if (!response.ok) {
    let message = text;
    try {
      const payload = JSON.parse(text) as { error?: { message?: string }; message?: string };
      message = payload?.error?.message || payload?.message || text;
    } catch {
      message = text;
    }
    throw new Error(`Vercel billing sync failed: ${message || `HTTP ${response.status}`}`);
  }

  return parseJsonLines(text);
}

async function getSpendForecast(input: {
  config: ReturnType<typeof getVercelConfig>;
  token?: string;
  windowStart: Date;
  windowEnd: Date;
  windowDays: number;
}): Promise<VercelSpendForecast> {
  const configured = getConfiguredSpendForecast();
  if (!input.token) return configured;

  try {
    return summarizeBillingCharges({
      charges: await fetchVercelBillingCharges({
        teamId: input.config.teamId,
        teamSlug: input.config.teamSlug,
        token: input.token,
        from: input.windowStart,
        to: input.windowEnd
      }),
      days: input.windowDays,
      monthlyBudgetUsd: configured.monthlyBudgetUsd
    });
  } catch (error) {
    return {
      ...configured,
      error: error instanceof Error ? error.message : "Vercel billing sync failed."
    };
  }
}

export async function getVercelOperationsSnapshot(
  input: VercelOperationsInput = {}
): Promise<VercelOperationsSnapshot> {
  const window = getWindow(input);
  const config = getVercelConfig();
  const runtime = getRuntimeSnapshot();
  const spend = await getSpendForecast({
    config,
    token: config.token,
    windowStart: window.start,
    windowEnd: window.end,
    windowDays: window.windowKey === "last-7-days" ? 7 : 30
  });
  const instrumentation = getObservabilityInstrumentation();
  const configuration = getConfigurationSnapshot({ config, spend, instrumentation });
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
    configuration,
    runtime,
    spend
  };

  if (!configuration.deploymentTelemetryReady) {
    return {
      ...base,
      configured: false,
      connected: false,
      deployments: null,
      observability: {
        deploymentApi: "not-configured",
        runtimeLogs: "not-configured",
        webAnalytics: instrumentation.webAnalytics ? "instrumented" : "not-instrumented",
        speedInsights: instrumentation.speedInsights ? "instrumented" : "not-instrumented"
      },
      error: getMissingTelemetryMessage(configuration)
    };
  }

  try {
    const token = config.token;
    if (!token) throw new Error("Vercel API token is missing.");

    const payload = await fetchVercelDeployments({
      projectId: config.projectId,
      projectName: config.projectName,
      teamId: config.teamId,
      teamSlug: config.teamSlug,
      token,
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
        webAnalytics: instrumentation.webAnalytics ? "instrumented" : "not-instrumented",
        speedInsights: instrumentation.speedInsights ? "instrumented" : "not-instrumented"
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
        webAnalytics: instrumentation.webAnalytics ? "instrumented" : "not-instrumented",
        speedInsights: instrumentation.speedInsights ? "instrumented" : "not-instrumented"
      },
      error: error instanceof Error ? error.message : "Vercel operations sync failed."
    };
  }
}
