"use client";

import { BrainCircuit, CircleDollarSign, FileClock, MessageSquareQuote, Milestone, RefreshCw } from "lucide-react";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import type { GuidanceModelProfile } from "@/lib/guidance-model-profile";
import type { ReviewCadence, ReviewCycleStatus, ReviewQueueItem } from "@/lib/leadership-review-queue";
import type { StoredProgram } from "@/lib/program-intake-types";
import { firstSignal } from "@/lib/text-signals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LeadershipReviewSidebarProps = {
  programs: StoredProgram[];
  selectedProgramId: string;
  selectedProgram: StoredProgram | null;
  selectedCadence: ReviewCadence;
  reviewCycleStatus: ReviewCycleStatus;
  queueMode: boolean;
  displayedReviewQueue: ReviewQueueItem[];
  recentLeadershipSignals: LeadershipReviewRecord[];
  status: string | null;
  guidanceModelProfile: GuidanceModelProfile;
  onProgramChange: (programId: string) => void;
  onCadenceChange: (cadence: ReviewCadence) => void;
  onClearQueueFilter: () => void;
  onFocusReviewCycle: (programId: string) => void;
  onLoadReview: (review: LeadershipReviewInput) => void;
  formatTimestamp: (value: string) => string;
};

export function LeadershipReviewSidebar({
  programs,
  selectedProgramId,
  selectedProgram,
  selectedCadence,
  reviewCycleStatus,
  queueMode,
  displayedReviewQueue,
  recentLeadershipSignals,
  status,
  guidanceModelProfile,
  onProgramChange,
  onCadenceChange,
  onClearQueueFilter,
  onFocusReviewCycle,
  onLoadReview,
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
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Saved program</span>
            <select
              value={selectedProgramId}
              onChange={(event) => onProgramChange(event.target.value)}
              className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
            >
              {programs.length ? null : <option value="">No saved programs yet</option>}
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.intake.programName}
                </option>
              ))}
            </select>
          </label>

          {selectedProgram ? (
            <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-sm font-medium text-zinc-100">{selectedProgram.intake.programName}</p>
              <p className="text-xs leading-5 text-zinc-400">{selectedProgram.intake.vision || "No north star captured yet."}</p>
              <p className="text-xs text-zinc-500">Updated {formatTimestamp(selectedProgram.updatedAt)}</p>
            </div>
          ) : null}

          {selectedProgram ? (
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Review cadence</span>
              <select
                value={selectedCadence}
                onChange={(event) => onCadenceChange(event.target.value as ReviewCadence)}
                className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
              </select>
            </label>
          ) : null}

          {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
        </CardContent>
      </Card>

      <Card className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <BrainCircuit className="h-4 w-4 text-cyan-200" />
            Guidance model
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-5">
          <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-100">{guidanceModelProfile.model}</p>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
                {guidanceModelProfile.provider}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              Used for guided plans and leadership-signal interpretation when the OpenAI provider is active.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Reasoning</p>
              <p className="mt-2 text-sm text-zinc-200">{guidanceModelProfile.reasoningEffort}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Verbosity</p>
              <p className="mt-2 text-sm text-zinc-200">{guidanceModelProfile.textVerbosity}</p>
            </div>
          </div>

          {guidanceModelProfile.pricing ? (
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                <CircleDollarSign className="h-3.5 w-3.5 text-emerald-200" />
                Standard API rate
              </p>
              <div className="mt-3 grid gap-2 text-sm text-zinc-300">
                <p>Input: {guidanceModelProfile.pricing.inputPerMillionTokens} / 1M tokens</p>
                <p>Cached input: {guidanceModelProfile.pricing.cachedInputPerMillionTokens} / 1M tokens</p>
                <p>Output: {guidanceModelProfile.pricing.outputPerMillionTokens} / 1M tokens</p>
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Actual cost depends on token volume from uploads, updates, leadership feedback, meeting context, and generated output.
              </p>
              <a
                href={guidanceModelProfile.pricing.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs font-medium text-cyan-200 hover:text-cyan-100"
              >
                {guidanceModelProfile.pricing.sourceLabel}, {guidanceModelProfile.pricing.asOf}
              </a>
            </div>
          ) : (
            <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3 text-sm leading-6 text-zinc-300">
              Pricing for this configured model is not listed in the app yet. Check OpenAI pricing before sharing a cost estimate.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <FileClock className="h-4 w-4 text-amber-200" />
            Review cadence
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          <div
            className={`rounded-md border p-4 ${
              reviewCycleStatus.badgeTone === "overdue"
                ? "border-rose-300/25 bg-rose-300/10"
                : reviewCycleStatus.badgeTone === "due"
                  ? "border-amber-300/25 bg-amber-300/10"
                  : "border-emerald-300/20 bg-emerald-300/[0.07]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-200">
                {reviewCycleStatus.cadence === "weekly" ? "Weekly review loop" : "Bi-weekly review loop"}
              </p>
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
            <p className="mt-3 text-sm leading-6 text-zinc-300">{reviewCycleStatus.helperText}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Last reviewed</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{reviewCycleStatus.lastReviewedLabel}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Next expected review</p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">{reviewCycleStatus.nextReviewLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <Card className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <MessageSquareQuote className="h-4 w-4 text-cyan-200" />
            Recent leadership signal
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-5">
          {recentLeadershipSignals.length ? (
            recentLeadershipSignals.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onLoadReview(entry.feedback)}
                className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:border-cyan-300/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">
                    {index === 0 ? "Most recent" : formatTimestamp(entry.createdAt)}
                  </span>
                  <span className="text-[11px] text-zinc-500">{index === 0 ? formatTimestamp(entry.createdAt) : "load"}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-100">
                  {firstSignal(entry.interpretation?.summary ?? entry.feedback.leadershipGuidance, "Leadership review")}
                </p>
                <p className="mt-1 line-clamp-3 text-xs leading-5 text-zinc-400">
                  {entry.interpretation?.deliveryLeadMessage ||
                    entry.feedback.feedbackToDeliveryLead ||
                    entry.feedback.supportRequests ||
                    "No detail captured."}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-zinc-400">
              No leadership guidance is saved yet.
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
