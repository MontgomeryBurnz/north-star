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
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    heroDot: "bg-emerald-400",
    marker: "bg-blue-600",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    progress: "bg-emerald-500",
    text: "text-emerald-600"
  },
  "at-risk": {
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    heroDot: "bg-amber-400",
    marker: "bg-amber-500",
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    progress: "bg-amber-500",
    text: "text-amber-600"
  },
  blocked: {
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
    heroDot: "bg-rose-400",
    marker: "bg-rose-500",
    pill: "border-rose-200 bg-rose-50 text-rose-700",
    progress: "bg-rose-500",
    text: "text-rose-600"
  },
  watch: {
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
    heroDot: "bg-blue-400",
    marker: "bg-blue-500",
    pill: "border-blue-200 bg-blue-50 text-blue-700",
    progress: "bg-blue-500",
    text: "text-blue-600"
  }
};

const priorityStyles = {
  High: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-rose-100 text-rose-700"
} as const;

const roadmapSegmentStyles = {
  Discover: "bg-blue-200 text-blue-700",
  Plan: "bg-violet-200 text-violet-700",
  Execute: "bg-blue-700 text-white",
  Stabilize: "bg-emerald-200 text-emerald-700",
  Value: "bg-slate-200 text-slate-500"
} as const;

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
      <Button type="submit" variant="outline" size="sm" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </form>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-32 rounded-[1.4rem] border border-slate-200 bg-white/90 p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-8 text-4xl font-extrabold tracking-normal text-slate-800">{value}</p>
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
    return "border-rose-200 bg-rose-50 text-rose-600";
  }
  if (risk.trend === "Better") {
    return "border-emerald-200 bg-emerald-50 text-emerald-600";
  }
  return "border-slate-200 bg-white text-slate-500";
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
        "grid w-full gap-5 rounded-[1.35rem] p-5 text-left transition-colors",
        selected ? "bg-white shadow-sm ring-2 ring-blue-200" : "bg-white/55 hover:bg-white"
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(15rem,1.15fr)_10rem_12rem] lg:items-center">
        <span className="rounded-full bg-gradient-to-r from-blue-600 to-blue-400 px-8 py-4 text-center text-base font-bold text-white shadow-sm">
          {program.name}
        </span>
        <span>
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">RAG</span>
          <span className={cn("mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold", styles.badge)}>{program.postureLabel}</span>
        </span>
        <span>
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">% Complete</span>
          <span className="mt-2 block text-2xl font-extrabold text-slate-800">
            {program.metrics.programCompletionPercent}% <span className={styles.text}>{program.completionDelta}</span>
          </span>
        </span>
      </div>
      <div className="grid gap-4 text-slate-500 md:grid-cols-3">
        <span>
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Owner</span>
          <span className="mt-2 block font-semibold">{program.owner}</span>
        </span>
        <span>
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Phase</span>
          <span className="mt-2 block font-semibold">{program.phase}</span>
        </span>
        <span>
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Next Milestone</span>
          <span className="mt-2 block font-semibold text-slate-800">{program.nextMilestone.name}</span>
          <span className="text-sm">{program.nextMilestone.dateLabel}</span>
        </span>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Status Note</p>
        <p className="mt-2 text-base leading-7 text-slate-500">{program.statusNote}</p>
      </div>
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-blue-600">{children}</p>;
}

function UpcomingMilestonesPanel({ milestones }: { milestones: ClientPortalPortfolioMilestone[] }) {
  return (
    <section className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="rounded-[1.2rem] bg-gradient-to-r from-blue-600 to-blue-400 px-6 py-5 text-center text-lg font-extrabold text-white">
        Upcoming Milestones
      </div>
      <div className="mt-5 grid gap-4">
        {milestones.length ? milestones.map((milestone) => (
          <div key={milestone.id} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-4 rounded-[1.15rem] border border-slate-200 bg-white p-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-center text-slate-700">
              <span className="block text-lg font-extrabold">{milestone.dateLabel.split(" ")[0] ?? "Next"}</span>
              <span className="block text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{milestone.dateLabel.split(" ")[1] ?? ""}</span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-slate-800">{milestone.title}</p>
              <p className="mt-1 truncate text-sm font-medium text-slate-500">{milestone.programName}</p>
            </div>
            <span className={cn("h-fit rounded-full px-3 py-1 text-sm font-bold", priorityStyles[milestone.priority])}>
              {milestone.priority}
            </span>
          </div>
        )) : (
          <p className="rounded-[1rem] border border-slate-200 bg-slate-50 p-5 text-base font-semibold leading-7 text-slate-500">
            Upcoming milestones will appear after programs capture delivery checkpoints or board due dates.
          </p>
        )}
      </div>
    </section>
  );
}

function PortfolioRisksPanel({ risks }: { risks: ClientPortalPortfolioRisk[] }) {
  return (
    <section className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="rounded-[1.2rem] bg-gradient-to-r from-blue-600 to-blue-400 px-6 py-5 text-center text-lg font-extrabold text-white">
        Key Risks Across Portfolio
      </div>
      <div className="mt-5 grid gap-4">
        {risks.length ? risks.map((risk) => (
          <div key={risk.id} className={cn("rounded-[1.2rem] border p-5", riskTone(risk))}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-lg font-extrabold leading-8 text-slate-900">{risk.description}</p>
              <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold">
                <TrendIcon trend={risk.trend} />
                {risk.trend}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">
              {risk.programName} <span className="mx-2">Severity: {risk.severity}</span>
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-500">Mitigation: {risk.mitigationOwner}</p>
          </div>
        )) : (
          <p className="rounded-[1rem] border border-slate-200 bg-slate-50 p-5 text-base font-semibold leading-7 text-slate-500">
            No executive risks are currently visible across the selected portfolio.
          </p>
        )}
      </div>
    </section>
  );
}

function PortfolioRoadmap({ roadmap }: { roadmap: ClientPortalRoadmapRow[] }) {
  return (
    <section className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm">
      <SectionLabel>Portfolio Roadmap - FY25</SectionLabel>
      <h2 className="mt-4 text-2xl font-extrabold text-slate-800">Program Timeline</h2>
      <div className="mt-6 flex flex-wrap gap-8 text-xl font-extrabold text-slate-400">
        {["Q1 FY25", "Q2 FY25", "Q3 FY25", "Q4 FY25", "Q1 FY26"].map((quarter) => (
          <span key={quarter} className={quarter === "Q3 FY25" ? "text-blue-700" : undefined}>
            {quarter}
          </span>
        ))}
      </div>
      <div className="mt-8 grid gap-8">
        {roadmap.map((row) => {
          const markerStyle = postureStyles[row.markerTone];
          return (
            <div key={row.programId}>
              <p className="mb-4 text-lg font-extrabold text-slate-700">{row.programName}</p>
              <div className="relative">
                <div className="grid overflow-hidden rounded-full md:grid-cols-5">
                  {row.segments.map((segment) => (
                    <div key={`${row.programId}-${segment.label}`} className={cn("px-4 py-4 text-center text-sm font-extrabold", roadmapSegmentStyles[segment.label])}>
                      {segment.label}
                    </div>
                  ))}
                </div>
                <div
                  className={cn("absolute -top-2 h-16 w-4 rounded-md shadow-sm", markerStyle.marker)}
                  style={{ left: `calc(${row.markerPosition}% - 0.5rem)` }}
                />
                <p className={cn("mt-4 text-sm font-extrabold", markerStyle.text)} style={{ marginLeft: `max(0rem, calc(${row.markerPosition}% - 5rem))` }}>
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

  return (
    <section className="rounded-b-[1.8rem] bg-slate-950 px-6 py-8 text-white shadow-sm md:px-9">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.5fr)] xl:items-start">
        <div>
          <h2 className="text-4xl font-extrabold tracking-normal">{program.name}</h2>
          <p className="mt-4 text-lg font-semibold text-blue-200">Core Delivery transformation program overview</p>
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-base text-slate-300">
            <span>Executive Sponsor: <strong className="text-white">{program.executiveSponsor}</strong></span>
            <span>Program Lead: <strong className="text-white">{program.programLead}</strong></span>
            <span>PMO: <strong className="text-white">{program.pmo}</strong></span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-3">
          <HeroMetric label="Overall Status" value={program.statusSignal} dot={styles.heroDot} />
          <HeroMetric label="% Complete" value={`${program.metrics.programCompletionPercent}%`} delta={program.completionDelta} />
          <HeroMetric label="Current Phase" value={program.phase} />
        </div>
      </div>
      <div className="mt-8 border-t border-white/15 pt-6">
        <div className="grid gap-5 text-base font-semibold text-slate-200 md:grid-cols-2">
          <StatusBullet tone="neutral">Status unchanged from prior cycle</StatusBullet>
          <StatusBullet tone="good">Percent complete {program.completionDelta} (current {program.metrics.programCompletionPercent}%)</StatusBullet>
        </div>
        <div className="mt-7">
          <StatusBullet tone={program.posture === "on-track" ? "good" : "risk"}>
            Risk exposure {program.posture === "on-track" ? "remains contained" : "requires attention"}: {program.topRisk}
          </StatusBullet>
        </div>
      </div>
    </section>
  );
}

function HeroMetric({ dot, label, value, delta }: { delta?: string; dot?: string; label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 flex items-center gap-3 text-2xl font-extrabold text-white">
        {dot ? <span className={cn("h-4 w-4 rounded-full", dot)} /> : null}
        {value}
        {delta ? <span className="text-lg text-emerald-400">{delta}</span> : null}
      </p>
    </div>
  );
}

function StatusBullet({ children, tone }: { children: ReactNode; tone: "neutral" | "good" | "risk" }) {
  return (
    <p className="flex gap-3 leading-7">
      <span className={cn("mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full", tone === "good" ? "bg-emerald-400" : tone === "risk" ? "bg-rose-400" : "bg-slate-400")} />
      <span>{children}</span>
    </p>
  );
}

function ExecutiveCard({ children, icon: Icon, title }: { children: ReactNode; icon: LucideIcon; title: string }) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
      <h3 className="flex items-center gap-3 text-xl font-extrabold text-slate-900">
        <Icon className="h-5 w-5 text-blue-600" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function ProgramMilestoneTimeline({ program }: { program: ClientPortalProgram }) {
  return (
    <ExecutiveCard icon={Flag} title="Milestone Timeline">
      <div className="mt-10 overflow-x-auto pb-3">
        <div className="grid min-w-[58rem] grid-cols-6 items-start gap-0">
          {program.milestones.map((milestone, index) => {
            const isComplete = milestone.status === "complete";
            const isCurrent = milestone.status === "current";
            return (
              <div key={`${milestone.name}-${index}`} className="relative text-center">
                <div className={cn("absolute left-0 right-0 top-7 h-2", index === 0 ? "left-1/2" : "", index === program.milestones.length - 1 ? "right-1/2" : "", isComplete || isCurrent ? "bg-blue-700" : "bg-slate-200")} />
                <div
                  className={cn(
                    "relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 text-xl font-extrabold shadow-sm",
                    isComplete ? "border-blue-200 bg-blue-700 text-white" : isCurrent ? "border-amber-200 bg-amber-500 text-white" : "border-slate-200 bg-slate-100 text-slate-400"
                  )}
                >
                  {isComplete ? <CheckCircle2 className="h-7 w-7" /> : isCurrent ? <Compass className="h-7 w-7" /> : <Flag className="h-6 w-6" />}
                </div>
                <p className={cn("mt-4 text-base font-extrabold", isComplete ? "text-blue-700" : isCurrent ? "text-amber-600" : "text-slate-500")}>
                  {milestone.name}
                </p>
                <p className="mt-5 text-sm font-semibold text-slate-400">{milestone.dateLabel}</p>
                <p className={cn("mt-2 text-sm font-extrabold", isComplete ? "text-emerald-600" : isCurrent ? "text-emerald-600" : "text-slate-400")}>
                  {isComplete ? "On time" : isCurrent ? "Current checkpoint" : "On track"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </ExecutiveCard>
  );
}

function ExecutiveListCard({ icon, items, title }: { icon: LucideIcon; items: string[]; title: string }) {
  return (
    <ExecutiveCard icon={icon} title={title}>
      <ul className="mt-6 grid gap-4 text-lg leading-8 text-slate-600">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-4">
            <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-600" />
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
        <div className="mt-7 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-400">
                <th className="py-3 pr-5">Severity</th>
                <th className="py-3 pr-5">Description</th>
                <th className="py-3 pr-5">Owner</th>
                <th className="py-3 pr-5">Mitigation</th>
                <th className="py-3">Target Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold leading-6 text-slate-600">
              {program.executiveRisks.map((risk, index) => (
                <tr key={`${risk.description}-${index}`}>
                  <td className={cn("py-4 pr-5 font-extrabold", risk.severity === "High" ? "text-rose-600" : risk.severity === "Medium" ? "text-amber-600" : "text-emerald-600")}>{risk.severity}</td>
                  <td className="py-4 pr-5">{risk.description}</td>
                  <td className="py-4 pr-5">{risk.owner}</td>
                  <td className="py-4 pr-5">{risk.mitigation}</td>
                  <td className="py-4">{risk.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ExecutiveCard>

      <section className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-7 shadow-sm">
        <h3 className="flex items-center gap-3 text-xl font-extrabold text-slate-900">
          <ClipboardCheck className="h-5 w-5 text-blue-600" />
          Leadership Decisions Needed
        </h3>
        <div className="mt-6 grid gap-4">
          {program.leadershipDecisions.map((decision, index) => (
            <div key={`${decision.title}-${index}`} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 rounded-[1rem] border border-slate-200 bg-white p-5">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-lg font-extrabold text-white", index === 0 ? "bg-rose-500" : "bg-amber-500")}>
                {index + 1}
              </span>
              <span>
                <span className="block text-lg font-extrabold leading-7 text-slate-900">{decision.title}</span>
                <span className="mt-1 block text-sm font-semibold text-slate-400">{decision.meta}</span>
              </span>
            </div>
          ))}
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
          const riskStyle =
            workstream.status.toLowerCase().includes("risk") || workstream.status.toLowerCase().includes("blocked")
              ? "bg-amber-500"
              : "bg-emerald-500";
          return (
            <div key={workstream.name} className="rounded-[1.1rem] border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-extrabold leading-7 text-slate-900">{workstream.name}</h4>
                <span className={cn("mt-1 h-4 w-4 rounded-full", riskStyle)} />
              </div>
              <div className="mt-5">
                <div className="h-3 rounded-full bg-slate-200">
                  <div className={cn("h-full rounded-full", riskStyle)} style={{ width: `${workstream.percent}%` }} />
                </div>
                <p className="mt-2 text-right text-lg font-extrabold text-slate-500">{workstream.percent}%</p>
              </div>
              <p className="mt-4 text-base font-semibold leading-7 text-slate-500">{workstream.note}</p>
              <p className="mt-4 text-sm font-semibold text-slate-400">Owner: {workstream.owner}</p>
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
    <section className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-7 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">Client Decisions / Approvals</h3>
          <p className="mt-2 text-base leading-7 text-slate-500">Capture executive decisions that should be tracked against this program.</p>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-blue-700">{decisions.length} open</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={decisionText}
          onChange={(event) => setDecisionText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void addDecision();
          }}
          placeholder="Add a client decision or approval needed"
          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400"
        />
        <Button type="button" onClick={() => void addDecision()} className="h-12 rounded-xl bg-blue-700 px-6 hover:bg-blue-800">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {saveStatus ? <p className="mt-2 text-sm font-semibold text-slate-500">{saveStatus}</p> : null}

      <div className="mt-5 grid gap-3">
        {decisions.map((decision) => (
          <div key={decision.id} className="rounded-xl border border-slate-200 bg-white p-4 text-base leading-7 text-slate-600">
            <p className="font-bold text-slate-900">{decision.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-400">{decision.source}</p>
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
        <p className="mt-6 text-lg leading-9 text-slate-600">{program.executiveOverview}</p>
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
  const [selectedProgramId, setSelectedProgramId] = useState(portfolio.programs[0]?.id ?? "");
  const [visibleProgramIds, setVisibleProgramIds] = useState(() => new Set(portfolio.programs.map((program) => program.id)));
  const detailRef = useRef<HTMLDivElement>(null);
  const visiblePrograms = useMemo(
    () => portfolio.programs.filter((program) => visibleProgramIds.has(program.id)),
    [portfolio.programs, visibleProgramIds]
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

  function selectProgram(programId: string) {
    setSelectedProgramId(programId);
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef4fb] text-slate-800">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="northstar-shell flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">North Star Client Portal</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-500">{viewerLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {canReturnToInternal ? (
              <Button asChild variant="outline" size="sm" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
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
          <h1 className="text-4xl font-extrabold tracking-normal text-slate-800 md:text-5xl">FY25 Strategic Program Intelligence</h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-lg font-bold text-slate-400">
            <span>Week Ending {formatDate(portfolio.generatedAt)}</span>
            <span className="rounded-full bg-emerald-100 px-4 py-2 text-base text-emerald-700">Refreshed {formatRefreshTime(portfolio.generatedAt)}</span>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <MetricTile label="Total Programs" value={String(visibleMetrics.totalPrograms)} />
          <MetricTile label="At Risk" value={String(visibleMetrics.atRisk)} />
          <MetricTile label="Delayed" value={String(visibleMetrics.delayed)} />
          <MetricTile label="Avg % Complete" value={`${visibleMetrics.averageCompletionPercent}%`} />
          <MetricTile label="Decisions Pending" value={String(visibleMetrics.decisions)} />
        </section>

        {portfolio.programs.length ? (
          <>
            <section className="mt-8 rounded-[1.5rem] border border-slate-200 bg-white/70 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Portfolio scope</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Toggle which programs appear in the executive view.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setVisibleProgramIds(new Set(portfolio.programs.map((program) => program.id)))}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-blue-700 hover:bg-blue-50"
                >
                  All programs
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {portfolio.programs.map((program) => (
                  <button
                    key={program.id}
                    type="button"
                    aria-pressed={visibleProgramIds.has(program.id)}
                    onClick={() => toggleProgram(program.id)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-extrabold transition-colors",
                      visibleProgramIds.has(program.id)
                        ? "border-blue-200 bg-blue-700 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
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
                <h2 className="mt-4 text-2xl font-extrabold text-slate-800">Weekly Updates</h2>
                <p className="mt-2 text-lg font-semibold text-slate-400">
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
          <section className="mt-10 rounded-[1.5rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-slate-900">No client programs assigned yet.</p>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-500">
              Ask an Admin to assign this client user to one or more programs. Assigned programs will appear here as an executive portfolio.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
