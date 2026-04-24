import Link from "next/link";
import { FlaskConical, ShieldCheck } from "lucide-react";
import { aiProducts, experiments } from "@/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";

export function AILabSection() {
  return (
    <section id="lab" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="AI lab"
        title="Product experiments with operator-grade guardrails."
        description="AI surfaces managed through use case, evaluation, guardrails, adoption signal, and rollout gate."
      />
      <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          {aiProducts.map((product) => (
            <Card key={product.id} className="bg-zinc-950/70">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-zinc-50">
                    <FlaskConical className="h-4 w-4 text-amber-200" />
                    {product.name}
                  </CardTitle>
                  <StatusBadge status={product.status} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-zinc-400">{product.summary}</p>
                <p className="mt-4 text-sm text-zinc-300">{product.purpose}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.outputs.map((output) => (
                    <span
                      key={output}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-zinc-400"
                    >
                      <ShieldCheck className="h-3 w-3 text-emerald-200" />
                      {output}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/lab/${product.id}`}
                  className="mt-5 inline-flex rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-300/30 hover:text-zinc-50"
                >
                  Open product detail
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-zinc-950/70">
          <CardHeader>
            <CardTitle className="text-zinc-50">Experiment feed</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {experiments.map((experiment) => (
              <div key={experiment.id} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-zinc-100">{experiment.title}</p>
                  <StatusBadge status={experiment.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{experiment.description}</p>
                {experiment.tag ? (
                  <>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-500">Tag</p>
                    <p className="mt-1 text-sm capitalize text-zinc-300">{experiment.tag}</p>
                  </>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
