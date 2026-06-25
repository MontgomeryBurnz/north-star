"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Flag,
  LogOut,
  Plus,
  TriangleAlert,
  type LucideIcon
} from "lucide-react";
import type {
  ClientPortalPortfolio,
  ClientPortalPortfolioMilestone,
  ClientPortalPortfolioRisk,
  ClientPortalProgram,
  ClientPortalRoadmapRow,
  ClientProgramPosture
} from "@/lib/client-portal";
import type { ClientDecisionRequest } from "@/lib/program-intelligence-types";
import { cn } from "@/lib/utils";
import { MetricBasisLabel } from "@/components/metric-basis-label";
import { Button } from "@/components/ui/button";

const postureStyles: Record<
  ClientProgramPosture,
  {
    badge: string;
    dot: string;
    heroDot: string;
    marker: string;
    pill: string;
    progress: string;
    text: string;
  }
> = {
  "on-track": {
    badge: "border border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100",
    dot: "bg-emerald-300",
    heroDot: "bg-emerald-300",
    marker: "bg-emerald-300",
    pill: "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100",
    progress: "bg-emerald-300",
    text: "text-emerald-200"
  },
  "at-risk": {
    badge: "border border-amber-300/25 bg-amber-300/[0.08] text-amber-100",
    dot: "bg-amber-300",
    heroDot: "bg-amber-300",
    marker: "bg-amber-300",
    pill: "border-amber-300/25 bg-amber-300/[0.08] text-amber-100",
    progress: "bg-amber-300",
    text: "text-amber-200"
  },
  blocked: {
    badge: "border border-rose-300/25 bg-rose-300/[0.08] text-rose-100",
    dot: "bg-rose-300",
    heroDot: "bg-rose-300",
    marker: "bg-rose-300",
    pill: "border-rose-300/25 bg-rose-300/[0.08] text-rose-100",
    progress: "bg-rose-300",
    text: "text-rose-200"
  },
  watch: {
    badge: "border border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100",
    dot: "bg-cyan-300",
    heroDot: "bg-cyan-300",
    marker: "bg-cyan-300",
    pill: "border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100",
    progress: "bg-cyan-300",
    text: "text-cyan-200"
  }
};

const priorityStyles = {
  High: "border border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100",
  Medium: "border border-amber-300/25 bg-amber-300/[0.08] text-amber-100",
  Low: "border border-rose-300/25 bg-rose-300/[0.08] text-rose-100"
} as const;

type RoadmapSegmentState = ClientPortalRoadmapRow["segments"][number]["state"];
type RoadmapWindowMode = ClientPortalRoadmapRow["windowMode"];

const roadmapPhaseSegmentStyles: Record<RoadmapSegmentState, string> = {
  complete: "border-r border-white/10 bg-emerald-300/[0.12] text-emerald-100",
  current: "border-r border-white/10 bg-emerald-300/35 text-zinc-950",
  next: "border-r border-white/10 bg-white/[0.06] text-zinc-500"
} as const;

function roadmapSegmentClass(label: string, state: RoadmapSegmentState, windowMode: RoadmapWindowMode) {
  if (windowMode === "year") {
    return cn(roadmapPhaseSegmentStyles[state], label === "Value" ? "border-r-0" : "");
  }

  if (state === "complete") return "border-r border-white/10 bg-emerald-300/[0.16] text-emerald-100";
  if (state === "current") return "border-r border-white/10 bg-cyan-300/[0.18] text-cyan-100";
  return "border-r border-white/10 bg-white/[0.04] text-zinc-500";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "America/New_York",
    year: "numeric"
  }).format(date);
}

function formatRefreshTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/New_York"
  }).format(date);
}

function PortfolioLogoutForm() {
  return (
    <form action="/api/auth/user/logout" method="post">
      <Button type="submit" variant="outline" size="sm" className="border-white/10 bg-white/[0.035] text-zinc-300 hover:bg-white/[0.055] hover:text-zinc-50">
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </form>
  );
}

function MetricTile({ helper, label, value }: { helper?: string; label: string; value: string }) {
  return (
    <div className="min-h-32 rounded-lg border border-white/10 bg-zinc-950/80 p-6 shadow-glow">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-8 text-4xl font-semibold tracking-normal text-zinc-50">{value}</p>
      {helper ? <MetricBasisLabel className="mt-3">{helper}</MetricBasisLabel> : null}
    </div>
  );
}

function deriveVisibleMetrics(programs: ClientPortalProgram[]) {
  const totalPrograms = programs.length;
  const weightedHealth = programs.reduce((total, program) => {
    if (program.posture === "on-track") return total + 100;
    if (program.posture === "watch") return total + 72;
    if (program.posture === "at-risk") return total + 46;
    return total + 18;
  }, 0);

  return {
    averageCompletionPercent: totalPrograms
      ? Math.round(programs.reduce((total, program) => total + program.metrics.programCompletionPercent, 0) / totalPrograms)
      : 0,
    atRisk: programs.filter((program) => program.posture === "at-risk" || program.posture === "blocked").length,
    decisions: programs.reduce((total, program) => total + program.metrics.decisions, 0),
    delayed: programs.filter(
      (program) =>
        program.posture === "blocked" ||
        program.posture === "watch" ||
        (program.posture === "at-risk" && program.metrics.programCompletionPercent < 60)
    ).length,
    healthScore: totalPrograms ? Math.round(weightedHealth / totalPrograms) : 0,
    totalPrograms
  };
}

function TrendIcon({ trend }: { trend: ClientPortalPortfolioRisk["trend"] }) {
  if (trend === "Worse") return <ArrowUpRight className="h-4 w-4" />;
  if (trend === "Better") return <ArrowDownRight className="h-4 w-4" />;
  return <ArrowRight className="h-4 w-4" />;
}

function riskTone(risk: ClientPortalPortfolioRisk) {
  if (risk.trend === "Worse") {
    return "border-rose-300/25 bg-rose-300/[0.06] text-rose-100";
  }
  if (risk.trend === "Better") {
    return "border-emerald-300/25 bg-emerald-300/[0.06] text-emerald-100";
  }
  return "border-white/10 bg-white/[0.035] text-zinc-300";
}

function ProgramGridRow({
  onSelect,
  program,
  selected
}: {
  onSelect: () => void;
  program: ClientPortalProgram;
  selected: boolean;
}) {
  const styles = postureStyles[program.posture];

  return (
    <button
      type="button"
      data-client-program-card={program.id}
      onClick={onSelect}
      className={cn(
        "grid w-full gap-5 rounded-lg border p-5 text-left transition-colors",
        selected
          ? "border-cyan-300/35 bg-cyan-300/[0.07] shadow-[0_0_30px_rgba(103,232,249,0.08)]"
          : "border-white/10 bg-zinc-950/70 hover:border-cyan-300/25 hover:bg-cyan-300/[0.035]"
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(15rem,1.15fr)_10rem_12rem] lg:items-center">
        <span className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.08] px-8 py-4 text-center text-base font-semibold text-emerald-100 shadow-sm">
          <span className="block">{program.name}</span>
          <span className="mt-1 block text-xs font-medium uppercase tracking-[0.14em] text-emerald-100/60">{program.clientName}</span>
        </span>
        <span>
          <span className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">RAG</span>
          <span className={cn("mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium", styles.badge)}>{program.postureLabel}</span>
        </span>
        <span>
          <span className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">% Complete</span>
          <span className="mt-2 block text-2xl font-semibold text-zinc-50">
            {program.metrics.programCompletionPercent}%{" "}
            {program.completionDelta ? <span className={styles.text}>{program.completionDelta}</span> : null}
          </span>
          <span className="mt-1 block text-xs font-medium text-zinc-500">
            Basis: {program.metrics.completionBasis} · {program.metrics.completionScheduleLabel}
          </span>
        </span>
      </div>
      <div className="grid gap-4 text-zinc-400 md:grid-cols-3">
        <span>
          <span className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Owner</span>
          <span className="mt-2 block font-medium">{program.owner}</span>
        </span>
        <span>
          <span className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Phase</span>
          <span className="mt-2 block font-medium">{program.phase}</span>
        </span>
        <span>
          <span className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Next Milestone</span>
          <span className="mt-2 block font-medium text-zinc-100">{program.nextMilestone.name}</span>
          <span className="text-sm">{program.nextMilestone.dateLabel}</span>
        </span>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Status Note</p>
        <p className="mt-2 text-base leading-7 text-zinc-400">{program.statusNote}</p>
      </div>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-200">{children}</p>;
}

function UpcomingMilestonesPanel({ milestones }: { milestones: ClientPortalPortfolioMilestone[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-6 shadow-glow">
      <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.08] px-6 py-5 text-center text-lg font-semibold text-cyan-100">
        Upcoming Milestones
      </div>
      <div className="mt-5 grid gap-4">
        {milestones.length ? milestones.map((milestone) => (
          <div key={milestone.id} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="rounded-md border border-white/10 bg-black/20 px-2 py-3 text-center text-zinc-100">
              <span className="block text-lg font-semibold">{milestone.dateLabel.split(" ")[0] ?? "Next"}</span>
              <span className="block text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">{milestone.dateLabel.split(" ")[1] ?? ""}</span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-zinc-50">{milestone.title}</p>
              <p className="mt-1 truncate text-sm font-medium text-zinc-500">{milestone.programName}</p>
            </div>
            <span className={cn("h-fit rounded-full px-3 py-1 text-sm font-medium", priorityStyles[milestone.priority])}>
              {milestone.priority}
            </span>
          </div>
        )) : (
          <p className="rounded-lg border border-white/10 bg-white/[0.025] p-5 text-base font-medium leading-7 text-zinc-500">
            Upcoming milestones will appear after programs capture delivery checkpoints or board due dates.
          </p>
        )}
      </div>
    </section>
  );
}

function PortfolioRisksPanel({ risks }: { risks: ClientPortalPortfolioRisk[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-6 shadow-glow">
      <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.08] px-6 py-5 text-center text-lg font-semibold text-emerald-100">
        Key Risks Across Portfolio
      </div>
      <div className="mt-5 grid gap-4">
        {risks.length ? risks.map((risk) => (
          <div key={risk.id} className={cn("rounded-lg border p-5", riskTone(risk))}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-lg font-semibold leading-8 text-zinc-50">{risk.description}</p>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold">
                <TrendIcon trend={risk.trend} />
                {risk.trend}
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-400">
              {risk.programName} <span className="mx-2">Severity: {risk.severity}</span>
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-400">Mitigation: {risk.mitigationOwner}</p>
          </div>
        )) : (
          <p className="rounded-lg border border-white/10 bg-white/[0.025] p-5 text-base font-medium leading-7 text-zinc-500">
            No executive risks are currently visible across the selected portfolio.
          </p>
        )}
      </div>
    </section>
  );
}

function PortfolioRoadmap({ roadmap }: { roadmap: ClientPortalRoadmapRow[] }) {
  const activeWindowLabels = roadmap[0]?.windowLabels?.length
    ? roadmap[0].windowLabels
    : ["Window 1", "Window 2", "Window 3", "Window 4", "Window 5"];
  const timeframeLabel = roadmap[0]?.timeframeLabel;
  const currentWindowIndex = roadmap[0]?.currentWindowIndex ?? 2;
  const windowMode = roadmap[0]?.windowMode ?? "year";
  const isShortWindow = windowMode === "month" || windowMode === "week";

  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-6 shadow-glow">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel>{timeframeLabel ? `Portfolio Roadmap - ${timeframeLabel}` : "Portfolio Roadmap"}</SectionLabel>
          <h2 className="mt-4 text-2xl font-semibold text-zinc-50">Program Timeline</h2>
        </div>
        <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
          {windowMode} view
        </span>
      </div>
      <div className={cn("mt-6 flex flex-wrap font-semibold", isShortWindow ? "gap-2 text-sm" : "gap-8 text-xl text-zinc-600")}>
        {activeWindowLabels.map((windowLabel, index) => (
          <span
            key={windowLabel}
            className={cn(
              isShortWindow ? "rounded-full border px-3 py-1.5" : "",
              index === currentWindowIndex
                ? isShortWindow
                  ? "border-cyan-300/30 bg-cyan-300/[0.1] text-cyan-100"
                  : "text-cyan-100"
                : isShortWindow
                  ? "border-white/10 bg-white/[0.025] text-zinc-500"
                  : undefined
            )}
          >
            {windowLabel}
          </span>
        ))}
      </div>
      <div className="mt-8 grid gap-8">
        {roadmap.map((row) => {
          const markerStyle = postureStyles[row.markerTone];
          const rowIsShortWindow = row.windowMode === "month" || row.windowMode === "week";
          return (
            <div
              key={row.programId}
              data-client-roadmap-current-index={row.currentWindowIndex}
              data-client-roadmap-row={row.programId}
              data-client-roadmap-window-mode={row.windowMode}
            >
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <p className="text-lg font-semibold text-zinc-100">{row.programName}</p>
                {row.timeframeLabel && row.timeframeLabel !== timeframeLabel ? (
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">{row.timeframeLabel}</p>
                ) : null}
              </div>
              <div className="relative">
                <div
                  className={cn("grid overflow-hidden rounded-full", rowIsShortWindow ? "border border-white/10" : "")}
                  style={{ gridTemplateColumns: `repeat(${row.segments.length}, minmax(0, 1fr))` }}
                >
                  {row.segments.map((segment) => (
                    <div
                      key={`${row.programId}-${segment.label}`}
                      data-client-roadmap-segment={segment.label}
                      data-client-roadmap-segment-state={segment.state}
                      className={cn(
                        "px-3 text-center font-semibold",
                        rowIsShortWindow ? "py-3 text-xs sm:text-sm" : "py-4 text-sm",
                        roadmapSegmentClass(segment.label, segment.state, row.windowMode)
                      )}
                    >
                      {segment.label}
                    </div>
                  ))}
                </div>
                <div
                  data-client-roadmap-marker={row.programId}
                  data-client-roadmap-marker-position={row.markerPosition}
                  className={cn("absolute -top-2 h-16 w-4 rounded-md shadow-[0_0_24px_rgba(110,231,183,0.28)]", markerStyle.marker)}
                  style={{ left: `calc(${row.markerPosition}% - 0.5rem)` }}
                />
                <p className={cn("mt-4 text-sm font-semibold", markerStyle.text)} style={{ marginLeft: `max(0rem, calc(${row.markerPosition}% - 5rem))` }}>
                  {row.markerLabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProgramHero({ program }: { program: ClientPortalProgram }) {
  const styles = postureStyles[program.posture];
  const highlights = program.executiveStatusHighlights.slice(0, 3);

  return (
    <section className="rounded-lg border border-emerald-300/15 bg-zinc-950/90 px-6 py-8 text-zinc-50 shadow-glow md:px-9">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.5fr)] xl:items-start">
        <div>
          <h2 className="text-4xl font-semibold tracking-normal">{program.name}</h2>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">{program.clientName}</p>
          <p className="mt-4 text-lg font-medium text-cyan-100">{program.primaryOutcome}</p>
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-base text-zinc-400">
            <span data-client-executive-sponsor>Executive Sponsor: <strong className="text-zinc-50">{program.executiveSponsor}</strong></span>
            <span data-client-program-lead>Program Lead: <strong className="text-zinc-50">{program.programLead}</strong></span>
            <span data-client-pmo>PMO: <strong className="text-zinc-50">{program.pmo}</strong></span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-3">
          <HeroMetric label="Overall Status" value={program.statusSignal} dot={styles.heroDot} />
          <HeroMetric
            label="% Complete"
            value={`${program.metrics.programCompletionPercent}%`}
            delta={program.completionDelta}
            helper={`Basis: ${program.metrics.completionBasis} · ${program.metrics.completionScheduleLabel}`}
          />
          <HeroMetric label="Current Phase" value={program.phase} />
        </div>
      </div>
      <div className="mt-8 border-t border-white/10 pt-6">
        <div className="grid gap-5 text-base font-medium text-zinc-300 md:grid-cols-2">
          {highlights.map((highlight, index) => (
            <StatusBullet
              key={`${highlight}-${index}`}
              tone={highlight.toLowerCase().includes("risk") || program.posture === "blocked" ? "risk" : index === 1 ? "good" : "neutral"}
            >
              {highlight}
            </StatusBullet>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroMetric({ dot, helper, label, value, delta }: { delta?: string; dot?: string; helper?: string; label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className="mt-2 flex items-center gap-3 text-2xl font-semibold text-zinc-50">
        {dot ? <span className={cn("h-4 w-4 rounded-full", dot)} /> : null}
        {value}
        {delta ? <span className="text-lg text-emerald-200">{delta}</span> : null}
      </p>
      {helper ? <MetricBasisLabel className="mt-1">{helper}</MetricBasisLabel> : null}
    </div>
  );
}

function StatusBullet({ children, tone }: { children: ReactNode; tone: "neutral" | "good" | "risk" }) {
  return (
    <p className="flex gap-3 leading-7">
      <span className={cn("mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full", tone === "good" ? "bg-emerald-300" : tone === "risk" ? "bg-rose-300" : "bg-zinc-500")} />
      <span>{children}</span>
    </p>
  );
}

function ExecutiveCard({ children, icon: Icon, title }: { children: ReactNode; icon: LucideIcon; title: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/80 p-7 shadow-glow">
      <h3 className="flex items-center gap-3 text-xl font-semibold text-zinc-50">
        <Icon className="h-5 w-5 text-cyan-200" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function ProgramMilestoneTimeline({ program }: { program: ClientPortalProgram }) {
  const compactTimeline = program.timelineScale === "month" || program.timelineScale === "week";

  return (
    <ExecutiveCard icon={Flag} title="Milestone Timeline">
      {program.milestones.length ? (
        <div className={cn("overflow-x-auto pb-3", compactTimeline ? "mt-8" : "mt-10")}>
          <p className="-mt-4 mb-8 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-2 text-sm font-semibold text-cyan-100">
            {program.timelineScaleLabel} view · {program.timelineWindowLabel}
          </p>
          <div
            className={cn("grid items-start gap-0", compactTimeline ? "min-w-[44rem]" : "min-w-[58rem]")}
            style={{ gridTemplateColumns: `repeat(${program.milestones.length}, minmax(${compactTimeline ? "7.5rem" : "9rem"}, 1fr))` }}
          >
            {program.milestones.map((milestone, index) => {
              const isComplete = milestone.status === "complete";
              const isCurrent = milestone.status === "current";
              return (
                <div key={`${milestone.name}-${index}`} className="relative text-center">
                  <div
                    className={cn(
                      "absolute left-0 right-0 top-7 h-2",
                      index === 0 ? "left-1/2" : "",
                      index === program.milestones.length - 1 ? "right-1/2" : "",
                      isComplete || isCurrent ? "bg-emerald-300" : "bg-white/10"
                    )}
                  />
                  <div
                    className={cn(
                      "relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 text-xl font-semibold shadow-sm",
                      isComplete
                        ? "border-emerald-300/20 bg-emerald-300/[0.16] text-emerald-100"
                        : isCurrent
                          ? "border-amber-300/20 bg-amber-300/[0.16] text-amber-100"
                          : "border-white/10 bg-white/[0.035] text-zinc-500"
                    )}
                  >
                    {isComplete ? <CheckCircle2 className="h-7 w-7" /> : isCurrent ? <Compass className="h-7 w-7" /> : <Flag className="h-6 w-6" />}
                  </div>
                  <p className={cn("mt-4 text-base font-semibold", isComplete ? "text-emerald-100" : isCurrent ? "text-amber-100" : "text-zinc-500")}>
                    {milestone.name}
                  </p>
                  <p className="mt-5 text-sm font-medium text-zinc-500">{milestone.dateLabel}</p>
                  <p className={cn("mt-2 text-sm font-semibold", isComplete ? "text-emerald-200" : isCurrent ? "text-emerald-200" : "text-zinc-600")}>
                    {isComplete ? "On time" : isCurrent ? "Current checkpoint" : "On track"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-white/10 bg-white/[0.025] p-5 text-base font-medium leading-7 text-zinc-500">
          Milestones will appear after the team saves a next milestone or delivery board due date in Program Hub.
        </p>
      )}
    </ExecutiveCard>
  );
}

function ExecutiveListCard({ icon, items, title }: { icon: LucideIcon; items: string[]; title: string }) {
  return (
    <ExecutiveCard icon={icon} title={title}>
      <ul className="mt-6 grid gap-4 text-lg leading-8 text-zinc-400">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-4">
            <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </ExecutiveCard>
  );
}

function RiskDecisionSection({ program }: { program: ClientPortalProgram }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ExecutiveCard icon={TriangleAlert} title="Risks / Issues / Dependencies">
        {program.executiveRisks.length ? (
          <div className="mt-7 overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  <th className="py-3 pr-5">Severity</th>
                  <th className="py-3 pr-5">Description</th>
                  <th className="py-3 pr-5">Owner</th>
                  <th className="py-3 pr-5">Mitigation</th>
                  <th className="py-3">Target Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm font-medium leading-6 text-zinc-400">
                {program.executiveRisks.map((risk, index) => (
                  <tr key={`${risk.description}-${index}`}>
                    <td
                      className={cn(
                        "py-4 pr-5 font-semibold",
                        risk.severity === "High" ? "text-rose-200" : risk.severity === "Medium" ? "text-amber-200" : "text-emerald-200"
                      )}
                    >
                      {risk.severity}
                    </td>
                    <td className="py-4 pr-5">{risk.description}</td>
                    <td className="py-4 pr-5">{risk.owner}</td>
                    <td className="py-4 pr-5">{risk.mitigation}</td>
                    <td className="py-4">{risk.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 rounded-lg border border-white/10 bg-white/[0.025] p-5 text-base font-medium leading-7 text-zinc-500">
            No executive risks, issues, or dependencies are currently captured for this program.
          </p>
        )}
      </ExecutiveCard>

      <section className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.045] p-7 shadow-glow">
        <h3 className="flex items-center gap-3 text-xl font-semibold text-zinc-50">
          <ClipboardCheck className="h-5 w-5 text-cyan-200" />
          Leadership Decisions Needed
        </h3>
        <div className="mt-6 grid gap-4">
          {program.leadershipDecisions.length ? (
            program.leadershipDecisions.map((decision, index) => (
              <div key={`${decision.title}-${index}`} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 rounded-lg border border-white/10 bg-zinc-950/70 p-5">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-zinc-950", index === 0 ? "bg-rose-300" : "bg-amber-300")}>
                  {index + 1}
                </span>
                <span>
                  <span className="block text-lg font-semibold leading-7 text-zinc-50">{decision.title}</span>
                  <span className="mt-1 block text-sm font-medium text-zinc-500">{decision.meta}</span>
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-white/10 bg-zinc-950/70 p-5 text-base font-medium leading-7 text-zinc-500">
              No executive decision is currently pending from saved program updates or client requests.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function WorkstreamStatus({ program }: { program: ClientPortalProgram }) {
  return (
    <ExecutiveCard icon={BriefcaseBusiness} title="Workstream Status">
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {program.workstreams.slice(0, 5).map((workstream) => {
          const normalizedStatus = workstream.status.toLowerCase();
          const riskStyle = normalizedStatus.includes("blocked")
            ? "bg-rose-300"
            : normalizedStatus.includes("review")
              ? "bg-amber-300"
              : normalizedStatus.includes("no linked") || normalizedStatus.includes("not started")
                ? "bg-zinc-500"
                : "bg-emerald-300";
          return (
            <div
              key={workstream.name}
              data-client-workstream-card={workstream.name}
              data-client-workstream-percent={workstream.percent}
              className="rounded-lg border border-white/10 bg-white/[0.025] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-semibold leading-7 text-zinc-50">{workstream.name}</h4>
                <span className={cn("mt-1 h-4 w-4 rounded-full", riskStyle)} />
              </div>
              <div className="mt-5">
                <div className="h-3 rounded-full bg-white/10">
                  <div className={cn("h-full rounded-full", riskStyle)} style={{ width: `${workstream.percent}%` }} />
                </div>
                <p className="mt-2 text-right text-lg font-semibold text-zinc-400">{workstream.percent}%</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                  Task basis: {workstream.taskCount ? workstream.percentBasis : "No tasks linked"}
                </span>
                <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.045] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-cyan-100">
                  Schedule: {workstream.scheduleLabel}
                </span>
              </div>
              <p className="mt-4 text-base font-medium leading-7 text-zinc-400">{workstream.note}</p>
              <p className="mt-4 text-sm font-medium text-zinc-500">
                Owner: {workstream.owner}
                {workstream.blockedTaskCount ? ` · ${workstream.blockedTaskCount} blocked` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </ExecutiveCard>
  );
}

function ClientDecisionPanel({ program }: { program: ClientPortalProgram }) {
  const [decisionText, setDecisionText] = useState("");
  const [clientDecisions, setClientDecisions] = useState<ClientDecisionRequest[]>(program.clientDecisions);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const decisions = [
    ...clientDecisions.map((decision) => ({
      id: decision.id,
      label: decision.decisionText,
      source: decision.requestedBy ? `Added by ${decision.requestedBy}` : "Client added"
    })),
    ...program.decisions.map((decision, index) => ({
      id: `program-decision-${index}`,
      label: decision,
      source: "Program signal"
    }))
  ];

  useEffect(() => {
    setDecisionText("");
    setClientDecisions(program.clientDecisions);
    setSaveStatus(null);
  }, [program.clientDecisions, program.id]);

  async function addDecision() {
    const trimmed = decisionText.trim();
    if (!trimmed) return;
    setSaveStatus("Saving decision...");

    try {
      const response = await fetch(`/api/programs/${program.id}/client-decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionText: trimmed })
      });
      if (!response.ok) throw new Error("save");

      const payload = (await response.json()) as { decision: ClientDecisionRequest };
      setClientDecisions((current) => [payload.decision, ...current]);
      setDecisionText("");
      setSaveStatus("Decision captured.");
    } catch {
      setSaveStatus("Could not save this decision.");
    }
  }

  return (
    <section className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.045] p-7 shadow-glow">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-zinc-50">Client Decisions / Approvals</h3>
          <p className="mt-2 text-base leading-7 text-zinc-400">Capture executive decisions that should be tracked against this program.</p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-2 text-sm font-semibold text-emerald-100">{decisions.length} open</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={decisionText}
          onChange={(event) => setDecisionText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void addDecision();
          }}
          placeholder="Add a client decision or approval needed"
          className="h-12 rounded-md border border-white/10 bg-zinc-950 px-4 text-base text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
        />
        <Button type="button" onClick={() => void addDecision()} className="h-12 rounded-md bg-emerald-300 px-6 text-zinc-950 hover:bg-emerald-200">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {saveStatus ? <p className="mt-2 text-sm font-medium text-zinc-400">{saveStatus}</p> : null}

      <div className="mt-5 grid gap-3">
        {decisions.map((decision) => (
          <div key={decision.id} className="rounded-lg border border-white/10 bg-zinc-950/70 p-4 text-base leading-7 text-zinc-400">
            <p className="font-semibold text-zinc-50">{decision.label}</p>
            <p className="mt-1 text-sm font-medium text-zinc-500">{decision.source}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgramOnePager({ program }: { program: ClientPortalProgram }) {
  return (
    <section data-client-program-detail={program.id} className="grid gap-6">
      <ProgramHero program={program} />

      <ExecutiveCard icon={Compass} title="Executive Summary">
        <p className="mt-6 text-lg leading-9 text-zinc-400">{program.executiveOverview}</p>
      </ExecutiveCard>

      <ProgramMilestoneTimeline program={program} />

      <div className="grid gap-6 xl:grid-cols-2">
        <ExecutiveListCard icon={CheckCircle2} title="Recent Accomplishments" items={program.recentAccomplishments} />
        <ExecutiveListCard icon={ArrowRight} title="Upcoming Work (Next 2 Weeks)" items={program.upcomingWork} />
      </div>

      <RiskDecisionSection program={program} />
      <WorkstreamStatus program={program} />
      <ClientDecisionPanel program={program} />
    </section>
  );
}

export function ClientPortalConsole({
  canReturnToInternal,
  portfolio,
  viewerLabel
}: {
  canReturnToInternal: boolean;
  portfolio: ClientPortalPortfolio;
  viewerLabel: string;
}) {
  const [selectedClientName, setSelectedClientName] = useState(portfolio.clients[0]?.clientName ?? "");
  const initialClientProgramIds = portfolio.clients[0]?.programIds ?? portfolio.programs.map((program) => program.id);
  const [selectedProgramId, setSelectedProgramId] = useState(initialClientProgramIds[0] ?? "");
  const [visibleProgramIds, setVisibleProgramIds] = useState(() => new Set(initialClientProgramIds));
  const detailRef = useRef<HTMLDivElement>(null);
  const selectedClient = useMemo(
    () => portfolio.clients.find((client) => client.clientName === selectedClientName) ?? portfolio.clients[0] ?? null,
    [portfolio.clients, selectedClientName]
  );
  const selectedClientProgramIds = useMemo(() => selectedClient?.programIds ?? [], [selectedClient]);
  const selectedClientProgramIdsKey = selectedClientProgramIds.join("|");
  const clientPrograms = useMemo(
    () => portfolio.programs.filter((program) => selectedClientProgramIds.includes(program.id)),
    [portfolio.programs, selectedClientProgramIds]
  );
  const visiblePrograms = useMemo(
    () => clientPrograms.filter((program) => visibleProgramIds.has(program.id)),
    [clientPrograms, visibleProgramIds]
  );
  const visibleMetrics = useMemo(() => deriveVisibleMetrics(visiblePrograms), [visiblePrograms]);
  const selectedProgram = useMemo(
    () => visiblePrograms.find((program) => program.id === selectedProgramId) ?? visiblePrograms[0] ?? null,
    [selectedProgramId, visiblePrograms]
  );
  const visibleIds = useMemo(() => new Set(visiblePrograms.map((program) => program.id)), [visiblePrograms]);
  const visibleMilestones = portfolio.upcomingMilestones.filter((milestone) => visibleIds.has(milestone.programId));
  const visibleRisks = portfolio.keyRisks.filter((risk) => visibleIds.has(risk.programId));
  const visibleRoadmap = portfolio.roadmap.filter((row) => visibleIds.has(row.programId));

  useEffect(() => {
    if (!portfolio.clients.length) return;
    if (portfolio.clients.some((client) => client.clientName === selectedClientName)) return;
    setSelectedClientName(portfolio.clients[0]?.clientName ?? "");
  }, [portfolio.clients, selectedClientName]);

  useEffect(() => {
    setVisibleProgramIds(new Set(selectedClientProgramIds));
    setSelectedProgramId(selectedClientProgramIds[0] ?? "");
  }, [selectedClientName, selectedClientProgramIdsKey, selectedClientProgramIds]);

  useEffect(() => {
    if (!selectedProgram && visiblePrograms[0]) {
      setSelectedProgramId(visiblePrograms[0].id);
    }

    if (selectedProgram && selectedProgram.id !== selectedProgramId) {
      setSelectedProgramId(selectedProgram.id);
    }
  }, [selectedProgram, selectedProgramId, visiblePrograms]);

  function toggleProgram(programId: string) {
    setVisibleProgramIds((current) => {
      const next = new Set(current);
      if (next.has(programId) && next.size > 1) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  }

  function selectClient(clientName: string) {
    setSelectedClientName(clientName);
    window.requestAnimationFrame(() => {
      window.scrollTo({ behavior: "smooth", top: 0 });
    });
  }

  function selectProgram(programId: string) {
    setSelectedProgramId(programId);
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.12),transparent_34rem),#050505] text-zinc-100">
      <header className="border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
        <div className="northstar-shell flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">North Star Client Portal</p>
            <p className="mt-1 truncate text-sm font-medium text-zinc-500">{viewerLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {canReturnToInternal ? (
              <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.035] text-zinc-300 hover:bg-white/[0.055] hover:text-zinc-50">
                <Link href="/">
                  <span className="hidden sm:inline">Internal console</span>
                  <span className="sm:hidden">Console</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <PortfolioLogoutForm />
          </div>
        </div>
      </header>

      <div className="northstar-shell py-10">
        <section>
          <h1 className="text-4xl font-semibold tracking-normal text-zinc-50 md:text-5xl">Portfolio Dashboard</h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-lg font-medium text-zinc-500">
            <span>Week Ending {formatDate(portfolio.generatedAt)}</span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-2 text-base text-emerald-100">Refreshed {formatRefreshTime(portfolio.generatedAt)}</span>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <MetricTile label="Total Programs" value={String(visibleMetrics.totalPrograms)} />
          <MetricTile label="At Risk" value={String(visibleMetrics.atRisk)} />
          <MetricTile label="Delayed" value={String(visibleMetrics.delayed)} />
          <MetricTile label="Avg % Complete" value={`${visibleMetrics.averageCompletionPercent}%`} helper="Averaged from each program's shown completion basis." />
          <MetricTile label="Decisions Pending" value={String(visibleMetrics.decisions)} />
        </section>

        {portfolio.programs.length ? (
          <>
            <section className="mt-8 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.045] p-5 shadow-glow" data-client-portfolio-selector>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">Client portfolio</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-zinc-500">
                    Select the client first, then inspect the programs inside that portfolio.
                  </p>
                </div>
                {selectedClient ? (
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-4 py-2 text-sm font-semibold text-emerald-100">
                    {selectedClient.metrics.totalPrograms} program{selectedClient.metrics.totalPrograms === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {portfolio.clients.map((client) => (
                  <button
                    key={client.clientName}
                    type="button"
                    aria-pressed={client.clientName === selectedClientName}
                    data-client-portfolio-option={client.clientName}
                    onClick={() => selectClient(client.clientName)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      client.clientName === selectedClientName
                        ? "border-cyan-300/30 bg-cyan-300/[0.14] text-cyan-100"
                        : "border-white/10 bg-white/[0.025] text-zinc-500 hover:border-cyan-300/25 hover:text-zinc-200"
                    )}
                  >
                    {client.clientName}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-lg border border-white/10 bg-zinc-950/70 p-5 shadow-glow">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">Portfolio scope</p>
                  <p className="mt-1 text-sm font-medium text-zinc-500">
                    Toggle which {selectedClient?.clientName ?? "client"} programs appear in the executive view.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVisibleProgramIds(new Set(selectedClientProgramIds))}
                  className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/30 hover:bg-cyan-300/[0.06]"
                >
                  All {selectedClient?.clientName ?? "client"} programs
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {clientPrograms.map((program) => (
                  <button
                    key={program.id}
                    type="button"
                    aria-pressed={visibleProgramIds.has(program.id)}
                    onClick={() => toggleProgram(program.id)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      visibleProgramIds.has(program.id)
                        ? "border-emerald-300/25 bg-emerald-300/[0.12] text-emerald-100"
                        : "border-white/10 bg-white/[0.025] text-zinc-500 hover:border-cyan-300/25 hover:text-zinc-200"
                    )}
                  >
                    {program.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.52fr)]">
              <div className="min-w-0">
                <SectionLabel>Portfolio Program Grid</SectionLabel>
                <h2 className="mt-4 text-2xl font-semibold text-zinc-50">Weekly Updates</h2>
                <p className="mt-2 text-lg font-medium text-zinc-500">
                  Program, owner, phase, health, progress, next milestone, and current delivery note.
                </p>
                <div className="mt-7 grid gap-6">
                  {visiblePrograms.map((program) => (
                    <ProgramGridRow
                      key={program.id}
                      program={program}
                      selected={program.id === selectedProgram?.id}
                      onSelect={() => selectProgram(program.id)}
                    />
                  ))}
                </div>
                <div className="mt-8">
                  <PortfolioRoadmap roadmap={visibleRoadmap} />
                </div>
              </div>
              <aside className="grid content-start gap-6 xl:sticky xl:top-6">
                <UpcomingMilestonesPanel milestones={visibleMilestones} />
                <PortfolioRisksPanel risks={visibleRisks} />
              </aside>
            </section>

            {selectedProgram ? (
              <div ref={detailRef} className="mt-12 scroll-mt-8">
                <ProgramOnePager program={selectedProgram} />
              </div>
            ) : null}
          </>
        ) : (
          <section className="mt-10 rounded-lg border border-white/10 bg-zinc-950/80 p-10 text-center shadow-glow">
            <p className="text-2xl font-semibold text-zinc-50">No client programs assigned yet.</p>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-zinc-500">
              Ask an Admin to assign this client user to one or more programs. Assigned programs will appear here as an executive portfolio.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
