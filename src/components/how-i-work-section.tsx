import { Route } from "lucide-react";
import { workMethods } from "@/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";

export function HowIWorkSection() {
  return (
    <section id="how-i-work" className="border-y border-white/10 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="How I work"
          title="Playbook for turning ambiguity into delivery systems."
          description="Define the constraint. Shape the system. Align the decision. Deliver through measured loops."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {workMethods.map((method, index) => (
            <Card key={method.id} className="bg-zinc-900/45">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-300/20 bg-emerald-300/10 text-xs font-medium text-emerald-100">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Route className="h-4 w-4 text-zinc-600" />
                </div>
                <CardTitle className="text-zinc-50">{method.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Trigger</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{method.trigger}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Move</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{method.operatingMove}</p>
                </div>
                <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">Output</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{method.output}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
