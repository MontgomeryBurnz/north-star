"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Milestone, RefreshCw } from "lucide-react";
import type { ReviewCadence, ReviewCycleStatus, ReviewQueueItem } from "@/lib/leadership-review-queue";
import type { StoredProgram } from "@/lib/program-intake-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type LeadershipLaneOption = {
  label: string;
  value: string;
  detail: string;
};

type LeadershipReviewSidebarProps = {
  programs: StoredProgram[];
  selectedProgramId: string;
  selectedProgram: StoredProgram | null;
  selectedCadence: ReviewCadence;
  selectedLane: string;
  laneOptions: LeadershipLaneOption[];
  reviewCycleStatus: ReviewCycleStatus;
  queueMode: boolean;
  displayedReviewQueue: ReviewQueueItem[];
  status: string | null;
  onProgramChange: (programId: string) => void;
  onCadenceChange: (cadence: ReviewCadence) => void;
  onLaneChange: (lane: string) => void;
  onClearQueueFilter: () => void;
  onFocusReviewCycle: (programId: string) => void;
  formatTimestamp: (value: string) => string;
};

type LeadershipProgramPickerProps = {
  programs: StoredProgram[];
  selectedProgramId: string;
  onProgramChange: (programId: string) => void;
};

function LeadershipProgramPicker({ programs, selectedProgramId, onProgramChange }: LeadershipProgramPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId]
  );

  useEffect(() => {
    setOpen(false);
  }, [selectedProgramId]);

  return (
    <div
      className="relative grid gap-2"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Saved program</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={!programs.length}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-zinc-950 px-4 py-3 text-left text-sm leading-6 text-zinc-100 outline-none transition-colors hover:border-emerald-300/30 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15 disabled:cursor-not-allowed disabled:text-zinc-500"
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedProgram?.intake.programName ?? (programs.length ? "Select a program..." : "No saved programs yet")}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Saved program"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-md border border-white/10 bg-zinc-950 p-2 shadow-2xl shadow-black/40"
        >
          {programs.map((program) => {
            const selected = program.id === selectedProgramId;
            const owner = program.intake.programOwner?.trim() || "Owner not set";

            return (
              <button
                key={program.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onProgramChange(program.id)}
                className={`w-full rounded-md px-3 py-3 text-left transition-colors ${
                  selected ? "border border-emerald-300/25 bg-emerald-300/10" : "border border-transparent hover:bg-white/[0.055]"
                }`}
              >
                <span className="block truncate text-sm font-medium leading-6 text-zinc-100">{program.intake.programName}</span>
                <span className="mt-1 block truncate text-xs leading-5 text-zinc-500">Lead: {owner}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function LeadershipReviewSidebar({
  programs,
  selectedProgramId,
  selectedProgram,
  selectedCadence,
  selectedLane,
  laneOptions,
  reviewCycleStatus,
  queueMode,
  displayedReviewQueue,
  status,
  onProgramChange,
  onCadenceChange,
  onLaneChange,
  onClearQueueFilter,
  onFocusReviewCycle,
  formatTimestamp
}: LeadershipReviewSidebarProps) {
  return (
    <aside className="grid gap-4 self-start lg:sticky lg:top-24">
      <Card className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <Milestone className="h-4 w-4 text-emerald-200" />
            Program selection
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          <LeadershipProgramPicker programs={programs} selectedProgramId={selectedProgramId} onProgramChange={onProgramChange} />

          {selectedProgram ? (
            <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-sm font-medium text-zinc-100">{selectedProgram.intake.programName}</p>
              <p className="line-clamp-2 text-xs leading-5 text-zinc-400">{selectedProgram.intake.vision || "No north star captured yet."}</p>
              <p className="text-xs text-zinc-500">Updated {formatTimestamp(selectedProgram.updatedAt)}</p>
            </div>
          ) : null}

          {selectedProgram ? (
            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Sponsor lane</span>
                <select
                  value={selectedLane}
                  onChange={(event) => onLaneChange(event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                >
                  {laneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs leading-5 text-zinc-500">
                  {laneOptions.find((option) => option.value === selectedLane)?.detail ?? "View the full leadership signal."}
                </span>
              </label>

              <div
                className={`rounded-md border p-3 ${
                  reviewCycleStatus.badgeTone === "overdue"
                    ? "border-rose-300/25 bg-rose-300/10"
                    : reviewCycleStatus.badgeTone === "due"
                      ? "border-amber-300/25 bg-amber-300/10"
                      : "border-emerald-300/20 bg-emerald-300/[0.07]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-200">Review status</p>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                      reviewCycleStatus.badgeTone === "overdue"
                        ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
                        : reviewCycleStatus.badgeTone === "due"
                          ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                          : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                    }`}
                  >
                    {reviewCycleStatus.badgeLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{reviewCycleStatus.helperText}</p>
                <div className="mt-3 grid gap-3 text-xs leading-5 text-zinc-500 sm:grid-cols-2 lg:grid-cols-1">
                  <p>Last: {reviewCycleStatus.lastReviewedLabel}</p>
                  <p>Next: {reviewCycleStatus.nextReviewLabel}</p>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Cadence</span>
                <select
                  value={selectedCadence}
                  onChange={(event) => onCadenceChange(event.target.value as ReviewCadence)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                </select>
              </label>
            </div>
          ) : null}

          {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
        </CardContent>
      </Card>

      {queueMode || displayedReviewQueue.length ? (
        <Card className="bg-zinc-950/80">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <RefreshCw className="h-4 w-4 text-fuchsia-200" />
                {queueMode ? "Filtered review due queue" : "Review due queue"}
              </CardTitle>
              {displayedReviewQueue.length ? (
                <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-300/[0.1] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-fuchsia-100">
                  {displayedReviewQueue.length}
                </span>
              ) : null}
              {queueMode ? (
                <Button type="button" variant="ghost" size="sm" className="text-zinc-300" onClick={onClearQueueFilter}>
                  Clear queue filter
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {queueMode ? (
              <div className="rounded-md border border-fuchsia-300/20 bg-fuchsia-300/[0.07] p-3 text-sm leading-6 text-zinc-300">
                The Console sent you here because one or more leadership reviews are due now.
              </div>
            ) : null}

            {displayedReviewQueue.length ? (
              displayedReviewQueue.map((entry) => (
                <div
                  key={entry.programId}
                  className={`rounded-md border p-3 transition-colors ${
                    entry.programId === selectedProgramId
                      ? "border-fuchsia-300/35 bg-fuchsia-300/[0.08]"
                      : "border-white/10 bg-white/[0.035] hover:border-fuchsia-300/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{entry.programName}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-400">Lead: {entry.leadLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-300">
                        {entry.cadence === "weekly" ? "Weekly" : "Bi-weekly"}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                          entry.status === "attention"
                            ? "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100"
                            : entry.status === "overdue"
                              ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
                              : "border-amber-300/30 bg-amber-300/10 text-amber-100"
                        }`}
                      >
                        {entry.status === "attention" ? "Attention" : entry.status === "overdue" ? "Overdue" : "Due"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">{entry.lastReviewedLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{entry.nextReviewLabel}</p>
                  {entry.attentionRoles.length ? (
                    <p className="mt-2 text-xs leading-5 text-fuchsia-100">
                      Leadership attention flagged by: {entry.attentionRoles.join(", ")}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant={entry.programId === selectedProgramId ? "default" : "secondary"} onClick={() => onProgramChange(entry.programId)}>
                      Open program
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="text-zinc-200" onClick={() => onFocusReviewCycle(entry.programId)}>
                      Start review cycle
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-zinc-400">
                No leadership reviews are due right now.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </aside>
  );
}
