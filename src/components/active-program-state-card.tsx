"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";
import type { ActiveProgramReview } from "@/lib/active-program-types";
import { ProgramSlicer } from "@/components/program-slicer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProgramOption = {
  id: string;
  label: string;
};

type ActiveProgramStateCardProps = {
  selectedProgramId: string;
  programOptions: ProgramOption[];
  review: ActiveProgramReview;
  onSelectProgram: (programId: string) => void;
  onFieldChange: (field: keyof Omit<ActiveProgramReview, "artifacts" | "deliveryBoardItems" | "teamRoleUpdates">, value: string) => void;
};

export function ActiveProgramStateCard({
  selectedProgramId,
  programOptions,
  review,
  onSelectProgram,
  onFieldChange
}: ActiveProgramStateCardProps) {
  const slicerOptions = useMemo(
    () => programOptions.map((program) => ({ id: program.id, label: program.label })),
    [programOptions]
  );

  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <Activity className="h-4 w-4 text-cyan-200" />
          Program setup
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 md:p-5">
        <ProgramSlicer
          label="Select existing program"
          options={slicerOptions}
          selectedProgramId={selectedProgramId}
          onSelectProgram={onSelectProgram}
          placeholder="Choose a program to review..."
          emptyLabel="No saved programs yet"
          helperText="Selecting a program prefills the review with its north star, current risks, decisions, and delivery context."
          tone="cyan"
        />

        <label className="grid gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program name</span>
          <input
            value={review.programName}
            onChange={(event) => onFieldChange("programName", event.target.value)}
            placeholder="Active program, client, initiative, or workstream name"
            className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Update cadence</span>
            <select
              value={review.updateCadence ?? "weekly"}
              onChange={(event) => onFieldChange("updateCadence", event.target.value)}
              className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
            >
              <option value="weekly">Weekly cycle</option>
              <option value="biweekly">Bi-weekly cycle</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Current phase</span>
            <input
              value={review.currentPhase}
              onChange={(event) => onFieldChange("currentPhase", event.target.value)}
              placeholder="Discovery, build, launch, stabilization, or recovery"
              className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Original north star</span>
            <textarea
              value={review.originalNorthStar}
              onChange={(event) => onFieldChange("originalNorthStar", event.target.value)}
              placeholder="What outcome is the team still trying to protect as conditions change?"
              rows={3}
              className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Stakeholder temperature</span>
            <textarea
              value={review.stakeholderTemperature}
              onChange={(event) => onFieldChange("stakeholderTemperature", event.target.value)}
              placeholder="Where are stakeholders aligned, uncertain, frustrated, or split?"
              rows={3}
              className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Delivery health</span>
            <textarea
              value={review.deliveryHealth}
              onChange={(event) => onFieldChange("deliveryHealth", event.target.value)}
              placeholder="Where does the program feel healthy, overloaded, noisy, or fragile?"
              rows={3}
              className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program synthesis note</span>
            <textarea
              value={review.programSynthesisNote ?? ""}
              onChange={(event) => onFieldChange("programSynthesisNote", event.target.value)}
              placeholder="Capture the delivery-lead synthesis of how the team inputs change the weekly picture."
              rows={3}
              className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
            />
          </label>
        </div>

      </CardContent>
    </Card>
  );
}
