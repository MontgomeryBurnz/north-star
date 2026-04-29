"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ShieldAlert, XCircle } from "lucide-react";
import { useForegroundRefresh } from "@/hooks/use-foreground-refresh";
import { useProgramCatalog } from "@/hooks/use-program-catalog";
import { useRequestSequence } from "@/hooks/use-request-sequence";
import type { GuidanceModelProfile } from "@/lib/guidance-model-profile";
import { isTeamActionPlanFlagSourceId, roleFromTeamActionPlanFlagSourceId } from "@/lib/guidance-feedback-flag-sources";
import type { GuidanceFeedbackFlag, GuidanceJustificationRecord, OpenAIUsageRecord } from "@/lib/program-intelligence-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuidanceModelProfileCard } from "@/components/guidance-model-profile-card";
import { SectionHeader } from "@/components/section-header";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  if (value <= 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

function formatTokenCount(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getWorkflowLabel(workflow: OpenAIUsageRecord["workflow"]) {
  if (workflow === "guided-plan") return "Guided plans";
  if (workflow === "guide") return "Guide dialogue";
  if (workflow === "assistant-briefing") return "Prompt briefing";
  return "Leadership feedback";
}

function getFlagTarget(flag: GuidanceFeedbackFlag, justification?: GuidanceJustificationRecord) {
  const citation = justification?.citations.find((item) => item.sourceId === flag.citationId);
  const isTeamActionPlan = flag.targetType === "team-action-plan" || isTeamActionPlanFlagSourceId(flag.citationId);
  const teamRole = flag.targetRole || roleFromTeamActionPlanFlagSourceId(flag.citationId);

  if (isTeamActionPlan) {
    return {
      eyebrow: "Team Action Plan disputed",
      title: flag.targetLabel || `${teamRole || "Team role"} Team Action Plan`,
      detail: teamRole ? `Role-specific dispute for ${teamRole}.` : "Role-specific dispute.",
      citation
    };
  }

  if (flag.scope === "whole") {
    return {
      eyebrow: "Whole rationale disputed",
      title: flag.targetLabel || justification?.summary || "Guidance rationale review",
      detail: "The user is challenging the full explanation behind the guidance change.",
      citation
    };
  }

  return {
    eyebrow: "Source citation disputed",
    title: flag.targetLabel || citation?.label || justification?.summary || "Guidance source review",
    detail: "The user is challenging one source or citation used by the guided plan.",
    citation
  };
}

function getStatusClassName(status: GuidanceFeedbackFlag["status"]) {
  if (status === "approved") return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  if (status === "denied") return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  return "border-amber-300/25 bg-amber-300/10 text-amber-100";
}

function getDecisionLabel(status: GuidanceFeedbackFlag["status"]) {
  if (status === "approved") return "Correction approved";
  if (status === "denied") return "Challenge denied";
  return "Pending review";
}

function getDecisionImpact(status: GuidanceFeedbackFlag["status"]) {
  if (status === "approved") {
    return "Use this correction as governed program memory for future guidance.";
  }

  if (status === "denied") {
    return "Keep the original guidance interpretation; retain this challenge as audit history only.";
  }

  return "Awaiting governance disposition.";
}

type GovernanceDashboardProps = {
  guidanceModelProfile: GuidanceModelProfile;
};

export function GovernanceDashboard({ guidanceModelProfile }: GovernanceDashboardProps) {
  const governanceRequest = useRequestSequence();
  const [flags, setFlags] = useState<GuidanceFeedbackFlag[]>([]);
  const [justifications, setJustifications] = useState<GuidanceJustificationRecord[]>([]);
  const [usageRecords, setUsageRecords] = useState<OpenAIUsageRecord[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<Record<string, { disposition: string; saving: boolean }>>({});
  const handleProgramLoadError = useCallback(() => setStatus("Could not load programs for governance review."), []);
  const { programs, selectedProgramId, setSelectedProgramId, refreshPrograms } = useProgramCatalog({
    onError: handleProgramLoadError
  });

  const loadGovernance = useCallback(async () => {
    const requestId = governanceRequest.beginRequest();

    if (!selectedProgramId) {
      setFlags([]);
      setJustifications([]);
      setUsageRecords([]);
      return;
    }

    const [flagsResponse, justificationsResponse, usageResponse] = await Promise.all([
      fetch(`/api/programs/${selectedProgramId}/guidance-feedback-flags`, { cache: "no-store" }),
      fetch(`/api/programs/${selectedProgramId}/guidance-justifications`, { cache: "no-store" }),
      fetch(`/api/programs/${selectedProgramId}/openai-usage`, { cache: "no-store" })
    ]);

    if (!flagsResponse.ok || !justificationsResponse.ok || !usageResponse.ok) {
      throw new Error("Could not load governance records.");
    }

    const flagsPayload = (await flagsResponse.json()) as { flags: GuidanceFeedbackFlag[] };
    const justificationsPayload = (await justificationsResponse.json()) as { justifications: GuidanceJustificationRecord[] };
    const usagePayload = (await usageResponse.json()) as { usageRecords: OpenAIUsageRecord[] };
    if (!governanceRequest.isLatestRequest(requestId)) return;

    setFlags(flagsPayload.flags);
    setJustifications(justificationsPayload.justifications);
    setUsageRecords(usagePayload.usageRecords);
  }, [governanceRequest, selectedProgramId]);

  useEffect(() => {
    void loadGovernance().catch(() => setStatus("Could not load governance records."));
  }, [loadGovernance]);

  useForegroundRefresh(
    () => {
      void refreshPrograms({ silent: true });
      void loadGovernance().catch(() => null);
    },
    { enabled: true, intervalMs: selectedProgramId ? 15000 : null }
  );

  const justificationsById = useMemo(
    () => new Map(justifications.map((record) => [record.id, record])),
    [justifications]
  );

  const counts = useMemo(
    () => ({
      pending: flags.filter((flag) => flag.status === "pending").length,
      approved: flags.filter((flag) => flag.status === "approved").length,
      denied: flags.filter((flag) => flag.status === "denied").length,
      teamActionPlan: flags.filter((flag) => flag.targetType === "team-action-plan" || isTeamActionPlanFlagSourceId(flag.citationId)).length
    }),
    [flags]
  );

  const flagGroups = useMemo(
    () => {
      const sortedFlags = [...flags].sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));

      return {
        pending: sortedFlags.filter((flag) => flag.status === "pending"),
        resolved: sortedFlags.filter((flag) => flag.status !== "pending")
      };
    },
    [flags]
  );

  const usageSummary = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const lastSevenDays = usageRecords.filter((record) => Date.parse(record.createdAt) >= sevenDaysAgo);
    const recordsForForecast = lastSevenDays.length ? lastSevenDays : usageRecords;
    const oldestForecastRecordTime = Math.min(...recordsForForecast.map((record) => Date.parse(record.createdAt)).filter(Number.isFinite));
    const observedDays = Number.isFinite(oldestForecastRecordTime)
      ? Math.max(1, Math.min(7, (now - oldestForecastRecordTime) / (24 * 60 * 60 * 1000)))
      : 1;
    const totals = usageRecords.reduce(
      (summary, record) => ({
        inputTokens: summary.inputTokens + record.inputTokens,
        cachedInputTokens: summary.cachedInputTokens + record.cachedInputTokens,
        outputTokens: summary.outputTokens + record.outputTokens,
        totalTokens: summary.totalTokens + record.totalTokens,
        estimatedCostUsd: summary.estimatedCostUsd + record.estimatedCostUsd,
        estimatedCachedInputSavingsUsd: summary.estimatedCachedInputSavingsUsd + record.estimatedCachedInputSavingsUsd
      }),
      {
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        estimatedCachedInputSavingsUsd: 0
      }
    );
    const forecastCost = recordsForForecast.reduce((sum, record) => sum + record.estimatedCostUsd, 0);
    const workflowBreakdown = Array.from(
      usageRecords.reduce((map, record) => {
        const current = map.get(record.workflow) ?? { calls: 0, estimatedCostUsd: 0, totalTokens: 0 };
        map.set(record.workflow, {
          calls: current.calls + 1,
          estimatedCostUsd: current.estimatedCostUsd + record.estimatedCostUsd,
          totalTokens: current.totalTokens + record.totalTokens
        });
        return map;
      }, new Map<OpenAIUsageRecord["workflow"], { calls: number; estimatedCostUsd: number; totalTokens: number }>())
    ).sort((first, second) => second[1].estimatedCostUsd - first[1].estimatedCostUsd);

    return {
      ...totals,
      cacheHitRate: totals.inputTokens ? totals.cachedInputTokens / totals.inputTokens : 0,
      projectedThirtyDayCostUsd: recordsForForecast.length ? (forecastCost / observedDays) * 30 : 0,
      lastSevenDayCostUsd: lastSevenDays.reduce((sum, record) => sum + record.estimatedCostUsd, 0),
      workflowBreakdown,
      latestRecord: usageRecords[0] ?? null
    };
  }, [usageRecords]);

  async function reviewFlag(flag: GuidanceFeedbackFlag, nextStatus: "approved" | "denied") {
    const disposition = reviewState[flag.id]?.disposition?.trim() ?? "";
    if (!disposition) {
      setStatus("Add a leadership disposition before approving or denying a flagged rationale.");
      return;
    }

    setReviewState((current) => ({
      ...current,
      [flag.id]: { disposition, saving: true }
    }));
    setStatus(`${nextStatus === "approved" ? "Approving" : "Denying"} flagged guidance...`);

    try {
      const response = await fetch(`/api/programs/${flag.programId}/guidance-feedback-flags/${flag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          leadershipDisposition: disposition
        })
      });

      if (!response.ok) {
        throw new Error("review");
      }

      await loadGovernance();
      setStatus(
        nextStatus === "approved"
          ? "Flag approved. This correction can now be treated as governed program memory."
          : "Flag denied. The original rationale remains the approved program interpretation."
      );
    } catch {
      setStatus("Could not save the governance review.");
    } finally {
      setReviewState((current) => ({
        ...current,
        [flag.id]: { disposition, saving: false }
      }));
    }
  }

  function renderChallengeEvidence(flag: GuidanceFeedbackFlag) {
    const justification = justificationsById.get(flag.guidanceJustificationId);
    const target = getFlagTarget(flag, justification);

    return (
      <>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">User reason</p>
            <p className="mt-2 text-sm leading-6 text-zinc-200">{flag.userReason}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">User context</p>
            <p className="mt-2 text-sm leading-6 text-zinc-200">{flag.userContext}</p>
          </div>
        </div>

        {justification ? (
          <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">Original guidance rationale</p>
            <p className="mt-2 text-sm leading-6 text-zinc-200">{justification.summary}</p>
            {target.citation ? (
              <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Disputed source</p>
                <p className="mt-2 text-sm font-medium text-zinc-100">{target.citation.label}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{target.citation.rationale}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  function renderPendingFlagCard(flag: GuidanceFeedbackFlag) {
    const justification = justificationsById.get(flag.guidanceJustificationId);
    const target = getFlagTarget(flag, justification);
    const currentReview = reviewState[flag.id] ?? { disposition: flag.leadershipDisposition ?? "", saving: false };

    return (
      <Card key={flag.id} className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-200">{target.eyebrow}</p>
              <CardTitle className="text-zinc-50">{target.title}</CardTitle>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{target.detail}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${getStatusClassName(flag.status)}`}>
              {flag.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          {renderChallengeEvidence(flag)}

          <div className="grid gap-2">
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Leadership disposition</span>
              <textarea
                value={currentReview.disposition}
                onChange={(event) =>
                  setReviewState((current) => ({
                    ...current,
                    [flag.id]: { disposition: event.target.value, saving: currentReview.saving }
                  }))
                }
                rows={4}
                placeholder="Approve or deny this flag with the cross-functional rationale that should govern this program."
                className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-amber-300/50"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void reviewFlag(flag, "approved")}
              disabled={currentReview.saving || flag.status === "approved"}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void reviewFlag(flag, "denied")}
              disabled={currentReview.saving || flag.status === "denied"}
            >
              <XCircle className="h-4 w-4" />
              Deny
            </Button>
            <span className="self-center text-xs text-zinc-500">
              Flagged {formatDate(flag.createdAt)}
              {flag.reviewedBy ? ` / reviewed by ${flag.reviewedBy}` : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderAuditFlagCard(flag: GuidanceFeedbackFlag) {
    const justification = justificationsById.get(flag.guidanceJustificationId);
    const target = getFlagTarget(flag, justification);

    return (
      <Card key={flag.id} className="bg-zinc-950/70">
        <CardHeader className="border-b border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Governance decision audit</p>
              <CardTitle className="text-zinc-50">{target.title}</CardTitle>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{target.detail}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${getStatusClassName(flag.status)}`}>
              {getDecisionLabel(flag.status)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Decision</p>
              <p className="mt-2 text-sm font-medium text-zinc-100">{getDecisionLabel(flag.status)}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Reviewed</p>
              <p className="mt-2 text-sm font-medium text-zinc-100">{formatDate(flag.updatedAt)}</p>
              {flag.reviewedBy ? <p className="mt-1 text-xs text-zinc-500">By {flag.reviewedBy}</p> : null}
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Program impact</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{getDecisionImpact(flag.status)}</p>
            </div>
          </div>

          <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Governance disposition</p>
            <p className="mt-2 text-sm leading-6 text-zinc-200">
              {flag.leadershipDisposition || "No governance disposition was captured for this decision."}
            </p>
          </div>

          {renderChallengeEvidence(flag)}
        </CardContent>
      </Card>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Governance"
        title="Model Governance"
        description="Optimize model spend, review disputed guidance one program at a time, and prevent false flags from steering future plans, role guidance, or program outputs."
      />

      <section className="mt-10 grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid gap-4 self-start lg:sticky lg:top-24">
          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-zinc-50">Program slicer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Active program</span>
                <span className="relative block">
                  <select
                    value={selectedProgramId}
                    onChange={(event) => setSelectedProgramId(event.target.value)}
                    className="h-12 w-full appearance-none rounded-md border border-white/10 bg-zinc-950 px-4 pr-11 text-base leading-none text-zinc-100 outline-none transition-colors focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
                  >
                    {programs.length ? null : <option value="">No programs available</option>}
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.intake.programName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                </span>
              </label>
              <div className="grid gap-3">
                {[
                  ["Pending flags", counts.pending],
                  ["Approved corrections", counts.approved],
                  ["Denied flags", counts.denied],
                  ["Team Action Plan disputes", counts.teamActionPlan]
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-100">{String(value).padStart(2, "0")}</p>
                  </div>
                ))}
              </div>
              {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
            </CardContent>
          </Card>

          <GuidanceModelProfileCard
            guidanceModelProfile={guidanceModelProfile}
            usageDescription="Used by governance to monitor model choice, reasoning level, cost basis, and cache posture while adjudicating which flags should influence future guidance."
          />

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-zinc-50">Alpha cost forecast</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Recorded spend</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-50">{formatCurrency(usageSummary.estimatedCostUsd)}</p>
                  <p className="mt-1 text-xs text-zinc-500">{usageRecords.length} OpenAI calls logged for this program</p>
                </div>
                <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">Projected 30-day</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-50">{formatCurrency(usageSummary.projectedThirtyDayCostUsd)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Based on current observed alpha pace</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Cache efficiency</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">{formatPercent(usageSummary.cacheHitRate)}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatTokenCount(usageSummary.cachedInputTokens)} of {formatTokenCount(usageSummary.inputTokens)} input tokens cached
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Estimated cache savings</p>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">{formatCurrency(usageSummary.estimatedCachedInputSavingsUsd)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Versus billing cached tokens at standard input rate</p>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Token volume</p>
                <div className="mt-3 grid gap-2 text-sm text-zinc-300">
                  <p>Input: {formatTokenCount(usageSummary.inputTokens)}</p>
                  <p>Output: {formatTokenCount(usageSummary.outputTokens)}</p>
                  <p>Total: {formatTokenCount(usageSummary.totalTokens)}</p>
                </div>
              </div>

              {usageSummary.workflowBreakdown.length ? (
                <div className="grid gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Workflow cost</p>
                  {usageSummary.workflowBreakdown.map(([workflow, summary]) => (
                    <div key={workflow} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 p-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{getWorkflowLabel(workflow)}</p>
                        <p className="text-xs text-zinc-500">
                          {summary.calls} calls / {formatTokenCount(summary.totalTokens)} tokens
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-zinc-100">{formatCurrency(summary.estimatedCostUsd)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-zinc-400">
                  No OpenAI usage has been recorded for this program yet. The forecast will populate after guided plans, Guide prompts, prompt briefings, or leadership feedback use the OpenAI provider.
                </p>
              )}

              {usageSummary.latestRecord ? (
                <p className="text-xs leading-5 text-zinc-500">
                  Latest OpenAI call: {getWorkflowLabel(usageSummary.latestRecord.workflow)} at {formatDate(usageSummary.latestRecord.createdAt)}.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>

        <section className="grid content-start gap-4 self-start">
          {flags.length ? (
            <div className="grid content-start gap-6">
              <section className="grid content-start gap-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">Review queue</p>
                    <h2 className="text-2xl font-semibold text-zinc-50">Pending adjudication</h2>
                  </div>
                  <span className="text-sm text-zinc-400">{flagGroups.pending.length} open</span>
                </div>
                {flagGroups.pending.length ? flagGroups.pending.map(renderPendingFlagCard) : (
                  <Card className="bg-zinc-950/80">
                    <CardContent className="p-6 text-sm leading-6 text-zinc-400">
                      No disputed guidance is currently waiting for this program.
                    </CardContent>
                  </Card>
                )}
              </section>

              {flagGroups.resolved.length ? (
                <section className="grid content-start gap-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Audit history</p>
                      <h2 className="text-2xl font-semibold text-zinc-50">Adjudicated guidance decisions</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                        Approved and denied flags are retained here as read-only program history after governance has made a decision.
                      </p>
                    </div>
                    <span className="text-sm text-zinc-400">{flagGroups.resolved.length} reviewed</span>
                  </div>
                  {flagGroups.resolved.map(renderAuditFlagCard)}
                </section>
              ) : null}
            </div>
          ) : (
            <Card className="bg-zinc-950/80">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 text-zinc-100">
                  <ShieldAlert className="h-5 w-5 text-emerald-200" />
                  <p className="text-lg font-medium">No flagged guidance is waiting for governance review.</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  When delivery leads dispute a rationale, source citation, or Team Action Plan on a guided plan, it will appear here for program-scoped review.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </section>
    </main>
  );
}
