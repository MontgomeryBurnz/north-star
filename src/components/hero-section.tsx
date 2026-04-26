import Link from "next/link";
import { ArrowRight, Gauge, Info, Layers3, Radio, Sparkles } from "lucide-react";
import { MotionDiv } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/dashboard-metrics";

export function HeroSection({ metrics }: { metrics: DashboardMetrics }) {
  const stats = [
    { label: "Active programs", value: String(metrics.activePrograms).padStart(2, "0") },
    { label: "Guided plans", value: String(metrics.guidedPlans).padStart(2, "0") },
    {
      label: "Risks",
      value: String(metrics.riskCount).padStart(2, "0"),
      help: metrics.riskHelp
    },
    {
      label: "Decisions needed",
      value: String(metrics.decisionCount).padStart(2, "0"),
      help: metrics.decisionHelp
    },
    {
      label: "Reviews due",
      value: String(metrics.leadershipReviewsDue).padStart(2, "0"),
      help: metrics.leadershipReviewHelp
    }
  ];

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),transparent_42%),linear-gradient(180deg,rgba(9,9,11,0.4),#09090b_88%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
            Console
          </div>
          <h1 className="text-5xl font-semibold tracking-normal text-zinc-50 sm:text-6xl lg:text-7xl">
            Finding True North.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 md:text-lg">
            See the programs, guidance surfaces, and decision paths that shape the work ahead. This console helps teams orient quickly, reduce noise, and hold to the clearest direction as conditions change.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/assistant">
                Find the work path
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/#guidance-flow">See how it works</Link>
            </Button>
          </div>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="grid gap-4"
        >
          <Card className="relative overflow-hidden bg-zinc-950/80">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
            <div className="absolute inset-0 animate-scan bg-gradient-to-b from-transparent via-white/[0.035] to-transparent" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <Gauge className="h-4 w-4 text-emerald-200" />
                North Star console
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-2xl font-semibold text-zinc-50">{stat.value}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs leading-5 text-zinc-500">
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
              <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-100">
                  <Layers3 className="h-4 w-4" />
                Operating focus
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Program inputs, leadership signal, and delivery updates are translated into the next practical path.
                </p>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-3 rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-4">
                <Radio className="mt-0.5 h-4 w-4 text-cyan-200" />
                <div>
                  <p className="text-sm font-medium text-cyan-100">Current watchlist</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Delivery risk, timing pressure, unresolved decisions, and blockers that can pull programs off path.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>
      </div>
    </section>
  );
}
