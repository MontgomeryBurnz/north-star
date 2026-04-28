"use client";

import { Flag } from "lucide-react";
import type { GuidanceJustificationRecord } from "@/lib/program-intelligence-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FlagTarget = {
  justificationId: string;
  citationId?: string;
  scope: "partial" | "whole";
};

type GuidedPlanJustificationCardProps = {
  justification: GuidanceJustificationRecord;
  pendingFlagCount: number;
  flagTarget: FlagTarget | null;
  flagReason: string;
  flagContext: string;
  isSubmittingFlag: boolean;
  onOpenCitationFlag: (citationId: string) => void;
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
              <div key={`${citation.sourceId}-${citation.label}`} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">{citation.label}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{citation.rationale}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-zinc-300 hover:text-zinc-50"
                    onClick={() => onOpenCitationFlag(citation.sourceId)}
                  >
                    <Flag className="h-4 w-4" />
                    Flag
                  </Button>
                </div>
                {isFlagTarget ? (
                  <div className="mt-4 grid gap-3 rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3">
                    <input
                      value={flagReason}
                      onChange={(event) => onFlagReasonChange(event.target.value)}
                      placeholder="Why is this citation inaccurate or incomplete?"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-amber-300/50"
                    />
                    <textarea
                      value={flagContext}
                      onChange={(event) => onFlagContextChange(event.target.value)}
                      rows={4}
                      placeholder="Add the operator context leadership should use to review this challenge."
                      className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-amber-300/50"
                    />
                    <div className="flex gap-3">
                      <Button type="button" onClick={() => void onSubmitFlag()} disabled={isSubmittingFlag}>
                        {isSubmittingFlag ? "Submitting..." : "Submit flag"}
                      </Button>
                      <Button type="button" variant="outline" onClick={onCancelFlag}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="rounded-md border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">Dispute the whole rationale</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Use this when the full explanation is misframed, not just one citation.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={onOpenWholeFlag}>
              <Flag className="h-4 w-4" />
              Flag rationale
            </Button>
          </div>
          {flagTarget?.justificationId === justification.id && flagTarget.scope === "whole" && !flagTarget.citationId ? (
            <div className="mt-4 grid gap-3">
              <input
                value={flagReason}
                onChange={(event) => onFlagReasonChange(event.target.value)}
                placeholder="Why is the overall rationale inaccurate?"
                className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-amber-300/50"
              />
              <textarea
                value={flagContext}
                onChange={(event) => onFlagContextChange(event.target.value)}
                rows={4}
                placeholder="Add the broader program context or correction that should govern this plan."
                className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-amber-300/50"
              />
              <div className="flex gap-3">
                <Button type="button" onClick={() => void onSubmitFlag()} disabled={isSubmittingFlag}>
                  {isSubmittingFlag ? "Submitting..." : "Submit flag"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancelFlag}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
