"use client";

import { ClipboardPen, MessageSquareQuote, RefreshCw } from "lucide-react";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import type { ReviewCycleStatus } from "@/lib/leadership-review-queue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LeadershipField = {
  id: keyof LeadershipReviewInput;
  label: string;
  placeholder: string;
  rows: number;
};

type LeadershipReviewWorkbenchProps = {
  review: LeadershipReviewInput;
  leadershipFields: LeadershipField[];
  reviewCycleStatus: ReviewCycleStatus;
  latestReviewCycle: LeadershipReviewRecord | undefined;
  clarifyItems: string[];
  feedback: LeadershipReviewRecord[];
  saveState: "idle" | "saving" | "saved" | "error";
  selectedProgramId: string;
  formatTimestamp: (value: string) => string;
  onUpdateField: (field: keyof LeadershipReviewInput, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onLoadReview: (review: LeadershipReviewInput) => void;
  summarizeFeedback: (entry: LeadershipReviewRecord) => string;
  summarizeFeedbackDetail: (entry: LeadershipReviewRecord) => string;
};

export function LeadershipReviewWorkbench({
  review,
  leadershipFields,
  reviewCycleStatus,
  latestReviewCycle,
  clarifyItems,
  feedback,
  saveState,
  selectedProgramId,
  formatTimestamp,
  onUpdateField,
  onSubmit,
  onLoadReview,
  summarizeFeedback,
  summarizeFeedbackDetail
}: LeadershipReviewWorkbenchProps) {
  const focusedFields = leadershipFields.filter((field) =>
    ["leadershipGuidance", "activeRisks", "supportRequests", "feedbackToDeliveryLead"].includes(field.id)
  );

  return (
    <>
      <Card className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <ClipboardPen className="h-4 w-4 text-emerald-200" />
            Fresh leadership guidance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form id="leadership-review-form" onSubmit={onSubmit} className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">{reviewCycleStatus.ctaLabel}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {latestReviewCycle
                    ? `Last saved ${formatTimestamp(latestReviewCycle.createdAt)}. Save a new review to refresh guidance.`
                    : "Save the first leadership review to refresh guidance."}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                {reviewCycleStatus.cadence === "weekly" ? "Weekly" : "Bi-weekly"}
              </span>
            </div>

            {clarifyItems.length ? (
              <div className="grid gap-2 rounded-md border border-amber-300/15 bg-amber-300/[0.055] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">Likely decision pressure</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {clarifyItems.slice(0, 2).map((item) => (
                    <p key={item} className="text-sm leading-6 text-zinc-300">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {focusedFields.map((field) => (
                <label key={field.id} className={field.id === "feedbackToDeliveryLead" ? "grid gap-2 md:col-span-2" : "grid gap-2"}>
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">{field.label}</span>
                  <textarea
                    value={review[field.id]}
                    onChange={(event) => onUpdateField(field.id, event.target.value)}
                    rows={field.rows}
                    placeholder={field.placeholder}
                    className="min-h-32 resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-300/50"
                  />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" disabled={!selectedProgramId || saveState === "saving"}>
                <MessageSquareQuote className="h-4 w-4" />
                {saveState === "saving" ? "Saving..." : "Save leadership review"}
              </Button>
              <p className="text-sm leading-6 text-zinc-400">
                {saveState === "saved"
                  ? "Saved. Guidance refreshed from this leadership signal."
                  : saveState === "error"
                    ? "Save failed. Try again."
                    : "Saving translates this input into the next guided plan."}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <details className="group rounded-md border border-white/10 bg-zinc-950/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-zinc-100">
          <span className="flex items-center gap-2 font-medium">
            <RefreshCw className="h-4 w-4 text-amber-200" />
            Past leadership reviews
          </span>
          <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">{feedback.length} saved</span>
        </summary>
        <div className="grid gap-3 border-t border-white/10 p-5">
          {feedback.length ? (
            feedback.slice(0, 3).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onLoadReview(entry.feedback)}
                className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:border-amber-300/30"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">
                    {formatTimestamp(entry.createdAt)}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">load</span>
                </div>
                <p className="text-sm font-medium text-zinc-100">{summarizeFeedback(entry)}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{summarizeFeedbackDetail(entry)}</p>
              </button>
            ))
          ) : (
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-zinc-400">
              No leadership reviews saved yet.
            </div>
          )}
        </div>
      </details>
    </>
  );
}
