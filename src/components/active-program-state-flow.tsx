"use client";

import type { ActiveProgramReview, ProgramTimelineMilestone } from "@/lib/active-program-types";
import { ActiveProgramStateCard } from "@/components/active-program-state-card";

type ActiveProgramScalarField = keyof Omit<
  ActiveProgramReview,
  "artifacts" | "deliveryBoardItems" | "programMilestones" | "teamRoleUpdates"
>;

type SaveConfirmation = {
  savedAt?: string;
  scope: string;
  status: "saving" | "saved" | "error";
} | null;

type ActiveProgramStateFlowProps = {
  selectedProgramId: string;
  programOptions: Array<{ id: string; label: string }>;
  review: ActiveProgramReview;
  onAddTimelineMilestone: () => void;
  onFieldChange: (field: ActiveProgramScalarField, value: string) => void;
  onRemoveTimelineMilestone: (milestoneId: string) => void;
  onSaveProfile: () => void;
  onSelectProgram: (programId: string) => void;
  onTimelineMilestoneChange: (milestoneId: string, field: keyof Omit<ProgramTimelineMilestone, "id">, value: string) => void;
  saveConfirmation: SaveConfirmation;
  saveState: "idle" | "saving" | "saved" | "error";
};

export function ActiveProgramStateFlow({
  selectedProgramId,
  programOptions,
  review,
  onAddTimelineMilestone,
  onFieldChange,
  onRemoveTimelineMilestone,
  onSaveProfile,
  onSelectProgram,
  onTimelineMilestoneChange,
  saveConfirmation,
  saveState
}: ActiveProgramStateFlowProps) {
  return (
    <>
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">Active program review</p>
        <h2 className="text-3xl font-semibold text-zinc-50 md:text-4xl">Keep the program aligned as reality changes.</h2>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          Select a program, then use the cockpit, role updates, and progress board to manage the weekly execution picture.
        </p>
      </div>

      <ActiveProgramStateCard
        selectedProgramId={selectedProgramId}
        programOptions={programOptions}
        review={review}
        onSelectProgram={onSelectProgram}
        onFieldChange={onFieldChange}
        onAddTimelineMilestone={onAddTimelineMilestone}
        onRemoveTimelineMilestone={onRemoveTimelineMilestone}
        onSaveProfile={onSaveProfile}
        onTimelineMilestoneChange={onTimelineMilestoneChange}
        saveConfirmation={saveConfirmation}
        saveState={saveState}
      />
    </>
  );
}
