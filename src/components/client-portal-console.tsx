"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  ClipboardCheck,
  LogOut,
  ShieldAlert,
  Sparkles,
  TriangleAlert
} from "lucide-react";
import type { ClientPortalPortfolio, ClientPortalProgram, ClientProgramPosture } from "@/lib/client-portal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const postureStyles: Record<ClientProgramPosture, { badge: string; dot: string; ring: string }> = {
  "on-track": {
    badge: "border-emerald-300/25 bg-emerald-300/[0.09] text-emerald-100",
    dot: "bg-emerald-300",
    ring: "from-emerald-300/40 to-emerald-300/5"
  },
  "at-risk": {
    badge: "border-amber-300/25 bg-amber-300/[0.09] text-amber-100",
    dot: "bg-amber-300",
    ring: "from-amber-300/40 to-amber-300/5"
  },
  blocked: {
    badge: "border-rose-300/25 bg-rose-300/[0.09] text-rose-100",
    dot: "bg-rose-300",
    ring: "from-rose-300/40 to-rose-300/5"
  },
  watch: {
    badge: "border-cyan-300/25 bg-cyan-300/[0.09] text-cyan-100",
    dot: "bg-cyan-300",
    ring: "from-cyan-300/40 to-cyan-300/5"
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-zinc-50">{program.name}</p>
          <p className="mt-1 truncate text-sm text-zinc-500">{program.owner}</p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]", styles.badge)}>
          {program.postureLabel}
        </span>
      </div>
      <div className="grid gap-2 text-sm leading-6 text-zinc-300">
        <p className="line-clamp-2">{program.primaryOutcome}</p>
        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-xs text-zinc-500">
          <span>{program.metrics.risks} risks</span>
          <span>{program.metrics.decisions} decisions</span>
          <span>{program.phase}</span>
        </div>
      </div>
    </button>
  );
}

function SignalList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-300">
          {item}
        </div>
      ))}
    </div>
  );
}

function ProgramDetail({ program }: { program: ClientPortalProgram }) {
  const styles = postureStyles[program.posture];

  return (
    <section className="grid min-w-0 gap-6">
      <div className={cn("rounded-md border bg-gradient-to-br p-5", styles.ring, "border-white/10")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", styles.dot)} />
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">{program.postureLabel}</p>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-zinc-50 md:text-3xl">{program.name}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{program.executiveSummary}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Updated</p>
            <p className="mt-2 text-sm font-medium text-zinc-100">{formatTimestamp(program.updatedAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-rose-300/20 bg-rose-300/[0.045] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-rose-100">
            <TriangleAlert className="h-4 w-4" />
            Top risk
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{program.topRisk}</p>
        </div>
        <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.045] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-cyan-100">
            <ClipboardCheck className="h-4 w-4" />
            Next decision
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{program.nextDecision}</p>
        </div>
        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.045] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
            <Sparkles className="h-4 w-4" />
            North Star
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{program.northStar}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
            <CircleGauge className="h-4 w-4 text-emerald-200" />
            Executive signal
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{program.leadershipSignal}</p>
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-white/[0.03] p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
          <CalendarDays className="h-4 w-4 text-emerald-200" />
          Delivery path
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {program.timeline.map((step) => (
            <div key={step.label} className="grid gap-3">
              <div
                className={cn(
                  "h-2 rounded-full",
                  step.status === "complete"
                    ? "bg-emerald-300"
                    : step.status === "current"
                      ? "bg-cyan-300"
                      : "bg-white/10"
                )}
              />
              <p className={cn("text-sm font-medium", step.status === "next" ? "text-zinc-500" : "text-zinc-100")}>{step.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Outcomes</p>
          <SignalList items={program.outcomes} />
        </div>
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-amber-200">Risks</p>
          <SignalList items={program.risks} />
        </div>
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">Recommended path</p>
          <SignalList items={program.recommendedPath} />
        </div>
      </div>
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
  const selectedProgram = useMemo(
    () => portfolio.programs.find((program) => program.id === selectedProgramId) ?? portfolio.programs[0] ?? null,
    [portfolio.programs, selectedProgramId]
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">North Star Client Portal</p>
            <p className="mt-1 truncate text-sm text-zinc-400">{viewerLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {canReturnToInternal ? (
              <Button asChild variant="outline" size="sm" className="hidden border-white/15 bg-black/20 text-zinc-100 hover:bg-white/[0.08] sm:inline-flex">
                <Link href="/">
                  Internal console
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <PortalLogoutForm />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">Executive portfolio</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal text-zinc-50 md:text-6xl">
              Program signal, shaped for client leadership.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-400">
              A concise executive view of program health, risk, decisions, outcomes, and the recommended path forward.
            </p>
          </div>
          <HealthDial score={portfolio.metrics.healthScore} />
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricTile icon={BriefcaseBusiness} label="Programs" value={String(portfolio.metrics.totalPrograms).padStart(2, "0")} detail="Assigned portfolio scope" />
          <MetricTile icon={CheckCircle2} label="On track" value={String(portfolio.metrics.onTrack).padStart(2, "0")} detail="No major executive action needed" />
          <MetricTile icon={ShieldAlert} label="Risks" value={String(portfolio.metrics.risks).padStart(2, "0")} detail="Visible risks across assigned programs" />
          <MetricTile icon={ClipboardCheck} label="Decisions" value={String(portfolio.metrics.decisions).padStart(2, "0")} detail="Open decisions requiring attention" />
        </section>

        {portfolio.programs.length ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <aside className="grid min-w-0 content-start gap-3">
              {portfolio.programs.map((program) => (
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
