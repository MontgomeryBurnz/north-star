import Link from "next/link";
import { Initiative } from "@/data";
import { ArrowRight, ChevronDown, FileCheck2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";

const typeTone: Record<Initiative["type"], string> = {
  Product: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  Data: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
  CX: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  AI: "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
  "Operating Model": "border-zinc-400/20 bg-zinc-300/10 text-zinc-100"
};

const typeLabel: Record<Initiative["type"], string> = {
  Product: "Plan",
  Data: "Risk",
  CX: "CX",
  AI: "AI output",
  "Operating Model": "Delivery"
};

export function OperatingCard({ initiative }: { initiative: Initiative }) {
  return (
    <Card className="group h-full overflow-hidden bg-zinc-950/75 transition-colors hover:border-emerald-300/30">
      <details className="group/details">
        <summary className="cursor-pointer list-none">
          <div className="grid grid-cols-12">
            <div className="col-span-5 h-1 bg-emerald-300/80" />
            <div className="col-span-4 h-1 bg-cyan-300/60" />
            <div className="col-span-3 h-1 bg-amber-300/70" />
          </div>
          <CardHeader>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={initiative.status} />
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${typeTone[initiative.type]}`}>
                  {typeLabel[initiative.type]}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open/details:rotate-180" />
            </div>
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <FileCheck2 className="h-4 w-4 text-emerald-200" />
              {initiative.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">When this helps</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{initiative.problemSpace}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Tailored guidance</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{initiative.systemDesigned}</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Input context</p>
                <div className="flex flex-wrap gap-2">
                  {initiative.inputContext.map((item) => (
                    <span key={item} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-400">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </summary>
        <div className="border-t border-white/10 px-5 pb-5 pt-4">
          <div className="grid gap-3">
            <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">How it decides</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{initiative.howItWorks}</p>
            </div>
            <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">Key next steps</p>
              <div className="mt-2 grid gap-2">
                {initiative.recommendedNextSteps.map((step) => (
                  <p key={step} className="flex gap-2 text-sm leading-6 text-zinc-300">
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                    {step}
                  </p>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Key outputs</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {initiative.deliveryOutputs.map((output) => (
                    <span key={output} className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-zinc-300">
                      {output}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">Risk signals</p>
                <div className="mt-2 grid gap-1">
                  {initiative.riskSignals.map((risk) => (
                    <p key={risk} className="text-xs leading-5 text-zinc-300">{risk}</p>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Work path value</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{initiative.valueCreated}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Planning approach</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{initiative.strategicAngle}</p>
            </div>
            <Link
              href={`/systems/${initiative.id}`}
              className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-emerald-300/30 hover:text-zinc-50"
            >
              Open output detail
            </Link>
          </div>
        </div>
      </details>
    </Card>
  );
}
