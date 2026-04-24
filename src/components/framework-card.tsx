import Link from "next/link";
import { ChevronDown, Wrench } from "lucide-react";
import { Framework } from "@/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FrameworkCard({ framework }: { framework: Framework }) {
  return (
    <Card className="h-full overflow-hidden border-cyan-300/15 bg-[linear-gradient(180deg,rgba(8,145,178,0.09),rgba(9,9,11,0.78))] transition-colors hover:border-cyan-300/35">
      <details className="group/details">
        <summary className="cursor-pointer list-none">
          <CardHeader>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-xs font-medium text-cyan-100">
                Strategic model
              </span>
              <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open/details:rotate-180" />
            </div>
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <Wrench className="h-4 w-4 text-cyan-200" />
              {framework.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Problem it solves</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{framework.problemSolved}</p>
              </div>
              <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Core idea</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{framework.coreIdea}</p>
              </div>
            </div>
          </CardContent>
        </summary>
        <div className="border-t border-cyan-300/15 px-5 pb-5 pt-4">
          <div className="grid gap-3">
            <div className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Where it applies</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{framework.whereItApplies}</p>
            </div>
            <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">Output</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{framework.output}</p>
            </div>
            <Link
              href={`/frameworks/${framework.id}`}
              className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-cyan-300/30 hover:text-zinc-50"
            >
              Open model detail
            </Link>
          </div>
        </div>
      </details>
    </Card>
  );
}
