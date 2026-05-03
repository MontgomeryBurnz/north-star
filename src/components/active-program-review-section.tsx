"use client";

import { useActiveProgramReviewController } from "@/hooks/use-active-program-review-controller";
import { ActiveProgramCockpitFlow } from "@/components/active-program-cockpit-flow";
import { ActiveProgramStateFlow } from "@/components/active-program-state-flow";
import { ActiveProgramTeamSignalFlow } from "@/components/active-program-team-signal-flow";

export function ActiveProgramReviewSection() {
  const controller = useActiveProgramReviewController();

  return (
    <section id="active-program-review" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <form onSubmit={controller.handleSubmit} className="grid gap-5">
        <ActiveProgramStateFlow
          selectedProgramId={controller.selectedProgramId}
          programOptions={controller.programOptions}
          review={controller.review}
          onSelectProgram={controller.selectExistingProgram}
          onFieldChange={controller.updateField}
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
        />

        <ActiveProgramTeamSignalFlow
          teamRoleUpdates={controller.teamRoleUpdates}
          assignedOwnersByRole={controller.assignedOwnersByRole}
          ownerCoverage={controller.ownerCoverage}
          deliveryBoardItems={controller.review.deliveryBoardItems ?? []}
          saveState={controller.saveState}
          saveConfirmation={controller.saveConfirmation}
          deliveryBoardUploadState={controller.deliveryBoardUploadState}
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
