"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    const timeout = window.setTimeout(() => {
      let frame = 0;
      const totalFrames = 18;
      const interval = window.setInterval(() => {
        frame += 1;
        setDisplayValue(Math.round((value * frame) / totalFrames));
        if (frame >= totalFrames) {
          window.clearInterval(interval);
        }
      }, 28);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return <span>{String(displayValue).padStart(2, "0")}</span>;
}

export type OperatorSignal = {
  id: string;
  label: string;
  value: number;
  href: string;
  detail: string;
};

export function OperatorSignalStrip({ signals }: { signals: OperatorSignal[] }) {
  return (
    <section aria-label="Operator signal strip" className="border-b border-white/10 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-px overflow-hidden rounded-none border-x border-white/10 bg-white/10 md:grid-cols-3">
          {signals.map((signal, index) => (
            <Link
              key={signal.label}
              href={signal.href}
              className="group animate-[fadeIn_500ms_ease-out_both] bg-zinc-950 px-5 py-5 transition-colors hover:bg-zinc-900/75"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">{signal.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-normal text-zinc-50">
                    <CountUp value={signal.value} delay={index * 90} />
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{signal.detail}</p>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 text-zinc-600 transition-colors group-hover:text-emerald-200" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
