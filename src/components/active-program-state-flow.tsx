"use client";

import type { ActiveProgramReview, ActiveProgramSaveConfirmation, ProgramTimelineMilestone } from "@/lib/active-program-types";
import type { ProgramSlicerOption } from "@/lib/program-slicer";
import { ActiveProgramStateCard } from "@/components/active-program-state-card";

type ActiveProgramScalarField = keyof Omit<
  ActiveProgramReview,
  "artifacts" | "deliveryBoardItems" | "programMilestones" | "teamRoleUpdates"
>;

type SaveConfirmation = ActiveProgramSaveConfirmation;

type ActiveProgramStateFlowProps = {
  selectedProgramId: string;
  clientPortfolioDraft: string;
  clientPortfolioSaveState: "idle" | "saving" | "saved" | "error";
  programOptions: ProgramSlicerOption[];
  review: ActiveProgramReview;
  onAddTimelineMilestone: () => void;
  onClientPortfolioChange: (value: string) => void;
  onFieldChange: (field: ActiveProgramScalarField, value: string) => void;
  onReorderTimelineMilestone: (draggedMilestoneId: string, targetMilestoneId: string) => void;
  onRemoveTimelineMilestone: (milestoneId: string) => void;
  onSaveProfile: () => void;
  onSaveClientPortfolio: () => void;
  onSaveTimeline: () => void;
  onSelectProgram: (programId: string) => void;
  onTimelineMilestoneChange: (milestoneId: string, field: keyof Omit<ProgramTimelineMilestone, "id">, value: string) => void;
  saveConfirmation: SaveConfirmation;
  saveState: "idle" | "saving" | "saved" | "error";
};

export function ActiveProgramStateFlow({
  selectedProgramId,
  clientPortfolioDraft,
  clientPortfolioSaveState,
  programOptions,
  review,
  onAddTimelineMilestone,
  onClientPortfolioChange,
  onFieldChange,
  onReorderTimelineMilestone,
  onRemoveTimelineMilestone,
  onSaveClientPortfolio,
  onSaveProfile,
  onSaveTimeline,
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
        clientPortfolioDraft={clientPortfolioDraft}
        clientPortfolioSaveState={clientPortfolioSaveState}
        programOptions={programOptions}
        review={review}
        onClientPortfolioChange={onClientPortfolioChange}
        onSelectProgram={onSelectProgram}
        onFieldChange={onFieldChange}
        onAddTimelineMilestone={onAddTimelineMilestone}
        onReorderTimelineMilestone={onReorderTimelineMilestone}
        onRemoveTimelineMilestone={onRemoveTimelineMilestone}
        onSaveClientPortfolio={onSaveClientPortfolio}
        onSaveProfile={onSaveProfile}
        onSaveTimeline={onSaveTimeline}
        onTimelineMilestoneChange={onTimelineMilestoneChange}
        saveConfirmation={saveConfirmation}
        saveState={saveState}
      />
    </>
  );
}
