import { initiatives } from "@/data";
import { SectionHeader } from "@/components/section-header";

export function TimelineSignals() {
  const signals = initiatives.map((initiative) => ({
    signal: initiative.problemSpace,
    source: initiative.title,
    type: initiative.type
  }));

  return (
    <section className="border-y border-white/10 bg-zinc-900/30">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Signals"
          title="Tracked signals keep systems current."
          description="Watched patterns, reviewed constraints, and decision inputs."
        />
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {signals.map((item, index) => (
            <div key={`${item.source}-${item.signal}`} className="relative rounded-lg border border-white/10 bg-zinc-950/70 p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-300/10 text-xs text-emerald-200">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xs text-zinc-500">{item.type}</span>
              </div>
              <p className="text-sm font-medium text-zinc-100">{item.source}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{item.signal}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
