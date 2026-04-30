export type VercelOperationsWindowKey = "last-7-days" | "last-30-days";

export type VercelDeploymentSummary = {
  id: string;
  url: string;
  state: string;
  target: string;
  createdAt: string;
  gitBranch?: string;
  gitSha?: string;
};

export type VercelSpendForecast = {
  configured: boolean;
  observedSpendUsd: number | null;
  observedDays: number | null;
  fixedMonthlySpendUsd: number | null;
  monthlyBudgetUsd: number | null;
  projectedThirtyDaySpendUsd: number | null;
  projectedNinetyDaySpendUsd: number | null;
  basisLabel: string;
};

export type VercelSetupItem = {
  key: string;
  label: string;
  description: string;
  status: "ready" | "missing";
  impact: "deployment-telemetry" | "spend-forecast" | "observability";
};

export type VercelOperationsSnapshot = {
  configured: boolean;
  connected: boolean;
  source: "vercel-deployments-api";
  windowKey: VercelOperationsWindowKey;
  windowLabel: string;
  windowStart: string;
  windowEnd: string;
  syncedAt: string;
  projectId?: string;
  projectName?: string;
  teamId?: string;
  teamSlug?: string;
  configuration: {
    deploymentTelemetryReady: boolean;
    spendForecastReady: boolean;
    observabilityReady: boolean;
    missingSetupKeys: string[];
    setupItems: VercelSetupItem[];
  };
  runtime: {
    environment: string;
    region: string;
    deploymentUrl: string;
    productionUrl: string;
    gitBranch: string;
    gitSha: string;
  };
  deployments: {
    total: number;
    ready: number;
    error: number;
    building: number;
    canceled: number;
    latest: VercelDeploymentSummary | null;
  } | null;
  observability: {
    deploymentApi: "connected" | "not-configured" | "error";
    runtimeLogs: "available-with-token" | "not-configured";
    webAnalytics: "instrumented" | "not-instrumented";
    speedInsights: "instrumented" | "not-instrumented";
  };
  spend: VercelSpendForecast;
  error?: string;
};
