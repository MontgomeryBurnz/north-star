"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  ClipboardCheck,
  Compass,
  LogOut,
  Plus,
  ShieldAlert,
  Sparkles,
  TriangleAlert
} from "lucide-react";
import type { ClientPortalPortfolio, ClientPortalProgram, ClientProgramPosture } from "@/lib/client-portal";
import type { ClientDecisionRequest } from "@/lib/program-intelligence-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const postureStyles: Record<ClientProgramPosture, { badge: string; dot: string; ring: string; signal: string }> = {
  "on-track": {
    badge: "border-emerald-300/25 bg-emerald-300/[0.09] text-emerald-100",
    dot: "bg-emerald-300",
    ring: "from-emerald-300/40 to-emerald-300/5",
    signal: "Green"
  },
  "at-risk": {
    badge: "border-amber-300/25 bg-amber-300/[0.09] text-amber-100",
    dot: "bg-amber-300",
    ring: "from-amber-300/40 to-amber-300/5",
    signal: "Yellow"
  },
  blocked: {
    badge: "border-rose-300/25 bg-rose-300/[0.09] text-rose-100",
    dot: "bg-rose-300",
    ring: "from-rose-300/40 to-rose-300/5",
    signal: "Red"
  },
  watch: {
    badge: "border-cyan-300/25 bg-cyan-300/[0.09] text-cyan-100",
    dot: "bg-cyan-300",
    ring: "from-cyan-300/40 to-cyan-300/5",
    signal: "Watch"
  }
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function PortalLogoutForm() {
  return (
    <form action="/api/auth/user/logout" method="post">
      <Button type="submit" variant="outline" size="sm" className="border-white/15 bg-black/20 text-zinc-100 hover:bg-white/[0.08]">
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </form>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  detail
}: {
  detail: string;
  icon: typeof CircleGauge;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{label}</p>
        <Icon className="h-4 w-4 text-emerald-200" />
      </div>
      <p className="mt-4 text-3xl font-semibold text-zinc-50">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{detail}</p>
    </div>
  );
}

function HealthDial({ score }: { score: number }) {
  return (
    <div className="relative grid aspect-square min-h-40 w-full max-w-44 place-items-center rounded-full border border-emerald-300/15 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.16),rgba(9,9,11,0.28)_58%,rgba(9,9,11,0.8))]">
      <div
        className="absolute inset-4 rounded-full"
        style={{
          background: `conic-gradient(rgba(110, 231, 183, 0.9) ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`
        }}
      />
      <div className="absolute inset-8 rounded-full bg-zinc-950" />
      <div className="relative text-center">
        <p className="text-4xl font-semibold text-zinc-50">{score}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-emerald-200">Portfolio health</p>
      </div>
    </div>
  );
}

function derivePortfolioMetrics(programs: ClientPortalProgram[]) {
  const totalPrograms = programs.length;
  const weightedHealth = programs.reduce((total, program) => {
    if (program.posture === "on-track") return total + 100;
    if (program.posture === "watch") return total + 72;
    if (program.posture === "at-risk") return total + 46;
    return total + 18;
  }, 0);

  return {
    totalPrograms,
    onTrack: programs.filter((program) => program.posture === "on-track").length,
    risks: programs.reduce((total, program) => total + program.metrics.risks, 0),
    decisions: programs.reduce((total, program) => total + program.metrics.decisions, 0),
    healthScore: totalPrograms ? Math.round(weightedHealth / totalPrograms) : 0
  };
}

function ProgramCard({
  program,
  selected,
  onSelect
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
        "grid min-w-0 w-full gap-4 rounded-md border p-4 text-left transition-colors",
        selected ? "border-emerald-300/35 bg-emerald-300/[0.065]" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
      )}
    >
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <p className="text-base font-semibold leading-6 text-zinc-50">{program.name}</p>
          <p className="mt-1 truncate text-sm text-zinc-500">{program.owner}</p>
        </div>
        <span className={cn("w-fit max-w-full rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] sm:justify-self-end", styles.badge)}>
          {program.postureLabel}
        </span>
      </div>
      <div className="grid gap-2 text-sm leading-6 text-zinc-300">
        <p className="line-clamp-2">{program.primaryOutcome}</p>
        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-xs text-zinc-500">
          <span>{program.metrics.risks} risks</span>
          <span>{program.metrics.decisions} decisions</span>
          <span className="truncate">{program.phase}</span>
        </div>
      </div>
    </button>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-white/10">
      <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function OnePagerMetric({
  label,
  value,
  note,
  tone = "border-white/10 bg-white/[0.04]"
}: {
  label: string;
  note: string;
  tone?: string;
  value: string;
}) {
  return (
    <div className={cn("rounded-md border p-4", tone)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-zinc-50">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{note}</p>
    </div>
  );
}

function StatusMovement({ program }: { program: ClientPortalProgram }) {
  return (
    <div className="grid gap-3 rounded-md border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">Status movement</p>
      <div className="grid gap-2 lg:grid-cols-3">
        {program.executiveStatusHighlights.map((highlight, index) => (
          <div key={`${highlight}-${index}`} className="flex gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-zinc-300">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
            {highlight}
          </div>
        ))}
      </div>
    </div>
  );
}

function OnePagerList({
  icon: Icon,
  items,
  title
}: {
  icon: typeof CircleGauge;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
        <Icon className="h-4 w-4 text-emerald-200" />
        {title}
      </p>
      <div className="mt-4 grid gap-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 rounded-md border border-white/10 bg-black/20 p-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-medium text-zinc-400">
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-zinc-300">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MilestoneTimeline({ program }: { program: ClientPortalProgram }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
        <CalendarDays className="h-4 w-4 text-emerald-200" />
        Milestone timeline
      </p>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {program.milestones.map((milestone) => (
          <div key={`${milestone.name}-${milestone.status}`} className="relative rounded-md border border-white/10 bg-black/20 p-4">
            <div
              className={cn(
                "mb-4 h-1.5 rounded-full",
                milestone.status === "complete" ? "bg-emerald-300" : milestone.status === "current" ? "bg-cyan-300" : "bg-white/10"
              )}
            />
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{milestone.dateLabel}</p>
            <p className="mt-2 text-base font-semibold text-zinc-100">{milestone.name}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{milestone.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskDecisionGrid({ program }: { program: ClientPortalProgram }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="rounded-md border border-rose-300/15 bg-rose-300/[0.035] p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
          <TriangleAlert className="h-4 w-4 text-rose-200" />
          Risks, issues, and dependencies
        </p>
        <div className="mt-4 overflow-hidden rounded-md border border-white/10">
          <div className="hidden grid-cols-[7rem_minmax(0,1.3fr)_9rem_minmax(0,1fr)] gap-3 border-b border-white/10 bg-black/30 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 lg:grid">
            <span>Severity</span>
            <span>Description</span>
            <span>Owner</span>
            <span>Mitigation</span>
          </div>
          <div className="divide-y divide-white/10">
            {program.executiveRisks.map((risk, index) => (
              <div key={`${risk.description}-${index}`} className="grid gap-3 px-4 py-4 text-sm leading-6 text-zinc-300 lg:grid-cols-[7rem_minmax(0,1.3fr)_9rem_minmax(0,1fr)]">
                <span className="w-fit rounded-full border border-rose-300/20 bg-rose-300/[0.08] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-rose-100">
                  {risk.severity}
                </span>
                <span>{risk.description}</span>
                <span className="text-zinc-400">{risk.owner}</span>
                <span className="text-zinc-400">{risk.mitigation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.04] p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
          <ClipboardCheck className="h-4 w-4 text-cyan-200" />
          Leadership decisions needed
        </p>
        <div className="mt-4 grid gap-3">
          {program.leadershipDecisions.map((decision, index) => (
            <div key={`${decision.title}-${index}`} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-md border border-white/10 bg-black/20 p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300 text-sm font-semibold text-zinc-950">{index + 1}</span>
              <span>
                <span className="block text-sm font-medium leading-6 text-zinc-100">{decision.title}</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">{decision.meta}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkstreamStatusGrid({ program }: { program: ClientPortalProgram }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            <BriefcaseBusiness className="h-4 w-4 text-emerald-200" />
            Domain progress
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            What each domain is pursuing to progress the effort.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-300">
          {program.workstreams.length} domains
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {program.workstreams.map((workstream) => (
          <div key={workstream.name} className="rounded-md border border-white/10 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-zinc-100">{workstream.name}</p>
                <p className="mt-1 text-xs text-zinc-500">Owner: {workstream.owner}</p>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-100">
                {workstream.status}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
                <span>Progress signal</span>
                <span>{workstream.percent}%</span>
              </div>
              <div className="mt-2"><ProgressBar value={workstream.percent} /></div>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">{workstream.note}</p>
          </div>
        ))}
      </div>
    </div>
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
    <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.045] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">Client decisions needed</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Capture executive decisions or adds that should be tracked against this program.</p>
        </div>
        <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
          {decisions.length} open
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={decisionText}
          onChange={(event) => setDecisionText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void addDecision();
          }}
          placeholder="Add a client decision or approval needed"
          className="h-11 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
        />
        <Button type="button" onClick={() => void addDecision()} className="sm:h-11">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {saveStatus ? <p className="mt-2 text-xs leading-5 text-zinc-400">{saveStatus}</p> : null}

      <div className="mt-4 grid gap-2">
        {decisions.map((decision) => (
          <div key={decision.id} className="flex gap-3 rounded-md border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-300">
            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
            <span>
              <span className="block">{decision.label}</span>
              <span className="mt-1 block text-xs text-zinc-500">{decision.source}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgramDetail({ program }: { program: ClientPortalProgram }) {
  const styles = postureStyles[program.posture];

  return (
    <section className="grid min-w-0 gap-6">
      <div className={cn("rounded-md border bg-gradient-to-br p-5 md:p-6", styles.ring, "border-white/10")}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", styles.dot)} />
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program one-pager</p>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-zinc-50 md:text-4xl">{program.name}</h2>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-400">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">Sponsor / owner: {program.owner}</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">Updated {formatTimestamp(program.updatedAt)}</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">{program.metrics.teamRoles} domains</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <OnePagerMetric label="Overall status" value={styles.signal} note={program.postureLabel} tone="border-emerald-300/20 bg-emerald-300/[0.055]" />
            <OnePagerMetric label="% complete" value={`${program.metrics.programCompletionPercent}%`} note="Program-level signal" />
            <OnePagerMetric label="Current phase" value={program.phase} note={`${program.metrics.phaseCompletionPercent}% phase signal`} />
          </div>
        </div>
        <div className="mt-5">
          <StatusMovement program={program} />
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-white/[0.03] p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
          <Compass className="h-4 w-4 text-emerald-200" />
          Executive overview
        </p>
        <p className="mt-4 max-w-5xl text-base leading-7 text-zinc-200">{program.executiveOverview}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-emerald-300/15 bg-emerald-300/[0.045] p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-200">North Star</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{program.northStar}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">Leadership signal</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{program.leadershipSignal}</p>
          </div>
        </div>
      </div>

      <MilestoneTimeline program={program} />

      <div className="grid gap-4 xl:grid-cols-2">
        <OnePagerList icon={CheckCircle2} title="Recent accomplishments" items={program.recentAccomplishments} />
        <OnePagerList icon={Sparkles} title="Upcoming work" items={program.upcomingWork} />
      </div>

      <RiskDecisionGrid program={program} />
      <WorkstreamStatusGrid program={program} />
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
  const visiblePrograms = useMemo(
    () => portfolio.programs.filter((program) => visibleProgramIds.has(program.id)),
    [portfolio.programs, visibleProgramIds]
  );
  const visibleMetrics = useMemo(() => derivePortfolioMetrics(visiblePrograms), [visiblePrograms]);
  const selectedProgram = useMemo(
    () => visiblePrograms.find((program) => program.id === selectedProgramId) ?? visiblePrograms[0] ?? null,
    [selectedProgramId, visiblePrograms]
  );

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

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl">
        <div className="northstar-shell flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">North Star Client Portal</p>
            <p className="mt-1 truncate text-sm text-zinc-400">{viewerLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {canReturnToInternal ? (
              <Button asChild variant="outline" size="sm" className="border-white/15 bg-black/20 text-zinc-100 hover:bg-white/[0.08]">
                <Link href="/">
                  <span className="hidden sm:inline">Internal console</span>
                  <span className="sm:hidden">Console</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <PortalLogoutForm />
          </div>
        </div>
      </header>

      <div className="northstar-shell py-10">
        <section className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">Client portal</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal text-zinc-50 md:text-6xl">
              Program Portfolio
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-400">
              Consolidated view of program health and progress.
            </p>
          </div>
          <HealthDial score={visibleMetrics.healthScore} />
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricTile icon={BriefcaseBusiness} label="Programs" value={String(visibleMetrics.totalPrograms).padStart(2, "0")} detail="Visible portfolio scope" />
          <MetricTile icon={CheckCircle2} label="On track" value={String(visibleMetrics.onTrack).padStart(2, "0")} detail="No major executive action needed" />
          <MetricTile icon={ShieldAlert} label="Risks" value={String(visibleMetrics.risks).padStart(2, "0")} detail="Visible risks across selected programs" />
          <MetricTile icon={ClipboardCheck} label="Decisions" value={String(visibleMetrics.decisions).padStart(2, "0")} detail="Open decisions requiring attention" />
        </section>

        {portfolio.programs.length ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] 2xl:grid-cols-[24rem_minmax(0,1fr)]">
            <aside className="grid min-w-0 content-start gap-3">
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">Portfolio view</p>
                  <button
                    type="button"
                    onClick={() => setVisibleProgramIds(new Set(portfolio.programs.map((program) => program.id)))}
                    className="text-xs font-medium text-emerald-200 hover:text-emerald-100"
                  >
                    All programs
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {portfolio.programs.map((program) => (
                    <button
                      key={program.id}
                      type="button"
                      aria-pressed={visibleProgramIds.has(program.id)}
                  onClick={() => toggleProgram(program.id)}
                  className={cn(
                        "max-w-full rounded-full border px-3 py-1.5 text-left text-xs font-medium leading-5 transition-colors",
                        visibleProgramIds.has(program.id)
                          ? "border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-100"
                          : "border-white/10 bg-black/20 text-zinc-500 hover:text-zinc-200"
                      )}
                    >
                      {program.name}
                    </button>
                  ))}
                </div>
              </div>

              {visiblePrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  selected={program.id === selectedProgram?.id}
                  onSelect={() => setSelectedProgramId(program.id)}
                />
              ))}
            </aside>
            {selectedProgram ? <ProgramDetail program={selectedProgram} /> : null}
          </div>
        ) : (
          <section className="mt-10 rounded-md border border-white/10 bg-white/[0.035] p-8 text-center">
            <p className="text-xl font-semibold text-zinc-50">No client programs assigned yet.</p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Ask an Admin to assign this client user to one or more programs. Assigned programs will appear here as an executive portfolio.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
