"use client";

import { ClipboardPen, MessageSquareQuote, RefreshCw, ShieldAlert } from "lucide-react";
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
  implicationItems: string[];
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
  implicationItems,
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
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
                    {reviewCycleStatus.ctaLabel}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {latestReviewCycle
                      ? `The current leadership record on file was submitted ${formatTimestamp(latestReviewCycle.createdAt)}. Save this form to create the next cadence update and refresh the guided plan.`
                      : "No review has been captured yet. Save this form to establish the first leadership review cycle and refresh the guided plan."}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                  {reviewCycleStatus.cadence === "weekly" ? "7-day loop" : "14-day loop"}
                </span>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-4">
                {leadershipFields.slice(0, 4).map((field) => (
                  <label key={field.id} className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">{field.label}</span>
                    <textarea
                      value={review[field.id]}
                      onChange={(event) => onUpdateField(field.id, event.target.value)}
                      rows={field.rows}
                      placeholder={field.placeholder}
                      className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-300/50"
                    />
                  </label>
                ))}
              </div>

              <div className="grid gap-4">
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">What leaders should clarify</p>
                  <div className="mt-3 grid gap-2">
                    {clarifyItems.map((item) => (
                      <p key={item} className="text-sm leading-6 text-zinc-300">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>

                {leadershipFields.slice(4).map((field) => (
                  <label key={field.id} className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">{field.label}</span>
                    <textarea
                      value={review[field.id]}
                      onChange={(event) => onUpdateField(field.id, event.target.value)}
                      rows={field.rows}
                      placeholder={field.placeholder}
                      className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-300/50"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg" disabled={!selectedProgramId || saveState === "saving"}>
                <MessageSquareQuote className="h-4 w-4" />
                {saveState === "saving" ? "Saving..." : "Save leadership review"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-zinc-950/80">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <ShieldAlert className="h-4 w-4 text-cyan-200" />
              Delivery-facing implication
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {implicationItems.map((item) => (
              <p key={item} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-6 text-zinc-300">
                {item}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/80">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <RefreshCw className="h-4 w-4 text-amber-200" />
              Review cycle history
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {feedback.length ? (
              feedback.slice(0, 5).map((entry) => (
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
                    <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                      review cycle
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-100">{summarizeFeedback(entry)}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{summarizeFeedbackDetail(entry)}</p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    Click to load this review cycle into the guidance form
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-zinc-400">
                No leadership reviews saved yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
