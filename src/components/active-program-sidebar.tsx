"use client";

import { CalendarCheck, FileText, History, MessageSquareQuote, Users2, Video } from "lucide-react";
import type { ActiveProgramUpdate } from "@/lib/active-program-types";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { ProgramMeetingInput } from "@/lib/program-intelligence-types";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import { firstSignal } from "@/lib/text-signals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TimelineEvent = {
  detail: string;
  id: string;
  kind: "role" | "leadership" | "meeting" | "artifact" | "program";
  timestamp: string;
  title: string;
  update?: ActiveProgramUpdate;
};

type ActiveProgramSidebarProps = {
  artifacts: ProgramArtifact[];
  latestUpdate?: ActiveProgramUpdate;
  leadershipSignal: DeliveryLeadershipSignal | null;
  selectedProgramHistory: ActiveProgramUpdate[];
  meetingInputs: ProgramMeetingInput[];
  formatTimestamp: (value: string) => string;
  onLoadUpdate: (update: ActiveProgramUpdate) => void;
};

const eventChrome: Record<TimelineEvent["kind"], { icon: typeof Users2; label: string; marker: string; panel: string }> = {
  artifact: {
    icon: FileText,
    label: "Artifact",
    marker: "border-cyan-300/40 bg-cyan-300/20 text-cyan-100",
    panel: "border-cyan-300/15 bg-cyan-300/[0.045]"
  },
  leadership: {
    icon: MessageSquareQuote,
    label: "Leadership",
    marker: "border-amber-300/40 bg-amber-300/20 text-amber-100",
    panel: "border-amber-300/15 bg-amber-300/[0.045]"
  },
  meeting: {
    icon: Video,
    label: "Meeting",
    marker: "border-emerald-300/40 bg-emerald-300/20 text-emerald-100",
    panel: "border-emerald-300/15 bg-emerald-300/[0.045]"
  },
  program: {
    icon: CalendarCheck,
    label: "Program",
    marker: "border-white/20 bg-white/10 text-zinc-100",
    panel: "border-white/10 bg-white/[0.035]"
  },
  role: {
    icon: Users2,
    label: "Role",
    marker: "border-cyan-300/40 bg-cyan-300/20 text-cyan-100",
    panel: "border-white/10 bg-white/[0.035]"
  }
};

function buildUpdateEvents(updates: ActiveProgramUpdate[]): TimelineEvent[] {
  return updates.slice(0, 8).map((update) => {
    const role = update.review.lastUpdatedRole?.trim();
    return {
      detail:
        update.review.programSynthesisNote ||
        firstSignal(
          update.review.progressSinceLastReview || update.review.activeRisks || update.review.decisionsPending,
          "Saved program context."
        ),
      id: update.id,
      kind: role ? "role" : "program",
      timestamp: update.createdAt,
      title: role ? `${role} submitted a role signal` : "Cycle update saved",
      update
    };
  });
}

function buildTimelineEvents({
  artifacts,
  leadershipSignal,
  meetingInputs,
  selectedProgramHistory
}: Pick<ActiveProgramSidebarProps, "artifacts" | "leadershipSignal" | "meetingInputs" | "selectedProgramHistory">) {
  const events: TimelineEvent[] = buildUpdateEvents(selectedProgramHistory);

  if (leadershipSignal && leadershipSignal.status !== "none" && leadershipSignal.updatedAt) {
    events.push({
      detail: firstSignal(leadershipSignal.summary, "Leadership feedback changed the guidance posture."),
      id: `leadership-${leadershipSignal.updatedAt}`,
      kind: "leadership",
      timestamp: leadershipSignal.updatedAt,
      title: leadershipSignal.status === "new" ? "New leadership signal" : "Leadership signal incorporated"
    });
  }

  for (const input of meetingInputs.slice(0, 5)) {
    events.push({
      detail: firstSignal(input.summary, "Meeting context added to the program record."),
      id: `meeting-${input.id}`,
      kind: "meeting",
      timestamp: input.capturedAt,
      title: input.title
    });
  }

  for (const artifact of artifacts.slice(0, 5)) {
    events.push({
      detail: `${artifact.type || "Artifact"} input available for guidance and work products.`,
      id: `artifact-${artifact.id}`,
      kind: "artifact",
      timestamp: new Date(artifact.lastModified).toISOString(),
      title: artifact.name
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
}

export function ActiveProgramSidebar({
  artifacts,
  latestUpdate,
  leadershipSignal,
  selectedProgramHistory,
  meetingInputs,
  formatTimestamp,
  onLoadUpdate
}: ActiveProgramSidebarProps) {
  const timelineEvents = buildTimelineEvents({ artifacts, leadershipSignal, meetingInputs, selectedProgramHistory });

  return (
    <aside className="self-start lg:sticky lg:top-24">
      <Card className="overflow-hidden bg-zinc-950/80">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-zinc-50">
            <History className="h-4 w-4 text-cyan-200" />
            This week timeline
          </CardTitle>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            What changed across roles, leadership, meetings, and artifacts.
          </p>
        </CardHeader>
        <CardContent className="p-5">
          <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Latest program save</p>
            <p className="mt-2 text-sm font-medium text-zinc-100">
              {latestUpdate ? formatTimestamp(latestUpdate.createdAt) : "No saved update yet"}
            </p>
          </div>

          {timelineEvents.length ? (
            <div className="relative grid gap-0 before:absolute before:left-[15px] before:top-3 before:h-[calc(100%-1.5rem)] before:w-px before:bg-white/10">
              {timelineEvents.map((event) => {
                const chrome = eventChrome[event.kind];
                const Icon = chrome.icon;
                const eventUpdate = event.update;
                const content = (
                  <>
                    <span className={`absolute left-0 top-4 grid h-8 w-8 place-items-center rounded-full border ${chrome.marker}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className={`rounded-lg border p-3 ${chrome.panel}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-200">{chrome.label}</span>
                        <span className="text-xs text-zinc-500">{formatTimestamp(event.timestamp)}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-zinc-100">{event.title}</p>
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-zinc-400">{event.detail}</p>
                    </div>
                  </>
                );

                return eventUpdate ? (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onLoadUpdate(eventUpdate)}
                    className="relative grid gap-2 py-3 pl-12 text-left transition-colors hover:text-zinc-50"
                  >
                    {content}
                  </button>
                ) : (
                  <div key={event.id} className="relative grid gap-2 py-3 pl-12">
                    {content}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
              <p className="text-sm leading-6 text-zinc-400">
                No weekly signal yet. Save a role update, meeting input, artifact, or leadership review to start the timeline.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
