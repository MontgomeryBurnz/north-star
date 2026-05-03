"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ActiveProgramReview, ActiveProgramUpdate, TeamRoleUpdate } from "@/lib/active-program-types";
import { useCurrentUserAssignments } from "@/hooks/use-current-user-assignments";
import { useForegroundRefresh } from "@/hooks/use-foreground-refresh";
import { useRequestSequence } from "@/hooks/use-request-sequence";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { ProgramTeamAssignmentSummary } from "@/lib/program-team-assignments";
import type { ProgramMeetingAttachment, ProgramMeetingInput } from "@/lib/program-intelligence-types";
import type { ProgramArtifact, ProgramIntake } from "@/lib/program-intake-types";
import { splitLines } from "@/lib/text-signals";
import {
  buildCycleMetadata,
  buildFallbackOwnershipSignature,
  clearCycleReview,
  emptyMeetingInputDraft,
  emptyReview,
  formatFileSize,
  formatTimestamp,
  getProgramTeamRoles,
  hasRoleSubmission,
  inferMeetingTitleFromFileName,
  intakeDraftKey,
  isOwnerOnlyRoleSnapshot,
  isTextLikeMeetingFile,
  normalizeProgramLabel,
  normalizeReview,
  normalizeTeamRoleUpdates,
  optionFromSavedIntake,
  pruneStoredUpdates,
  reviewDraftKey,
  writeStoredUpdates,
  type ExistingProgramOption
} from "@/components/active-program-review-model";

type SaveConfirmation = {
  savedAt?: string;
  scope: string;
  status: "saving" | "saved" | "error";
} | null;

type OwnershipSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function useActiveProgramReviewController() {
  const programsRequest = useRequestSequence();
  const updatesRequest = useRequestSequence();
  const signalRequest = useRequestSequence();
  const meetingInputsRequest = useRequestSequence();
  const { getAssignmentForProgram, loaded: assignmentsLoaded, primaryAssignment } = useCurrentUserAssignments();
  const [review, setReview] = useState<ActiveProgramReview>(emptyReview);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savedOwnershipSignature, setSavedOwnershipSignature] = useState("");
  const [ownershipSavedAt, setOwnershipSavedAt] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [existingPrograms, setExistingPrograms] = useState<ExistingProgramOption[]>([]);
  const [updates, setUpdates] = useState<ActiveProgramUpdate[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveConfirmation, setSaveConfirmation] = useState<SaveConfirmation>(null);
  const [leadershipSignal, setLeadershipSignal] = useState<DeliveryLeadershipSignal | null>(null);
  const [meetingInputs, setMeetingInputs] = useState<ProgramMeetingInput[]>([]);
  const [teamAssignments, setTeamAssignments] = useState<ProgramTeamAssignmentSummary[]>([]);
  const [meetingInputDraft, setMeetingInputDraft] = useState(emptyMeetingInputDraft);
  const [meetingSaveState, setMeetingSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [meetingUploadState, setMeetingUploadState] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");

  const loadServerPrograms = useCallback(async () => {
    const requestId = programsRequest.beginRequest();
    try {
      const response = await fetch("/api/programs", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        programs: Array<{ id: string; intake: ProgramIntake }>;
      };
      const serverPrograms: ExistingProgramOption[] = payload.programs.map((program) => ({
        id: program.id,
        label: program.intake.programName,
        source: "local",
        intake: program.intake,
        review:
          optionFromSavedIntake(program.intake)?.review ??
          normalizeReview(
            {
              ...emptyReview,
              programName: program.intake.programName,
              updateCadence: program.intake.leadershipReviewCadence === "biweekly" ? "biweekly" : "weekly"
            },
            program.intake
          )
      }));

      if (!programsRequest.isLatestRequest(requestId)) return;
      setExistingPrograms(serverPrograms);
      setUpdates(pruneStoredUpdates(serverPrograms.map((program) => program.id)));
      window.localStorage.removeItem(intakeDraftKey);
      window.localStorage.removeItem(reviewDraftKey);
      setSelectedProgramId((current) => (serverPrograms.some((program) => program.id === current) ? current : ""));
    } catch {
      if (!programsRequest.isLatestRequest(requestId)) return;
      setExistingPrograms([]);
    }
  }, [programsRequest]);

  useEffect(() => {
    void loadServerPrograms();
  }, [loadServerPrograms]);

  const selectedProgram = useMemo(
    () => existingPrograms.find((program) => program.id === selectedProgramId),
    [existingPrograms, selectedProgramId]
  );

  const loadProgramUpdates = useCallback(async () => {
    if (!selectedProgramId) return;
    const requestId = updatesRequest.beginRequest();

    try {
      const response = await fetch(`/api/programs/${selectedProgramId}/updates`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { updates: ActiveProgramUpdate[] };
      if (!updatesRequest.isLatestRequest(requestId)) return;
      const normalizedUpdates = payload.updates.map((update) => ({
        ...update,
        review: normalizeReview(update.review, selectedProgram?.intake)
      }));
      setUpdates((current) => {
        const currentOtherPrograms = current.filter((update) => update.programId !== selectedProgramId);
        return [...normalizedUpdates, ...currentOtherPrograms];
      });
    } catch {
      return;
    }
  }, [selectedProgram?.intake, selectedProgramId, updatesRequest]);

  useEffect(() => {
    void loadProgramUpdates();
  }, [loadProgramUpdates]);

  const loadLeadershipSignal = useCallback(async () => {
    if (!selectedProgramId) {
      setLeadershipSignal(null);
      return;
    }
    const requestId = signalRequest.beginRequest();

    try {
      const response = await fetch(`/api/programs/${selectedProgramId}/leadership-signal`, { cache: "no-store" });
      if (!response.ok) {
        if (!signalRequest.isLatestRequest(requestId)) return;
        setLeadershipSignal(null);
        return;
      }

      const payload = (await response.json()) as { signal: DeliveryLeadershipSignal };
      if (!signalRequest.isLatestRequest(requestId)) return;
      setLeadershipSignal(payload.signal);
    } catch {
      if (!signalRequest.isLatestRequest(requestId)) return;
      setLeadershipSignal(null);
    }
  }, [selectedProgramId, signalRequest]);

  useEffect(() => {
    void loadLeadershipSignal();
  }, [loadLeadershipSignal]);

  const defaultFocusRole = selectedProgramId ? getAssignmentForProgram(selectedProgramId)?.role ?? null : null;
  const activeTeamRoles = useMemo(() => getProgramTeamRoles(selectedProgram?.intake), [selectedProgram?.intake]);
  const assignedOwnersByRole = useMemo(
    () =>
      Object.fromEntries(
        teamAssignments.map((assignment) => [normalizeProgramLabel(assignment.role), assignment.owners])
      ) as Record<string, string[]>,
    [teamAssignments]
  );

  const loadTeamAssignments = useCallback(async () => {
    if (!selectedProgramId) {
      setTeamAssignments([]);
      return;
    }

    try {
      const response = await fetch(`/api/programs/${selectedProgramId}/team-assignments`, { cache: "no-store" });
      if (!response.ok) {
        setTeamAssignments([]);
        return;
      }

      const payload = (await response.json()) as { assignments: ProgramTeamAssignmentSummary[] };
      setTeamAssignments(payload.assignments);
    } catch {
      setTeamAssignments([]);
    }
  }, [selectedProgramId]);

  useEffect(() => {
    void loadTeamAssignments();
  }, [loadTeamAssignments]);

  const loadMeetingInputs = useCallback(async () => {
    if (!selectedProgramId) {
      setMeetingInputs([]);
      return;
    }
    const requestId = meetingInputsRequest.beginRequest();

    try {
      const response = await fetch(`/api/programs/${selectedProgramId}/meeting-inputs`, { cache: "no-store" });
      if (!response.ok) {
        if (!meetingInputsRequest.isLatestRequest(requestId)) return;
        setMeetingInputs([]);
        return;
      }

      const payload = (await response.json()) as { meetingInputs: ProgramMeetingInput[] };
      if (!meetingInputsRequest.isLatestRequest(requestId)) return;
      setMeetingInputs(payload.meetingInputs);
    } catch {
      if (!meetingInputsRequest.isLatestRequest(requestId)) return;
      setMeetingInputs([]);
    }
  }, [meetingInputsRequest, selectedProgramId]);

  useEffect(() => {
    void loadMeetingInputs();
  }, [loadMeetingInputs]);

  const refreshActiveProgramView = useCallback(() => {
    void loadServerPrograms();
    void loadProgramUpdates();
    void loadLeadershipSignal();
    void loadMeetingInputs();
    void loadTeamAssignments();
  }, [loadLeadershipSignal, loadMeetingInputs, loadProgramUpdates, loadServerPrograms, loadTeamAssignments]);
  useForegroundRefresh(refreshActiveProgramView, { enabled: true, intervalMs: selectedProgramId ? 15000 : null });

  const selectedProgramHistory = useMemo(() => {
    if (!selectedProgramId && !review.programName) return [];

    return updates
      .filter((update) => update.programId === selectedProgramId || update.programName === review.programName)
      .filter((update) => !isOwnerOnlyRoleSnapshot(update.review))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [review.programName, selectedProgramId, updates]);

  const latestUpdate = selectedProgramHistory[0];

  const teamRoleUpdates = useMemo(
    () => normalizeTeamRoleUpdates(review.teamRoleUpdates, activeTeamRoles),
    [activeTeamRoles, review.teamRoleUpdates]
  );

  const activeCycleMetadata = useMemo(
    () => buildCycleMetadata(review.updateCadence === "biweekly" ? "biweekly" : "weekly"),
    [review.updateCadence]
  );

  const teamCoverage = useMemo(() => {
    const submitted = teamRoleUpdates.filter(hasRoleSubmission);
    return {
      submitted: submitted.length,
      total: teamRoleUpdates.length,
      missing: teamRoleUpdates.filter((role) => !submitted.some((submittedRole) => submittedRole.role === role.role))
    };
  }, [teamRoleUpdates]);

  const ownerCoverage = useMemo(() => {
    const configured = teamRoleUpdates.filter(
      (role) => role.updatedBy.trim() || assignedOwnersByRole[normalizeProgramLabel(role.role)]?.length
    ).length;
    return {
      configured,
      total: teamRoleUpdates.length
    };
  }, [assignedOwnersByRole, teamRoleUpdates]);

  const ownershipSignature = useMemo(
    () => buildFallbackOwnershipSignature(review.teamRoleUpdates, activeTeamRoles, assignedOwnersByRole),
    [activeTeamRoles, assignedOwnersByRole, review.teamRoleUpdates]
  );
  const fallbackOwnershipHasEntries = useMemo(
    () =>
      teamRoleUpdates.some(
        (roleUpdate) => !assignedOwnersByRole[normalizeProgramLabel(roleUpdate.role)]?.length && roleUpdate.updatedBy.trim()
      ),
    [assignedOwnersByRole, teamRoleUpdates]
  );
  const ownershipSaveState = useMemo<OwnershipSaveState>(() => {
    if (!fallbackOwnershipHasEntries) return ownerCoverage.configured ? "saved" : "idle";
    if (saveState === "saving" && ownershipSignature !== savedOwnershipSignature) return "saving";
    if (saveState === "error" && ownershipSignature !== savedOwnershipSignature) return "error";
    return ownershipSignature === savedOwnershipSignature ? "saved" : "dirty";
  }, [fallbackOwnershipHasEntries, ownerCoverage.configured, ownershipSignature, saveState, savedOwnershipSignature]);

  const updateField = useCallback(
    (field: keyof Omit<ActiveProgramReview, "artifacts">, value: string) => {
      setReview((current) =>
        normalizeReview(
          {
            ...current,
            [field]: value
          },
          selectedProgram?.intake
        )
      );
    },
    [selectedProgram?.intake]
  );

  const updateRoleField = useCallback(
    (role: string, field: keyof Omit<TeamRoleUpdate, "role">, value: string | boolean) => {
      setReview((current) => {
        const nextRoleUpdates = normalizeTeamRoleUpdates(current.teamRoleUpdates, activeTeamRoles).map((roleUpdate) =>
          normalizeProgramLabel(roleUpdate.role) === normalizeProgramLabel(role)
            ? {
                ...roleUpdate,
                [field]: value
              }
            : roleUpdate
        );

        return normalizeReview(
          {
            ...current,
            teamRoleUpdates: nextRoleUpdates
          },
          selectedProgram?.intake
        );
      });
    },
    [activeTeamRoles, selectedProgram?.intake]
  );

  const selectExistingProgram = useCallback(
    (programId: string) => {
      setSelectedProgramId(programId);
      const selectedProgram = existingPrograms.find((program) => program.id === programId);
      if (!selectedProgram) return;
      const latestForProgram = updates
        .filter((update) => update.programId === programId || update.programName === selectedProgram.label)
        .filter((update) => !isOwnerOnlyRoleSnapshot(update.review))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      const nextReview = normalizeReview(latestForProgram?.review ?? selectedProgram.review, selectedProgram.intake);
      const nextRoles = getProgramTeamRoles(selectedProgram.intake);
      setReview(nextReview);
      setSavedOwnershipSignature(buildFallbackOwnershipSignature(nextReview.teamRoleUpdates, nextRoles, assignedOwnersByRole));
      setOwnershipSavedAt(null);
      setSavedAt(null);
      setSaveState("idle");
      setSaveConfirmation(null);
      setMeetingSaveState("idle");
    },
    [assignedOwnersByRole, existingPrograms, updates]
  );

  useEffect(() => {
    if (!assignmentsLoaded || selectedProgramId || !primaryAssignment) return;
    if (!existingPrograms.some((program) => program.id === primaryAssignment.programId)) return;
    selectExistingProgram(primaryAssignment.programId);
  }, [assignmentsLoaded, existingPrograms, primaryAssignment, selectExistingProgram, selectedProgramId]);

  const handleArtifacts = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const artifacts: ProgramArtifact[] = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
      lastModified: file.lastModified
    }));

    setReview((current) => ({
      ...current,
      artifacts: [...current.artifacts, ...artifacts].filter(
        (artifact, index, all) => all.findIndex((candidate) => candidate.id === artifact.id) === index
      )
    }));
    event.target.value = "";
  }, []);

  const removeArtifact = useCallback((id: string) => {
    setReview((current) => ({
      ...current,
      artifacts: current.artifacts.filter((artifact) => artifact.id !== id)
    }));
  }, []);

  const uploadMeetingAttachment = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/artifacts/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) throw new Error("meeting-attachment-upload");
    const payload = (await response.json()) as {
      artifact: ProgramMeetingAttachment;
    };
    return payload.artifact;
  }, []);

  const handleMeetingAttachments = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (!files.length) return;

      setMeetingUploadState("uploading");

      try {
        const attachments = await Promise.all(files.map((file) => uploadMeetingAttachment(file)));
        const transcriptTexts = await Promise.all(
          files.map(async (file) => {
            if (!isTextLikeMeetingFile(file)) return "";
            try {
              return (await file.text()).trim();
            } catch {
              return "";
            }
          })
        );

        setMeetingInputDraft((current) => {
          const nextAttachments = [...current.attachments, ...attachments].filter(
            (attachment, index, all) => all.findIndex((candidate) => candidate.id === attachment.id) === index
          );
          const nextTitle = current.title.trim() ? current.title : inferMeetingTitleFromFileName(files[0]?.name ?? "");
          const nextTranscriptExcerpt = current.transcriptExcerpt.trim()
            ? current.transcriptExcerpt
            : transcriptTexts.find(Boolean) ?? "";
          const hasTextUpload = files.some((file) => isTextLikeMeetingFile(file));
          const hasRecordingUpload = files.some((file) => file.type.startsWith("audio/") || file.type.startsWith("video/"));

          return {
            ...current,
            sourceProvider: "upload",
            sourceType: hasTextUpload ? "transcript" : hasRecordingUpload ? "recording" : current.sourceType,
            title: nextTitle,
            transcriptExcerpt: nextTranscriptExcerpt,
            attachments: nextAttachments
          };
        });

        setMeetingUploadState("uploaded");
      } catch {
        setMeetingUploadState("error");
      } finally {
        event.target.value = "";
      }
    },
    [uploadMeetingAttachment]
  );

  const removeMeetingAttachment = useCallback((id: string) => {
    setMeetingInputDraft((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id)
    }));
  }, []);

  const saveReviewSnapshot = useCallback(
    async (lastUpdatedRole = "") => {
      const timestamp = new Date();
      const programId =
        selectedProgramId || `local-${review.programName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "active-program"}`;
      const currentRoleUpdates = normalizeTeamRoleUpdates(review.teamRoleUpdates, activeTeamRoles);

      if (lastUpdatedRole) {
        const targetRole = currentRoleUpdates.find(
          (roleUpdate) => normalizeProgramLabel(roleUpdate.role) === normalizeProgramLabel(lastUpdatedRole)
        );
        if (!targetRole || !hasRoleSubmission(targetRole)) {
          return;
        }
      }

      const nextReview = normalizeReview(
        {
          ...review,
          teamRoleUpdates: lastUpdatedRole
            ? currentRoleUpdates.map((roleUpdate) =>
                normalizeProgramLabel(roleUpdate.role) === normalizeProgramLabel(lastUpdatedRole)
                  ? {
                      ...roleUpdate,
                      lastUpdatedAt: timestamp.toISOString()
                    }
                  : roleUpdate
              )
            : currentRoleUpdates,
          lastUpdatedRole: lastUpdatedRole || review.lastUpdatedRole || ""
        },
        selectedProgram?.intake
      );
      const nextUpdate: ActiveProgramUpdate = {
        id: `${programId}-${timestamp.getTime()}`,
        programId,
        programName: nextReview.programName || "Untitled active program",
        createdAt: timestamp.toISOString(),
        review: nextReview
      };
      const nextUpdates = [nextUpdate, ...updates].slice(0, 20);

      writeStoredUpdates(nextUpdates);
      window.localStorage.setItem("work-path-active-program-review", JSON.stringify(nextReview));
      setUpdates(nextUpdates);
      setReview(nextReview);
      setSaveState("saving");
      setSaveConfirmation({
        scope: lastUpdatedRole ? `${lastUpdatedRole} signal` : "Cycle synthesis",
        status: "saving"
      });

      try {
        const response = await fetch(`/api/programs/${programId}/updates`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(nextReview)
        });

        if (!response.ok) throw new Error("Review save failed.");
        setSaveState("saved");
        const savedTime = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setSavedAt(savedTime);
        setSaveConfirmation({
          savedAt: savedTime,
          scope: lastUpdatedRole ? `${lastUpdatedRole} signal` : "Cycle synthesis",
          status: "saved"
        });
        setSavedOwnershipSignature(buildFallbackOwnershipSignature(nextReview.teamRoleUpdates, activeTeamRoles, assignedOwnersByRole));
        setOwnershipSavedAt(savedTime);
        void loadProgramUpdates();
        void loadLeadershipSignal();
      } catch {
        setSaveState("error");
        setSavedAt(timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        setSaveConfirmation({
          scope: lastUpdatedRole ? `${lastUpdatedRole} signal` : "Cycle synthesis",
          status: "error"
        });
      }
    },
    [
      activeTeamRoles,
      assignedOwnersByRole,
      loadLeadershipSignal,
      loadProgramUpdates,
      review,
      selectedProgram?.intake,
      selectedProgramId,
      updates
    ]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await saveReviewSnapshot("");
    },
    [saveReviewSnapshot]
  );

  const saveMeetingInput = useCallback(async () => {
    if (!selectedProgramId || !review.programName.trim()) {
      setMeetingSaveState("error");
      return;
    }

    if (!meetingInputDraft.title.trim() || !meetingInputDraft.summary.trim()) {
      setMeetingSaveState("error");
      return;
    }

    setMeetingSaveState("saving");

    try {
      const response = await fetch(`/api/programs/${selectedProgramId}/meeting-inputs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: meetingInputDraft.title,
          sourceType: meetingInputDraft.sourceType,
          sourceProvider: meetingInputDraft.sourceProvider,
          capturedAt: meetingInputDraft.capturedAt || new Date().toISOString(),
          summary: meetingInputDraft.summary,
          transcriptExcerpt: meetingInputDraft.transcriptExcerpt,
          attachments: meetingInputDraft.attachments,
          extractedSignals: splitLines(meetingInputDraft.extractedSignals),
          recommendedPlanAdjustments: splitLines(meetingInputDraft.recommendedPlanAdjustments)
        })
      });

      if (!response.ok) {
        throw new Error("meeting-input");
      }

      const payload = (await response.json()) as { meetingInput: ProgramMeetingInput };
      setMeetingInputs((current) => [payload.meetingInput, ...current]);
      setMeetingInputDraft(emptyMeetingInputDraft);
      setMeetingSaveState("saved");
      setMeetingUploadState("idle");
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setMeetingSaveState("error");
    }
  }, [meetingInputDraft, review.programName, selectedProgramId]);

  const updateMeetingInputDraft = useCallback((patch: Partial<typeof emptyMeetingInputDraft>) => {
    setMeetingInputDraft((current) => ({ ...current, ...patch }));
  }, []);

  const clearCycle = useCallback(() => {
    setReview((current) => clearCycleReview(current, selectedProgram?.intake));
  }, [selectedProgram?.intake]);

  const loadUpdate = useCallback((update: ActiveProgramUpdate) => {
    setReview(update.review);
  }, []);

  const programOptions = useMemo(
    () => existingPrograms.map((program) => ({ id: program.id, label: program.label })),
    [existingPrograms]
  );

  return {
    activeCycleMetadata,
    assignedOwnersByRole,
    clearCycle,
    defaultFocusRole,
    formatFileSize,
    formatTimestamp,
    handleArtifacts,
    handleMeetingAttachments,
    handleSubmit,
    latestUpdate,
    leadershipSignal,
    loadUpdate,
    meetingInputDraft,
    meetingInputs,
    meetingSaveState,
    meetingUploadState,
    ownerCoverage,
    ownershipSavedAt,
    ownershipSaveState,
    programOptions,
    removeArtifact,
    removeMeetingAttachment,
    review,
    saveConfirmation,
    savedAt,
    saveMeetingInput,
    saveReviewSnapshot,
    saveState,
    selectExistingProgram,
    selectedProgramHistory,
    selectedProgramId,
    teamCoverage,
    teamRoleUpdates,
    updateField,
    updateMeetingInputDraft,
    updateRoleField
  };
}
