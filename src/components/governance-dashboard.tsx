"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { useForegroundRefresh } from "@/hooks/use-foreground-refresh";
import { useProgramCatalog } from "@/hooks/use-program-catalog";
import { useRequestSequence } from "@/hooks/use-request-sequence";
import { isTeamActionPlanFlagSourceId, roleFromTeamActionPlanFlagSourceId } from "@/lib/guidance-feedback-flag-sources";
import type { GuidanceFeedbackFlag, GuidanceJustificationRecord } from "@/lib/program-intelligence-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
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

export function GovernanceDashboard() {
  const governanceRequest = useRequestSequence();
  const [flags, setFlags] = useState<GuidanceFeedbackFlag[]>([]);
  const [justifications, setJustifications] = useState<GuidanceJustificationRecord[]>([]);
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
      return;
    }

    const [flagsResponse, justificationsResponse] = await Promise.all([
      fetch(`/api/programs/${selectedProgramId}/guidance-feedback-flags`, { cache: "no-store" }),
      fetch(`/api/programs/${selectedProgramId}/guidance-justifications`, { cache: "no-store" })
    ]);

    if (!flagsResponse.ok || !justificationsResponse.ok) {
      throw new Error("Could not load governance records.");
    }

    const flagsPayload = (await flagsResponse.json()) as { flags: GuidanceFeedbackFlag[] };
    const justificationsPayload = (await justificationsResponse.json()) as { justifications: GuidanceJustificationRecord[] };
    if (!governanceRequest.isLatestRequest(requestId)) return;

    setFlags(flagsPayload.flags);
    setJustifications(justificationsPayload.justifications);
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
              {flag.reviewedBy ? ` • reviewed by ${flag.reviewedBy}` : ""}
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
        title="Governed Program Memory"
        description="Review disputed guidance rationales one program at a time. Approved flags become trusted, program-scoped correction input instead of allowing feedback to bleed across unrelated work."
      />

      <section className="mt-10 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="grid gap-4 self-start lg:sticky lg:top-24">
          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-zinc-50">Program slicer</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Active program</span>
                <select
                  value={selectedProgramId}
                  onChange={(event) => setSelectedProgramId(event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                >
                  {programs.length ? null : <option value="">No programs available</option>}
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.intake.programName}
                    </option>
                  ))}
                </select>
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
        </aside>

        <section className="grid gap-4">
          {flags.length ? (
            <div className="grid gap-6">
              <section className="grid gap-3">
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
                <section className="grid gap-3">
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
