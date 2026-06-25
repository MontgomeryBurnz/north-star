"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { FileUp, KanbanSquare, Save, Users2 } from "lucide-react";
import type { ActiveProgramUpdate, DeliveryBoardItem, TeamRoleUpdate } from "@/lib/active-program-types";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { ProgramMeetingInput } from "@/lib/program-intelligence-types";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import { ActiveProgramDeliveryBoardCard } from "@/components/active-program-delivery-board-card";
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
  deliveryBoardItems: DeliveryBoardItem[];
  saveState: "idle" | "saving" | "saved" | "error";
  saveConfirmation: SaveConfirmation;
  deliveryBoardUploadState: {
    itemId: string;
    status: "idle" | "uploading" | "uploaded" | "error";
  } | null;
  roleAttachmentUploadState: {
    role: string;
    status: "idle" | "uploading" | "uploaded" | "error";
  } | null;
  defaultFocusRole: string | null;
  currentUserId: string | null;
  selectedProgramId: string;
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
  onAddDeliveryBoardItem: (
    input: Pick<
      DeliveryBoardItem,
      "description" | "dueDate" | "latestNote" | "owner" | "role" | "sharedRoles" | "startDate" | "status" | "title"
    >
  ) => void;
  onUpdateDeliveryBoardItem: (itemId: string, patch: Partial<Omit<DeliveryBoardItem, "attachments" | "createdAt" | "id">>) => void;
  onRemoveDeliveryBoardItem: (itemId: string) => void;
  onDeliveryBoardAttachmentsChange: (itemId: string, event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemoveDeliveryBoardAttachment: (itemId: string, attachmentId: string) => void;
  onSaveDeliveryBoard: () => void | Promise<void>;
  onUpdateRoleField: (role: string, field: keyof Omit<TeamRoleUpdate, "role">, value: string | boolean) => void;
  onRoleAttachmentsChange: (role: string, event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemoveRoleAttachment: (role: string, attachmentId: string) => void;
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
  deliveryBoardItems,
  saveState,
  saveConfirmation,
  deliveryBoardUploadState,
  roleAttachmentUploadState,
  defaultFocusRole,
  currentUserId,
  selectedProgramId,
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
  onAddDeliveryBoardItem,
  onUpdateDeliveryBoardItem,
  onRemoveDeliveryBoardItem,
  onDeliveryBoardAttachmentsChange,
  onRemoveDeliveryBoardAttachment,
  onSaveDeliveryBoard,
  onUpdateRoleField,
  onRoleAttachmentsChange,
  onRemoveRoleAttachment,
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
  const [activeWorkspace, setActiveWorkspace] = useState<"role" | "board" | "evidence">("role");
  const activeBoardItems = useMemo(
    () => deliveryBoardItems.filter((item) => item.status !== "done"),
    [deliveryBoardItems]
  );
  const uploadedEvidenceCount = artifacts.length + meetingInputs.reduce((total, input) => total + input.attachments.length, 0);
  const roleSignalsCaptured = useMemo(
    () =>
      teamRoleUpdates.filter((roleUpdate) =>
        Boolean(
          roleUpdate.status !== "on-track" ||
            roleUpdate.progressUpdate.trim() ||
            roleUpdate.changesObserved.trim() ||
            roleUpdate.activeRisks.trim() ||
            roleUpdate.blockers.trim() ||
            roleUpdate.decisionsNeeded.trim() ||
            roleUpdate.supportNeeded.trim()
        )
      ).length,
    [teamRoleUpdates]
  );
  const workspaceTabs = [
    {
      id: "role" as const,
      label: "Role update",
      detail: "Capture responsibility-level signal",
      metric: `${roleSignalsCaptured}/${teamRoleUpdates.length || 0}`,
      icon: Users2
    },
    {
      id: "board" as const,
      label: "Progress board",
      detail: "Track deliverables and blockers",
      metric: `${activeBoardItems.length} active`,
      icon: KanbanSquare
    },
    {
      id: "evidence" as const,
      label: "Artifacts",
      detail: "Attach files, recordings, and proof",
      metric: `${uploadedEvidenceCount} files`,
      icon: FileUp
    }
  ];

  return (
    <div className="grid gap-5">
      <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-3">
          {workspaceTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeWorkspace === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                data-active-program-workspace-tab={tab.id}
                onClick={() => setActiveWorkspace(tab.id)}
                className={`grid min-h-[116px] gap-3 rounded-lg border p-4 text-left transition-colors ${
                  selected
                    ? "border-cyan-300/35 bg-cyan-300/[0.075] text-cyan-50 shadow-[0_0_30px_rgba(103,232,249,0.08)]"
                    : "border-white/10 bg-white/[0.025] text-zinc-300 hover:border-cyan-300/25 hover:bg-cyan-300/[0.035]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]">
                    {tab.metric}
                  </span>
                </div>
                <p className="text-xs leading-5 text-zinc-500">{tab.detail}</p>
              </button>
            );
          })}
        </div>
      </div>

      {activeWorkspace === "role" ? (
        <ActiveProgramTeamUpdatesCard
          teamRoleUpdates={teamRoleUpdates}
          assignedOwnersByRole={assignedOwnersByRole}
          ownerCoverage={ownerCoverage}
          saveState={saveState}
          saveConfirmation={saveConfirmation}
          defaultFocusRole={defaultFocusRole}
          currentUserId={currentUserId}
          selectedProgramId={selectedProgramId}
          ownershipSaveState={ownershipSaveState}
          ownershipSavedAt={ownershipSavedAt}
          roleAttachmentUploadState={roleAttachmentUploadState}
          formatTimestamp={formatTimestamp}
          formatFileSize={formatFileSize}
          onUpdateRoleField={onUpdateRoleField}
          onRoleAttachmentsChange={onRoleAttachmentsChange}
          onRemoveRoleAttachment={onRemoveRoleAttachment}
          onSaveOwnership={onSaveOwnership}
          onSaveRoleSignal={onSaveRoleSignal}
        />
      ) : null}

      {activeWorkspace === "board" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <ActiveProgramDeliveryBoardCard
            deliveryBoardItems={deliveryBoardItems}
            deliveryBoardUploadState={deliveryBoardUploadState}
            teamRoleUpdates={teamRoleUpdates}
            assignedOwnersByRole={assignedOwnersByRole}
            saveState={saveState}
            saveConfirmation={saveConfirmation}
            formatFileSize={formatFileSize}
            onAddDeliveryBoardItem={onAddDeliveryBoardItem}
            onUpdateDeliveryBoardItem={onUpdateDeliveryBoardItem}
            onRemoveDeliveryBoardItem={onRemoveDeliveryBoardItem}
            onDeliveryBoardAttachmentsChange={onDeliveryBoardAttachmentsChange}
            onRemoveDeliveryBoardAttachment={onRemoveDeliveryBoardAttachment}
            onSaveDeliveryBoard={onSaveDeliveryBoard}
          />

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
      ) : null}

      {activeWorkspace === "evidence" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
          <ActiveProgramStatusArtifactsCard
            artifacts={artifacts}
            onArtifactsChange={onArtifactsChange}
            onRemoveArtifact={onRemoveArtifact}
            formatFileSize={formatFileSize}
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
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-100">Cycle synthesis</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Save the full operating picture when multiple inputs need to refresh guidance together.
          </p>
          {savedAt ? (
            <p className={`mt-2 text-sm ${saveState === "error" ? "text-amber-200" : "text-cyan-200"}`}>
              {saveState === "error" ? "Saved locally only" : "Saved to server and refreshed guided plan"} at {savedAt}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" size="lg" onClick={onClearCycle}>
            Clear cycle
          </Button>
          <Button type="submit" size="lg">
            <Save className="h-4 w-4" />
            {saveState === "saving" ? "Saving..." : "Save cycle synthesis"}
          </Button>
        </div>
      </div>
    </div>
  );
}
