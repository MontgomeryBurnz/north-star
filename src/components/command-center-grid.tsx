import { ArrowRight, BrainCircuit, ClipboardList, FileCheck2, HeartPulse, Info, Route, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/dashboard-metrics";

const programInputs = ["Plan", "SoW", "Outcomes", "Stakeholders", "Risks", "Constraints", "Program details"];

const recommendedOutputs = [
  "Recommended plan",
  "Delivery approach",
  "Key deliverables",
  "Requirements",
  "Stakeholder moves",
  "Next-step sequence"
];

const guidanceChecks = [
  {
    icon: HeartPulse,
    label: "Separate the signal from the noise",
    detail: "Name pressure, conflict, and uncertainty without letting them decide the work path."
  },
  {
    icon: ShieldAlert,
    label: "Protect program health",
    detail: "Surface risks, missing owners, overloaded paths, and decision points before they compound."
  },
  {
    icon: Route,
    label: "Choose a best-fit path",
    detail: "Use context, research, and local program data to recommend the next practical move."
  }
];

export function CommandCenterGrid({ metrics }: { metrics: DashboardMetrics }) {
  const metricCards = [
    {
      label: "Active programs",
      value: metrics.activePrograms,
      detail: "currently in motion"
    },
    {
      label: "Guided plans",
      value: metrics.guidedPlans,
      detail: "current guidance paths"
    },
    {
      label: "Risks",
      value: metrics.riskCount,
      detail: metrics.callouts.find((callout) => callout.type === "risk")
        ? `${metrics.callouts.find((callout) => callout.type === "risk")?.programName}: latest guided-plan risk`
        : "no active risks surfaced",
      help: metrics.riskHelp
    },
    {
      label: "Decisions needed",
      value: metrics.decisionCount,
      detail: metrics.callouts.find((callout) => callout.type === "decision")
        ? `${metrics.callouts.find((callout) => callout.type === "decision")?.programName}: pending decision`
        : "no pending decisions surfaced",
      help: metrics.decisionHelp
    }
  ];

  return (
    <section id="guidance-flow" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">How it works</p>
        <h2 className="text-3xl font-semibold text-zinc-50 md:text-4xl">Transforming Vision to Action</h2>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          Delivery leads provide the operating context. The system turns it into grounded guidance, clear outputs, and
          a practical path that keeps the team oriented around what matters most next.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="bg-zinc-950/80 lg:col-span-4">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <ClipboardList className="h-4 w-4 text-emerald-200" />
              1. Capture the program
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-5">
            {programInputs.map((input) => (
              <div key={input} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-zinc-300">
                {input}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/80 lg:col-span-4">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <BrainCircuit className="h-4 w-4 text-cyan-200" />
              2. Analyze the path
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {guidanceChecks.map((check) => (
              <div key={check.label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                  <check.icon className="h-4 w-4 text-cyan-200" />
                  {check.label}
                </div>
                <p className="text-xs leading-5 text-zinc-500">{check.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/80 lg:col-span-4">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <FileCheck2 className="h-4 w-4 text-amber-200" />
              3. Generate outputs
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-5">
            {recommendedOutputs.map((output) => (
              <div
                key={output}
                className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-zinc-300"
              >
                {output}
                <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item) => (
          <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.025] p-4">
            <p className="text-2xl font-semibold text-zinc-50">{String(item.value).padStart(2, "0")}</p>
            <div className="mt-1 flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
              <span>{item.label}</span>
              {"help" in item ? (
                <span className="group relative inline-flex items-center normal-case tracking-normal">
                  <Info className="h-3.5 w-3.5 cursor-help text-zinc-600" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-[11px] leading-5 text-zinc-300 shadow-lg group-hover:block">
                    {item.help}
                  </span>
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
