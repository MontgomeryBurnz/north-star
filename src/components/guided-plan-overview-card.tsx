"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GuidedPlan } from "@/lib/guided-plan-types";

type GuidedPlanOverviewCardProps = {
  plan: GuidedPlan;
  currentPhaseLabel: string;
  lastAssistantDialogueAt?: string;
  formatDate: (value: string) => string;
};

function shortenReadout(value: string, maxLength = 220) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) return normalized;

  const sentenceBreak = normalized.slice(0, maxLength).lastIndexOf(". ");
  const wordBreak = normalized.lastIndexOf(" ", maxLength);
  const breakPoint = sentenceBreak > 120 ? sentenceBreak + 1 : wordBreak > 120 ? wordBreak : maxLength;

  return `${normalized.slice(0, breakPoint).trim()}...`;
}

export function GuidedPlanOverviewCard({
  plan,
  currentPhaseLabel,
  lastAssistantDialogueAt,
  formatDate
}: GuidedPlanOverviewCardProps) {
  return (
    <Card className="bg-zinc-950/85">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Top line</p>
            <CardTitle className="text-2xl text-zinc-50">Program Health & Progress</CardTitle>
            <p className="mt-2 text-sm text-zinc-400">{plan.programName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] px-3 py-1 text-xs text-cyan-100">
              {currentPhaseLabel}
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-zinc-400">
              Refreshed {formatDate(plan.createdAt)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">North star</p>
          <p className="mt-2 text-sm leading-6 text-zinc-200">{plan.northStar}</p>
        </div>
        <details className="group rounded-md border border-white/10 bg-white/[0.025] p-4">
          <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Executive readout</span>
              <span className="mt-2 block text-sm leading-6 text-zinc-300">{shortenReadout(plan.summary)}</span>
            </span>
            <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-zinc-500 group-open:hidden">
              Details
            </span>
          </summary>
          <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-zinc-300">{plan.summary}</p>
        </details>
        {lastAssistantDialogueAt ? (
          <p className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.04] px-3 py-2 text-xs leading-5 text-cyan-100">
            Last updated from Guide dialogue {formatDate(lastAssistantDialogueAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
