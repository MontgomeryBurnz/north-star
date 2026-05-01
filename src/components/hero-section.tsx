import Link from "next/link";
import { ArrowRight, BookOpenCheck, FilePlus2, Gauge, Info, Layers3, ListChecks, MessageSquareText, Sparkles } from "lucide-react";

import { MotionDiv } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/dashboard-metrics";

const quickStartActions = [
  {
    href: "/active-program?mode=setup",
    icon: FilePlus2,
    label: "Capture context",
    detail: "Start with the program outcomes, SME assumptions, roles, stakeholders, and source artifacts."
  },
  {
    href: "/active-program?mode=manage",
    icon: ListChecks,
    label: "Refresh signal",
    detail: "Add team updates, risks, decisions, meeting context, and delivery changes as the work moves."
  },
  {
    href: "/systems",
    icon: Layers3,
    label: "Use guided work",
    detail: "Review program guidance, team action plans, role artifacts, risks, and decision paths."
  },
  {
    href: "/assistant",
    icon: MessageSquareText,
    label: "Open Guide",
    detail: "Ask program-specific questions and let the dialogue sharpen the intelligence layer."
  }
];

export function HeroSection({ metrics }: { metrics: DashboardMetrics }) {
  const stats = [
    { label: "Programs", value: String(metrics.activePrograms).padStart(2, "0") },
    { label: "Plans", value: String(metrics.guidedPlans).padStart(2, "0") },
    {
      label: "Risks",
      value: String(metrics.riskCount).padStart(2, "0"),
      help: metrics.riskHelp
    },
    {
      label: "Decisions",
      value: String(metrics.decisionCount).padStart(2, "0"),
      help: metrics.decisionHelp
    },
    {
      label: "Reviews",
      value: String(metrics.leadershipReviewsDue).padStart(2, "0"),
      help: metrics.leadershipReviewHelp
    }
  ];

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),transparent_42%),linear-gradient(180deg,rgba(9,9,11,0.4),#09090b_88%)]" />
      <div className="relative mx-auto grid max-w-7xl items-start gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-10 lg:px-8 lg:py-16">
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
            Console onboarding
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-zinc-50 sm:text-6xl lg:text-7xl">
            Let&apos;s Get Started
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 md:mt-6 md:text-lg md:leading-8">
            NorthStar combines SME insight, program data, and AI intelligence into one operating hub for getting work done.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/active-program?mode=setup">
                Start a program
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/#how-to-use">See the workflow</Link>
            </Button>
          </div>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="grid gap-4 lg:min-w-0"
        >
          <Card className="relative overflow-hidden bg-zinc-950/80">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
            <div className="absolute inset-0 animate-scan bg-gradient-to-b from-transparent via-white/[0.035] to-transparent" />
            <CardHeader className="p-5 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <BookOpenCheck className="h-4 w-4 text-emerald-200" />
                Intelligence hub path
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 min-[900px]:grid-cols-5">
                {stats.map((stat) => (
                  <div key={stat.label} className="min-h-20 rounded-md border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-2xl font-semibold text-zinc-50">{stat.value}</p>
                    <div className="mt-1 flex min-w-0 items-center gap-1 text-xs leading-5 text-zinc-500">
                      <span>{stat.label}</span>
                      {"help" in stat ? (
                        <span className="group relative inline-flex items-center">
                          <Info className="h-3.5 w-3.5 cursor-help text-zinc-600" />
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-[11px] leading-5 text-zinc-300 shadow-lg group-hover:block">
                            {stat.help}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3">
                {quickStartActions.map((action, index) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-emerald-300/35 hover:bg-emerald-300/[0.055]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-300/20 bg-emerald-300/10 text-sm font-semibold text-emerald-100">
                      {index + 1}
                    </span>
                    <span>
                      <span className="flex items-center gap-2 text-sm font-medium text-zinc-50">
                        <action.icon className="h-4 w-4 text-emerald-200" />
                        {action.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-500">{action.detail}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 text-zinc-600 transition-colors group-hover:text-emerald-200" />
                  </Link>
                ))}
              </div>

              <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-cyan-100">
                  <Gauge className="h-4 w-4" />
                  How NorthStar works
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Capture what experts know, ground it in program evidence, keep the signal current, and let AI translate
                  the latest context into plans, artifacts, decisions, and leadership-ready guidance.
                </p>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>
      </div>
    </section>
  );
}
