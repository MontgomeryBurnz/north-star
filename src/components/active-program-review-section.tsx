"use client";

import { useActiveProgramReviewController } from "@/hooks/use-active-program-review-controller";
import { ActiveProgramClientUpdateCard } from "@/components/active-program-client-update-card";
import { ActiveProgramCockpitFlow } from "@/components/active-program-cockpit-flow";
import { ActiveProgramStateFlow } from "@/components/active-program-state-flow";
import { ActiveProgramTeamSignalFlow } from "@/components/active-program-team-signal-flow";

export function ActiveProgramReviewSection() {
  const controller = useActiveProgramReviewController();

  return (
    <section id="active-program-review" className="northstar-shell py-16">
      <form onSubmit={controller.handleSubmit} className="grid gap-5">
        <ActiveProgramStateFlow
          selectedProgramId={controller.selectedProgramId}
          clientPortfolioDraft={controller.clientPortfolioDraft}
          clientPortfolioSaveState={controller.clientPortfolioSaveState}
          programOptions={controller.programOptions}
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

        {controller.selectedProgramId ? (
          <ActiveProgramClientUpdateCard
            review={controller.review}
            selectedProgramId={controller.selectedProgramId}
            teamRoleUpdates={controller.teamRoleUpdates}
          />
        ) : null}

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
      </form>
    </section>
  );
}
