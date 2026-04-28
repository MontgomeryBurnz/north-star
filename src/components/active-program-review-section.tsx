"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import type { ActiveProgramReview, ActiveProgramUpdate, TeamRoleUpdate, TeamRoleUpdateStatus } from "@/lib/active-program-types";
import { useRequestSequence } from "@/hooks/use-request-sequence";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { ProgramMeetingAttachment, ProgramMeetingInput } from "@/lib/program-intelligence-types";
import type { ProgramArtifact, ProgramIntake } from "@/lib/program-intake-types";
import { firstSignal, splitLines } from "@/lib/text-signals";
import { ActiveProgramMeetingIntelligenceCard } from "@/components/active-program-meeting-intelligence-card";
import { ActiveProgramSidebar } from "@/components/active-program-sidebar";
import { ActiveProgramStateCard } from "@/components/active-program-state-card";
import { ActiveProgramStatusArtifactsCard } from "@/components/active-program-status-artifacts-card";
import { ActiveProgramTeamUpdatesCard } from "@/components/active-program-team-updates-card";
import { Button } from "@/components/ui/button";

const emptyReview: ActiveProgramReview = {
  programName: "",
  originalNorthStar: "",
  currentPhase: "",
  progressSinceLastReview: "",
  planChanges: "",
  activeRisks: "",
  stakeholderTemperature: "",
  decisionsPending: "",
  deliveryHealth: "",
  supportNeeded: "",
  updateCadence: "weekly",
  cycleLabel: "",
  cycleStartedAt: "",
  programSynthesisNote: "",
  lastUpdatedRole: "",
  teamRoleUpdates: [],
  artifacts: []
};

const emptyMeetingInputDraft = {
  title: "",
  sourceType: "meeting-notes" as ProgramMeetingInput["sourceType"],
  sourceProvider: "manual" as ProgramMeetingInput["sourceProvider"],
  capturedAt: "",
  summary: "",
  transcriptExcerpt: "",
  attachments: [] as ProgramMeetingAttachment[],
  extractedSignals: "",
  recommendedPlanAdjustments: ""
};

type ExistingProgramOption = {
  id: string;
  label: string;
  source: "local";
  intake?: ProgramIntake;
  review: ActiveProgramReview;
};

function normalizeProgramLabel(value: string) {
  return value.trim().toLowerCase();
}

function mergeProgramOptions(...groups: ExistingProgramOption[][]) {
  const merged = new Map<string, ExistingProgramOption>();

  for (const option of groups.flat()) {
    const labelKey = normalizeProgramLabel(option.label);
    const existing = merged.get(labelKey);

    if (!existing) {
      merged.set(labelKey, option);
      continue;
    }

    if (existing.source === option.source && option.id !== existing.id) {
      merged.set(labelKey, option);
    }
  }

  return Array.from(merged.values());
}

const reviewHistoryKey = "work-path-active-program-updates";
const reviewDraftKey = "work-path-active-program-review";
const intakeDraftKey = "work-path-program-intake";

const defaultTeamRoles = [
  "Product Management",
  "Business Analysis",
  "User Experience",
  "Application Development",
  "Data Engineering",
  "Change Management"
] as const;

function mapLegacyConfidenceToStatus(confidence?: string): TeamRoleUpdateStatus {
  if (confidence === "low") return "blocked";
  if (confidence === "medium") return "at-risk";
  return "on-track";
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function optionFromSavedIntake(savedIntake: ProgramIntake): ExistingProgramOption | null {
  if (!savedIntake.programName.trim()) return null;

  const roleAwareReview = normalizeReview(
    {
      ...emptyReview,
      programName: savedIntake.programName,
      originalNorthStar: savedIntake.vision || savedIntake.outcomes,
      currentPhase: "Newly captured",
      progressSinceLastReview: savedIntake.currentStatus,
      planChanges: "",
      activeRisks: savedIntake.risks,
      stakeholderTemperature: savedIntake.stakeholders,
      decisionsPending: savedIntake.decisionsNeeded,
      deliveryHealth: savedIntake.blockers,
      supportNeeded: savedIntake.constraints,
      updateCadence: savedIntake.leadershipReviewCadence === "biweekly" ? "biweekly" : "weekly",
      artifacts: savedIntake.artifacts
    },
    savedIntake
  );

  return {
    id: "local-saved-intake",
    label: savedIntake.programName,
    source: "local",
    intake: savedIntake,
    review: roleAwareReview
  };
}

function readStoredUpdates(): ActiveProgramUpdate[] {
  const saved = window.localStorage.getItem(reviewHistoryKey);
  if (!saved) return [];

  try {
    return JSON.parse(saved) as ActiveProgramUpdate[];
  } catch {
    return [];
  }
}

function writeStoredUpdates(updates: ActiveProgramUpdate[]) {
  window.localStorage.setItem(reviewHistoryKey, JSON.stringify(updates));
}

function pruneStoredUpdates(validProgramIds: string[]) {
  const validIds = new Set(validProgramIds);
  const nextUpdates = readStoredUpdates().filter((update) => validIds.has(update.programId));
  writeStoredUpdates(nextUpdates);
  return nextUpdates;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function isTextLikeMeetingFile(file: File) {
  return file.type.startsWith("text/") || /\.(txt|md|csv|rtf)$/i.test(file.name);
}

function inferMeetingTitleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getProgramTeamRoles(intake?: ProgramIntake) {
  const configured = intake?.teamRoles?.map((role) => role.trim()).filter(Boolean) ?? [];
  return Array.from(new Set((configured.length ? configured : [...defaultTeamRoles]).map((role) => role.trim()).filter(Boolean)));
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function buildCycleMetadata(cadence: ActiveProgramReview["updateCadence"], date = new Date()) {
  const start = startOfWeek(date);
  const weekStart = new Date(start);
  if (cadence === "biweekly") {
    const reference = new Date("2026-01-05T00:00:00.000Z");
    const diffDays = Math.floor((start.getTime() - reference.getTime()) / 86400000);
    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex % 2 !== 0) {
      weekStart.setDate(weekStart.getDate() - 7);
    }
  }

  const end = new Date(weekStart);
  end.setDate(end.getDate() + (cadence === "biweekly" ? 13 : 6));
  const label = `${cadence === "biweekly" ? "Bi-weekly" : "Weekly"} cycle of ${weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })}`;

  return {
    cycleLabel: label,
    cycleStartedAt: weekStart.toISOString(),
    cycleEndsAt: end.toISOString()
  };
}

function buildTeamRoleUpdate(role: string, existing?: Partial<TeamRoleUpdate>): TeamRoleUpdate {
  const legacyConfidence = (existing as { confidence?: string } | undefined)?.confidence;
  return {
    role,
    updatedBy: existing?.updatedBy ?? "",
    progressUpdate: existing?.progressUpdate ?? "",
    changesObserved: existing?.changesObserved ?? "",
    activeRisks: existing?.activeRisks ?? "",
    blockers: existing?.blockers ?? "",
    decisionsNeeded: existing?.decisionsNeeded ?? "",
    supportNeeded: existing?.supportNeeded ?? "",
    status: existing?.status ?? mapLegacyConfidenceToStatus(legacyConfidence),
    needsLeadershipAttention: existing?.needsLeadershipAttention ?? false,
    lastUpdatedAt: existing?.lastUpdatedAt
  };
}

function normalizeTeamRoleUpdates(roleUpdates: TeamRoleUpdate[] | undefined, roles: string[]) {
  const byRole = new Map((roleUpdates ?? []).map((roleUpdate) => [normalizeProgramLabel(roleUpdate.role), roleUpdate]));
  return roles.map((role) => buildTeamRoleUpdate(role, byRole.get(normalizeProgramLabel(role))));
}

function joinRoleSignals(roleUpdates: TeamRoleUpdate[], selector: (role: TeamRoleUpdate) => string, fallback: string) {
  const items = roleUpdates
    .map((role) => {
      const value = selector(role).trim();
      return value ? `${role.role}: ${value}` : "";
    })
    .filter(Boolean);
  return items.length ? items.join("\n") : fallback;
}

function hasRoleSubmission(roleUpdate: TeamRoleUpdate) {
  return Boolean(
    roleUpdate.progressUpdate.trim() ||
      roleUpdate.changesObserved.trim() ||
      roleUpdate.activeRisks.trim() ||
      roleUpdate.blockers.trim() ||
      roleUpdate.decisionsNeeded.trim() ||
      roleUpdate.supportNeeded.trim()
  );
}

function clearCycleReview(review: ActiveProgramReview, intake?: ProgramIntake) {
  const roles = getProgramTeamRoles(intake);
  const preservedOwners = normalizeTeamRoleUpdates(review.teamRoleUpdates, roles).map((roleUpdate) =>
    buildTeamRoleUpdate(roleUpdate.role, {
      updatedBy: roleUpdate.updatedBy,
      status: roleUpdate.status,
      needsLeadershipAttention: roleUpdate.needsLeadershipAttention
    })
  );

  return normalizeReview(
    {
      ...emptyReview,
      programName: review.programName,
      originalNorthStar: review.originalNorthStar,
      currentPhase: review.currentPhase,
      stakeholderTemperature: review.stakeholderTemperature,
      deliveryHealth: review.deliveryHealth,
      updateCadence: review.updateCadence ?? "weekly",
      teamRoleUpdates: preservedOwners,
      artifacts: review.artifacts
    },
    intake
  );
}

function buildSynthesizedReview(review: ActiveProgramReview, roles: string[], lastUpdatedRole = ""): ActiveProgramReview {
  const normalizedRoleUpdates = normalizeTeamRoleUpdates(review.teamRoleUpdates, roles);
  const touchedRoles = normalizedRoleUpdates.filter(
    (role) =>
      role.progressUpdate.trim() ||
      role.changesObserved.trim() ||
      role.activeRisks.trim() ||
      role.blockers.trim() ||
      role.decisionsNeeded.trim() ||
      role.supportNeeded.trim()
  );
  const cycleMetadata = buildCycleMetadata(review.updateCadence === "biweekly" ? "biweekly" : "weekly");
  const cadence: ActiveProgramReview["updateCadence"] = review.updateCadence === "biweekly" ? "biweekly" : "weekly";
  const programSynthesisNote = touchedRoles.length
    ? `${touchedRoles.length} of ${roles.length} assigned team roles submitted updates in the current ${cadence === "biweekly" ? "bi-weekly" : "weekly"} cycle.`
    : `No team role submissions are on file for the current ${cadence === "biweekly" ? "bi-weekly" : "weekly"} cycle yet.`;

  return {
    ...review,
    updateCadence: cadence,
    cycleLabel: cycleMetadata.cycleLabel,
    cycleStartedAt: cycleMetadata.cycleStartedAt,
    programSynthesisNote,
    lastUpdatedRole: lastUpdatedRole || review.lastUpdatedRole || "",
    teamRoleUpdates: normalizedRoleUpdates,
    progressSinceLastReview: joinRoleSignals(
      normalizedRoleUpdates,
      (role) => role.progressUpdate,
      review.progressSinceLastReview || "No role-level progress updates captured yet."
    ),
    planChanges: joinRoleSignals(
      normalizedRoleUpdates,
      (role) => role.changesObserved,
      review.planChanges || "No role-level changes captured yet."
    ),
    activeRisks: joinRoleSignals(
      normalizedRoleUpdates,
      (role) => [role.activeRisks, role.blockers].filter(Boolean).join(" / "),
      review.activeRisks || "No role-level risks captured yet."
    ),
    decisionsPending: joinRoleSignals(
      normalizedRoleUpdates,
      (role) => role.decisionsNeeded,
      review.decisionsPending || "No role-level decisions captured yet."
    ),
    supportNeeded: joinRoleSignals(
      normalizedRoleUpdates,
      (role) => role.supportNeeded,
      review.supportNeeded || "No role-level support needs captured yet."
    )
  };
}

function normalizeReview(review: ActiveProgramReview, intake?: ProgramIntake) {
  return buildSynthesizedReview(
    {
      ...emptyReview,
      ...review,
      updateCadence: (review.updateCadence === "biweekly" ? "biweekly" : review.updateCadence ?? "weekly") as
        | "weekly"
        | "biweekly"
    },
    getProgramTeamRoles(intake),
    review.lastUpdatedRole ?? ""
  );
}

export function ActiveProgramReviewSection() {
  const programsRequest = useRequestSequence();
  const updatesRequest = useRequestSequence();
  const signalRequest = useRequestSequence();
  const meetingInputsRequest = useRequestSequence();
  const [review, setReview] = useState<ActiveProgramReview>(emptyReview);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [existingPrograms, setExistingPrograms] = useState<ExistingProgramOption[]>([]);
  const [updates, setUpdates] = useState<ActiveProgramUpdate[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [leadershipSignal, setLeadershipSignal] = useState<DeliveryLeadershipSignal | null>(null);
  const [meetingInputs, setMeetingInputs] = useState<ProgramMeetingInput[]>([]);
  const [meetingInputDraft, setMeetingInputDraft] = useState(emptyMeetingInputDraft);
  const [meetingSaveState, setMeetingSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [meetingUploadState, setMeetingUploadState] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");

  useEffect(() => {
    async function loadServerPrograms() {
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
    }

    void loadServerPrograms();
  }, [programsRequest]);

  useEffect(() => {
    async function loadProgramUpdates() {
      if (!selectedProgramId) return;
      const requestId = updatesRequest.beginRequest();

      try {
        const response = await fetch(`/api/programs/${selectedProgramId}/updates`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { updates: ActiveProgramUpdate[] };
        if (!updatesRequest.isLatestRequest(requestId)) return;
        const normalizedUpdates = payload.updates.map((update) => ({
          ...update,
          review: normalizeReview(
            update.review,
            existingPrograms.find((program) => program.id === selectedProgramId)?.intake
          )
        }));
        setUpdates((current) => {
          const currentOtherPrograms = current.filter((update) => update.programId !== selectedProgramId);
          return [...normalizedUpdates, ...currentOtherPrograms];
        });
      } catch {
        return;
      }
    }

    void loadProgramUpdates();
  }, [existingPrograms, selectedProgramId, updatesRequest]);

  useEffect(() => {
    async function loadLeadershipSignal() {
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
    }

    void loadLeadershipSignal();
  }, [selectedProgramId, saveState, signalRequest]);

  const selectedProgram = useMemo(
    () => existingPrograms.find((program) => program.id === selectedProgramId),
    [existingPrograms, selectedProgramId]
  );

  const activeTeamRoles = useMemo(() => getProgramTeamRoles(selectedProgram?.intake), [selectedProgram?.intake]);

  useEffect(() => {
    async function loadMeetingInputs() {
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
    }

    void loadMeetingInputs();
  }, [meetingInputsRequest, selectedProgramId, saveState]);

  const selectedProgramHistory = useMemo(() => {
    if (!selectedProgramId && !review.programName) return [];

    return updates
      .filter((update) => update.programId === selectedProgramId || update.programName === review.programName)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [review.programName, selectedProgramId, updates]);

  const latestUpdate = selectedProgramHistory[0];

  const completion = useMemo(() => {
    const values = Object.entries(review).filter(([key]) => key !== "artifacts").map(([, value]) => String(value).trim());
    const completed = values.filter(Boolean).length + (review.artifacts.length ? 1 : 0);
    return Math.round((completed / (values.length + 1)) * 100);
  }, [review]);

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
    const configured = teamRoleUpdates.filter((role) => role.updatedBy.trim()).length;
    return {
      configured,
      total: teamRoleUpdates.length
    };
  }, [teamRoleUpdates]);

  const programSynthesis = useMemo(() => {
    return [
      {
        label: "Cycle status",
        value: `${activeCycleMetadata.cycleLabel}. ${teamCoverage.submitted}/${teamCoverage.total} roles have submitted this cycle.`
      },
      {
        label: "Delivery pressure",
        value: review.activeRisks || "No role-level delivery pressure has been captured yet."
      },
      {
        label: "Decisions and support",
        value: review.decisionsPending || "No role-level decisions or support asks are on file yet."
      },
      {
        label: "Missing role inputs",
        value: teamCoverage.missing.length
          ? teamCoverage.missing.map((role) => role.role).join(", ")
          : "All assigned roles have at least one current-cycle signal on file."
      }
    ];
  }, [activeCycleMetadata.cycleLabel, review.activeRisks, review.decisionsPending, teamCoverage]);

  const updateImpact = useMemo(() => {
    const missingInputs = [
      !review.planChanges.trim() ? "what changed" : "",
      !review.decisionsPending.trim() ? "pending decisions" : "",
      !review.activeRisks.trim() ? "active risks" : "",
      !review.supportNeeded.trim() ? "support needed" : ""
    ].filter(Boolean);

    return [
      {
        label: "Next plan shift",
        value: review.planChanges
          ? `The next guided plan should adjust around: ${firstSignal(review.planChanges, "the latest change")}`
          : "Capture what changed so the next guided plan can materially shift instead of restating the current path."
      },
      {
        label: "Decision focus",
        value:
          review.decisionsPending || review.supportNeeded
            ? `Drive ${firstSignal(review.decisionsPending, "the next key decision")} and route support through ${firstSignal(
                review.supportNeeded,
                "the current support path"
              )}.`
            : "Add the next decision and support ask so the system can clarify ownership and execution sequence."
      },
      {
        label: "What the system will pressure-test",
        value:
          review.activeRisks || review.deliveryHealth
            ? `Pressure-test ${firstSignal(review.activeRisks, "the current risk posture")} against ${firstSignal(
                review.deliveryHealth,
                "the current delivery health signal"
              )}.`
            : "Add current risks and delivery health to sharpen the next guidance cycle."
      },
      {
        label: "Missing context",
        value: missingInputs.length
          ? `Still thin: ${missingInputs.join(", ")}. Filling those in will make the next plan update more specific.`
          : "Core update inputs are present. Saving this review should produce a sharper plan refresh."
      }
    ];
  }, [review]);

  function updateField(field: keyof Omit<ActiveProgramReview, "artifacts">, value: string) {
    setReview((current) =>
      normalizeReview(
        {
          ...current,
          [field]: value
        },
        selectedProgram?.intake
      )
    );
  }

  function updateRoleField<K extends keyof Omit<TeamRoleUpdate, "role">>(
    role: string,
    field: K,
    value: Omit<TeamRoleUpdate, "role">[K]
  ) {
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
  }

  function selectExistingProgram(programId: string) {
    setSelectedProgramId(programId);
    const selectedProgram = existingPrograms.find((program) => program.id === programId);
    if (!selectedProgram) return;
    const latestForProgram = updates
      .filter((update) => update.programId === programId || update.programName === selectedProgram.label)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    setReview(normalizeReview(latestForProgram?.review ?? selectedProgram.review, selectedProgram.intake));
    setSavedAt(null);
    setSaveState("idle");
    setMeetingSaveState("idle");
  }

  function handleArtifacts(event: ChangeEvent<HTMLInputElement>) {
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
  }

  function removeArtifact(id: string) {
    setReview((current) => ({
      ...current,
      artifacts: current.artifacts.filter((artifact) => artifact.id !== id)
    }));
  }

  async function uploadMeetingAttachment(file: File) {
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
  }

  async function handleMeetingAttachments(event: ChangeEvent<HTMLInputElement>) {
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
  }

  function removeMeetingAttachment(id: string) {
    setMeetingInputDraft((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id)
    }));
  }

  async function saveReviewSnapshot(lastUpdatedRole = "") {
    const timestamp = new Date();
    const programId = selectedProgramId || `local-${review.programName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "active-program"}`;
    const nextReview = normalizeReview(
      {
        ...review,
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

    try {
      const response = await fetch(`/api/programs/${programId}/updates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nextReview)
      });

      if (!response.ok) throw new Error("Review save failed.");
      setSaveState("saved");
      setSavedAt(timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setSaveState("error");
      setSavedAt(timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveReviewSnapshot("");
  }

  async function saveMeetingInput() {
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
  }

  return (
    <section id="active-program-review" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">Active program review</p>
        <h2 className="text-3xl font-semibold text-zinc-50 md:text-4xl">Keep the program aligned as reality changes.</h2>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          Update progress, risks, decisions, and delivery conditions as the work moves. The system regenerates tailored guidance and surfaces leadership signal in a direct, concise form so the delivery lead can manage, mitigate, and execute with clarity.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <ActiveProgramStateCard
            selectedProgramId={selectedProgramId}
            programOptions={existingPrograms.map((program) => ({ id: program.id, label: program.label }))}
            review={review}
            cycleLabel={activeCycleMetadata.cycleLabel}
            teamCoverage={{ submitted: teamCoverage.submitted, total: teamCoverage.total }}
            ownerCoverage={ownerCoverage}
            onSelectProgram={selectExistingProgram}
            onFieldChange={updateField}
          />

          <ActiveProgramTeamUpdatesCard
            teamRoleUpdates={teamRoleUpdates}
            ownerCoverage={ownerCoverage}
            saveState={saveState}
            formatTimestamp={formatTimestamp}
            onUpdateRoleField={(role, field, value) => updateRoleField(role, field, value as never)}
            onSaveRoleSignal={saveReviewSnapshot}
          />

          <ActiveProgramMeetingIntelligenceCard
            meetingInputDraft={meetingInputDraft}
            meetingSaveState={meetingSaveState}
            meetingUploadState={meetingUploadState}
            onDraftChange={(patch) => setMeetingInputDraft((current) => ({ ...current, ...patch }))}
            onAttachmentsChange={handleMeetingAttachments}
            onRemoveAttachment={removeMeetingAttachment}
            onSave={saveMeetingInput}
            formatFileSize={formatFileSize}
          />

          <ActiveProgramStatusArtifactsCard
            artifacts={review.artifacts}
            onArtifactsChange={handleArtifacts}
            onRemoveArtifact={removeArtifact}
            formatFileSize={formatFileSize}
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" size="lg">
              <Save className="h-4 w-4" />
              {saveState === "saving" ? "Saving..." : "Save cycle synthesis"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setReview(clearCycleReview(review, selectedProgram?.intake));
              }}
            >
              Clear cycle
            </Button>
            {savedAt ? (
              <p className={`self-center text-sm ${saveState === "error" ? "text-amber-200" : "text-cyan-200"}`}>
                {saveState === "error" ? "Saved locally only" : "Saved to server and refreshed guided plan"} at {savedAt}
              </p>
            ) : null}
          </div>
        </form>

        <ActiveProgramSidebar
          latestUpdate={latestUpdate}
          leadershipSignal={leadershipSignal}
          programSynthesis={programSynthesis}
          completion={completion}
          updateImpact={updateImpact}
          selectedProgramHistory={selectedProgramHistory}
          meetingInputs={meetingInputs}
          formatTimestamp={formatTimestamp}
          onLoadUpdate={(update) => setReview(update.review)}
        />
      </div>
    </section>
  );
}
