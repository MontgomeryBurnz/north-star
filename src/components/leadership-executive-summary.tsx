"use client";

import { Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReadoutItem = {
  label: string;
  value: string;
};

type LeadershipExecutiveSummaryProps = {
  executiveSummary: string;
  leaderReadout: ReadoutItem[];
  quickContextSignals: ReadoutItem[];
};

export function LeadershipExecutiveSummary({
  executiveSummary,
  leaderReadout,
  quickContextSignals
}: LeadershipExecutiveSummaryProps) {
  const readoutItems = [...leaderReadout, ...quickContextSignals].slice(0, 4);

  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <Flag className="h-4 w-4 text-emerald-200" />
          Program readout
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 p-5">
        <div className="grid gap-3 rounded-md border border-emerald-300/15 bg-emerald-300/[0.07] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Executive context</p>
          <p className="text-base leading-7 text-zinc-100">{executiveSummary}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {readoutItems.map((item) => (
            <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
