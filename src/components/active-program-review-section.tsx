"use client";

import type { ComponentType, ReactNode } from "react";
import { Gauge, ShieldCheck, SlidersHorizontal, Users2 } from "lucide-react";
import { useActiveProgramReviewController } from "@/hooks/use-active-program-review-controller";
import { ActiveProgramClientUpdateCard } from "@/components/active-program-client-update-card";
import { ActiveProgramCockpitFlow } from "@/components/active-program-cockpit-flow";
import { ActiveProgramStateFlow } from "@/components/active-program-state-flow";
import { ActiveProgramTeamSignalFlow } from "@/components/active-program-team-signal-flow";

type ManageFlowBlockProps = {
  children: ReactNode;
  description: string;
  icon: ComponentType<{ className?: string }>;
  step: string;
  title: string;
};

function ManageFlowBlock({ children, description, icon: Icon, step, title }: ManageFlowBlockProps) {
  return (
    <div className="grid gap-3" data-active-program-manage-step={step}>
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">{step}</p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold tracking-normal text-zinc-50">
            <Icon className="h-4 w-4 text-cyan-200" />
            {title}
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function ActiveProgramReviewSection() {
  const controller = useActiveProgramReviewController();

  return (
    <section id="active-program-review" className="northstar-shell py-16">
      <form onSubmit={controller.handleSubmit} className="grid gap-5">
        <ManageFlowBlock
          step="01 Context"
          title="Select the program and baseline."
          description="Pick the active program first. Baseline fields stay collapsed unless the program foundation, client mapping, or timeline changes."
          icon={SlidersHorizontal}
        >
          <ActiveProgramStateFlow
            selectedProgramId={controller.selectedProgramId}
            clientPortfolioDraft={controller.clientPortfolioDraft}
            clientPortfolioSaveState={controller.clientPortfolioSaveState}
            programOptions={controller.programOptions}
            presentation="compact"
            review={controller.review}
            onClientPortfolioChange={controller.updateClientPortfolioDraft}
            onSaveClientPortfolio={controller.saveClientPortfolio}
            onSelectProgram={controller.selectExistingProgram}
            onFieldChange={controller.updateField}
            onAddTimelineMilestone={controller.addTimelineMilestone}
            onReorderTimelineMilestone={controller.reorderTimelineMilestone}
            onRemoveTimelineMilestone={controller.removeTimelineMilestone}
            onSaveProfile={() => controller.saveReviewSnapshot("", "Program profile")}
            onSaveTimeline={() => controller.saveReviewSnapshot("", "Program timeline")}
            onTimelineMilestoneChange={controller.updateTimelineMilestone}
            saveConfirmation={controller.saveConfirmation}
            saveState={controller.saveState}
          />
        </ManageFlowBlock>

        <ManageFlowBlock
          step="02 Cockpit"
          title="Review the operating picture."
          description="Start here each week to understand health, phase progress, risk, decisions, leadership signal, and team coverage."
          icon={Gauge}
        >
          <ActiveProgramCockpitFlow
            review={controller.review}
            teamRoleUpdates={controller.teamRoleUpdates}
            teamCoverage={{ submitted: controller.teamCoverage.submitted, total: controller.teamCoverage.total }}
            ownerCoverage={controller.ownerCoverage}
            cycleLabel={controller.activeCycleMetadata.cycleLabel}
            latestUpdate={controller.latestUpdate}
            leadershipSignal={controller.leadershipSignal}
            meetingInputsCount={controller.meetingInputs.length}
            formatTimestamp={controller.formatTimestamp}
            isActive={Boolean(controller.selectedProgramId || controller.review.programName.trim())}
            saveState={controller.saveState}
            onPhaseChange={(value) => controller.updateField("currentPhase", value)}
            onSavePhase={() => controller.saveReviewSnapshot("", "Program phase")}
          />
        </ManageFlowBlock>

        {controller.selectedProgramId ? (
          <ManageFlowBlock
            step="03 Client Update"
            title="Publish the reviewed client-safe story."
            description="Use this governed layer only for content intended to appear in the Client Portal and PDF export."
            icon={ShieldCheck}
          >
            <ActiveProgramClientUpdateCard
              review={controller.review}
              selectedProgramId={controller.selectedProgramId}
              teamRoleUpdates={controller.teamRoleUpdates}
            />
          </ManageFlowBlock>
        ) : null}

        <ManageFlowBlock
          step="04 Team Execution"
          title="Capture role signal, tasks, and evidence."
          description="Role updates stay internal by default. Use the tabs to update role signal, move delivery cards, or attach supporting files."
          icon={Users2}
        >
          <ActiveProgramTeamSignalFlow
            teamRoleUpdates={controller.teamRoleUpdates}
            assignedOwnersByRole={controller.assignedOwnersByRole}
            ownerCoverage={controller.ownerCoverage}
            deliveryBoardItems={controller.review.deliveryBoardItems ?? []}
            saveState={controller.saveState}
            saveConfirmation={controller.saveConfirmation}
            deliveryBoardUploadState={controller.deliveryBoardUploadState}
            roleAttachmentUploadState={controller.roleAttachmentUploadState}
            defaultFocusRole={controller.defaultFocusRole}
            currentUserId={controller.currentUserId}
            selectedProgramId={controller.selectedProgramId}
            teamFootprint={controller.teamFootprint}
            teamFootprintSaveState={controller.teamFootprintSaveState}
            teamFootprintSavedAt={controller.teamFootprintSavedAt}
            ownershipSaveState={controller.ownershipSaveState}
            ownershipSavedAt={controller.ownershipSavedAt}
            meetingInputDraft={controller.meetingInputDraft}
            meetingSaveState={controller.meetingSaveState}
            meetingUploadState={controller.meetingUploadState}
            artifacts={controller.review.artifacts}
            latestUpdate={controller.latestUpdate}
            leadershipSignal={controller.leadershipSignal}
            selectedProgramHistory={controller.selectedProgramHistory}
            meetingInputs={controller.meetingInputs}
            savedAt={controller.savedAt}
            formatTimestamp={controller.formatTimestamp}
            formatFileSize={controller.formatFileSize}
            onAddDeliveryBoardItem={controller.addDeliveryBoardItem}
            onUpdateDeliveryBoardItem={controller.updateDeliveryBoardItem}
            onRemoveDeliveryBoardItem={controller.removeDeliveryBoardItem}
            onDeliveryBoardAttachmentsChange={controller.handleDeliveryBoardAttachments}
            onRemoveDeliveryBoardAttachment={controller.removeDeliveryBoardAttachment}
            onSaveDeliveryBoard={() => controller.saveReviewSnapshot("", "Delivery board")}
            onUpdateRoleField={controller.updateRoleField}
            onRoleAttachmentsChange={controller.handleRoleAttachments}
            onRemoveRoleAttachment={controller.removeRoleAttachment}
            onSaveOwnership={controller.saveReviewSnapshot}
            onTeamFootprintChange={controller.updateTeamFootprint}
            onSaveTeamFootprint={controller.saveTeamFootprint}
            onSaveRoleSignal={controller.saveReviewSnapshot}
            onMeetingDraftChange={controller.updateMeetingInputDraft}
            onMeetingAttachmentsChange={controller.handleMeetingAttachments}
            onRemoveMeetingAttachment={controller.removeMeetingAttachment}
            onSaveMeetingInput={controller.saveMeetingInput}
            onArtifactsChange={controller.handleArtifacts}
            onRemoveArtifact={controller.removeArtifact}
            onClearCycle={controller.clearCycle}
            onLoadUpdate={controller.loadUpdate}
          />
        </ManageFlowBlock>
      </form>
    </section>
  );
}
