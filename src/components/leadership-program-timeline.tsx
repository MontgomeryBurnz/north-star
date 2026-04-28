"use client";

import { FileClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GanttPhase = {
  id: string;
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
};

type TimelineItem = {
  id: string;
  label: string;
  detail: string;
  createdAt: string;
  tone: "program" | "update" | "plan" | "leadership";
};

type LeadershipProgramTimelineProps = {
  selectedProgram: boolean;
  currentPhaseLabel: string;
  ganttPhases: GanttPhase[];
  timeline: TimelineItem[];
  formatTimestamp: (value: string) => string;
};

export function LeadershipProgramTimeline({
  selectedProgram,
  currentPhaseLabel,
  ganttPhases,
  timeline,
  formatTimestamp
}: LeadershipProgramTimelineProps) {
  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <FileClock className="h-4 w-4 text-amber-200" />
          Program timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 p-5">
        {selectedProgram ? (
          <>
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">Gantt summary</p>
                  <p className="mt-2 text-sm text-zinc-300">
                    Current phase: <span className="font-medium text-zinc-100">{currentPhaseLabel}</span>
                  </p>
                </div>
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
            </div>

            <div className="grid gap-3">
              {timeline.map((item) => (
                <div key={item.id} className="grid gap-2 rounded-md border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                          item.tone === "program"
                            ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                            : item.tone === "update"
                              ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                              : item.tone === "plan"
                                ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                                : "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100"
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="text-xs text-zinc-500">{formatTimestamp(item.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-zinc-300">{item.detail}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-zinc-400">
            Select a saved program to view the timeline.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
