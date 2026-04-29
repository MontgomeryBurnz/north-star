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
          <div>
            <CardTitle className="text-zinc-50">Why This Changed</CardTitle>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{justification.summary}</p>
          </div>
          <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-zinc-400">
            {pendingFlagCount ? `${pendingFlagCount} pending flag${pendingFlagCount === 1 ? "" : "s"}` : "No pending flags"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-5">
        <div className="grid gap-3">
          {justification.citations.map((citation) => {
            const isFlagTarget =
              flagTarget?.justificationId === justification.id && flagTarget.citationId === citation.sourceId;

            return (
              <div key={`${citation.sourceId}-${citation.label}`} className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">{citation.label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{citation.rationale}</p>
                </div>
                <div className="flex justify-end border-t border-white/10 pt-3">
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
