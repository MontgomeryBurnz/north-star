"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  FileText,
  Flag,
  Layers3,
  LockKeyhole,
  Map,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  sampleDiscoverySources,
  sampleDiscoverySynthesis,
  sampleProgram,
  sampleProgramSlug
} from "@/data/sample-program";

type SampleView = "overview" | "discovery" | "product" | "execution" | "stakeholders";

const sampleViews: Array<{
  id: SampleView;
  label: string;
  helper: string;
  icon: typeof Target;
}> = [
  { id: "overview", label: "Program", helper: "Shared context", icon: Target },
  { id: "discovery", label: "Discovery", helper: "Evidence to insight", icon: BrainCircuit },
  { id: "product", label: "Product", helper: "Build-ready outputs", icon: Layers3 },
  { id: "execution", label: "Execution", helper: "Plan and intervention", icon: Map },
  { id: "stakeholders", label: "Stakeholders", helper: "Leadership and client", icon: UsersRound }
];

const outcomeFlow = [
  { label: "Evidence", value: "6 sources", icon: FileText },
  { label: "Understanding", value: "5 capabilities", icon: BrainCircuit },
  { label: "Product definition", value: "3 epics · 5 features", icon: Layers3 },
  { label: "Delivery", value: "2 ready stories", icon: ClipboardCheck },
  { label: "Decisions", value: "2 leadership asks", icon: Flag }
];

function SampleNotice() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.055] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
        <div>
          <p className="text-sm font-medium text-cyan-100">Safe sample environment</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Everything here is fictional, read-only, and isolated from your live programs and reporting.
          </p>
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="border-cyan-300/20 text-cyan-100">
        <Link href={`/artifacts?sample=${sampleProgramSlug}`}>
          Open sample in Studio
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function ProgramOverview() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sampleProgram.metrics.map((metric) => (
          <Card key={metric.label} className="bg-zinc-950/75">
            <CardContent className="p-5">
              <p className="text-3xl font-semibold text-zinc-50">{metric.value}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">{metric.label}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.75fr)]">
        <Card className="bg-zinc-950/75">
          <CardHeader className="border-b border-white/10">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Program foundation</p>
            <CardTitle className="mt-2 text-zinc-50">A single outcome narrative from fragmented inputs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Vision</p>
              <p className="mt-2 text-base leading-7 text-zinc-200">{sampleProgram.vision}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Measurable outcomes</p>
              <ul className="mt-3 grid gap-3">
                {sampleProgram.outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-3 rounded-md border border-white/10 bg-white/[0.025] p-3 text-sm leading-6 text-zinc-300">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/75">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <CircleDot className="h-4 w-4 text-amber-200" />
              Current posture
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold text-zinc-50">{sampleProgram.progress}%</p>
                <p className="mt-1 text-xs text-zinc-500">Definition complete</p>
              </div>
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100">
                {sampleProgram.health}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${sampleProgram.progress}%` }} />
            </div>
            <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-100">Why attention is needed</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                The product definition is strong enough to begin refinement. One approval-policy decision blocks the final workflow commitment.
              </p>
            </div>
            <p className="text-xs leading-5 text-zinc-500">
              North Star keeps the health signal tied to its evidence, decision owner, and downstream impact.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DiscoveryView() {
  return (
    <div className="grid gap-5">
      <Card className="bg-zinc-950/75">
        <CardHeader className="border-b border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Source package</p>
              <CardTitle className="mt-2 text-zinc-50">Different formats become one traceable understanding</CardTitle>
            </div>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
              {sampleDiscoverySources.length} sources analyzed
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {sampleDiscoverySources.map((source) => (
            <div key={source.id} className="flex gap-3 rounded-md border border-white/10 bg-white/[0.025] p-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">{source.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-500">
                  {source.fileFormat} · {source.sourceQuality}
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-400">{source.extractionSummary}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]">
        <Card className="bg-zinc-950/75">
          <CardHeader className="border-b border-white/10">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Synthesized understanding</p>
            <CardTitle className="mt-2 text-zinc-50">What the evidence says</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-5">
            <p className="text-sm leading-7 text-zinc-200">{sampleDiscoverySynthesis.executiveSummary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {sampleDiscoverySynthesis.capabilities.map((capability) => (
                <div key={capability} className="flex gap-3 rounded-md border border-white/10 bg-white/[0.025] p-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                  <p className="text-sm leading-6 text-zinc-300">{capability}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/75">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <AlertTriangle className="h-4 w-4 text-amber-200" />
              Missing information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {sampleDiscoverySynthesis.gaps.map((gap) => (
              <article key={gap.id} className="rounded-md border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-zinc-500">{gap.id}</span>
                  <span className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                    gap.severity === "blocking"
                      ? "border-red-300/25 bg-red-300/10 text-red-100"
                      : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                  )}>
                    {gap.severity}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-100">{gap.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{gap.question}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductView() {
  const readyStories = sampleDiscoverySynthesis.stories.filter((story) => story.readiness === "ready");

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        {sampleDiscoverySynthesis.epics.map((epic) => (
          <Card key={epic.id} className="bg-zinc-950/75">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">{epic.id}</p>
              <h3 className="mt-3 text-lg font-semibold text-zinc-50">{epic.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{epic.objective}</p>
              <p className="mt-4 text-xs text-emerald-200">
                {sampleDiscoverySynthesis.features.filter((feature) => feature.epicId === epic.id).length} mapped feature(s)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-950/75">
        <CardHeader className="border-b border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Engineering handoff</p>
              <CardTitle className="mt-2 text-zinc-50">Stories arrive with acceptance criteria and tests</CardTitle>
            </div>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
              {readyStories.length} of {sampleDiscoverySynthesis.stories.length} shown stories ready
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          {sampleDiscoverySynthesis.stories.map((story) => (
            <details key={story.id} open={story.id === "US-01"} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">{story.id} · {story.featureId}</p>
                    <h3 className="mt-2 font-semibold text-zinc-50">{story.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{story.story}</p>
                  </div>
                  <span className={cn(
                    "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                    story.readiness === "ready"
                      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                      : "border-amber-300/25 bg-amber-300/10 text-amber-100"
                  )}>
                    {story.readiness}
                  </span>
                </div>
              </summary>
              <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Acceptance criteria</p>
                  <ul className="mt-3 grid gap-2">
                    {story.acceptanceCriteria.map((criterion) => (
                      <li key={criterion} className="flex gap-2 text-sm leading-6 text-zinc-300">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Test foundation</p>
                  <div className="mt-3 grid gap-2">
                    {story.testCases.map((testCase) => (
                      <div key={testCase.id} className="rounded-md border border-white/10 bg-zinc-950/70 p-3">
                        <p className="text-xs font-medium text-cyan-100">{testCase.id} · {testCase.type}</p>
                        <p className="mt-1 text-sm font-medium text-zinc-100">{testCase.title}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">Expected: {testCase.expectedResult}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ExecutionView() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,0.75fr)]">
      <Card className="bg-zinc-950/75">
        <CardHeader className="border-b border-white/10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Living roadmap</p>
          <CardTitle className="mt-2 text-zinc-50">Product intent becomes a sequenced delivery path</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          {sampleDiscoverySynthesis.roadmap.map((item, index) => (
            <article key={item.horizon} className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-[2rem_1fr]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 text-xs font-semibold text-emerald-100">
                {index + 1}
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">{item.horizon}</p>
                <h3 className="mt-2 font-semibold text-zinc-50">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.outcome}</p>
                <p className="mt-3 text-xs text-amber-100">Dependencies: {item.dependencies.join(" · ")}</p>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5">
        <Card className="bg-zinc-950/75">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <Map className="h-4 w-4 text-cyan-200" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 p-5">
            {sampleProgram.milestones.map((milestone) => (
              <div key={milestone.title} className="grid grid-cols-[3.5rem_auto_1fr] gap-3 py-3">
                <p className="text-xs text-zinc-500">{milestone.date}</p>
                <span className={cn(
                  "mt-1 h-3 w-3 rounded-full border",
                  milestone.status === "complete"
                    ? "border-emerald-300 bg-emerald-300"
                    : milestone.status === "current"
                      ? "border-amber-200 bg-amber-200"
                      : "border-zinc-600 bg-zinc-900"
                )} />
                <p className="text-sm leading-5 text-zinc-300">{milestone.title}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-300/20 bg-amber-300/[0.045]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              Highest intervention
            </div>
            <h3 className="mt-4 font-semibold text-zinc-50">{sampleProgram.risks[0].title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{sampleProgram.risks[0].response}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StakeholderView() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="bg-zinc-950/75">
        <CardHeader className="border-b border-white/10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">Leadership view</p>
          <CardTitle className="mt-2 text-zinc-50">Decisions arrive with context and delivery impact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          {sampleProgram.decisions.map((decision, index) => (
            <article key={decision.question} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-amber-100">Decision {index + 1}</span>
                <span className="text-xs text-zinc-500">Due {decision.due}</span>
              </div>
              <h3 className="mt-3 font-semibold leading-6 text-zinc-50">{decision.question}</h3>
              <p className="mt-3 text-sm text-zinc-400">Owner: {decision.owner}</p>
              <p className="mt-3 rounded-md border border-amber-300/15 bg-amber-300/[0.045] p-3 text-sm leading-6 text-zinc-300">
                {decision.impact}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-zinc-950/75">
        <CardHeader className="border-b border-white/10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Client-safe view</p>
          <CardTitle className="mt-2 text-zinc-50">Internal complexity becomes a confident external story</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 p-5">
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-emerald-100">
              <MessageSquareText className="h-4 w-4" />
              Executive headline
            </div>
            <p className="mt-3 text-lg font-semibold leading-7 text-zinc-50">{sampleProgram.clientUpdate.headline}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Progress narrative</p>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{sampleProgram.clientUpdate.narrative}</p>
          </div>
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">What happens next</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{sampleProgram.clientUpdate.next}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SampleProgramExperience() {
  const [view, setView] = useState<SampleView>("overview");

  return (
    <main data-sample-program>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.17),transparent_48%),linear-gradient(180deg,rgba(9,9,11,0.15),#09090b_92%)]" />
        <div className="northstar-shell relative py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.65fr)] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/[0.08] px-3 py-1 text-xs font-medium text-emerald-100">
                <Sparkles className="h-3.5 w-3.5" />
                Guided sample program
              </div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-zinc-50 sm:text-5xl lg:text-6xl">
                {sampleProgram.name}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300">
                Follow one realistic program from messy discovery evidence to build-ready product definition, coordinated delivery, leadership decisions, and a client-safe update.
              </p>
            </div>
            <div className="grid gap-3 rounded-lg border border-white/10 bg-zinc-950/75 p-5 shadow-glow">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">Fictional client</span>
                <span className="text-sm font-medium text-zinc-200">{sampleProgram.client}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">Phase</span>
                <span className="text-sm font-medium text-zinc-200">{sampleProgram.phase}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">Current signal</span>
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-100">{sampleProgram.health}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-2 sm:grid-cols-5">
            {outcomeFlow.map((item, index) => (
              <div key={item.label} className="relative rounded-md border border-white/10 bg-zinc-950/65 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                  <item.icon className="h-3.5 w-3.5 text-emerald-200" />
                  {item.label}
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{item.value}</p>
                {index < outcomeFlow.length - 1 ? <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-zinc-600 sm:block" /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="northstar-shell py-8 sm:py-10">
        <SampleNotice />

        <div className="mt-6 grid gap-2 rounded-lg border border-white/10 bg-zinc-950/75 p-2 sm:grid-cols-5" role="tablist" aria-label="Sample program journey">
          {sampleViews.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              aria-controls="sample-program-view"
              onClick={() => setView(item.id)}
              className={cn(
                "grid min-h-20 grid-cols-[auto_1fr] items-center gap-3 rounded-md px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50",
                view === item.id ? "bg-emerald-300/[0.1] text-zinc-50" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              )}
            >
              <span className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold",
                view === item.id ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[0.025] text-zinc-500"
              )}>
                {index + 1}
              </span>
              <span>
                <span className="flex items-center gap-2 text-sm font-medium"><item.icon className="h-4 w-4" />{item.label}</span>
                <span className="mt-1 block text-xs text-zinc-500">{item.helper}</span>
              </span>
            </button>
          ))}
        </div>

        <section id="sample-program-view" role="tabpanel" className="mt-6">
          {view === "overview" ? <ProgramOverview /> : null}
          {view === "discovery" ? <DiscoveryView /> : null}
          {view === "product" ? <ProductView /> : null}
          {view === "execution" ? <ExecutionView /> : null}
          {view === "stakeholders" ? <StakeholderView /> : null}
        </section>

        <div className="mt-6 grid gap-4 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.055] p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <ShieldCheck className="h-5 w-5 text-emerald-200" />
          <div>
            <p className="text-sm font-medium text-emerald-100">Ready to try the value-creation step yourself?</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Load this program’s discovery package into Studio, inspect the source traceability, and explore the roadmap, epics, stories, acceptance criteria, and test cases.
            </p>
          </div>
          <Button asChild>
            <Link href={`/artifacts?sample=${sampleProgramSlug}`}>
              Try it in Studio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
