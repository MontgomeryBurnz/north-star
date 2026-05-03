"use client";

import type { ActiveProgramReview } from "@/lib/active-program-types";
import { ActiveProgramStateCard } from "@/components/active-program-state-card";

type ActiveProgramStateFlowProps = {
  selectedProgramId: string;
  programOptions: Array<{ id: string; label: string }>;
  review: ActiveProgramReview;
  onFieldChange: (field: keyof Omit<ActiveProgramReview, "artifacts">, value: string) => void;
  onSelectProgram: (programId: string) => void;
};

export function ActiveProgramStateFlow({
  selectedProgramId,
  programOptions,
  review,
  onFieldChange,
  onSelectProgram
}: ActiveProgramStateFlowProps) {
  return (
    <>
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">Active program review</p>
        <h2 className="text-3xl font-semibold text-zinc-50 md:text-4xl">Keep the program aligned as reality changes.</h2>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          Start with program setup, then use the cockpit to read the current picture, capture team updates, and keep guided plans pointed at the next move.
        </p>
      </div>

      <ActiveProgramStateCard
        selectedProgramId={selectedProgramId}
        programOptions={programOptions}
        review={review}
        onSelectProgram={onSelectProgram}
        onFieldChange={onFieldChange}
      />
    </>
  );
}
