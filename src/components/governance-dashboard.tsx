"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import type { GuidanceFeedbackFlag, GuidanceJustificationRecord } from "@/lib/program-intelligence-types";
import type { StoredProgram } from "@/lib/program-intake-types";
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

export function GovernanceDashboard() {
  const [programs, setPrograms] = useState<StoredProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [flags, setFlags] = useState<GuidanceFeedbackFlag[]>([]);
  const [justifications, setJustifications] = useState<GuidanceJustificationRecord[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<Record<string, { disposition: string; saving: boolean }>>({});

  const loadPrograms = useCallback(async () => {
    const response = await fetch("/api/programs", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load programs.");
    }

    const payload = (await response.json()) as { programs: StoredProgram[] };
    setPrograms(payload.programs);
    setSelectedProgramId((current) => {
      if (current && payload.programs.some((program) => program.id === current)) return current;
      return payload.programs[0]?.id ?? "";
    });
  }, []);

  const loadGovernance = useCallback(async () => {
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

    setFlags(flagsPayload.flags);
    setJustifications(justificationsPayload.justifications);
  }, [selectedProgramId]);

  useEffect(() => {
    void loadPrograms().catch(() => setStatus("Could not load programs for governance review."));
  }, [loadPrograms]);

  useEffect(() => {
    void loadGovernance().catch(() => setStatus("Could not load governance records."));
  }, [loadGovernance]);

  const justificationsById = useMemo(
    () => new Map(justifications.map((record) => [record.id, record])),
    [justifications]
  );

  const counts = useMemo(
    () => ({
      pending: flags.filter((flag) => flag.status === "pending").length,
      approved: flags.filter((flag) => flag.status === "approved").length,
      denied: flags.filter((flag) => flag.status === "denied").length
    }),
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
                  ["Denied flags", counts.denied]
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
            flags.map((flag) => {
              const justification = justificationsById.get(flag.guidanceJustificationId);
              const citation = justification?.citations.find((item) => item.sourceId === flag.citationId);
              const currentReview = reviewState[flag.id] ?? { disposition: flag.leadershipDisposition ?? "", saving: false };

              return (
                <Card key={flag.id} className="bg-zinc-950/80">
                  <CardHeader className="border-b border-white/10">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-200">
                          {flag.scope === "whole" ? "Whole rationale flagged" : "Citation flagged"}
                        </p>
                        <CardTitle className="text-zinc-50">
                          {citation?.label ?? justification?.summary ?? "Guidance rationale review"}
                        </CardTitle>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                          flag.status === "approved"
                            ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                            : flag.status === "denied"
                              ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
                              : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                        }`}
                      >
                        {flag.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 p-5">
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
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">Guidance justification</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-200">{justification.summary}</p>
                        <div className="mt-3 grid gap-2">
                          {justification.citations.map((item) => (
                            <div key={`${item.sourceId}-${item.label}`} className="rounded-md border border-white/10 bg-black/20 p-3">
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
                              <p className="mt-2 text-sm leading-6 text-zinc-300">{item.rationale}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

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
            })
          ) : (
            <Card className="bg-zinc-950/80">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 text-zinc-100">
                  <ShieldAlert className="h-5 w-5 text-emerald-200" />
                  <p className="text-lg font-medium">No flagged guidance is waiting for governance review.</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  When delivery leads dispute a justification or citation on a guided plan, it will appear here for program-scoped review.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </section>
    </main>
  );
}
