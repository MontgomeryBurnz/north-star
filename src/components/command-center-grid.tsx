import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
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
    href: "/new-program",
    icon: FilePlus2,
    label: "New Program",
    title: "Create the program record",
    detail:
      "Enter the program name, intended outcomes, stakeholders, constraints, delivery context, and upload the initial artifact when available.",
    outcome: "A saved program that every other surface can use."
  },
  {
    href: "/active-program",
    icon: ListChecks,
    label: "Active Program",
    title: "Keep the operating picture current",
    detail:
      "Select the program, collect role-level updates, capture risks, decisions, blockers, artifacts, and meeting intelligence as the week changes.",
    outcome: "Fresh context that automatically influences guidance."
  },
  {
    href: "/systems",
    icon: Layers3,
    label: "Guided Plans",
    title: "Review the refreshed guidance",
    detail:
      "Use the plan overview, team action plans, risks, decisions, key questions, and change justifications to decide the next practical move.",
    outcome: "A current execution path shaped by the latest inputs."
  },
  {
    href: "/assistant",
    icon: MessageSquareText,
    label: "Guide",
    title: "Ask program-specific questions",
    detail:
      "Choose the active program before asking questions so the dialogue stays anchored to that program and can improve the guided plan context.",
    outcome: "Conversation history that can shape future guidance."
  },
  {
    href: "/leadership",
    icon: UsersRound,
    label: "Leadership",
    title: "Collect sponsor guidance",
    detail:
      "Leaders review posture, progress, and delivery risk, then submit feedback that is interpreted and folded back into the guided plan.",
    outcome: "Executive signal translated into action."
  },
  {
    href: "/governance",
    icon: ShieldCheck,
    label: "Governance",
    title: "Resolve disputed guidance",
    detail:
      "Review flagged justifications by program, approve or deny corrections, and prevent one program's context from polluting another.",
    outcome: "A cleaner learning loop for guidance quality."
  }
];

const refreshSources = [
  "Artifact uploads from New Program or Active Program",
  "Role-level weekly or biweekly updates",
  "Risks, blockers, decisions, and support needs",
  "Meeting recordings or meeting intelligence notes",
  "Guide dialogue tied to the selected program",
  "Leadership feedback and governance decisions",
  "Team role changes on the Guided Plans page"
];

const alphaTestScript = [
  "Create one realistic program from a statement of work or BRD.",
  "Assign the team roles that reflect the actual delivery team.",
  "Save at least one update from two different roles.",
  "Add one risk, one decision needed, and one meeting input.",
  "Open Guided Plans and verify the Team Action Plans match the new context.",
  "Submit leadership feedback and confirm the guidance refreshes automatically.",
  "Use Guide to ask what needs attention next for the selected program."
];

export function CommandCenterGrid({ metrics }: { metrics: DashboardMetrics }) {
  const metricCards = [
    {
      label: "Programs",
      value: metrics.activePrograms,
      detail: "saved in this workspace"
    },
    {
      label: "Plans",
      value: metrics.guidedPlans,
      detail: "available guided-plan views"
    },
    {
      label: "Risks",
      value: metrics.riskCount,
      detail: metrics.callouts.find((callout) => callout.type === "risk")
        ? `${metrics.callouts.find((callout) => callout.type === "risk")?.programName}: latest risk`
        : "no active risks surfaced",
      help: metrics.riskHelp
    },
    {
      label: "Decisions",
      value: metrics.decisionCount,
      detail: metrics.callouts.find((callout) => callout.type === "decision")
        ? `${metrics.callouts.find((callout) => callout.type === "decision")?.programName}: pending decision`
        : "no pending decisions surfaced",
      help: metrics.decisionHelp
    },
    {
      label: "Reviews",
      value: metrics.leadershipReviewsDue,
      detail: metrics.leadershipReviewsDue
        ? metrics.duePrograms.slice(0, 2).map((program) => program.programName).join(" • ")
        : "no leadership reviews due",
      help: metrics.leadershipReviewHelp
    }
  ];

  return (
    <section id="how-to-use" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.55fr)] lg:items-end">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">How to use North Star</p>
          <h2 className="text-3xl font-semibold text-zinc-50 md:text-4xl">Operate the app as a continuous program loop.</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            North Star works best when each program has a clear source record, regular team updates, visible leadership
            input, and guided plans that refresh as the facts change.
          </p>
        </div>
        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
            <RefreshCcw className="h-4 w-4" />
            Guidance refresh rule
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Users should not need to manually regenerate a plan. Saving meaningful program inputs should refresh the
            guided plan and preserve why the guidance changed.
          </p>
        </div>
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
              What updates guided plans
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
              First alpha test pass
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {alphaTestScript.map((item, index) => (
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
            href={item.label === "Reviews" ? "/leadership?queue=due" : item.label === "Programs" ? "/active-program" : "/systems"}
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
            <p className="text-sm font-medium text-cyan-100">Recommended onboarding habit</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Each week, update the Active Program page first, then review Guided Plans, use Guide for questions, and
              send leadership directly to the Leadership page when sponsor input is due.
            </p>
          </div>
          <Button asChild>
            <Link href="/active-program">
              Start the weekly loop
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
