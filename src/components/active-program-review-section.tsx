"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, FileClock, FolderUp, HeartPulse, History, Layers3, MessageSquareQuote, RefreshCw, Save, Trash2, Users2 } from "lucide-react";
import type { ActiveProgramReview, ActiveProgramUpdate, TeamRoleUpdate, TeamRoleUpdateStatus } from "@/lib/active-program-types";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { ProgramMeetingAttachment, ProgramMeetingInput } from "@/lib/program-intelligence-types";
import type { ProgramArtifact, ProgramIntake } from "@/lib/program-intake-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const roleStatusOptions: Array<{ value: TeamRoleUpdateStatus; label: string }> = [
  { value: "on-track", label: "On track" },
  { value: "at-risk", label: "At risk" },
  { value: "blocked", label: "Blocked" }
];

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

function firstSignal(value: string, fallback: string) {
  return (
    value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)[0] ?? fallback
  );
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

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
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

        setExistingPrograms(serverPrograms);
        setUpdates(pruneStoredUpdates(serverPrograms.map((program) => program.id)));
        window.localStorage.removeItem(intakeDraftKey);
        window.localStorage.removeItem(reviewDraftKey);
        setSelectedProgramId((current) => (serverPrograms.some((program) => program.id === current) ? current : ""));
      } catch {
        setExistingPrograms([]);
      }
    }

    void loadServerPrograms();
  }, []);

  useEffect(() => {
    setUpdates(readStoredUpdates());
  }, []);

  useEffect(() => {
    async function loadProgramUpdates() {
      if (!selectedProgramId) return;

      try {
        const response = await fetch(`/api/programs/${selectedProgramId}/updates`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { updates: ActiveProgramUpdate[] };
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
  }, [existingPrograms, selectedProgramId]);

  useEffect(() => {
    async function loadLeadershipSignal() {
      if (!selectedProgramId) {
        setLeadershipSignal(null);
        return;
      }

      try {
        const response = await fetch(`/api/programs/${selectedProgramId}/leadership-signal`, { cache: "no-store" });
        if (!response.ok) {
          setLeadershipSignal(null);
          return;
        }

        const payload = (await response.json()) as { signal: DeliveryLeadershipSignal };
        setLeadershipSignal(payload.signal);
      } catch {
        setLeadershipSignal(null);
      }
    }

    void loadLeadershipSignal();
  }, [selectedProgramId, saveState]);

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

      try {
        const response = await fetch(`/api/programs/${selectedProgramId}/meeting-inputs`, { cache: "no-store" });
        if (!response.ok) {
          setMeetingInputs([]);
          return;
        }

        const payload = (await response.json()) as { meetingInputs: ProgramMeetingInput[] };
        setMeetingInputs(payload.meetingInputs);
      } catch {
        setMeetingInputs([]);
      }
    }

    void loadMeetingInputs();
  }, [selectedProgramId, saveState]);

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
        label: "Escalations and decisions",
        value: review.decisionsPending || "No role-level decisions or escalations are on file yet."
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
        label: "Decision and escalation focus",
        value:
          review.decisionsPending || review.supportNeeded
            ? `Drive ${firstSignal(review.decisionsPending, "the next key decision")} and route support through ${firstSignal(
                review.supportNeeded,
                "the current escalation path"
              )}.`
            : "Add the next decision and support ask so the system can clarify ownership, escalation, and execution sequence."
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
          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <Activity className="h-4 w-4 text-cyan-200" />
                Active program state
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 md:p-5">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Select existing program</span>
                <select
                  value={selectedProgramId}
                  onChange={(event) => selectExistingProgram(event.target.value)}
                  className="min-h-11 rounded-md border border-cyan-300/20 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                >
                  <option value="">Choose a program to review...</option>
                  {existingPrograms.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs leading-5 text-zinc-500">
                  Selecting a program prefills the review with its north star, current risks, decisions, and delivery context.
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program name</span>
                <input
                  value={review.programName}
                  onChange={(event) => updateField("programName", event.target.value)}
                  placeholder="Active program, client, initiative, or workstream name"
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Update cadence</span>
                  <select
                    value={review.updateCadence ?? "weekly"}
                    onChange={(event) =>
                      updateField("updateCadence", event.target.value as ActiveProgramReview["updateCadence"] & string)
                    }
                    className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                  >
                    <option value="weekly">Weekly cycle</option>
                    <option value="biweekly">Bi-weekly cycle</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Current phase</span>
                  <textarea
                    value={review.currentPhase}
                    onChange={(event) => updateField("currentPhase", event.target.value)}
                    placeholder="Discovery, build, launch, stabilization, or recovery"
                    rows={3}
                    className="min-h-[92px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                  />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Original north star</span>
                  <textarea
                    value={review.originalNorthStar}
                    onChange={(event) => updateField("originalNorthStar", event.target.value)}
                    placeholder="What outcome is the team still trying to protect as conditions change?"
                    rows={3}
                    className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Stakeholder temperature</span>
                  <textarea
                    value={review.stakeholderTemperature}
                    onChange={(event) => updateField("stakeholderTemperature", event.target.value)}
                    placeholder="Where are stakeholders aligned, uncertain, frustrated, or split?"
                    rows={3}
                    className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Delivery health</span>
                  <textarea
                    value={review.deliveryHealth}
                    onChange={(event) => updateField("deliveryHealth", event.target.value)}
                    placeholder="Where does the program feel healthy, overloaded, noisy, or fragile?"
                    rows={3}
                    className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                  />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program synthesis note</span>
                  <textarea
                    value={review.programSynthesisNote ?? ""}
                    onChange={(event) => updateField("programSynthesisNote", event.target.value)}
                    placeholder="Capture the delivery-lead synthesis of how the team inputs change the weekly picture."
                    rows={3}
                    className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                  />
                </label>
              </div>
              <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Current team update cycle</p>
                    <p className="mt-2 text-sm font-medium text-zinc-100">{activeCycleMetadata.cycleLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-100">
                      {teamCoverage.submitted}/{teamCoverage.total} roles updated
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-200">
                      {ownerCoverage.configured}/{ownerCoverage.total} owners set
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Teams can submit individual role updates throughout the cycle. Each save refreshes the program synthesis and can trigger guided-plan regeneration when the signal materially changes.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <Users2 className="h-4 w-4 text-cyan-200" />
                Team updates this cycle
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 md:p-5">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">Role ownership stays stable across cycles</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">
                      Set each role owner once. Future cycles keep those defaults and clear only the weekly signal fields.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-300">
                    {ownerCoverage.configured}/{ownerCoverage.total} mapped
                  </span>
                </div>
              </div>
              <div className="grid gap-3 2xl:grid-cols-2">
                {teamRoleUpdates.map((roleUpdate) => (
                  <div key={roleUpdate.role} className="rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{roleUpdate.role}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {roleUpdate.lastUpdatedAt ? `Last role update ${formatTimestamp(roleUpdate.lastUpdatedAt)}` : "No role submission yet this cycle"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${
                            hasRoleSubmission(roleUpdate)
                              ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                              : "border-white/10 bg-black/20 text-zinc-400"
                          }`}
                        >
                          {hasRoleSubmission(roleUpdate) ? "signal captured" : "awaiting input"}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${
                            roleUpdate.status === "on-track"
                              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                              : roleUpdate.status === "at-risk"
                                ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                                : "border-rose-300/20 bg-rose-300/10 text-rose-100"
                          }`}
                        >
                          {roleStatusOptions.find((option) => option.value === roleUpdate.status)?.label ?? "On track"}
                        </span>
                        {roleUpdate.needsLeadershipAttention ? (
                          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-fuchsia-100">
                            Leadership attention
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_220px]">
                        <label className="grid gap-2">
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Role owner</span>
                          <input
                            value={roleUpdate.updatedBy}
                            onChange={(event) => updateRoleField(roleUpdate.role, "updatedBy", event.target.value)}
                            placeholder={`${roleUpdate.role} lead or owner`}
                            className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                          />
                          <span className="text-xs leading-5 text-zinc-500">This persists as the default owner for future cycles.</span>
                        </label>
                        <label className="grid gap-2">
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Status</span>
                          <select
                            value={roleUpdate.status}
                            onChange={(event) =>
                              updateRoleField(roleUpdate.role, "status", event.target.value as TeamRoleUpdateStatus)
                            }
                            className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                          >
                            {roleStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-2">
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Escalation signal</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateRoleField(
                                roleUpdate.role,
                                "needsLeadershipAttention",
                                !roleUpdate.needsLeadershipAttention
                              )
                            }
                            className={`flex min-h-11 items-center justify-between rounded-md border px-3 py-3 text-left text-sm transition-colors ${
                              roleUpdate.needsLeadershipAttention
                                ? "border-fuchsia-300/30 bg-fuchsia-300/[0.08] text-fuchsia-50"
                                : "border-white/10 bg-zinc-950 text-zinc-300 hover:border-cyan-300/30"
                            }`}
                          >
                            <span>{roleUpdate.needsLeadershipAttention ? "Needs leadership attention" : "No escalation needed"}</span>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${
                                roleUpdate.needsLeadershipAttention
                                  ? "bg-fuchsia-300/15 text-fuchsia-100"
                                  : "bg-white/[0.05] text-zinc-400"
                              }`}
                            >
                              {roleUpdate.needsLeadershipAttention ? "On" : "Off"}
                            </span>
                          </button>
                        </label>
                      </div>
                      <label className="grid gap-2 md:col-span-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Progress update</span>
                        <textarea
                          value={roleUpdate.progressUpdate}
                          onChange={(event) => updateRoleField(roleUpdate.role, "progressUpdate", event.target.value)}
                          placeholder="What changed most for this role since the last checkpoint?"
                          rows={2}
                          className="min-h-[88px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Changes observed</span>
                        <textarea
                          value={roleUpdate.changesObserved}
                          onChange={(event) => updateRoleField(roleUpdate.role, "changesObserved", event.target.value)}
                          placeholder="Scope, sequencing, dependency, or stakeholder changes."
                          rows={3}
                          className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                        />
                      </label>
                      <div className="grid gap-3 xl:grid-cols-2">
                        <label className="grid gap-2">
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Risks and blockers</span>
                          <textarea
                            value={[roleUpdate.activeRisks, roleUpdate.blockers].filter(Boolean).join("\n")}
                            onChange={(event) => {
                              const [activeRisks, ...rest] = event.target.value.split("\n");
                              updateRoleField(roleUpdate.role, "activeRisks", activeRisks ?? "");
                              updateRoleField(roleUpdate.role, "blockers", rest.join("\n"));
                            }}
                            placeholder="Top risk on the first line, blockers beneath it."
                            rows={4}
                            className="min-h-[120px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                          />
                        </label>
                        <label className="grid gap-2">
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Decisions and support</span>
                          <textarea
                            value={[roleUpdate.decisionsNeeded, roleUpdate.supportNeeded].filter(Boolean).join("\n")}
                            onChange={(event) => {
                              const [decisionsNeeded, ...rest] = event.target.value.split("\n");
                              updateRoleField(roleUpdate.role, "decisionsNeeded", decisionsNeeded ?? "");
                              updateRoleField(roleUpdate.role, "supportNeeded", rest.join("\n"));
                            }}
                            placeholder="Decision needed on the first line, support ask beneath it."
                            rows={4}
                            className="min-h-[120px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-2">
                        <p className="text-xs leading-5 text-zinc-500">
                          Save the role signal as soon as it changes. The program synthesis and guided plan will absorb it.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void saveReviewSnapshot(roleUpdate.role)}
                          disabled={saveState === "saving"}
                        >
                          <Save className="h-4 w-4" />
                          Save {roleUpdate.role} signal
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <MessageSquareQuote className="h-4 w-4 text-cyan-200" />
                Meeting intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Meeting title</span>
                  <input
                    value={meetingInputDraft.title}
                    onChange={(event) => setMeetingInputDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="SteerCo, sprint review, working session, stakeholder sync"
                    className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                  />
                </label>
                <div className="grid gap-3 md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Meeting recording or transcript</span>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-300/30 bg-cyan-300/[0.045] px-4 py-6 text-center transition-colors hover:border-cyan-300/60">
                    <FolderUp className="mb-3 h-7 w-7 text-cyan-200" />
                    <span className="text-sm font-medium text-zinc-100">Upload Teams, Zoom, Meet, transcript, or recap files</span>
                    <span className="mt-2 text-xs leading-5 text-zinc-500">
                      We store the recording or transcript reference with this meeting input. Text-based uploads can prefill the transcript excerpt.
                    </span>
                    <input
                      className="hidden"
                      type="file"
                      multiple
                      accept="audio/*,video/*,.txt,.md,.csv,.rtf,.doc,.docx,.pdf"
                      onChange={(event) => void handleMeetingAttachments(event)}
                    />
                  </label>
                  <p className={`text-xs leading-5 ${meetingUploadState === "error" ? "text-amber-200" : "text-zinc-500"}`}>
                    {meetingUploadState === "uploading"
                      ? "Uploading meeting files..."
                      : meetingUploadState === "uploaded"
                        ? "Meeting file uploaded and attached to this input."
                        : "Use this for raw recordings, exported transcripts, or meeting recaps that should stay attached to the program signal."}
                  </p>
                  {meetingInputDraft.attachments.length ? (
                    <div className="grid gap-2">
                      {meetingInputDraft.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-100">{attachment.fileName}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {attachment.mimeType || "unknown"} / {formatFileSize(attachment.sizeBytes)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMeetingAttachment(attachment.id)}
                            className="rounded-md border border-white/10 bg-black/20 p-2 text-zinc-400 transition-colors hover:border-red-300/30 hover:text-red-200"
                            aria-label={`Remove ${attachment.fileName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Input type</span>
                  <select
                    value={meetingInputDraft.sourceType}
                    onChange={(event) =>
                      setMeetingInputDraft((current) => ({
                        ...current,
                        sourceType: event.target.value as ProgramMeetingInput["sourceType"]
                      }))
                    }
                    className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                  >
                    <option value="meeting-notes">Meeting notes</option>
                    <option value="transcript">Transcript summary</option>
                    <option value="recording">Recording recap</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Capture source</span>
                  <select
                    value={meetingInputDraft.sourceProvider}
                    onChange={(event) =>
                      setMeetingInputDraft((current) => ({
                        ...current,
                        sourceProvider: event.target.value as ProgramMeetingInput["sourceProvider"]
                      }))
                    }
                    className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                  >
                    <option value="manual">Manual summary</option>
                    <option value="upload">Uploaded recording / transcript</option>
                    <option value="linked-series">Linked meeting series</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Captured at</span>
                  <input
                    type="datetime-local"
                    value={meetingInputDraft.capturedAt}
                    onChange={(event) => setMeetingInputDraft((current) => ({ ...current, capturedAt: event.target.value }))}
                    className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                  />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Meeting summary</span>
                  <textarea
                    value={meetingInputDraft.summary}
                    onChange={(event) => setMeetingInputDraft((current) => ({ ...current, summary: event.target.value }))}
                    rows={4}
                    placeholder="Summarize the material program signal from this meeting."
                    className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                  />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Transcript excerpt</span>
                  <textarea
                    value={meetingInputDraft.transcriptExcerpt}
                    onChange={(event) => setMeetingInputDraft((current) => ({ ...current, transcriptExcerpt: event.target.value }))}
                    rows={3}
                    placeholder="Paste the most useful excerpt if a transcript or recording summary exists."
                    className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Signals detected</span>
                  <textarea
                    value={meetingInputDraft.extractedSignals}
                    onChange={(event) =>
                      setMeetingInputDraft((current) => ({ ...current, extractedSignals: event.target.value }))
                    }
                    rows={4}
                    placeholder="One per line: sponsor concern, dependency risk, decision gap, scope pressure"
                    className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Recommended plan adjustments</span>
                  <textarea
                    value={meetingInputDraft.recommendedPlanAdjustments}
                    onChange={(event) =>
                      setMeetingInputDraft((current) => ({
                        ...current,
                        recommendedPlanAdjustments: event.target.value
                      }))
                    }
                    rows={4}
                    placeholder="One per line: tighten decision gate, escalate API dependency, change checkpoint cadence"
                    className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void saveMeetingInput()} disabled={meetingSaveState === "saving"}>
                  <Save className="h-4 w-4" />
                  {meetingSaveState === "saving" ? "Saving meeting input..." : "Save meeting input"}
                </Button>
                <p className={`text-sm ${meetingSaveState === "error" ? "text-amber-200" : "text-zinc-400"}`}>
                  {meetingSaveState === "saved"
                    ? "Saved to server and refreshed guided plan."
                    : "Saving meeting inputs here should refresh the guided plan when the context justifies a change."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <FolderUp className="h-4 w-4 text-emerald-200" />
                Status artifacts
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-emerald-300/30 bg-emerald-300/[0.045] px-4 py-8 text-center transition-colors hover:border-emerald-300/60">
                <FileClock className="mb-3 h-7 w-7 text-emerald-200" />
                <span className="text-sm font-medium text-zinc-100">Add status report, RAID log, meeting notes, or plan update</span>
                <span className="mt-2 text-xs leading-5 text-zinc-500">
                  Local metadata only for now. These will later be stored, parsed, and used for grounded guidance.
                </span>
                <input className="hidden" type="file" multiple onChange={handleArtifacts} />
              </label>

              {review.artifacts.length ? (
                <div className="grid gap-2">
                  {review.artifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">{artifact.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {artifact.type} / {formatFileSize(artifact.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeArtifact(artifact.id)}
                        className="rounded-md border border-white/10 bg-black/20 p-2 text-zinc-400 transition-colors hover:border-red-300/30 hover:text-red-200"
                        aria-label={`Remove ${artifact.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

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

        <aside className="grid gap-4 self-start lg:sticky lg:top-24">
          {latestUpdate ? (
            <Card className="bg-zinc-950/80">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2 text-zinc-50">
                  <FileClock className="h-4 w-4 text-emerald-200" />
                  Latest update snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-5">
                <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
                    Last updated
                  </p>
                  <p className="mt-2 text-sm text-zinc-100">{formatTimestamp(latestUpdate.createdAt)}</p>
                  {latestUpdate.review.lastUpdatedRole ? (
                    <p className="mt-2 text-xs leading-5 text-zinc-400">
                      Latest role submission: {latestUpdate.review.lastUpdatedRole}
                    </p>
                  ) : null}
                </div>
                {[
                  ["Cycle", latestUpdate.review.cycleLabel],
                  ["Current phase", latestUpdate.review.currentPhase],
                  ["Program synthesis", latestUpdate.review.programSynthesisNote],
                  ["Active risks", latestUpdate.review.activeRisks],
                  ["Pending decisions", latestUpdate.review.decisionsPending],
                  ["Support needed", latestUpdate.review.supportNeeded]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-300">{value || "No update captured."}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {leadershipSignal && leadershipSignal.status !== "none" ? (
            <Card className="bg-zinc-950/80">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2 text-zinc-50">
                  <RefreshCw className="h-4 w-4 text-amber-200" />
                  Leadership signal
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                      leadershipSignal.status === "new"
                        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                        : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                    }`}
                  >
                    {leadershipSignal.status === "new" ? "New leadership signal" : "Leadership signal incorporated"}
                  </span>
                  {leadershipSignal.updatedAt ? (
                    <span className="text-xs text-zinc-500">{formatTimestamp(leadershipSignal.updatedAt)}</span>
                  ) : null}
                </div>
                <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3">
                  <p className="text-sm leading-6 text-zinc-200">{leadershipSignal.summary}</p>
                </div>
                <div className="grid gap-2">
                  {leadershipSignal.highlights.map((highlight) => (
                    <div key={highlight} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                      <p className="text-sm leading-6 text-zinc-300">{highlight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <Layers3 className="h-4 w-4 text-cyan-200" />
                Program synthesis
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {programSynthesis.map((item) => (
                <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <HeartPulse className="h-4 w-4 text-cyan-200" />
                Review readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Active context captured</span>
                  <span className="font-medium text-zinc-100">{completion}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full bg-cyan-300 transition-all" style={{ width: `${completion}%` }} />
                </div>
              </div>
              <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-cyan-100">
                  <RefreshCw className="h-4 w-4" />
                  Iteration mode
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  This flow is for programs already moving. It should generate plan adjustments, recovery moves,
                  escalation guidance, and updated next steps.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <FileClock className="h-4 w-4 text-emerald-200" />
                Update impact
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {updateImpact.map((item) => (
                <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <History className="h-4 w-4 text-amber-200" />
                Update history
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {selectedProgramHistory.length ? (
                selectedProgramHistory.slice(0, 5).map((update) => (
                  <button
                    key={update.id}
                    type="button"
                    onClick={() => setReview(update.review)}
                    className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:border-amber-300/30"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">
                        {formatTimestamp(update.createdAt)}
                      </span>
                      <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-zinc-500">
                        load
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-100">
                      {update.review.lastUpdatedRole ? `${update.review.lastUpdatedRole} update` : update.review.currentPhase || update.programName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                      {update.review.programSynthesisNote || update.review.progressSinceLastReview || update.review.deliveryHealth || "No summary captured."}
                    </p>
                  </button>
                ))
              ) : (
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-sm leading-6 text-zinc-400">
                    No saved updates yet. Save this review to create the first timestamped program update.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <MessageSquareQuote className="h-4 w-4 text-cyan-200" />
                Recent meeting inputs
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {meetingInputs.length ? (
                meetingInputs.slice(0, 3).map((input) => (
                  <div key={input.id} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-100">{input.title}</p>
                      <span className="text-xs text-zinc-500">{formatTimestamp(input.capturedAt)}</span>
                    </div>
                    <p className="text-sm leading-6 text-zinc-300">{input.summary}</p>
                    {input.attachments.length ? (
                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        Attachments: {input.attachments.map((attachment) => attachment.fileName).join(", ")}
                      </p>
                    ) : null}
                    {input.recommendedPlanAdjustments.length ? (
                      <p className="mt-2 text-xs leading-5 text-cyan-200">
                        Next adjustment: {input.recommendedPlanAdjustments[0]}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-sm leading-6 text-zinc-400">
                    No meeting intelligence is on file yet. Add a meeting summary or transcript signal to let the next guided plan adapt to recurring delivery discussions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
