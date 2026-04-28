"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { GuidedPlan } from "@/lib/guided-plan-types";

type GuidedPlanOverviewCardProps = {
  plan: GuidedPlan;
  leadershipSignal: DeliveryLeadershipSignal | null;
  lastAssistantDialogueAt?: string;
  formatDate: (value: string) => string;
};

export function GuidedPlanOverviewCard({
  plan,
  leadershipSignal,
  lastAssistantDialogueAt,
  formatDate
}: GuidedPlanOverviewCardProps) {
  return (
    <Card className="bg-zinc-950/85">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Current guided plan</p>
            <CardTitle className="text-2xl text-zinc-50">{plan.programName}</CardTitle>
            {lastAssistantDialogueAt ? (
              <p className="mt-2 text-xs leading-5 text-cyan-200">Last updated from guide dialogue {formatDate(lastAssistantDialogueAt)}</p>
            ) : null}
          </div>
          <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-zinc-400">
            {formatDate(plan.createdAt)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-5">
        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">North star</p>
          <p className="mt-2 text-sm leading-6 text-zinc-200">{plan.northStar}</p>
        </div>
        <p className="text-sm leading-6 text-zinc-400">{plan.summary}</p>
        {leadershipSignal && leadershipSignal.status !== "none" ? (
          <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-100">Leadership signal</p>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                  leadershipSignal.status === "new"
                    ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                    : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                }`}
              >
                {leadershipSignal.status === "new" ? "New signal available" : "Incorporated into plan"}
              </span>
            </div>
            <p className="text-sm leading-6 text-zinc-200">{leadershipSignal.summary}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
