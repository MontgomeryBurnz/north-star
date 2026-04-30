"use client";

import { Flag } from "lucide-react";
import type { GuidanceFeedbackFlagTargetType, GuidanceJustificationRecord } from "@/lib/program-intelligence-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GuidanceFlagForm } from "@/components/guidance-flag-form";

type FlagTarget = {
  justificationId: string;
  citationId?: string;
  targetType?: GuidanceFeedbackFlagTargetType;
  targetLabel?: string;
  targetRole?: string;
  scope: "partial" | "whole";
};

type GuidedPlanJustificationCardProps = {
  justification: GuidanceJustificationRecord;
  pendingFlagCount: number;
  flagTarget: FlagTarget | null;
  flagReason: string;
  flagContext: string;
  isSubmittingFlag: boolean;
  onOpenCitationFlag: (citationId: string, citationLabel: string) => void;
  onOpenWholeFlag: () => void;
  onFlagReasonChange: (value: string) => void;
  onFlagContextChange: (value: string) => void;
  onSubmitFlag: () => void | Promise<void>;
  onCancelFlag: () => void;
};

const triggerLabels: Record<GuidanceJustificationRecord["triggeredBy"][number], string> = {
  artifact: "Upload",
  "active-update": "Active update",
  "leadership-feedback": "Leadership",
  "assistant-dialogue": "Guide dialogue",
  "meeting-input": "Meeting input"
};

function shortenInsight(value: string, maxLength = 180) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return { preview: normalized, isShortened: false };
  }

  const sentenceBreak = normalized.slice(0, maxLength).lastIndexOf(". ");
  const breakPoint = sentenceBreak > 80 ? sentenceBreak + 1 : normalized.lastIndexOf(" ", maxLength);

  return {
    preview: `${normalized.slice(0, breakPoint > 80 ? breakPoint : maxLength).trim()}...`,
    isShortened: true
  };
}

export function GuidedPlanJustificationCard({
  justification,
  pendingFlagCount,
  flagTarget,
  flagReason,
  flagContext,
  isSubmittingFlag,
  onOpenCitationFlag,
  onOpenWholeFlag,
  onFlagReasonChange,
  onFlagContextChange,
  onSubmitFlag,
  onCancelFlag
}: GuidedPlanJustificationCardProps) {
  return (
    <Card className="bg-zinc-950/80 lg:col-span-2">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <CardTitle className="text-zinc-50">Why This Changed</CardTitle>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{justification.summary}</p>
          </div>
          <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-zinc-400">
            {pendingFlagCount ? `${pendingFlagCount} pending flag${pendingFlagCount === 1 ? "" : "s"}` : "No pending flags"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Refresh drivers</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {justification.triggeredBy.map((trigger) => (
                <span
                  key={trigger}
                  className="rounded-full border border-emerald-200/20 bg-black/20 px-3 py-1 text-xs text-emerald-100"
                >
                  {triggerLabels[trigger]}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">Evidence loaded</p>
            <p className="mt-3 text-3xl font-semibold text-zinc-50">{justification.citations.length}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Source signals used to support the latest plan refresh.
            </p>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {justification.citations.map((citation) => {
            const isFlagTarget =
              flagTarget?.justificationId === justification.id && flagTarget.citationId === citation.sourceId;
            const { preview, isShortened } = shortenInsight(citation.rationale);

            return (
              <div
                key={`${citation.sourceId}-${citation.label}`}
                className="flex min-h-full flex-col gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">{citation.label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{preview}</p>
                  {isShortened ? (
                    <details className="mt-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-zinc-400">
                      <summary className="cursor-pointer text-zinc-200">View full source detail</summary>
                      <p className="mt-2">{citation.rationale}</p>
                    </details>
                  ) : null}
                </div>
                <div className="mt-auto flex justify-end border-t border-white/10 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-zinc-300 hover:text-zinc-50"
                    onClick={() => onOpenCitationFlag(citation.sourceId, citation.label)}
                  >
                    <Flag className="h-4 w-4" />
                    Flag citation
                  </Button>
                </div>
                {isFlagTarget ? (
                  <GuidanceFlagForm
                    reason={flagReason}
                    context={flagContext}
                    isSubmitting={isSubmittingFlag}
                    reasonPlaceholder="Why is this citation inaccurate or incomplete?"
                    contextPlaceholder="Add the operator context governance should use to review this challenge."
                    onReasonChange={onFlagReasonChange}
                    onContextChange={onFlagContextChange}
                    onSubmit={onSubmitFlag}
                    onCancel={onCancelFlag}
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-100">Dispute the whole rationale</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Use this when the full explanation is misframed, not just one source citation.
            </p>
          </div>
          <div className="flex justify-end border-t border-white/10 pt-3">
            <Button type="button" variant="outline" onClick={onOpenWholeFlag}>
              <Flag className="h-4 w-4" />
              Flag rationale
            </Button>
          </div>
          {flagTarget?.justificationId === justification.id && flagTarget.scope === "whole" && !flagTarget.citationId ? (
            <GuidanceFlagForm
              reason={flagReason}
              context={flagContext}
              isSubmitting={isSubmittingFlag}
              reasonPlaceholder="Why is the overall rationale inaccurate?"
              contextPlaceholder="Add the broader program context or correction that should govern this plan."
              onReasonChange={onFlagReasonChange}
              onContextChange={onFlagContextChange}
              onSubmit={onSubmitFlag}
              onCancel={onCancelFlag}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
