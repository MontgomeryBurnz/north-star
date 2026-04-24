import { Activity, ArrowUpRight } from "lucide-react";
import { experiments } from "@/data";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";

export function SignalsSection() {
  return (
    <section id="signals" className="border-y border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(9,9,11,0))]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
          <SectionHeader
            eyebrow="Signals"
            title="Active exploration layer."
            description="Concepts, product ideas, AI tests, and early systems moving through the edge of the operating model."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {experiments.map((experiment, index) => (
              <article
                key={experiment.id}
                className="group relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950/55 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-zinc-950/80"
              >
                <div className="absolute right-3 top-3 text-xs text-zinc-700">{String(index + 1).padStart(2, "0")}</div>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <StatusBadge status={experiment.status} />
                  {experiment.tag ? (
                    <Badge variant="zinc" className="capitalize">
                      {experiment.tag}
                    </Badge>
                  ) : null}
                </div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-50">
                  <Activity className="h-4 w-4 text-cyan-200" />
                  {experiment.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{experiment.description}</p>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-600 transition-colors group-hover:text-cyan-200">
                  evolving signal
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
