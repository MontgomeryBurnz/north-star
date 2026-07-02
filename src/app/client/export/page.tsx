export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, Download, FileText, Flag, ShieldCheck, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { auditActorFromManagedUser } from "@/lib/audit-event-service";
import type { ClientPortalPortfolio, ClientPortalProgram } from "@/lib/client-portal";
import { loadClientPortalData } from "@/lib/client-portal-data";
import { createAuditEvent } from "@/lib/program-store";
import { cn } from "@/lib/utils";

type ExportScope = "portfolio" | "program";

type ClientExportPageProps = {
  searchParams: Promise<{
    client?: string;
    programId?: string;
    scope?: string;
  }>;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "America/New_York",
    year: "numeric"
  }).format(date);
}

function statusDot(status: ClientPortalProgram["posture"]) {
  if (status === "on-track") return "bg-emerald-500";
  if (status === "at-risk") return "bg-amber-500";
  if (status === "blocked") return "bg-rose-500";
  return "bg-sky-500";
}

function ReportMetric({ label, value, helper }: { helper?: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-5 text-3xl font-semibold tracking-normal text-slate-950">{value}</p>
      {helper ? <p className="mt-2 text-xs font-medium leading-5 text-slate-600">{helper}</p> : null}
    </div>
  );
}

function ReportSection({
  children,
  icon: Icon,
  title
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="flex items-center gap-3 text-xl font-semibold tracking-normal text-slate-950">
        <Icon className="h-5 w-5 text-emerald-700" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function ProgramSummaryCard({ program }: { program: ClientPortalProgram }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-950">{program.name}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">{program.clientName}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
          <span className={cn("h-2.5 w-2.5 rounded-full", statusDot(program.posture))} />
          {program.postureLabel}
        </span>
      </div>
      <div className="mt-5 grid gap-4 text-sm text-slate-700 sm:grid-cols-3">
        <p>
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phase</span>
          <span className="mt-1 block font-semibold text-slate-950">{program.phase}</span>
        </p>
        <p>
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">% Complete</span>
          <span className="mt-1 block font-semibold text-slate-950">{program.metrics.programCompletionPercent}%</span>
        </p>
        <p>
          <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Next Milestone</span>
          <span className="mt-1 block font-semibold text-slate-950">{program.nextMilestone.name}</span>
        </p>
      </div>
      <p className="mt-5 text-sm font-medium leading-6 text-slate-700">{program.statusNote}</p>
    </article>
  );
}

function PortfolioReport({ clientName, portfolio, programs }: { clientName: string; portfolio: ClientPortalPortfolio; programs: ClientPortalProgram[] }) {
  const programIds = new Set(programs.map((program) => program.id));
  const milestones = portfolio.upcomingMilestones.filter((milestone) => programIds.has(milestone.programId)).slice(0, 6);
  const risksAcrossPortfolio = portfolio.keyRisks.filter((risk) => programIds.has(risk.programId)).slice(0, 6);

  return (
    <>
      <section className="rounded-lg bg-slate-950 p-7 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Client portfolio report</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal">{clientName}</h1>
        <p className="mt-3 text-base font-medium text-slate-300">
          Executive portfolio snapshot generated from published client-facing North Star updates.
        </p>
      </section>

      <ReportSection icon={FileText} title="Program Updates">
        <div className="mt-5 grid gap-4">
          {programs.map((program) => <ProgramSummaryCard key={program.id} program={program} />)}
        </div>
      </ReportSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportSection icon={CalendarDays} title="Upcoming Milestones">
          <div className="mt-5 grid gap-3">
            {milestones.length ? milestones.map((milestone) => (
              <div key={milestone.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-base font-semibold text-slate-950">{milestone.title}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{milestone.programName} · {milestone.dateLabel} · {milestone.priority}</p>
              </div>
            )) : <p className="text-sm font-medium text-slate-600">No published milestones are currently visible.</p>}
          </div>
        </ReportSection>

        <ReportSection icon={TriangleAlert} title="Key Risks">
          <div className="mt-5 grid gap-3">
            {risksAcrossPortfolio.length ? risksAcrossPortfolio.map((risk) => (
              <div key={risk.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-base font-semibold text-slate-950">{risk.description}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{risk.programName}</p>
              </div>
            )) : <p className="text-sm font-medium text-slate-600">No executive risks are currently visible.</p>}
          </div>
        </ReportSection>
      </div>

    </>
  );
}

function ProgramReport({ program }: { program: ClientPortalProgram }) {
  return (
    <>
      <section className="rounded-lg bg-slate-950 p-7 text-white">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Program executive report</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal">{program.name}</h1>
            <p className="mt-3 text-base font-medium text-slate-300">{program.clientName}</p>
          </div>
          <div className="grid gap-3 text-sm font-semibold">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", statusDot(program.posture))} />
              {program.statusSignal}
            </span>
            <span>{program.metrics.programCompletionPercent}% complete</span>
            <span>{program.phase}</span>
          </div>
        </div>
        <p className="mt-7 text-lg font-medium leading-8 text-slate-100">{program.executiveOverview}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportMetric label="Status" value={program.postureLabel} />
        <ReportMetric label="% Complete" value={`${program.metrics.programCompletionPercent}%`} helper={`${program.metrics.completionBasis} · ${program.metrics.completionScheduleLabel}`} />
        <ReportMetric label="Open Risks" value={String(program.metrics.risks)} />
        <ReportMetric label="Decisions" value={String(program.metrics.decisions)} />
      </section>

      <ReportSection icon={FileText} title="Executive Summary">
        <p className="mt-5 text-base font-medium leading-8 text-slate-700">{program.executiveSummary}</p>
      </ReportSection>

      <ReportSection icon={CalendarDays} title="Milestone Timeline">
        <div className="mt-5 grid gap-3">
          {program.milestones.map((milestone, index) => (
            <div key={`${milestone.name}-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[10rem_minmax(0,1fr)_9rem]">
              <p className="font-semibold text-slate-950">{milestone.dateLabel}</p>
              <p className="font-medium text-slate-800">{milestone.name}</p>
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">{milestone.status}</p>
            </div>
          ))}
        </div>
      </ReportSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportSection icon={CheckCircle2} title="Recent Accomplishments">
          <ul className="mt-5 grid gap-3 text-sm font-medium leading-7 text-slate-700">
            {program.recentAccomplishments.map((item, index) => <li key={`recent-${index}`}>• {item}</li>)}
          </ul>
        </ReportSection>
        <ReportSection icon={Flag} title="Upcoming Work">
          <ul className="mt-5 grid gap-3 text-sm font-medium leading-7 text-slate-700">
            {program.upcomingWork.map((item, index) => <li key={`upcoming-${index}`}>• {item}</li>)}
          </ul>
        </ReportSection>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportSection icon={TriangleAlert} title="Risks / Issues / Dependencies">
          <div className="mt-5 grid gap-3">
            {program.risks.length ? program.risks.map((risk, index) => (
              <div key={`${risk}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-base font-semibold text-slate-950">{risk}</p>
              </div>
            )) : <p className="text-sm font-medium text-slate-600">No executive risks are currently captured.</p>}
          </div>
        </ReportSection>
        <ReportSection icon={ShieldCheck} title="Leadership Decisions Needed">
          <div className="mt-5 grid gap-3">
            {program.decisions.length ? program.decisions.map((decision, index) => (
              <div key={`${decision}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-base font-semibold text-slate-950">{index + 1}. {decision}</p>
              </div>
            )) : <p className="text-sm font-medium text-slate-600">No executive decision is currently pending.</p>}
          </div>
        </ReportSection>
      </div>

    </>
  );
}

async function recordExportAudit({
  clientName,
  currentUser,
  program,
  scope
}: {
  clientName: string;
  currentUser: Awaited<ReturnType<typeof loadClientPortalData>>["currentUser"];
  program?: ClientPortalProgram | null;
  scope: ExportScope;
}) {
  try {
    await createAuditEvent({
      actor: auditActorFromManagedUser(currentUser),
      entityId: program?.id ?? clientName,
      entityLabel: program?.name ?? clientName,
      entityType: scope === "program" ? "client-program-report" : "client-portfolio-report",
      eventType: "client.portal.export",
      metadata: {
        clientName,
        exportFormat: "print-pdf",
        scope
      },
      programId: program?.id,
      programName: program?.name,
      summary: scope === "program"
        ? `${program?.name ?? "Program"} client PDF report opened.`
        : `${clientName} portfolio PDF report opened.`,
      surface: "Client Portal"
    });
  } catch (error) {
    console.error("Client Portal export audit failed", {
      error: error instanceof Error ? error.message : String(error),
      programId: program?.id,
      scope
    });
  }
}

export default async function ClientPortalExportPage({ searchParams }: ClientExportPageProps) {
  const params = await searchParams;
  const scope: ExportScope = params.scope === "program" ? "program" : "portfolio";
  const { currentUser, portfolio, viewerLabel } = await loadClientPortalData("/client/export");
  const requestedProgram = params.programId
    ? portfolio.programs.find((program) => program.id === params.programId)
    : null;
  const requestedClientName = params.client?.trim()
    ? params.client.trim()
    : requestedProgram?.clientName ?? portfolio.clients[0]?.clientName ?? "Client Portfolio";
  const clientPrograms = portfolio.programs.filter((program) => program.clientName === requestedClientName);
  const programs = clientPrograms.length ? clientPrograms : portfolio.programs;
  const selectedProgram = scope === "program" ? requestedProgram ?? programs[0] ?? null : null;
  const reportClientName = selectedProgram?.clientName ?? requestedClientName;

  await recordExportAudit({
    clientName: reportClientName,
    currentUser,
    program: selectedProgram,
    scope
  });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 print:bg-white">
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener("load", function () {
              var buttons = document.querySelectorAll("[data-print-report]");
              buttons.forEach(function (button) {
                button.addEventListener("click", function () { window.print(); });
              });
            });
          `
        }}
      />
      <div className="mx-auto w-full max-w-[72rem] px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:hidden">
          <Link href="/client" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Back to Client Portal
          </Link>
          <button
            type="button"
            data-print-report
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            Print / Save PDF
          </button>
        </header>

        <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-600 print:border-0 print:p-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Generated by North Star · {viewerLabel}</span>
            <span>{formatDateTime(portfolio.generatedAt)}</span>
          </div>
        </section>

        <div className="grid gap-5 print:gap-4">
          {scope === "program" && selectedProgram
            ? <ProgramReport program={selectedProgram} />
            : <PortfolioReport clientName={reportClientName} portfolio={portfolio} programs={programs} />}
        </div>
      </div>
    </main>
  );
}
