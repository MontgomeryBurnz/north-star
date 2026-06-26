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
  Download,
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
    badge: "border border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    heroDot: "bg-emerald-400",
    marker: "bg-emerald-500",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-800",
    progress: "bg-emerald-500",
    text: "text-emerald-700"
  },
  "at-risk": {
    badge: "border border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    heroDot: "bg-amber-400",
    marker: "bg-amber-500",
    pill: "border-amber-200 bg-amber-50 text-amber-800",
    progress: "bg-amber-500",
    text: "text-amber-700"
  },
  blocked: {
    badge: "border border-rose-200 bg-rose-50 text-rose-800",
    dot: "bg-rose-500",
    heroDot: "bg-rose-400",
    marker: "bg-rose-500",
    pill: "border-rose-200 bg-rose-50 text-rose-800",
    progress: "bg-rose-500",
    text: "text-rose-700"
  },
  watch: {
    badge: "border border-sky-200 bg-sky-50 text-sky-800",
    dot: "bg-sky-500",
    heroDot: "bg-sky-400",
    marker: "bg-sky-500",
    pill: "border-sky-200 bg-sky-50 text-sky-800",
    progress: "bg-sky-500",
    text: "text-sky-700"
  }
};

const priorityStyles = {
  High: "border border-rose-200 bg-rose-50 text-rose-800",
  Medium: "border border-amber-200 bg-amber-50 text-amber-800",
  Low: "border border-emerald-200 bg-emerald-50 text-emerald-800"
} as const;

type RoadmapSegmentState = ClientPortalRoadmapRow["segments"][number]["state"];
type RoadmapWindowMode = ClientPortalRoadmapRow["windowMode"];

const roadmapPhaseSegmentStyles: Record<RoadmapSegmentState, string> = {
  complete: "border-r border-white/30 bg-emerald-100 text-emerald-900",
  current: "border-r border-white/30 bg-emerald-500 text-white",
  next: "border-r border-slate-200 bg-slate-100 text-slate-500"
} as const;

function roadmapSegmentClass(label: string, state: RoadmapSegmentState, windowMode: RoadmapWindowMode) {
  if (windowMode === "year") {
    return cn(roadmapPhaseSegmentStyles[state], label === "Value" ? "border-r-0" : "");
  }

  if (state === "complete") return "border-r border-white/30 bg-emerald-100 text-emerald-900";
  if (state === "current") return "border-r border-white/30 bg-sky-600 text-white";
  return "border-r border-slate-200 bg-slate-100 text-slate-500";
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
      <Button type="submit" variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950">
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </form>
  );
}

function MetricTile({ helper, label, value }: { helper?: string; label: string; value: string }) {
  return (
    <div className="min-h-32 rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-8 text-4xl font-semibold tracking-normal text-slate-950">{value}</p>
      {helper ? <MetricBasisLabel className="mt-3 text-slate-600">{helper}</MetricBasisLabel> : null}
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
    return "border-rose-200 bg-rose-50 text-rose-900";
  }
  if (risk.trend === "Better") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  return "border-slate-200 bg-white text-slate-800";
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
        "grid w-full gap-5 rounded-lg border p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-colors",
        selected
          ? "border-sky-300 bg-sky-50 ring-2 ring-sky-100"
          : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/60"
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(15rem,1.15fr)_10rem_12rem] lg:items-center">
        <span className="rounded-md border border-sky-200 bg-sky-600 px-8 py-4 text-center text-base font-semibold text-white shadow-sm">
          <span className="block">{program.name}</span>
          <span className="mt-1 block text-xs font-medium uppercase tracking-[0.14em] text-sky-100">{program.clientName}</span>
        </span>
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">RAG</span>
          <span className={cn("mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium", styles.badge)}>{program.postureLabel}</span>
        </span>
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">% Complete</span>
          <span className="mt-2 block text-2xl font-semibold text-slate-950">
            {program.metrics.programCompletionPercent}%{" "}
            {program.completionDelta ? <span className={styles.text}>{program.completionDelta}</span> : null}
          </span>
          <span className="mt-1 block text-xs font-medium text-slate-600">
            Basis: {program.metrics.completionBasis} · {program.metrics.completionScheduleLabel}
          </span>
        </span>
      </div>
      <div className="grid gap-4 text-slate-700 md:grid-cols-3">
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Owner</span>
          <span className="mt-2 block font-medium">{program.owner}</span>
        </span>
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Phase</span>
          <span className="mt-2 block font-medium">{program.phase}</span>
        </span>
        <span>
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next Milestone</span>
          <span className="mt-2 block font-semibold text-slate-950">{program.nextMilestone.name}</span>
          <span className="text-sm">{program.nextMilestone.dateLabel}</span>
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status Note</p>
        <p className="mt-2 text-base leading-7 text-slate-700">{program.statusNote}</p>
      </div>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">{children}</p>;
}

function UpcomingMilestonesPanel({ milestones }: { milestones: ClientPortalPortfolioMilestone[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="rounded-md bg-sky-600 px-6 py-5 text-center text-lg font-semibold text-white">
        Upcoming Milestones
      </div>
      <div className="mt-5 grid gap-4">
        {milestones.length ? milestones.map((milestone) => (
          <div key={milestone.id} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-md border border-slate-200 bg-white px-2 py-3 text-center text-slate-950">
              <span className="block text-lg font-semibold">{milestone.dateLabel.split(" ")[0] ?? "Next"}</span>
              <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{milestone.dateLabel.split(" ")[1] ?? ""}</span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-950">{milestone.title}</p>
              <p className="mt-1 truncate text-sm font-medium text-slate-600">{milestone.programName}</p>
            </div>
            <span className={cn("h-fit rounded-full px-3 py-1 text-sm font-medium", priorityStyles[milestone.priority])}>
              {milestone.priority}
            </span>
          </div>
        )) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-base font-medium leading-7 text-slate-600">
            Upcoming milestones will appear after programs capture delivery checkpoints or board due dates.
          </p>
        )}
      </div>
    </section>
  );
}

function PortfolioRisksPanel({ risks }: { risks: ClientPortalPortfolioRisk[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="rounded-md bg-slate-900 px-6 py-5 text-center text-lg font-semibold text-white">
        Key Risks Across Portfolio
      </div>
      <div className="mt-5 grid gap-4">
        {risks.length ? risks.map((risk) => (
          <div key={risk.id} className={cn("rounded-lg border p-5", riskTone(risk))}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-lg font-semibold leading-8 text-slate-950">{risk.description}</p>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold">
                <TrendIcon trend={risk.trend} />
                {risk.trend}
              </span>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              {risk.programName} <span className="mx-2">Severity: {risk.severity}</span>
            </p>
            <p className="mt-3 text-sm font-medium text-slate-700">Mitigation: {risk.mitigationOwner}</p>
          </div>
        )) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-base font-medium leading-7 text-slate-600">
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
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionLabel>{timeframeLabel ? `Portfolio Roadmap - ${timeframeLabel}` : "Portfolio Roadmap"}</SectionLabel>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">Program Timeline</h2>
        </div>
        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
          {windowMode} view
        </span>
      </div>
      <div className={cn("mt-6 flex flex-wrap font-semibold", isShortWindow ? "gap-2 text-sm" : "gap-8 text-xl text-slate-400")}>
        {activeWindowLabels.map((windowLabel, index) => (
          <span
            key={windowLabel}
            className={cn(
              isShortWindow ? "rounded-full border px-3 py-1.5" : "",
              index === currentWindowIndex
                ? isShortWindow
                  ? "border-sky-200 bg-sky-50 text-sky-800"
                  : "text-sky-800"
                : isShortWindow
                  ? "border-slate-200 bg-slate-50 text-slate-500"
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
                <p className="text-lg font-semibold text-slate-950">{row.programName}</p>
                {row.timeframeLabel && row.timeframeLabel !== timeframeLabel ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{row.timeframeLabel}</p>
                ) : null}
              </div>
              <div className="relative">
                <div
                  className={cn("grid overflow-hidden rounded-full border border-slate-200", rowIsShortWindow ? "" : "bg-slate-100")}
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
                  className={cn("absolute -top-2 h-16 w-4 rounded-md shadow-[0_12px_24px_rgba(15,23,42,0.18)]", markerStyle.marker)}
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
    <section className="rounded-lg border border-slate-800 bg-slate-950 px-6 py-8 text-white shadow-[0_22px_60px_rgba(15,23,42,0.28)] md:px-9">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.5fr)] xl:items-start">
        <div>
          <h2 className="text-4xl font-semibold tracking-normal">{program.name}</h2>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-sky-200">{program.clientName}</p>
          <p className="mt-4 text-lg font-medium text-sky-100">{program.primaryOutcome}</p>
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-base text-slate-300">
            <span data-client-executive-sponsor>Executive Sponsor: <strong className="text-white">{program.executiveSponsor}</strong></span>
            <span data-client-program-lead>Program Lead: <strong className="text-white">{program.programLead}</strong></span>
            <span data-client-pmo>PMO: <strong className="text-white">{program.pmo}</strong></span>
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
      <div className="mt-8 border-t border-white/15 pt-6">
        <div className="grid gap-5 text-base font-medium text-slate-200 md:grid-cols-2">
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
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 flex items-center gap-3 text-2xl font-semibold text-white">
        {dot ? <span className={cn("h-4 w-4 rounded-full", dot)} /> : null}
        {value}
        {delta ? <span className="text-lg text-emerald-300">{delta}</span> : null}
      </p>
      {helper ? <MetricBasisLabel className="mt-1 text-slate-300">{helper}</MetricBasisLabel> : null}
    </div>
  );
}

function StatusBullet({ children, tone }: { children: ReactNode; tone: "neutral" | "good" | "risk" }) {
  return (
    <p className="flex gap-3 leading-7">
      <span className={cn("mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full", tone === "good" ? "bg-emerald-300" : tone === "risk" ? "bg-rose-300" : "bg-slate-400")} />
      <span>{children}</span>
    </p>
  );
}

function ExecutiveCard({ children, icon: Icon, title }: { children: ReactNode; icon: LucideIcon; title: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <h3 className="flex items-center gap-3 text-xl font-semibold text-slate-950">
        <Icon className="h-5 w-5 text-sky-700" />
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
          <p className="-mt-4 mb-8 inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800">
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
                      isComplete || isCurrent ? "bg-emerald-500" : "bg-slate-200"
                    )}
                  />
                  <div
                    className={cn(
                      "relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 text-xl font-semibold shadow-sm",
                      isComplete
                        ? "border-emerald-100 bg-emerald-500 text-white"
                        : isCurrent
                          ? "border-amber-100 bg-amber-500 text-white"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                    )}
                  >
                    {isComplete ? <CheckCircle2 className="h-7 w-7" /> : isCurrent ? <Compass className="h-7 w-7" /> : <Flag className="h-6 w-6" />}
                  </div>
                  <p className={cn("mt-4 text-base font-semibold", isComplete ? "text-emerald-700" : isCurrent ? "text-amber-700" : "text-slate-500")}>
                    {milestone.name}
                  </p>
                  <p className="mt-5 text-sm font-medium text-slate-600">{milestone.dateLabel}</p>
                  <p className={cn("mt-2 text-sm font-semibold", isComplete ? "text-emerald-700" : isCurrent ? "text-emerald-700" : "text-slate-500")}>
                    {isComplete ? "On time" : isCurrent ? "Current checkpoint" : "On track"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 text-base font-medium leading-7 text-slate-600">
          Milestones will appear after the team saves a next milestone or delivery board due date in Program Hub.
        </p>
      )}
    </ExecutiveCard>
  );
}

function ExecutiveListCard({ icon, items, title }: { icon: LucideIcon; items: string[]; title: string }) {
  return (
    <ExecutiveCard icon={icon} title={title}>
      <ul className="mt-6 grid gap-4 text-lg leading-8 text-slate-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-4">
            <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
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
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  <th className="py-3 pr-5">Severity</th>
                  <th className="py-3 pr-5">Description</th>
                  <th className="py-3 pr-5">Owner</th>
                  <th className="py-3 pr-5">Mitigation</th>
                  <th className="py-3">Target Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm font-medium leading-6 text-slate-700">
                {program.executiveRisks.map((risk, index) => (
                  <tr key={`${risk.description}-${index}`}>
                    <td
                      className={cn(
                        "py-4 pr-5 font-semibold",
                        risk.severity === "High" ? "text-rose-700" : risk.severity === "Medium" ? "text-amber-700" : "text-emerald-700"
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
          <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 text-base font-medium leading-7 text-slate-600">
            No executive risks, issues, or dependencies are currently captured for this program.
          </p>
        )}
      </ExecutiveCard>

      <section className="rounded-lg border border-sky-200 bg-sky-50 p-7 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h3 className="flex items-center gap-3 text-xl font-semibold text-slate-950">
          <ClipboardCheck className="h-5 w-5 text-sky-700" />
          Leadership Decisions Needed
        </h3>
        <div className="mt-6 grid gap-4">
          {program.leadershipDecisions.length ? (
            program.leadershipDecisions.map((decision, index) => (
              <div key={`${decision.title}-${index}`} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 rounded-lg border border-slate-200 bg-white p-5">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-white", index === 0 ? "bg-rose-500" : "bg-amber-500")}>
                  {index + 1}
                </span>
                <span>
                  <span className="block text-lg font-semibold leading-7 text-slate-950">{decision.title}</span>
                  <span className="mt-1 block text-sm font-medium text-slate-600">{decision.meta}</span>
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white p-5 text-base font-medium leading-7 text-slate-600">
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
            ? "bg-rose-500"
            : normalizedStatus.includes("review")
              ? "bg-amber-500"
              : normalizedStatus.includes("no linked") || normalizedStatus.includes("not started")
                ? "bg-slate-400"
                : "bg-emerald-500";
          return (
            <div
              key={workstream.name}
              data-client-workstream-card={workstream.name}
              data-client-workstream-percent={workstream.percent}
              className="rounded-lg border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-semibold leading-7 text-slate-950">{workstream.name}</h4>
                <span className={cn("mt-1 h-4 w-4 rounded-full", riskStyle)} />
              </div>
              <div className="mt-5">
                <div className="h-3 rounded-full bg-slate-200">
                  <div className={cn("h-full rounded-full", riskStyle)} style={{ width: `${workstream.percent}%` }} />
                </div>
                <p className="mt-2 text-right text-lg font-semibold text-slate-700">{workstream.percent}%</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Task basis: {workstream.taskCount ? workstream.percentBasis : "No tasks linked"}
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-800">
                  Schedule: {workstream.scheduleLabel}
                </span>
              </div>
              <p className="mt-4 text-base font-medium leading-7 text-slate-700">{workstream.note}</p>
              <p className="mt-4 text-sm font-medium text-slate-600">
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
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-7 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">Client Decisions / Approvals</h3>
          <p className="mt-2 text-base leading-7 text-slate-700">Capture executive decisions that should be tracked against this program.</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800">{decisions.length} open</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={decisionText}
          onChange={(event) => setDecisionText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void addDecision();
          }}
          placeholder="Add a client decision or approval needed"
          className="h-12 rounded-md border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
        <Button type="button" onClick={() => void addDecision()} className="h-12 rounded-md bg-emerald-600 px-6 text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {saveStatus ? <p className="mt-2 text-sm font-medium text-slate-700">{saveStatus}</p> : null}

      <div className="mt-5 grid gap-3">
        {decisions.map((decision) => (
          <div key={decision.id} className="rounded-lg border border-emerald-200 bg-white p-4 text-base leading-7 text-slate-700">
            <p className="font-semibold text-slate-950">{decision.label}</p>
            <p className="mt-1 text-sm font-medium text-slate-600">{decision.source}</p>
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
        <p className="mt-6 text-lg leading-9 text-slate-700">{program.executiveOverview}</p>
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
    <main className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="northstar-shell flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">North Star Client Portal</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-600">{viewerLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {canReturnToInternal ? (
              <Button asChild variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950">
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
        <section className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-normal text-slate-950 md:text-5xl">Portfolio Dashboard</h1>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-lg font-medium text-slate-600">
              <span>Week Ending {formatDate(portfolio.generatedAt)}</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-base font-semibold text-emerald-800">Refreshed {formatRefreshTime(portfolio.generatedAt)}</span>
            </div>
          </div>
          {selectedClient ? (
            <Button asChild className="rounded-md bg-slate-950 px-5 py-3 text-white shadow-sm hover:bg-slate-800">
              <Link
                href={`/client/export?scope=portfolio&client=${encodeURIComponent(selectedClient.clientName)}`}
                target="_blank"
                rel="noreferrer"
                data-client-export-portfolio
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Link>
            </Button>
          ) : null}
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
            <section className="mt-8 rounded-lg border border-sky-200 bg-sky-50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]" data-client-portfolio-selector>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">Client portfolio</p>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                    Select the client first, then inspect the programs inside that portfolio.
                  </p>
                </div>
                {selectedClient ? (
                  <span className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800">
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
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:text-sky-800"
                    )}
                  >
                    {client.clientName}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Portfolio scope</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    Toggle which {selectedClient?.clientName ?? "client"} programs appear in the executive view.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVisibleProgramIds(new Set(selectedClientProgramIds))}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-sky-800 transition-colors hover:border-sky-400 hover:bg-sky-50"
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
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:text-sky-800"
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
                <h2 className="mt-4 text-2xl font-semibold text-slate-950">Weekly Updates</h2>
                <p className="mt-2 text-lg font-medium text-slate-600">
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
          <section className="mt-10 rounded-lg border border-slate-200 bg-white p-10 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <p className="text-2xl font-semibold text-slate-950">No client programs assigned yet.</p>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Ask an Admin to assign this client user to one or more programs. Assigned programs will appear here as an executive portfolio.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
