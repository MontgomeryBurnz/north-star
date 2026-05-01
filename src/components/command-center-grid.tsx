import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  DatabaseZap,
  FileCheck2,
  FilePlus2,
  Flag,
  Info,
  Layers3,
  ListChecks,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
  UsersRound
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/dashboard-metrics";

const workflowSteps = [
  {
    href: "/active-program?mode=setup",
    icon: FilePlus2,
    label: "Programs / Setup",
    title: "Capture SME context and source data",
    detail:
      "Create the program record around outcomes, delivery assumptions, stakeholders, constraints, team roles, and the artifacts that explain the work.",
    outcome: "One grounded source record for every downstream guidance view."
  },
  {
    href: "/active-program?mode=manage",
    icon: ListChecks,
    label: "Programs / Manage",
    title: "Keep the work signal current",
    detail:
      "Collect role-level updates, risks, blockers, decisions, support needs, artifacts, and meeting intelligence as the program changes through the week.",
    outcome: "Fresh program signal that automatically reshapes guidance."
  },
  {
    href: "/systems",
    icon: Layers3,
    label: "Guided Plans",
    title: "Turn intelligence into the work path",
    detail:
      "Review program health, Gantt posture, Team Action Plans, risks, decisions, and change rationale before choosing the next move.",
    outcome: "A current execution path that stays tied to the latest evidence."
  },
  {
    href: "/assistant",
    icon: MessageSquareText,
    label: "Guide",
    title: "Pressure-test with program-aware AI",
    detail:
      "Select the active program, ask targeted questions, and keep the conversation anchored to the same context that informs plans and artifacts.",
    outcome: "AI dialogue that learns from the program rather than answering generically."
  },
  {
    href: "/leadership",
    icon: UsersRound,
    label: "Leadership",
    title: "Translate leadership signal",
    detail:
      "Leaders review posture, progress, and delivery risk, then submit sponsor guidance that is interpreted and folded back into the plan.",
    outcome: "Executive signal translated into team action."
  },
  {
    href: "/admin",
    icon: ShieldCheck,
    label: "Admin",
    title: "Govern the intelligence loop",
    detail:
      "Manage users, review flagged justifications by program, approve or deny corrections, and keep one program's context from influencing another.",
    outcome: "Role-aware access and cleaner guidance quality by program."
  }
];

const intelligenceLayers = [
  {
    icon: UsersRound,
    title: "SME insight",
    detail: "What delivery leads, analysts, product owners, technologists, UX, change teams, and sponsors know about the work."
  },
  {
    icon: DatabaseZap,
    title: "Program data",
    detail: "Artifacts, updates, meetings, risks, decisions, timelines, roles, and evidence captured against the selected program."
  },
  {
    icon: BrainCircuit,
    title: "AI intelligence",
    detail: "OpenAI synthesis that turns grounded context into guidance, artifacts, prompts, summaries, and recommended next moves."
  }
];

const capabilityOutputs = [
  "Program health and progress posture",
  "Guided plans and Team Action Plans",
  "Role-based artifacts and reusable work products",
  "Risks, decisions, and executive-ready summaries",
  "Guide dialogue grounded in the selected program",
  "Governed feedback when guidance needs correction"
];

const refreshSources = [
  "Uploaded statements of work, BRDs, plans, and source artifacts",
  "Role-level weekly or biweekly progress updates",
  "Risks, blockers, decisions, and support requests",
  "Meeting recordings, notes, and recurring meeting context",
  "Guide conversations tied to the selected program",
  "Leadership feedback and Admin rulings",
  "Team role changes that reshape action plans and artifacts"
];

export function CommandCenterGrid({ metrics }: { metrics: DashboardMetrics }) {
  const riskCallout = metrics.callouts.find((callout) => callout.type === "risk");
  const decisionCallout = metrics.callouts.find((callout) => callout.type === "decision");
  const dueProgramDetail = metrics.duePrograms.slice(0, 2).map((program) => program.programName).join(" • ");
  const reviewDetail = metrics.leadershipReviewsDue && dueProgramDetail ? dueProgramDetail : "no leadership reviews due";
  const metricCards = [
    {
      label: "Programs",
      value: metrics.activePrograms,
      detail: "saved in this workspace",
      href: "/active-program"
    },
    {
      label: "Plans",
      value: metrics.guidedPlans,
      detail: "available guided-plan views",
      href: "/systems"
    },
    {
      label: "Risks",
      value: metrics.riskCount,
      detail: riskCallout ? `${riskCallout.programName}: latest risk` : "no active risks surfaced",
      help: metrics.riskHelp,
      href: "/systems"
    },
    {
      label: "Decisions",
      value: metrics.decisionCount,
      detail: decisionCallout ? `${decisionCallout.programName}: pending decision` : "no pending decisions surfaced",
      help: metrics.decisionHelp,
      href: "/systems"
    },
    {
      label: "Reviews",
      value: metrics.leadershipReviewsDue,
      detail: reviewDetail,
      help: metrics.leadershipReviewHelp,
      href: "/leadership?queue=due"
    }
  ];

  return (
    <section id="how-to-use" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.55fr)] lg:items-end">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">How NorthStar creates value</p>
          <h2 className="text-3xl font-semibold text-zinc-50 md:text-4xl">An intelligence hub for moving work forward.</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            NorthStar connects expert judgment, program evidence, and AI reasoning so teams can see what changed,
            understand what matters, and act on the right next move.
          </p>
        </div>
        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
            <RefreshCcw className="h-4 w-4" />
            Living guidance rule
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Every meaningful input should refresh the work path automatically and preserve why the guidance changed.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {intelligenceLayers.map((layer) => (
          <Card key={layer.title} className="bg-zinc-950/80">
            <CardContent className="grid gap-3 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-50">
                <layer.icon className="h-4 w-4 text-emerald-200" />
                {layer.title}
              </div>
              <p className="text-sm leading-6 text-zinc-400">{layer.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {workflowSteps.map((step, index) => (
          <Card key={step.href} className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="grid gap-2 text-zinc-50">
                  <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
                    <step.icon className="h-4 w-4" />
                    {step.label}
                  </span>
                  <span>{index + 1}. {step.title}</span>
                </CardTitle>
                <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-zinc-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <p className="text-sm leading-6 text-zinc-400">{step.detail}</p>
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Expected result
                </p>
                <p className="text-sm leading-6 text-zinc-300">{step.outcome}</p>
              </div>
              <Button asChild variant="outline" size="sm" className="justify-self-start">
                <Link href={step.href}>
                  Open {step.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.55fr)]">
        <Card className="bg-zinc-950/80">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <BrainCircuit className="h-4 w-4 text-cyan-200" />
              What powers the intelligence hub
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            {refreshSources.map((source) => (
              <div key={source} className="flex gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3">
                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                <p className="text-sm leading-6 text-zinc-300">{source}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/80">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <BookOpenCheck className="h-4 w-4 text-emerald-200" />
              What users get back
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {capabilityOutputs.map((item, index) => (
              <div key={item} className="grid grid-cols-[auto_1fr] gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-xs font-medium text-cyan-100">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-zinc-300">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group rounded-md border border-white/10 bg-white/[0.025] p-4 transition-colors hover:border-emerald-300/30 hover:bg-white/[0.04]"
          >
            <p className="text-2xl font-semibold text-zinc-50">{String(item.value).padStart(2, "0")}</p>
            <div className="mt-1 flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
              <span>{item.label}</span>
              {"help" in item ? (
                <span className="group/help relative inline-flex items-center normal-case tracking-normal">
                  <Info className="h-3.5 w-3.5 cursor-help text-zinc-600" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-[11px] leading-5 text-zinc-300 shadow-lg group-hover/help:block">
                    {item.help}
                  </span>
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{item.detail}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-5">
        <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <Flag className="h-5 w-5 text-cyan-200" />
          <div>
            <p className="text-sm font-medium text-cyan-100">Recommended operating habit</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Each week, refresh program signal first, review the updated work path, use Guide to pressure-test the next move,
              and route leaders to the Leadership page when sponsor input is due.
            </p>
          </div>
          <Button asChild>
            <Link href="/active-program?mode=manage">
              Start the weekly loop
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
