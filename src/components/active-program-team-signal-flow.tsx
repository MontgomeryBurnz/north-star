"use client";

import type { ChangeEvent } from "react";
import { Save } from "lucide-react";
import type { ActiveProgramUpdate, TeamRoleUpdate } from "@/lib/active-program-types";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { ProgramMeetingInput } from "@/lib/program-intelligence-types";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import { ActiveProgramMeetingIntelligenceCard } from "@/components/active-program-meeting-intelligence-card";
import { ActiveProgramSidebar } from "@/components/active-program-sidebar";
import { ActiveProgramStatusArtifactsCard } from "@/components/active-program-status-artifacts-card";
import { ActiveProgramTeamUpdatesCard } from "@/components/active-program-team-updates-card";
import { Button } from "@/components/ui/button";
import type { emptyMeetingInputDraft } from "@/components/active-program-review-model";

type SaveConfirmation = {
  savedAt?: string;
  scope: string;
  status: "saving" | "saved" | "error";
} | null;

type ActiveProgramTeamSignalFlowProps = {
  teamRoleUpdates: TeamRoleUpdate[];
  assignedOwnersByRole: Record<string, string[]>;
  ownerCoverage: { configured: number; total: number };
  saveState: "idle" | "saving" | "saved" | "error";
  saveConfirmation: SaveConfirmation;
  defaultFocusRole: string | null;
  ownershipSaveState: "idle" | "dirty" | "saving" | "saved" | "error";
  ownershipSavedAt: string | null;
  meetingInputDraft: typeof emptyMeetingInputDraft;
  meetingSaveState: "idle" | "saving" | "saved" | "error";
  meetingUploadState: "idle" | "uploading" | "uploaded" | "error";
  artifacts: ProgramArtifact[];
  latestUpdate?: ActiveProgramUpdate;
  leadershipSignal: DeliveryLeadershipSignal | null;
  selectedProgramHistory: ActiveProgramUpdate[];
  meetingInputs: ProgramMeetingInput[];
  savedAt: string | null;
  formatTimestamp: (value: string) => string;
  formatFileSize: (size: number) => string;
  onUpdateRoleField: (role: string, field: keyof Omit<TeamRoleUpdate, "role">, value: string | boolean) => void;
  onSaveOwnership: (lastUpdatedRole?: string) => void | Promise<void>;
  onSaveRoleSignal: (lastUpdatedRole?: string) => void | Promise<void>;
  onMeetingDraftChange: (patch: Partial<typeof emptyMeetingInputDraft>) => void;
  onMeetingAttachmentsChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemoveMeetingAttachment: (id: string) => void;
  onSaveMeetingInput: () => void | Promise<void>;
  onArtifactsChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveArtifact: (id: string) => void;
  onClearCycle: () => void;
  onLoadUpdate: (update: ActiveProgramUpdate) => void;
};

export function ActiveProgramTeamSignalFlow({
  teamRoleUpdates,
  assignedOwnersByRole,
  ownerCoverage,
  saveState,
  saveConfirmation,
  defaultFocusRole,
  ownershipSaveState,
  ownershipSavedAt,
  meetingInputDraft,
  meetingSaveState,
  meetingUploadState,
  artifacts,
  latestUpdate,
  leadershipSignal,
  selectedProgramHistory,
  meetingInputs,
  savedAt,
  formatTimestamp,
  formatFileSize,
  onUpdateRoleField,
  onSaveOwnership,
  onSaveRoleSignal,
  onMeetingDraftChange,
  onMeetingAttachmentsChange,
  onRemoveMeetingAttachment,
  onSaveMeetingInput,
  onArtifactsChange,
  onRemoveArtifact,
  onClearCycle,
  onLoadUpdate
}: ActiveProgramTeamSignalFlowProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-4">
        <ActiveProgramTeamUpdatesCard
          teamRoleUpdates={teamRoleUpdates}
          assignedOwnersByRole={assignedOwnersByRole}
          ownerCoverage={ownerCoverage}
          saveState={saveState}
          saveConfirmation={saveConfirmation}
          defaultFocusRole={defaultFocusRole}
          ownershipSaveState={ownershipSaveState}
          ownershipSavedAt={ownershipSavedAt}
          formatTimestamp={formatTimestamp}
          onUpdateRoleField={onUpdateRoleField}
          onSaveOwnership={onSaveOwnership}
          onSaveRoleSignal={onSaveRoleSignal}
        />

        <ActiveProgramMeetingIntelligenceCard
          meetingInputDraft={meetingInputDraft}
          meetingSaveState={meetingSaveState}
          meetingUploadState={meetingUploadState}
          onDraftChange={onMeetingDraftChange}
          onAttachmentsChange={onMeetingAttachmentsChange}
          onRemoveAttachment={onRemoveMeetingAttachment}
          onSave={onSaveMeetingInput}
          formatFileSize={formatFileSize}
        />

        <ActiveProgramStatusArtifactsCard
          artifacts={artifacts}
          onArtifactsChange={onArtifactsChange}
          onRemoveArtifact={onRemoveArtifact}
          formatFileSize={formatFileSize}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" size="lg">
            <Save className="h-4 w-4" />
            {saveState === "saving" ? "Saving..." : "Save cycle synthesis"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={onClearCycle}>
            Clear cycle
          </Button>
          {savedAt ? (
            <p className={`self-center text-sm ${saveState === "error" ? "text-amber-200" : "text-cyan-200"}`}>
              {saveState === "error" ? "Saved locally only" : "Saved to server and refreshed guided plan"} at {savedAt}
            </p>
          ) : null}
        </div>
      </div>

      <ActiveProgramSidebar
        artifacts={artifacts}
        latestUpdate={latestUpdate}
        leadershipSignal={leadershipSignal}
        selectedProgramHistory={selectedProgramHistory}
        meetingInputs={meetingInputs}
        formatTimestamp={formatTimestamp}
        onLoadUpdate={onLoadUpdate}
      />
    </div>
  );
}
