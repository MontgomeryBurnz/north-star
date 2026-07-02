"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ClipboardCheck,
  Compass,
  Download,
  LogOut,
  Plus,
  TriangleAlert,
  type LucideIcon
} from "lucide-react";
import type {
  ClientPortalComponentRoadmapItem,
  ClientPortalPortfolio,
  ClientPortalProgram,
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

const clientRoadmapStatusStyles: Record<ClientPortalComponentRoadmapItem["status"], string> = {
  "at-risk": "bg-amber-500 text-white shadow-[0_10px_24px_rgba(245,158,11,0.28)]",
  blocked: "bg-rose-500 text-white shadow-[0_10px_24px_rgba(244,63,94,0.26)]",
  complete: "bg-emerald-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.22)]",
  "in-progress": "bg-sky-700 text-white shadow-[0_10px_24px_rgba(3,105,161,0.26)]",
  planned: "bg-slate-700 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
};

const clientRoadmapStatusLabels: Record<ClientPortalComponentRoadmapItem["status"], string> = {
  "at-risk": "At risk",
  blocked: "Blocked",
  complete: "Complete",
  "in-progress": "In progress",
  planned: "Planned"
};

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

function parseRoadmapMonth(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roadmapMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function roadmapMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "America/New_York" }).format(date).toUpperCase();
}

function buildClientRoadmapMonths(items: ClientPortalComponentRoadmapItem[]) {
  const dates = items
    .flatMap((item) => [parseRoadmapMonth(item.startMonth), parseRoadmapMonth(item.endMonth)])
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (!dates.length) return [];

  const start = new Date(dates[0].getFullYear(), dates[0].getMonth(), 1);
  const end = new Date(dates[dates.length - 1].getFullYear(), dates[dates.length - 1].getMonth(), 1);
  const months: Array<{ key: string; label: string }> = [];
  const cursor = new Date(start);

  while (cursor <= end && months.length < 12) {
    months.push({ key: roadmapMonthKey(cursor), label: roadmapMonthLabel(cursor) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function clientRoadmapRange(item: ClientPortalComponentRoadmapItem, months: Array<{ key: string; label: string }>) {
  const startIndex = months.findIndex((month) => month.key === item.startMonth);
  const endIndex = months.findIndex((month) => month.key === item.endMonth);
  const safeStart = startIndex >= 0 ? startIndex : 0;
  const safeEnd = endIndex >= 0 ? endIndex : safeStart;

  return {
    end: Math.max(safeStart, safeEnd),
    start: Math.min(safeStart, safeEnd)
  };
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

function clientRoadmapTitle(programName: string) {
  const cleaned = programName
    .replace(/\b(application|app)\s+build\b/gi, "")
    .replace(/\bbuild\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${cleaned || programName} Roadmap`;
}

function ProgramHero({ program }: { program: ClientPortalProgram }) {
  const styles = postureStyles[program.posture];

  return (
    <section data-client-program-hero className="min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950 px-4 py-4 text-white shadow-[0_22px_60px_rgba(15,23,42,0.28)] sm:px-6 sm:py-7 md:px-8 md:py-8">
      <div className="grid gap-4 sm:gap-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-200">{program.clientName}</p>
          <h2 className="mt-3 break-words text-2xl font-semibold tracking-normal sm:text-3xl md:text-4xl">{program.name}</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
          <HeroMetric label="Overall Status" metricId="overall-status" value={program.statusSignal} dot={styles.heroDot} />
          <HeroMetric label="Current Phase" metricId="current-phase" value={program.phase} />
        </div>
        <div className="border-t border-white/15 pt-4 text-sm text-slate-300 sm:pt-5 sm:text-base">
          <span data-client-executive-sponsor>Executive Sponsor: <strong className="text-white">{program.executiveSponsor}</strong></span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.16)] sm:p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            <Compass className="h-4 w-4" />
            Executive Summary
          </p>
          <p className="mt-3 line-clamp-5 text-sm font-medium leading-7 text-slate-700 sm:line-clamp-none sm:text-lg sm:leading-9">{program.executiveOverview}</p>
        </div>
      </div>
    </section>
  );
}

function HeroMetric({
  dot,
  helper,
  label,
  metricId,
  value,
  delta
}: {
  delta?: string;
  dot?: string;
  helper?: string;
  label: string;
  metricId: string;
  value: string;
}) {
  return (
    <div data-client-hero-metric={metricId} className="min-w-0 rounded-md border border-white/10 bg-white/[0.04] p-2.5 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:text-xs sm:tracking-[0.12em]">{label}</p>
      <p className="mt-2 flex min-w-0 flex-wrap items-center gap-2 break-words text-base font-semibold leading-6 text-white sm:gap-3 sm:text-xl sm:leading-7">
        {dot ? <span className={cn("h-3.5 w-3.5 rounded-full", dot)} /> : null}
        <span className="min-w-0">{value}</span>
        {delta ? <span className="text-base text-emerald-300">{delta}</span> : null}
      </p>
      {helper ? <MetricBasisLabel className="mt-1 text-slate-300">{helper}</MetricBasisLabel> : null}
    </div>
  );
}

function ExecutiveCard({ children, icon: Icon, title }: { children: ReactNode; icon: LucideIcon; title: string }) {
  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-7">
      <h3 className="flex items-center gap-3 text-xl font-semibold text-slate-950">
        <Icon className="h-5 w-5 text-sky-700" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function ClientWorkRoadmap({ program }: { program: ClientPortalProgram }) {
  const items = program.clientRoadmapItems;
  const months = buildClientRoadmapMonths(items);
  const groupedItems = items.reduce<Record<string, ClientPortalComponentRoadmapItem[]>>((groups, item) => {
    const category = item.category.trim() || "Roadmap";
    groups[category] = [...(groups[category] ?? []), item];
    return groups;
  }, {});
  const gridTemplateColumns = `minmax(20rem, 24rem) repeat(${Math.max(months.length, 1)}, minmax(7.25rem, 1fr))`;

  return (
    <ExecutiveCard icon={BriefcaseBusiness} title={clientRoadmapTitle(program.name)}>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Roadmap items are organized by category and month range.
        </p>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-800">
          {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {items.length > 0 && months.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
          <div className="min-w-[76rem]">
            <div className="grid border-b border-slate-200 bg-slate-950 text-white" style={{ gridTemplateColumns }}>
              <div className="border-r border-slate-700 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                Work item
              </div>
              {months.map((month) => (
                <div key={month.key} className="border-r border-slate-700 px-3 py-3 text-center text-sm font-semibold last:border-r-0">
                  {month.label}
                </div>
              ))}
            </div>

            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category}>
                <div className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-sky-800">
                  {category}
                </div>
                {categoryItems.map((item) => {
                  const range = clientRoadmapRange(item, months);
                  return (
                    <div
                      key={item.id ?? `${category}-${item.title}`}
                      data-client-work-roadmap-item={item.title}
                      className="grid min-h-[7.25rem] border-b border-slate-200 last:border-b-0"
                      style={{ gridTemplateColumns }}
                    >
                      <div className="border-r border-slate-200 bg-white px-5 py-4">
                        <p className="text-lg font-semibold leading-7 text-slate-950">{item.title}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {item.owner ? `Owner: ${item.owner}` : "Owner not set"}
                        </p>
                        {item.note ? <p className="mt-2 line-clamp-3 text-base leading-6 text-slate-600">{item.note}</p> : null}
                      </div>
                      {months.map((month) => (
                        <div key={`${item.id}-${month.key}`} className="border-r border-slate-200 bg-white last:border-r-0" />
                      ))}
                      <div
                        className={cn(
                          "z-10 mx-2 self-center rounded-full px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.14em]",
                          clientRoadmapStatusStyles[item.status]
                        )}
                        style={{
                          gridColumn: `${range.start + 2} / ${range.end + 3}`,
                          gridRow: 1
                        }}
                      >
                        {clientRoadmapStatusLabels[item.status]}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 text-base font-medium leading-7 text-slate-600">
          Publish roadmap rows to show component, workstream, or feature movement over time.
        </p>
      )}
    </ExecutiveCard>
  );
}

function isClientFunctionSignal(value: string) {
  const cleaned = value.trim();

  if (!cleaned) return false;
  if (/^no\s+/i.test(cleaned)) return false;
  if (/not captured|not published|will appear|will populate|will sharpen/i.test(cleaned)) return false;

  return true;
}

function buildFunctionRows(program: ClientPortalProgram, mode: "accomplishments" | "upcoming") {
  const rows = program.domainSummaries
    .map((domain) => {
      const text = mode === "accomplishments" ? domain.pursuit : domain.decisionsOrOutcomes;

      return {
        attachments: domain.attachments,
        owner: domain.owner,
        role: domain.role,
        statusLabel: domain.statusLabel,
        text
      };
    })
    .filter((row) => isClientFunctionSignal(row.text));

  if (rows.length) return rows;

  const fallbackItems = mode === "accomplishments" ? program.recentAccomplishments : program.upcomingWork;

  return fallbackItems
    .filter(isClientFunctionSignal)
    .map((item, index) => ({
      attachments: 0,
      owner: program.owner,
      role: index === 0 ? "Program team" : `Program team ${index + 1}`,
      statusLabel: "Published",
      text: item
    }));
}

function FunctionUpdateCard({
  icon,
  mode,
  program,
  title
}: {
  icon: LucideIcon;
  mode: "accomplishments" | "upcoming";
  program: ClientPortalProgram;
  title: string;
}) {
  const rows = buildFunctionRows(program, mode);

  return (
    <ExecutiveCard icon={icon} title={title}>
      {rows.length ? (
        <div className="mt-6 grid gap-4">
          {rows.map((row, index) => (
            <article
              key={`${title}-${row.role}-${index}`}
              data-client-function-update-card={row.role}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">{row.role}</p>
                  <p className="mt-2 text-base font-semibold leading-6 text-slate-950">{row.owner}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {row.statusLabel}
                  </span>
                  {row.attachments > 0 ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                      {row.attachments} attachment{row.attachments === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-4 text-base font-medium leading-7 text-slate-700">{row.text}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 text-base font-medium leading-7 text-slate-600">
          No client-facing {mode === "accomplishments" ? "accomplishments" : "upcoming work"} have been published yet.
        </p>
      )}
    </ExecutiveCard>
  );
}

function RiskDecisionSection({ program }: { program: ClientPortalProgram }) {
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-2">
      <ExecutiveCard icon={TriangleAlert} title="Risks / Issues / Dependencies">
        {program.risks.length ? (
          <ul className="mt-6 grid gap-3">
            {program.risks.map((risk, index) => (
              <li key={`${risk}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-base font-medium leading-7 text-slate-700">
                {risk}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 text-base font-medium leading-7 text-slate-600">
            No executive risks, issues, or dependencies are currently captured for this program.
          </p>
        )}
      </ExecutiveCard>

      <section className="min-w-0 rounded-lg border border-sky-200 bg-sky-50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-7">
        <h3 className="flex items-center gap-3 text-xl font-semibold text-slate-950">
          <ClipboardCheck className="h-5 w-5 text-sky-700" />
          Leadership Decisions Needed
        </h3>
        <div className="mt-6 grid gap-4">
          {program.decisions.length ? (
            program.decisions.map((decision, index) => (
              <div key={`${decision}-${index}`} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 rounded-lg border border-slate-200 bg-white p-5">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-white", index === 0 ? "bg-rose-500" : "bg-amber-500")}>
                  {index + 1}
                </span>
                <span>
                  <span className="block text-lg font-semibold leading-7 text-slate-950">{decision}</span>
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
    <section data-client-program-detail={program.id} className="grid min-w-0 max-w-full gap-6 overflow-hidden">
      <ProgramHero program={program} />
      <ClientWorkRoadmap program={program} />

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <FunctionUpdateCard icon={ClipboardCheck} mode="accomplishments" program={program} title="Recent Accomplishments" />
        <FunctionUpdateCard icon={ArrowUpRight} mode="upcoming" program={program} title="Upcoming Work (Next 2 Weeks)" />
      </div>

      <RiskDecisionSection program={program} />
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
  const selectedProgram = useMemo(
    () => clientPrograms.find((program) => program.id === selectedProgramId) ?? clientPrograms[0] ?? null,
    [clientPrograms, selectedProgramId]
  );
  const showClientSelector = portfolio.clients.length > 1;
  const showProgramScope = clientPrograms.length > 1;
  const exportHref = selectedProgram
    ? `/api/client-portal/export/pdf?scope=program&programId=${encodeURIComponent(selectedProgram.id)}`
    : selectedClient
      ? `/api/client-portal/export/pdf?scope=portfolio&client=${encodeURIComponent(selectedClient.clientName)}`
      : "/api/client-portal/export/pdf";

  useEffect(() => {
    if (!portfolio.clients.length) return;
    if (portfolio.clients.some((client) => client.clientName === selectedClientName)) return;
    setSelectedClientName(portfolio.clients[0]?.clientName ?? "");
  }, [portfolio.clients, selectedClientName]);

  useEffect(() => {
    setSelectedProgramId(selectedClientProgramIds[0] ?? "");
  }, [selectedClientName, selectedClientProgramIdsKey, selectedClientProgramIds]);

  useEffect(() => {
    if (!selectedProgram && clientPrograms[0]) {
      setSelectedProgramId(clientPrograms[0].id);
    }

    if (selectedProgram && selectedProgram.id !== selectedProgramId) {
      setSelectedProgramId(selectedProgram.id);
    }
  }, [clientPrograms, selectedProgram, selectedProgramId]);

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
                href={exportHref}
                data-client-export-portfolio
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Link>
            </Button>
          ) : null}
        </section>

        {portfolio.programs.length ? (
          <>
            {showClientSelector ? (
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
            ) : null}

            {showProgramScope ? (
              <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Program view</p>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Select the {selectedClient?.clientName ?? "client"} program to review.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                    {clientPrograms.length} program{clientPrograms.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {clientPrograms.map((program) => (
                    <button
                      key={program.id}
                      type="button"
                      aria-pressed={program.id === selectedProgram?.id}
                      data-client-program-option={program.id}
                      onClick={() => selectProgram(program.id)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        program.id === selectedProgram?.id
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:text-sky-800"
                      )}
                    >
                      {program.name}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {selectedProgram ? (
              <div ref={detailRef} className="mt-8 scroll-mt-8">
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
