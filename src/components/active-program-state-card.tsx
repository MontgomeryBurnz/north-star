"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown, Compass, SlidersHorizontal } from "lucide-react";
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
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const slicerOptions = useMemo(
    () => programOptions.map((program) => ({ id: program.id, label: program.label })),
    [programOptions]
  );
  const hasSelectedProgram = Boolean(selectedProgramId);

  useEffect(() => {
    setIsSetupOpen(false);
  }, [selectedProgramId]);

  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-zinc-50">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-200" />
            Program profile
          </span>
          {hasSelectedProgram ? (
            <button
              type="button"
              onClick={() => setIsSetupOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-cyan-300/30 hover:text-cyan-100"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {isSetupOpen ? "Close profile" : "Edit profile"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isSetupOpen ? "rotate-180" : ""}`} />
            </button>
          ) : null}
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

        {!hasSelectedProgram ? (
          <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <Compass className="h-4 w-4 text-cyan-200" />
              Select a program to manage the live operating view.
            </p>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
              Program setup is captured when the program is created. This page is optimized for weekly execution: role updates,
              progress board movement, and attached evidence.
            </p>
          </div>
        ) : null}

        {hasSelectedProgram ? (
          <div className="grid gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-4 md:grid-cols-5">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-100">Program</p>
              <p className="mt-2 truncate text-sm font-semibold text-zinc-50">{review.programName || "Selected program"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Phase</p>
              <p className="mt-2 truncate text-sm text-zinc-300">{review.currentPhase || "Not set"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Cadence</p>
              <p className="mt-2 truncate text-sm text-zinc-300">
                {(review.updateCadence ?? "weekly") === "biweekly" ? "Bi-weekly cycle" : "Weekly cycle"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Complete</p>
              <p className="mt-2 truncate text-sm text-zinc-300">
                {review.programCompletionPercent ? `${review.programCompletionPercent.replace(/%$/, "")}%` : "Not set"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Milestone</p>
              <p className="mt-2 truncate text-sm text-zinc-300">{review.nextMilestoneName || "Not set"}</p>
            </div>
          </div>
        ) : null}

        {isSetupOpen && hasSelectedProgram ? (
          <div className="grid gap-4 border-t border-white/10 pt-4">
            <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3">
              <p className="text-xs leading-5 text-amber-100">
                Profile fields should change only when the program baseline changes. Weekly movement belongs in Role update,
                Progress board, or Artifacts.
              </p>
            </div>
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

              <div className="grid gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-3 md:col-span-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">Client / executive update fields</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    These fields feed the Client Portal portfolio and program one-pager after save.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Executive sponsor</span>
                    <input
                      value={review.executiveSponsor ?? ""}
                      onChange={(event) => onFieldChange("executiveSponsor", event.target.value)}
                      placeholder="Sponsor name"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program lead</span>
                    <input
                      value={review.programLead ?? ""}
                      onChange={(event) => onFieldChange("programLead", event.target.value)}
                      placeholder="Delivery or program lead"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">PMO</span>
                    <input
                      value={review.pmo ?? ""}
                      onChange={(event) => onFieldChange("pmo", event.target.value)}
                      placeholder="PMO or operating owner"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program % complete</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={review.programCompletionPercent ?? ""}
                      onChange={(event) => onFieldChange("programCompletionPercent", event.target.value)}
                      placeholder="78"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Completion delta</span>
                    <input
                      value={review.completionDelta ?? ""}
                      onChange={(event) => onFieldChange("completionDelta", event.target.value)}
                      placeholder="+6%"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Next milestone priority</span>
                    <select
                      value={review.nextMilestonePriority ?? ""}
                      onChange={(event) => onFieldChange("nextMilestonePriority", event.target.value)}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    >
                      <option value="">Auto</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </label>

                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Next milestone</span>
                    <input
                      value={review.nextMilestoneName ?? ""}
                      onChange={(event) => onFieldChange("nextMilestoneName", event.target.value)}
                      placeholder="Scope baseline, pilot readiness, go-live, or next steering checkpoint"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Milestone date</span>
                    <input
                      type="date"
                      value={review.nextMilestoneDate ?? ""}
                      onChange={(event) => onFieldChange("nextMilestoneDate", event.target.value)}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2 md:col-span-3">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Client status note</span>
                    <textarea
                      value={review.clientStatusNote ?? ""}
                      onChange={(event) => onFieldChange("clientStatusNote", event.target.value)}
                      placeholder="One concise executive-facing status note for the Client Portal."
                      rows={3}
                      className="min-h-[96px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>
                </div>
              </div>

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
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
