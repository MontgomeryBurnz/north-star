"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GuidedPlan } from "@/lib/guided-plan-types";

type GuidedPlanOverviewCardProps = {
  plan: GuidedPlan;
  currentPhaseLabel: string;
  lastAssistantDialogueAt?: string;
  formatDate: (value: string) => string;
};

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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">North star</p>
            <p className="mt-2 text-sm leading-6 text-zinc-200">{plan.northStar}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.025] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Executive readout</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{plan.summary}</p>
          </div>
        </div>
        {lastAssistantDialogueAt ? (
          <p className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.04] px-3 py-2 text-xs leading-5 text-cyan-100">
            Last updated from Guide dialogue {formatDate(lastAssistantDialogueAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
