"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, RotateCcw, X } from "lucide-react";
import { demoProgramId } from "@/lib/demo-mode";

const steps = [
  { href: `/active-program?mode=manage&program=${demoProgramId}`, path: "/active-program", label: "Program Hub" },
  { href: `/systems?program=${demoProgramId}`, path: "/systems", label: "Guided Plans" },
  { href: "/artifacts", path: "/artifacts", label: "Studio" },
  { href: `/leadership?program=${demoProgramId}`, path: "/leadership", label: "Leadership" },
  { href: `/client-updates?program=${demoProgramId}`, path: "/client-updates", label: "Client Updates" },
  { href: "/client", path: "/client", label: "Client Portal" }
];

export function DemoModeBanner() {
  const pathname = usePathname();
  return (
    <aside className="border-b border-amber-300/20 bg-amber-300/[0.07]" aria-label="Sample data mode" data-demo-mode>
      <div className="northstar-shell py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-100">Exploring with sample data · Civic Services Network</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">Use every workspace with one connected fictional program. Changes stay in this browser session.</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <form action="/api/demo-session" method="post">
              <input type="hidden" name="action" value="reset" />
              <input type="hidden" name="next" value={pathname === "/artifacts" ? "/artifacts?sample=regional-service-modernization" : pathname === "/active-program" ? "/active-program?mode=manage" : pathname} />
              <button type="submit" className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-amber-100 hover:bg-amber-300/10"><RotateCcw className="h-3 w-3" />Reset sample</button>
            </form>
            <form action="/api/demo-session" method="post">
              <input type="hidden" name="action" value="exit" />
              <input type="hidden" name="next" value="/" />
              <button type="submit" className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-zinc-300 hover:bg-white/10"><X className="h-3 w-3" />Exit sample data</button>
            </form>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Explore the connected workflow">
          {steps.map((step, index) => (
            <span key={step.path} className="inline-flex items-center gap-2">
              {index ? <ArrowRight className="h-3 w-3 text-zinc-600" aria-hidden="true" /> : null}
              <Link href={step.href} aria-current={pathname === step.path ? "page" : undefined} className={`rounded px-2 py-1 text-xs transition-colors ${pathname === step.path ? "bg-amber-300/15 text-amber-100" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"}`}>{step.label}</Link>
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function StartSampleButton({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <form action="/api/demo-session" method="post" className={className}>
      <input type="hidden" name="action" value="start" />
      <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/[0.075]">{children ?? "Explore with sample data"}<ArrowRight className="h-4 w-4" /></button>
    </form>
  );
}
