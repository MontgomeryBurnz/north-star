"use client";

import { useState } from "react";
import { ClipboardList, FilePlus2 } from "lucide-react";
import { ActiveProgramReviewSection } from "@/components/active-program-review-section";
import { ProgramIntakeSection } from "@/components/program-intake-section";
import { cn } from "@/lib/utils";

type ProgramWorkspaceMode = "manage" | "setup";

const programWorkspaceModes = [
  {
    id: "manage" as const,
    icon: ClipboardList,
    label: "Manage",
    description: "Review posture, capture team updates, meeting inputs, risks, and decisions."
  },
  {
    id: "setup" as const,
    icon: FilePlus2,
    label: "Setup",
    description: "Create a new program, define outcomes, assign roles, and upload source artifacts."
  }
];

export function ProgramWorkspace({ initialMode = "manage" }: { initialMode?: ProgramWorkspaceMode }) {
  const [mode, setMode] = useState<ProgramWorkspaceMode>(initialMode);

  return (
    <main>
      <section className="border-b border-white/10 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,0.7fr)] lg:items-end">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">Program Hub</p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-zinc-50 md:text-5xl">
                What changed, who owns it, and what needs action?
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                Create the program record once, then keep delivery reality current through team updates, artifacts,
                meeting inputs, risks, and decisions.
              </p>
            </div>
            <div className="grid gap-2 rounded-md border border-white/10 bg-zinc-950/70 p-2 sm:grid-cols-2">
              {programWorkspaceModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "rounded-md border p-4 text-left transition-colors",
                    mode === item.id
                      ? "border-emerald-300/35 bg-emerald-300/[0.08]"
                      : "border-transparent bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.045]"
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-50">
                    <item.icon className="h-4 w-4 text-emerald-200" />
                    {item.label}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-zinc-500">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {mode === "setup" ? <ProgramIntakeSection /> : <ActiveProgramReviewSection />}
    </main>
  );
}
