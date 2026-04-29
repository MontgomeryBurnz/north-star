"use client";

import { FileClock, HeartPulse, History, Layers3, MessageSquareQuote, RefreshCw } from "lucide-react";
import type { ActiveProgramUpdate } from "@/lib/active-program-types";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { ProgramMeetingInput } from "@/lib/program-intelligence-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SummaryItem = {
  label: string;
  value: string;
};

type ActiveProgramSidebarProps = {
  latestUpdate?: ActiveProgramUpdate;
  leadershipSignal: DeliveryLeadershipSignal | null;
  programSynthesis: SummaryItem[];
  completion: number;
  updateImpact: SummaryItem[];
  selectedProgramHistory: ActiveProgramUpdate[];
  meetingInputs: ProgramMeetingInput[];
  formatTimestamp: (value: string) => string;
  onLoadUpdate: (update: ActiveProgramUpdate) => void;
};

export function ActiveProgramSidebar({
  latestUpdate,
  leadershipSignal,
  programSynthesis,
  completion,
  updateImpact,
  selectedProgramHistory,
  meetingInputs,
  formatTimestamp,
  onLoadUpdate
}: ActiveProgramSidebarProps) {
  return (
    <aside className="grid gap-4 self-start lg:sticky lg:top-24">
      {latestUpdate ? (
        <Card className="bg-zinc-950/80">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <FileClock className="h-4 w-4 text-emerald-200" />
              Latest update snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Last updated</p>
              <p className="mt-2 text-sm text-zinc-100">{formatTimestamp(latestUpdate.createdAt)}</p>
              {latestUpdate.review.lastUpdatedRole ? (
                <p className="mt-2 text-xs leading-5 text-zinc-400">Latest role submission: {latestUpdate.review.lastUpdatedRole}</p>
              ) : null}
            </div>
            {[
              ["Cycle", latestUpdate.review.cycleLabel],
              ["Current phase", latestUpdate.review.currentPhase],
              ["Program synthesis", latestUpdate.review.programSynthesisNote],
              ["Active risks", latestUpdate.review.activeRisks],
              ["Pending decisions", latestUpdate.review.decisionsPending],
              ["Support needed", latestUpdate.review.supportNeeded]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-300">{value || "No update captured."}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {leadershipSignal && leadershipSignal.status !== "none" ? (
        <Card className="bg-zinc-950/80">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <RefreshCw className="h-4 w-4 text-amber-200" />
              Leadership signal
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                  leadershipSignal.status === "new"
                    ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                    : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                }`}
              >
                {leadershipSignal.status === "new" ? "New leadership signal" : "Leadership signal incorporated"}
              </span>
              {leadershipSignal.updatedAt ? <span className="text-xs text-zinc-500">{formatTimestamp(leadershipSignal.updatedAt)}</span> : null}
            </div>
            <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3">
              <p className="text-sm leading-6 text-zinc-200">{leadershipSignal.summary}</p>
            </div>
            <div className="grid gap-2">
              {leadershipSignal.highlights.map((highlight) => (
                <div key={highlight} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-sm leading-6 text-zinc-300">{highlight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <Layers3 className="h-4 w-4 text-cyan-200" />
            Program synthesis
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-5">
          {programSynthesis.map((item) => (
            <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <HeartPulse className="h-4 w-4 text-cyan-200" />
            Review readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-zinc-400">Active context captured</span>
              <span className="font-medium text-zinc-100">{completion}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
              <div className="h-full bg-cyan-300 transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
          <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-cyan-100">
              <RefreshCw className="h-4 w-4" />
              Iteration mode
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              This flow is for programs already moving. It should generate plan adjustments, recovery moves, escalation guidance, and updated next steps.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <FileClock className="h-4 w-4 text-emerald-200" />
            Update impact
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-5">
          {updateImpact.map((item) => (
            <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <History className="h-4 w-4 text-amber-200" />
            Cycle timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {selectedProgramHistory.length ? (
            <div className="relative grid gap-0 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-white/10">
              {selectedProgramHistory.slice(0, 6).map((update) => (
                <button
                  key={update.id}
                  type="button"
                  onClick={() => onLoadUpdate(update)}
                  className="relative grid gap-2 py-3 pl-7 text-left transition-colors hover:text-zinc-50"
                >
                  <span className="absolute left-0 top-5 h-3.5 w-3.5 rounded-full border border-amber-300/40 bg-zinc-950 shadow-[0_0_18px_rgba(251,191,36,0.18)]" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">{formatTimestamp(update.createdAt)}</span>
                    <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-zinc-500">load</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-100">
                    {update.review.lastUpdatedRole ? `${update.review.lastUpdatedRole} update` : update.review.currentPhase || update.programName}
                  </p>
                  <p className="line-clamp-2 text-xs leading-5 text-zinc-400">
                    {update.review.programSynthesisNote || update.review.progressSinceLastReview || update.review.deliveryHealth || "No summary captured."}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-sm leading-6 text-zinc-400">
                No saved updates yet. Save this review to create the first timestamped program update.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <MessageSquareQuote className="h-4 w-4 text-cyan-200" />
            Recent meeting inputs
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-5">
          {meetingInputs.length ? (
            meetingInputs.slice(0, 3).map((input) => (
              <div key={input.id} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-100">{input.title}</p>
                  <span className="text-xs text-zinc-500">{formatTimestamp(input.capturedAt)}</span>
                </div>
                <p className="text-sm leading-6 text-zinc-300">{input.summary}</p>
                {input.attachments.length ? (
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Attachments: {input.attachments.map((attachment) => attachment.fileName).join(", ")}
                  </p>
                ) : null}
                {input.recommendedPlanAdjustments.length ? (
                  <p className="mt-2 text-xs leading-5 text-cyan-200">Next adjustment: {input.recommendedPlanAdjustments[0]}</p>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-sm leading-6 text-zinc-400">
                No meeting intelligence is on file yet. Add a meeting summary or transcript signal to let the next guided plan adapt to recurring delivery discussions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
