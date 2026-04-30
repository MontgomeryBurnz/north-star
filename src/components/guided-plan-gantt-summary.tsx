"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GanttPhase = {
  id: string;
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
};

type GuidedPlanGanttSummaryProps = {
  currentPhaseLabel: string;
  ganttPhases: GanttPhase[];
};

export function GuidedPlanGanttSummary({
  currentPhaseLabel,
  ganttPhases
}: GuidedPlanGanttSummaryProps) {
  return (
    <Card className="bg-zinc-950/80 lg:col-span-2">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-zinc-50">Timeline & Milestones</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-300">
            Current phase: <span className="font-medium text-zinc-100">{currentPhaseLabel}</span>
          </p>
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
            Today
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {ganttPhases.map((phase) => (
            <div key={phase.id} className="grid gap-2">
              <div
                className={`min-h-24 rounded-md border p-3 ${
                  phase.status === "completed"
                    ? "border-emerald-300/25 bg-emerald-300/10"
                    : phase.status === "current"
                      ? "border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.15)]"
                      : "border-white/10 bg-black/20"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p
                    className={`text-xs font-medium uppercase tracking-[0.14em] ${
                      phase.status === "completed"
                        ? "text-emerald-100"
                        : phase.status === "current"
                          ? "text-cyan-100"
                          : "text-zinc-500"
                    }`}
                  >
                    {phase.label}
                  </p>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      phase.status === "completed"
                        ? "bg-emerald-300"
                        : phase.status === "current"
                          ? "bg-cyan-300"
                          : "bg-zinc-700"
                    }`}
                  />
                </div>
                <p className="text-xs leading-5 text-zinc-300">{phase.description}</p>
              </div>
              <div className="h-1 rounded-full bg-zinc-900">
                <div
                  className={`h-full rounded-full ${
                    phase.status === "completed"
                      ? "w-full bg-emerald-300"
                      : phase.status === "current"
                        ? "w-2/3 bg-cyan-300"
                        : "w-1/5 bg-zinc-700"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
