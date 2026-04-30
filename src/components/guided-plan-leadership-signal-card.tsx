"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";

export function GuidedPlanLeadershipSignalCard({
  leadershipSignal
}: {
  leadershipSignal: DeliveryLeadershipSignal | null;
}) {
  const hasSignal = Boolean(leadershipSignal && leadershipSignal.status !== "none");

  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-200">Leadership Inputs</p>
            <CardTitle className="text-zinc-50">Signals</CardTitle>
          </div>
          {hasSignal ? (
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                leadershipSignal?.status === "new"
                  ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                  : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              }`}
            >
              {leadershipSignal?.status === "new" ? "New signal" : "Incorporated"}
            </span>
          ) : (
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              No signal
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {leadershipSignal && leadershipSignal.status !== "none" ? (
          <p className="text-sm leading-6 text-zinc-200">{leadershipSignal.summary}</p>
        ) : (
          <p className="text-sm leading-6 text-zinc-400">
            No leadership input has been captured for this program yet. When leaders submit feedback, it will refresh guidance and appear here first.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
