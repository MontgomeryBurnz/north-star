"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, ChevronDown, Cloud, DollarSign, RefreshCw, ServerCog, Wrench } from "lucide-react";
import { getBillingExpenseForecast } from "@/lib/openai-billing-forecast";
import type { GuidanceModelProfile } from "@/lib/guidance-model-profile";
import type { OpenAIBillingReconciliation, OpenAIBillingWindowKey } from "@/lib/openai-billing-types";
import type { VercelOperationsSnapshot, VercelOperationsWindowKey, VercelSetupItem } from "@/lib/vercel-operations-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuidanceModelProfileCard } from "@/components/guidance-model-profile-card";
import { SectionHeader } from "@/components/section-header";

const billingWindowOptions: Array<{ label: string; value: OpenAIBillingWindowKey }> = [
  { label: "Month to date", value: "month-to-date" },
  { label: "Last 7 days", value: "last-7-days" },
  { label: "Last 14 days", value: "last-14-days" },
  { label: "Last 30 days", value: "last-30-days" }
];

const vercelWindowOptions: Array<{ label: string; value: VercelOperationsWindowKey }> = [
  { label: "Last 7 days", value: "last-7-days" },
  { label: "Last 30 days", value: "last-30-days" }
];

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not connected";
  if (value <= 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

function formatForecastCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "Needs inputs";
  return formatCurrency(value);
}

function formatInteger(value: number | null | undefined) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value ?? 0);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not connected";
  return `${Math.round((value ?? 0) * 100)}%`;
}

function formatDate(value: string | undefined) {
  if (!value) return "Not synced";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function shortSha(value: string | undefined) {
  if (!value || value === "unknown") return "unknown";
  return value.slice(0, 7);
}

function formatStatusLabel(value: string | undefined) {
  if (!value) return "not configured";
  return value.replaceAll("-", " ");
}

function getVercelStatusLabel(vercel: VercelOperationsSnapshot | null) {
  if (!vercel) return "Syncing";
  if (vercel.connected && vercel.configuration.spendForecastReady) return "Connected";
  if (vercel.connected) return "Telemetry connected";
  if (vercel.configuration.observabilityReady) return "Observability active";
  return "Needs setup";
}

function getVercelStatusTone(vercel: VercelOperationsSnapshot | null): "good" | "warn" | "neutral" {
  if (!vercel) return "neutral";
  return vercel.connected && vercel.configuration.spendForecastReady
    ? "good"
    : vercel.configuration.observabilityReady
      ? "good"
      : "warn";
}

function getOpenAISpendValue(billing: OpenAIBillingReconciliation | null) {
  return billing?.actualSpendUsd ?? billing?.usageEstimatedSpendUsd ?? billing?.localTrackedSpendUsd;
}

function getOpenAIRequestValue(billing: OpenAIBillingReconciliation | null) {
  return billing?.actualRequests ?? billing?.localTrackedCalls;
}

function getOpenAITokenValue(billing: OpenAIBillingReconciliation | null) {
  return billing?.actualTotalTokens ?? billing?.localTrackedTokens;
}

function getOpenAICachedTokenValue(billing: OpenAIBillingReconciliation | null) {
  return billing?.actualCachedInputTokens ?? null;
}

function getOpenAICostBasisLabel(billing: OpenAIBillingReconciliation | null) {
  if (!billing) return "Waiting for OpenAI billing sync";
  if (billing.connected) return billing.windowLabel;
  if (billing.localTrackedCalls || billing.localTrackedTokens || billing.localTrackedSpendUsd) {
    return "App-tracked fallback until billing reconnects";
  }
  return billing.windowLabel;
}

async function getFailureMessage(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (payload?.error) return payload.error;
  }

  return fallback;
}

function StatusPill({ children, tone = "neutral" }: { children: string; tone?: "good" | "warn" | "neutral" }) {
  const className =
    tone === "good"
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
      : tone === "warn"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : "border-white/10 bg-white/[0.035] text-zinc-300";

  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${className}`}>
      {children}
    </span>
  );
}

function SetupItemCard({ item }: { item: VercelSetupItem }) {
  const ready = item.status === "ready";

  return (
    <div
      className={`rounded-md border p-3 ${
        ready ? "border-emerald-300/20 bg-emerald-300/[0.055]" : "border-amber-300/20 bg-amber-300/[0.055]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">{item.description}</p>
        </div>
        {ready ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
        ) : (
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
        )}
      </div>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">{item.key}</p>
    </div>
  );
}

function MetricTile({
  detail,
  label,
  value,
  tone = "neutral"
}: {
  detail: string;
  label: string;
  value: string;
  tone?: "good" | "info" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-300/20 bg-emerald-300/[0.055]"
      : tone === "info"
        ? "border-cyan-300/20 bg-cyan-300/[0.055]"
        : "border-white/10 bg-white/[0.035]";

  return (
    <div className={`rounded-md border p-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-50">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

function SelectControl<T extends string>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="h-11 w-full appearance-none rounded-md border border-white/10 bg-zinc-950 px-3 pr-10 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </span>
    </label>
  );
}

export function AdminOperatingCostCenter({ guidanceModelProfile }: { guidanceModelProfile: GuidanceModelProfile }) {
  const [billing, setBilling] = useState<OpenAIBillingReconciliation | null>(null);
  const [billingWindow, setBillingWindow] = useState<OpenAIBillingWindowKey>("month-to-date");
  const [billingStatus, setBillingStatus] = useState<string | null>(null);
  const [isBillingSyncing, setIsBillingSyncing] = useState(false);
  const [vercel, setVercel] = useState<VercelOperationsSnapshot | null>(null);
  const [vercelWindow, setVercelWindow] = useState<VercelOperationsWindowKey>("last-30-days");
  const [vercelStatus, setVercelStatus] = useState<string | null>(null);
  const [isVercelSyncing, setIsVercelSyncing] = useState(false);

  const billingForecast = useMemo(() => getBillingExpenseForecast(billing), [billing]);
  const totalThirtyDayForecast = useMemo(() => {
    const openAIProjection = billingForecast?.projectedThirtyDaySpendUsd;
    const vercelProjection = vercel?.spend.projectedThirtyDaySpendUsd;
    if (openAIProjection === undefined && vercelProjection == null) return null;
    return (openAIProjection ?? 0) + (vercelProjection ?? 0);
  }, [billingForecast?.projectedThirtyDaySpendUsd, vercel?.spend.projectedThirtyDaySpendUsd]);

  const loadBilling = useCallback(async () => {
    setIsBillingSyncing(true);
    setBillingStatus("Syncing OpenAI...");
    try {
      const params = new URLSearchParams({ refresh: String(Date.now()), window: billingWindow });
      const response = await fetch(`/api/openai-billing?${params.toString()}`, {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error(await getFailureMessage(response, "OpenAI billing sync failed."));
      const payload = (await response.json()) as { billing: OpenAIBillingReconciliation };
      setBilling(payload.billing);
      setBillingStatus(null);
    } catch (error) {
      setBillingStatus(error instanceof Error ? error.message : "OpenAI billing could not sync.");
    } finally {
      setIsBillingSyncing(false);
    }
  }, [billingWindow]);

  const loadVercel = useCallback(async () => {
    setIsVercelSyncing(true);
    setVercelStatus("Syncing Vercel...");
    try {
      const params = new URLSearchParams({ refresh: String(Date.now()), window: vercelWindow });
      const response = await fetch(`/api/admin/vercel-operations?${params.toString()}`, {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error(await getFailureMessage(response, "Vercel sync failed."));
      const payload = (await response.json()) as { vercel: VercelOperationsSnapshot };
      setVercel(payload.vercel);
      setVercelStatus(null);
    } catch (error) {
      setVercelStatus(error instanceof Error ? error.message : "Vercel telemetry could not sync.");
    } finally {
      setIsVercelSyncing(false);
    }
  }, [vercelWindow]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    void loadVercel();
  }, [loadVercel]);

  return (
    <section className="mt-12">
      <SectionHeader
        eyebrow="Operating cost"
        title="Application Cost Center"
        description="Track OpenAI spend, model economics, Vercel operating signals, and forecasted run rate from one Admin view."
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-4">
        <MetricTile
          label="OpenAI current"
          value={formatCurrency(getOpenAISpendValue(billing))}
          detail={getOpenAICostBasisLabel(billing)}
          tone="good"
        />
        <MetricTile
          label="OpenAI 30-day"
          value={formatCurrency(billingForecast?.projectedThirtyDaySpendUsd)}
          detail={billingForecast?.basisLabel ?? "Forecast after billing sync"}
          tone="info"
        />
        <MetricTile
          label="Vercel 30-day"
          value={formatForecastCurrency(vercel?.spend.projectedThirtyDaySpendUsd)}
          detail={vercel?.spend.basisLabel ?? "Set platform spend inputs for forecast"}
        />
        <MetricTile
          label="Total forecast"
          value={formatForecastCurrency(totalThirtyDayForecast)}
          detail="OpenAI plus Vercel 30-day operating forecast"
          tone="good"
        />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="grid gap-6">
          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-zinc-50">
                  <DollarSign className="h-4 w-4 text-emerald-200" />
                  OpenAI spend and forecast
                </CardTitle>
                <StatusPill tone={billing?.connected ? "good" : "warn"}>
                  {billing?.connected ? "Connected" : "Not connected"}
                </StatusPill>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <SelectControl
                  label="Billing window"
                  value={billingWindow}
                  options={billingWindowOptions}
                  onChange={setBillingWindow}
                />
                <Button type="button" variant="outline" onClick={() => void loadBilling()} disabled={isBillingSyncing}>
                  <RefreshCw className={`h-4 w-4 ${isBillingSyncing ? "animate-spin" : ""}`} />
                  {isBillingSyncing ? "Syncing" : "Sync"}
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <MetricTile
                  label="Requests"
                  value={formatInteger(getOpenAIRequestValue(billing))}
                  detail={billing?.connected ? "OpenAI requests in selected window" : "App-tracked calls in selected window"}
                />
                <MetricTile
                  label="Tokens"
                  value={formatInteger(getOpenAITokenValue(billing))}
                  detail={
                    billing?.connected
                      ? `${formatInteger(getOpenAICachedTokenValue(billing))} cached input tokens`
                      : "App-tracked token volume"
                  }
                />
                <MetricTile
                  label="Cache rate"
                  value={formatPercent(billing?.actualCacheHitRate)}
                  detail={billing?.connected ? "Higher cache reuse improves cost efficiency" : "Reconnect billing to show cache efficiency"}
                />
              </div>

              <div className="rounded-md border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-zinc-400">
                <p>
                  {billingStatus ??
                    (billing?.syncedAt
                      ? billing.connected
                        ? `Last synced ${formatDate(billing.syncedAt)}. Unallocated OpenAI spend: ${formatCurrency(billing.unallocatedSpendUsd)}.`
                        : `Last checked ${formatDate(billing.syncedAt)}. Showing app-tracked usage until OpenAI billing reconnects.`
                      : "OpenAI billing has not synced yet.")}
                </p>
                {billing?.error ? <p className="mt-2 text-amber-100">{billing.error}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-zinc-50">
                  <Cloud className="h-4 w-4 text-cyan-200" />
                  Vercel usage and observability
                </CardTitle>
                <StatusPill tone={getVercelStatusTone(vercel)}>{getVercelStatusLabel(vercel)}</StatusPill>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <SelectControl
                  label="Deployment and cost window"
                  value={vercelWindow}
                  options={vercelWindowOptions}
                  onChange={setVercelWindow}
                />
                <Button type="button" variant="outline" onClick={() => void loadVercel()} disabled={isVercelSyncing}>
                  <RefreshCw className={`h-4 w-4 ${isVercelSyncing ? "animate-spin" : ""}`} />
                  {isVercelSyncing ? "Syncing" : "Sync"}
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <MetricTile
                  label="Deployments"
                  value={formatInteger(vercel?.deployments?.total)}
                  detail={vercel?.windowLabel ?? "Selected window"}
                />
                <MetricTile
                  label="Ready"
                  value={formatInteger(vercel?.deployments?.ready)}
                  detail="Successful deployments"
                  tone="good"
                />
                <MetricTile label="Errors" value={formatInteger(vercel?.deployments?.error)} detail="Failed deployments" />
                <MetricTile
                  label="Vercel 90-day"
                  value={formatForecastCurrency(vercel?.spend.projectedNinetyDaySpendUsd)}
                  detail={vercel?.spend.billingConnected ? "Projected from live billing charges" : "Quarterly platform view"}
                />
              </div>

              {vercel?.spend.billingConnected ? (
                <div className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">Live Vercel billing</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {formatCurrency(vercel.spend.observedSpendUsd)} across {formatInteger(vercel.spend.chargeCount)} charges in{" "}
                        {vercel.windowLabel.toLowerCase()}.
                      </p>
                    </div>
                    <StatusPill tone="good">Billing connected</StatusPill>
                  </div>
                  {vercel.spend.serviceBreakdown.length ? (
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {vercel.spend.serviceBreakdown.map((service) => (
                        <div key={`${service.name}-${service.category}`} className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-sm font-medium text-zinc-100">{service.name}</p>
                          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
                            <span>{service.category}</span>
                            <span className="font-semibold text-cyan-100">{formatCurrency(service.spendUsd)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {vercel ? (
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">Connection checklist</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Deployment telemetry, spend forecast, and observability are configured independently.
                      </p>
                    </div>
                    <StatusPill tone={vercel.configuration.deploymentTelemetryReady ? "good" : "warn"}>
                      {vercel.configuration.deploymentTelemetryReady ? "Telemetry ready" : "Token needed"}
                    </StatusPill>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {vercel.configuration.setupItems.map((item) => (
                      <SetupItemCard key={`${item.impact}-${item.key}`} item={item} />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    <ServerCog className="h-3.5 w-3.5 text-emerald-200" />
                    Runtime
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-300">
                    <p>Environment: {vercel?.runtime.environment ?? "unknown"}</p>
                    <p>Region: {vercel?.runtime.region ?? "unknown"}</p>
                    <p>Branch: {vercel?.runtime.gitBranch ?? "unknown"}</p>
                    <p>Commit: {shortSha(vercel?.runtime.gitSha)}</p>
                  </div>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    <Activity className="h-3.5 w-3.5 text-cyan-200" />
                    Observability
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-300">
                    <p>Deployment API: {formatStatusLabel(vercel?.observability.deploymentApi)}</p>
                    <p>Runtime logs: {formatStatusLabel(vercel?.observability.runtimeLogs)}</p>
                    <p>Web Analytics: {formatStatusLabel(vercel?.observability.webAnalytics)}</p>
                    <p>Speed Insights: {formatStatusLabel(vercel?.observability.speedInsights)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-zinc-400">
                <p>
                  {vercelStatus ??
                    (vercel?.syncedAt
                      ? `Last synced ${formatDate(vercel.syncedAt)}. Latest deployment: ${vercel.deployments?.latest?.state ?? "unknown"}.`
                      : "Vercel telemetry has not synced yet.")}
                </p>
                {vercel?.error ? <p className="mt-2 text-amber-100">{vercel.error}</p> : null}
                {vercel?.spend.error ? <p className="mt-2 text-amber-100">{vercel.spend.error}</p> : null}
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Vercel billing remains the source of truth. Admin now uses live Vercel billing charges when connected, with manual spend inputs
                  only as a fallback.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <GuidanceModelProfileCard
          guidanceModelProfile={guidanceModelProfile}
          usageDescription="Used by Admin to monitor model choice, reasoning level, cost basis, and cache posture for North Star guidance workflows."
        />
      </div>
    </section>
  );
}
