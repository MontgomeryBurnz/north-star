"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import { useForegroundRefresh } from "@/hooks/use-foreground-refresh";
import { useCurrentUserAssignments } from "@/hooks/use-current-user-assignments";
import { useProgramCatalog } from "@/hooks/use-program-catalog";
import { useRequestSequence } from "@/hooks/use-request-sequence";
import { buildReviewCycleStatusForCadence, type ReviewCadence, type ReviewQueueItem } from "@/lib/leadership-review-queue";
import { buildProgramGantt } from "@/lib/program-gantt";
import type { StoredProgram } from "@/lib/program-intake-types";
import { firstNonEmpty, firstSignal, splitSignals } from "@/lib/text-signals";
import { LeadershipExecutiveSummary } from "@/components/leadership-executive-summary";
import { LeadershipProgramTimeline } from "@/components/leadership-program-timeline";
import { LeadershipReviewWorkbench } from "@/components/leadership-review-workbench";
import { LeadershipReviewSidebar, type LeadershipLaneOption } from "@/components/leadership-review-sidebar";
import { SectionHeader } from "@/components/section-header";

const emptyLeadershipReview: LeadershipReviewInput = {
  programName: "",
  timelineSummary: "",
  progressHighlights: "",
  activeRisks: "",
  leadershipGuidance: "",
  supportRequests: "",
  feedbackToDeliveryLead: ""
};

const allSponsorLanesValue = "all";

const defaultLeadershipLanes = [
  "Product Management",
  "Business Analysis",
  "User Experience",
  "Application Development",
  "Data Engineering",
  "Change Management"
];

const seededLeadershipProgram: StoredProgram = {
  id: "seeded-ordering-visibility-program",
  createdAt: "2026-04-15T14:00:00.000Z",
  updatedAt: "2026-04-22T13:30:00.000Z",
  intake: {
    programName: "Ordering Visibility Recovery",
    programOwner: "Delivery lead",
    vision: "Create a sponsor-visible delivery path for order workflow modernization without burying delivery leads in escalation noise.",
    sowSummary: "Stabilize the delivery path, improve milestone visibility, and create a clearer decision and risk signal for leadership.",
    outcomes: "Visible milestone posture\nClear sponsor checkpoints\nReduced escalation noise\nHigher confidence in execution path",
    stakeholders: "Executive sponsor\nDelivery lead\nCX operations\nData governance lead\nImplementation manager",
    risks: "Sponsor visibility is inconsistent\nDecision rights are still blurred\nTimeline pressure is distorting prioritization",
    constraints: "Need visible progress without expanding scope\nLeadership wants concise checkpoints\nRecovery path must be measurable",
    currentStatus: "Recovery planning is active and sequencing has been tightened.",
    decisionsNeeded: "Approve checkpoint cadence\nConfirm leadership escalation path",
    blockers: "The program needs cleaner signal, fewer status narratives, and tighter checkpoint structure.",
    leadershipReviewCadence: "weekly",
    artifacts: [],
    reviewedContext: {
      outcomes: "Visible milestone posture\nClear sponsor checkpoints\nReduced escalation noise",
      stakeholders: "Executive sponsor\nDelivery lead\nCX operations\nImplementation manager",
      risks: "Decision rights are unclear\nTimeline pressure is distorting prioritization\nSponsor confidence depends on visible proof",
      requirements: "Checkpoint cadence\nDecision owner map\nSponsor-ready progress summary",
      decisions: "Approve checkpoint cadence\nConfirm leadership escalation path",
      outputs: "Executive checkpoint summary\nNext-step owner map\nRisk and decision view",
      confidence: "high",
      reviewedAt: "2026-04-22T13:15:00.000Z"
    }
  }
};

const seededLeadershipPrograms = [seededLeadershipProgram];

const seededLeadershipUpdates: StoredProgramUpdate[] = [
  {
    id: "seeded-update-1",
    programId: seededLeadershipProgram.id,
    programName: seededLeadershipProgram.intake.programName,
    createdAt: "2026-04-19T16:00:00.000Z",
    updatedAt: "2026-04-19T16:00:00.000Z",
    review: {
      programName: seededLeadershipProgram.intake.programName,
      originalNorthStar: "Create a sponsor-visible delivery path for order workflow modernization without burying delivery leads in escalation noise.",
      currentPhase: "Recovery planning",
      progressSinceLastReview: "Checkpoint sequence was reworked and milestone visibility improved for the sponsor view.",
      planChanges: "Shifted to a tighter two-checkpoint path before expanding downstream work.",
      activeRisks: "Decision rights are still uneven and sponsor confidence depends on visible evidence.",
      stakeholderTemperature: "Sponsor is engaged but wants clearer proof of progress; delivery lead needs fewer side-channel escalations.",
      decisionsPending: "Approve the next two checkpoints and the escalation owner for exceptions.",
      deliveryHealth: "Recovering, but still vulnerable to noisy status narratives.",
      supportNeeded: "Leadership alignment on checkpoint cadence and sponsor-ready summary format.",
      artifacts: []
    }
  }
];

const seededLeadershipPlan: GuidedPlan = {
  id: "seeded-plan-1",
  programId: seededLeadershipProgram.id,
  programName: seededLeadershipProgram.intake.programName,
  createdAt: "2026-04-21T15:30:00.000Z",
  northStar: "Create a sponsor-visible delivery path with visible milestones, explicit decision rights, and lower escalation noise.",
  summary: "Seeded guided plan showing how leadership feedback should tighten delivery guidance and checkpoint sequencing.",
  sourceInputs: {
    title: "Fresh Inputs Driving This Plan",
    items: [
      "Uploads influencing this plan: none in the seeded leadership scenario.",
      "Active-program update shaping this plan: Checkpoint sequence was reworked and milestone visibility improved for the sponsor view.",
      "Leadership feedback shaping this plan: Reduce noise in the narrative, make decision ownership explicit, and keep the next outputs highly visible."
    ]
  },
  assistantDialogue: {
    title: "Guide Dialogue Shaping This Plan",
    items: [
      "No guide dialogue is on file in the seeded leadership scenario.",
      "Use Guide to capture delivery-lead context that should influence the next plan refresh."
    ]
  },
  signalFromNoise: {
    title: "Signal From Noise",
    items: [
      "North star: create a visible recovery path with fewer side-channel escalations.",
      "Most important delivery signal: milestone visibility is improving.",
      "Primary noise or pressure: sponsor confidence still depends on visible proof.",
      "Leadership signal: tighten the next two checkpoints and show evidence."
    ]
  },
  workPath: {
    title: "Recommended Work Path",
    items: [
      "Anchor the next two checkpoints around visible progress evidence.",
      "Confirm decision ownership before widening scope.",
      "Use the sponsor summary as the control point for escalation noise."
    ]
  },
  planningApproach: {
    title: "Planning Approach",
    items: [
      "Use milestone posture, decision rights, and sponsor visibility as the governing frame.",
      "Translate leadership feedback into narrower checkpoint planning.",
      "Review plan health after the next evidence-producing milestone."
    ]
  },
  keyOutcomes: {
    title: "Key Outcomes",
    items: ["Visible milestone posture", "Clear sponsor checkpoints", "Reduced escalation noise"]
  },
  criticalRequirements: {
    title: "Critical Requirements",
    items: ["Checkpoint cadence", "Decision owner map", "Sponsor-ready progress summary"]
  },
  keyOutputs: {
    title: "Key Outputs",
    items: ["Executive checkpoint summary", "Next-step owner map", "Risk and decision view"]
  },
  risksAndDecisions: {
    title: "Risks And Decisions",
    items: [
      "Risk focus: decision rights remain uneven.",
      "Decision focus: approve checkpoint cadence.",
      "Leadership feedback: sponsor visibility must improve."
    ]
  },
  leadershipChanges: {
    title: "What Changed From Leadership Signal",
    items: [
      "Leadership direction translated into plan language: Tighten the next two checkpoints and show visible proof of progress rather than broader status narrative.",
      "Risk posture now emphasizes: Decision rights are still uneven and sponsor confidence can drop when evidence is not visible.",
      "Execution should account for: Create a sponsor-ready checkpoint summary and define the escalation owner for exceptions.",
      "This leadership signal is already reflected in the current guidance."
    ]
  },
  leadershipSignal: {
    status: "incorporated",
    summary: "Leadership input has been translated into the current delivery guidance.",
    highlights: [
      "Direction: Tighten the next two checkpoints and show visible proof of progress rather than broader status narrative.",
      "Risk posture: Decision rights are still uneven and sponsor confidence can drop when evidence is not visible.",
      "Support emphasis: Create a sponsor-ready checkpoint summary and define the escalation owner for exceptions."
    ],
    updatedAt: "2026-04-22T13:30:00.000Z",
    sourceFeedbackId: "seeded-leadership-feedback-1"
  },
  followUpQuestions: [
    "What visible proof will restore sponsor confidence this week?",
    "Which decision owner needs to be explicit before the next checkpoint?",
    "What leadership input should reshape the delivery path now?"
  ],
  sourceRecordIds: [seededLeadershipProgram.id, "seeded-update-1", "seeded-leadership-feedback-1"]
};

const seededLeadershipFeedback: LeadershipReviewRecord[] = [
  {
    id: "seeded-leadership-feedback-1",
    programId: seededLeadershipProgram.id,
    programName: seededLeadershipProgram.intake.programName,
    createdAt: "2026-04-22T13:30:00.000Z",
    updatedAt: "2026-04-22T13:30:00.000Z",
    feedback: {
      programName: seededLeadershipProgram.intake.programName,
      timelineSummary: "Milestone posture is improving, but leadership still needs a cleaner checkpoint narrative over the next two weeks.",
      progressHighlights: "The delivery path is tighter, checkpoint sequencing is clearer, and recovery work is now visible.",
      activeRisks: "Decision rights are still uneven and sponsor confidence can drop when evidence is not visible.",
      leadershipGuidance: "Tighten the next two checkpoints and show visible proof of progress rather than broader status narrative.",
      supportRequests: "Create a sponsor-ready checkpoint summary and define the escalation owner for exceptions.",
      feedbackToDeliveryLead: "Reduce noise in the narrative, make decision ownership explicit, and keep the next outputs highly visible."
    }
  }
];

const leadershipFields: Array<{
  id: keyof LeadershipReviewInput;
  label: string;
  placeholder: string;
  rows: number;
}> = [
  {
    id: "timelineSummary",
    label: "Timeline summary",
    placeholder: "Optional context on milestone posture, phase, or timing pressure.",
    rows: 3
  },
  {
    id: "progressHighlights",
    label: "Progress highlights",
    placeholder: "Optional context on material progress, evidence, or visible gains.",
    rows: 3
  },
  {
    id: "activeRisks",
    label: "Risk or decision",
    placeholder: "What risk, decision, or concern needs leadership attention?",
    rows: 3
  },
  {
    id: "leadershipGuidance",
    label: "Direction for next cycle",
    placeholder: "What should the delivery lead optimize for before the next checkpoint?",
    rows: 4
  },
  {
    id: "supportRequests",
    label: "Support needed",
    placeholder: "What help, sponsor action, or decision support is needed?",
    rows: 3
  },
  {
    id: "feedbackToDeliveryLead",
    label: "Message to delivery lead",
    placeholder: "What should be reflected back to the delivery lead in plain language?",
    rows: 4
  }
];

type TimelineItem = {
  id: string;
  label: string;
  detail: string;
  createdAt: string;
  tone: "program" | "update" | "plan" | "leadership";
};

const leadershipTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York"
});

function formatTimestamp(value: string) {
  return leadershipTimestampFormatter.format(new Date(value));
}

function differenceInDays(later: Date, earlier: Date) {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

function inferReviewCadence(entries: LeadershipReviewRecord[]): ReviewCadence {
  if (entries.length < 2) return "weekly";
  const latest = new Date(entries[0].createdAt);
  const previous = new Date(entries[1].createdAt);
  return differenceInDays(latest, previous) >= 10 ? "biweekly" : "weekly";
}

function sameRole(left: string | undefined, right: string) {
  return left?.trim().toLowerCase() === right.trim().toLowerCase();
}

function roleStatusLabel(status: string | undefined) {
  if (status === "on-track") return "On track";
  if (status === "at-risk") return "At risk";
  if (status === "blocked") return "Blocked";
  return "No status saved yet.";
}

function buildLeadershipLaneOptions(input: {
  feedback?: LeadershipReviewRecord;
  program: StoredProgram | null;
  update?: StoredProgramUpdate;
}): LeadershipLaneOption[] {
  const roles = [
    ...(input.program?.intake.teamRoles ?? []),
    ...(input.update?.review.teamRoleUpdates?.map((roleUpdate) => roleUpdate.role) ?? []),
    ...(input.feedback?.interpretation?.roleImpacts.map((roleImpact) => roleImpact.role) ?? [])
  ]
    .map((role) => role.trim())
    .filter(Boolean);

  const uniqueRoles = Array.from(new Set((roles.length ? roles : defaultLeadershipLanes).map((role) => role.trim())));

  return [
    {
      label: "All sponsor lanes",
      value: allSponsorLanesValue,
      detail: "Show the full leadership posture for the program."
    },
    ...uniqueRoles.map((role) => ({
      label: role,
      value: role,
      detail: `Show only the ${role} signal, risks, decisions, and guidance.`
    }))
  ];
}

export function LeadershipReviewConsole() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queueMode = searchParams.get("queue") === "due";
  const queueRequest = useRequestSequence();
  const contextRequest = useRequestSequence();
  const { getAssignmentForProgram, loaded: assignmentsLoaded, primaryAssignment } = useCurrentUserAssignments();
  const assignmentProgramAppliedRef = useRef(false);
  const previousLaneProgramId = useRef<string | null>(null);
  const [updates, setUpdates] = useState<StoredProgramUpdate[]>(seededLeadershipUpdates);
  const [plan, setPlan] = useState<GuidedPlan | null>(seededLeadershipPlan);
  const [feedback, setFeedback] = useState<LeadershipReviewRecord[]>(seededLeadershipFeedback);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [review, setReview] = useState<LeadershipReviewInput>(emptyLeadershipReview);
  const [status, setStatus] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [selectedLane, setSelectedLane] = useState(allSponsorLanesValue);
  const [laneWasManuallyChanged, setLaneWasManuallyChanged] = useState(false);
  const handleProgramLoadError = useCallback(() => setStatus("Leadership program catalog could not be refreshed."), []);
  const { programs, setPrograms, selectedProgram, selectedProgramId, setSelectedProgramId, refreshPrograms } = useProgramCatalog({
    initialPrograms: seededLeadershipPrograms,
    initialSelectedProgramId: seededLeadershipProgram.id,
    fallbackPrograms: seededLeadershipPrograms,
    fallbackSelectedProgramId: seededLeadershipProgram.id,
    onError: handleProgramLoadError
  });
  const latestUpdate = updates[0];
  const latestFeedback = feedback[0];
  const laneOptions = useMemo(
    () => buildLeadershipLaneOptions({ feedback: latestFeedback, program: selectedProgram, update: latestUpdate }),
    [latestFeedback, latestUpdate, selectedProgram]
  );
  const selectedLaneOption = laneOptions.find((option) => option.value === selectedLane) ?? laneOptions[0];
  const selectedRole = selectedLane === allSponsorLanesValue ? null : selectedLane;
  const assignedLane = selectedProgramId ? getAssignmentForProgram(selectedProgramId)?.role ?? null : null;
  const selectedRoleUpdate = useMemo(
    () => latestUpdate?.review.teamRoleUpdates?.find((roleUpdate) => sameRole(roleUpdate.role, selectedLane)) ?? null,
    [latestUpdate?.review.teamRoleUpdates, selectedLane]
  );
  const selectedRoleImpact = useMemo(
    () => latestFeedback?.interpretation?.roleImpacts.find((roleImpact) => sameRole(roleImpact.role, selectedLane)) ?? null,
    [latestFeedback?.interpretation?.roleImpacts, selectedLane]
  );

  useEffect(() => {
    if (!laneOptions.some((option) => option.value === selectedLane)) {
      setSelectedLane(allSponsorLanesValue);
    }
  }, [laneOptions, selectedLane]);

  useEffect(() => {
    if (!assignmentsLoaded || assignmentProgramAppliedRef.current || !primaryAssignment) return;
    if (!programs.some((program) => program.id === primaryAssignment.programId)) return;

    assignmentProgramAppliedRef.current = true;
    setSelectedProgramId(primaryAssignment.programId);
  }, [assignmentsLoaded, primaryAssignment, programs, setSelectedProgramId]);

  useEffect(() => {
    if (previousLaneProgramId.current === selectedProgramId) return;
    previousLaneProgramId.current = selectedProgramId;
    setLaneWasManuallyChanged(false);
  }, [selectedProgramId]);

  useEffect(() => {
    if (!assignmentsLoaded || laneWasManuallyChanged || !assignedLane) return;
    if (!laneOptions.some((option) => sameRole(option.value, assignedLane))) return;

    setSelectedLane(assignedLane);
  }, [assignedLane, assignmentsLoaded, laneOptions, laneWasManuallyChanged]);

  const ganttPhases = useMemo(() => buildProgramGantt(selectedProgram, latestUpdate), [latestUpdate, selectedProgram]);
  const currentPhase = ganttPhases.find((phase) => phase.status === "current") ?? ganttPhases[ganttPhases.length - 1];
  const executiveSummary = useMemo(
    () => {
      if (selectedRole) {
        return (
          firstNonEmpty(
            selectedRoleImpact?.focus,
            selectedRoleUpdate?.progressUpdate,
            selectedRoleUpdate?.activeRisks,
            selectedRoleUpdate?.decisionsNeeded
          ) || `${selectedRole} does not have a dedicated leadership signal yet. Review the full program posture or add lane-specific guidance.`
        );
      }

      return (
        firstNonEmpty(
          latestFeedback?.interpretation?.summary,
          plan?.summary,
          latestUpdate?.review.progressSinceLastReview,
          selectedProgram?.intake.vision,
          selectedProgram?.intake.outcomes
        ) || "No executive summary is available yet."
      );
    },
    [
      latestFeedback?.interpretation?.summary,
      latestUpdate?.review.progressSinceLastReview,
      plan?.summary,
      selectedProgram?.intake.outcomes,
      selectedProgram?.intake.vision,
      selectedRole,
      selectedRoleImpact?.focus,
      selectedRoleUpdate?.activeRisks,
      selectedRoleUpdate?.decisionsNeeded,
      selectedRoleUpdate?.progressUpdate
    ]
  );
  const leaderReadout = useMemo(
    () => {
      if (selectedRole) {
        return [
          {
            label: `${selectedRole} progression`,
            value:
              firstNonEmpty(
                selectedRoleUpdate?.progressUpdate,
                selectedRoleImpact?.focus,
                latestUpdate?.review.progressSinceLastReview
              ) || "No lane-specific progress signal is available yet."
          },
          {
            label: `${selectedRole} risk posture`,
            value:
              firstNonEmpty(
                selectedRoleUpdate?.activeRisks,
                selectedRoleUpdate?.blockers,
                latestUpdate?.review.activeRisks
              ) || "No lane-specific risk signal is available yet."
          },
          {
            label: `${selectedRole} decisions or support`,
            value:
              firstNonEmpty(
                selectedRoleUpdate?.decisionsNeeded,
                selectedRoleUpdate?.supportNeeded,
                latestUpdate?.review.decisionsPending
              ) || "No lane-specific decision or support ask is saved."
          }
        ];
      }

      return [
        {
          label: "Progression",
          value:
            firstNonEmpty(
              latestUpdate?.review.progressSinceLastReview,
              latestFeedback?.feedback.progressHighlights,
              selectedProgram?.intake.currentStatus
            ) || "No recent progression signal is available yet."
        },
        {
          label: "Risk posture",
          value:
            firstNonEmpty(
              latestUpdate?.review.activeRisks,
              latestFeedback?.feedback.activeRisks,
              plan?.risksAndDecisions.items[0],
              selectedProgram?.intake.risks
            ) || "No active risk signal is available yet."
        },
        {
          label: "Decisions needing leadership",
          value:
            firstNonEmpty(
              latestUpdate?.review.decisionsPending,
              selectedProgram?.intake.decisionsNeeded,
              plan?.risksAndDecisions.items.find((item) => item.toLowerCase().includes("decision"))
            ) || "No decision callout is currently saved."
        }
      ];
    },
    [
      latestFeedback?.feedback.activeRisks,
      latestFeedback?.feedback.progressHighlights,
      latestUpdate?.review.activeRisks,
      latestUpdate?.review.decisionsPending,
      latestUpdate?.review.progressSinceLastReview,
      plan?.risksAndDecisions.items,
      selectedProgram?.intake.currentStatus,
      selectedProgram?.intake.decisionsNeeded,
      selectedProgram?.intake.risks,
      selectedRole,
      selectedRoleImpact?.focus,
      selectedRoleUpdate?.activeRisks,
      selectedRoleUpdate?.blockers,
      selectedRoleUpdate?.decisionsNeeded,
      selectedRoleUpdate?.progressUpdate,
      selectedRoleUpdate?.supportNeeded
    ]
  );
  const quickContextSignals = useMemo(
    () => {
      if (selectedRole) {
        return [
          {
            label: "Lane status",
            value: roleStatusLabel(selectedRoleUpdate?.status)
          },
          {
            label: "Lane owner",
            value: selectedRoleUpdate?.updatedBy || "No owner update saved yet."
          },
          {
            label: "Leadership interpretation",
            value: selectedRoleImpact?.focus || "No AI-interpreted lane impact is saved yet."
          }
        ];
      }

      return [
        {
          label: "Support needed",
          value:
            firstNonEmpty(
              latestUpdate?.review.supportNeeded,
              latestFeedback?.feedback.supportRequests
            ) || "No sponsor or leadership support request is captured yet."
        },
        {
          label: "Leadership direction",
          value:
            firstNonEmpty(
              latestFeedback?.feedback.leadershipGuidance,
              latestFeedback?.interpretation?.deliveryLeadMessage
            ) || "No leadership direction saved yet."
        },
        {
          label: "Phase",
          value: latestUpdate?.review.currentPhase || selectedProgram?.intake.currentStatus || "No phase captured."
        }
      ];
    },
    [
      latestFeedback?.feedback.leadershipGuidance,
      latestFeedback?.feedback.supportRequests,
      latestFeedback?.interpretation?.deliveryLeadMessage,
      latestUpdate?.review.currentPhase,
      latestUpdate?.review.supportNeeded,
      selectedProgram?.intake.currentStatus,
      selectedRole,
      selectedRoleImpact?.focus,
      selectedRoleUpdate?.status,
      selectedRoleUpdate?.updatedBy
    ]
  );
  const selectedCadence = (selectedProgram?.intake.leadershipReviewCadence as ReviewCadence | undefined) ?? inferReviewCadence(feedback);
  const displayedReviewQueue = useMemo(
    () => (queueMode ? reviewQueue.filter((entry) => entry.status !== "attention") : reviewQueue),
    [queueMode, reviewQueue]
  );
  const reviewCycleStatus = useMemo(
    () => buildReviewCycleStatusForCadence(feedback, selectedCadence),
    [feedback, selectedCadence]
  );
  const latestReviewCycle = feedback[0];
  const clarifyItems = useMemo(
    () =>
      splitSignals(
        firstNonEmpty(
          selectedRoleUpdate?.decisionsNeeded,
          selectedRoleUpdate?.supportNeeded,
          latestUpdate?.review.decisionsPending,
          selectedProgram?.intake.decisionsNeeded,
          review.supportRequests
        ),
        "No decision pressure is currently saved."
      ),
    [
      latestUpdate?.review.decisionsPending,
      review.supportRequests,
      selectedProgram?.intake.decisionsNeeded,
      selectedRoleUpdate?.decisionsNeeded,
      selectedRoleUpdate?.supportNeeded
    ]
  );
  const quickReviewPrompt = selectedRole
    ? `What should ${selectedRole} act on before the next checkpoint?`
    : "What should leadership clarify before the next checkpoint?";

  useEffect(
    () => {
      if (!selectedRole || review.leadershipGuidance.trim()) return;
      const laneGuidance = firstNonEmpty(selectedRoleImpact?.focus, selectedRoleUpdate?.supportNeeded, selectedRoleUpdate?.decisionsNeeded);
      if (!laneGuidance) return;
      setReview((current) => (current.leadershipGuidance.trim() ? current : { ...current, leadershipGuidance: laneGuidance }));
    },
    [review.leadershipGuidance, selectedRole, selectedRoleImpact?.focus, selectedRoleUpdate?.decisionsNeeded, selectedRoleUpdate?.supportNeeded]
  );
  function focusReviewCycle(programId: string) {
    setSelectedProgramId(programId);
    requestAnimationFrame(() => {
      document.getElementById("leadership-review-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!selectedProgram) return [];

    return [
      {
        id: `program-${selectedProgram.id}`,
        label: "Program captured",
        detail: firstSignal(selectedProgram.intake.vision || selectedProgram.intake.outcomes, "Program context was captured."),
        createdAt: selectedProgram.createdAt,
        tone: "program" as const
      },
      ...updates.map((update) => ({
        id: update.id,
        label: "Delivery update",
        detail: firstSignal(update.review.progressSinceLastReview || update.review.deliveryHealth, "Program update saved."),
        createdAt: update.createdAt,
        tone: "update" as const
      })),
      ...(plan
        ? [
            {
              id: plan.id,
              label: "Guided plan generated",
              detail: firstSignal(plan.northStar, "Guided plan created."),
              createdAt: plan.createdAt,
              tone: "plan" as const
            }
          ]
        : []),
      ...feedback.map((entry) => ({
        id: entry.id,
        label: "Leadership feedback",
        detail: firstSignal(entry.feedback.leadershipGuidance || entry.feedback.feedbackToDeliveryLead, "Leadership review saved."),
        createdAt: entry.createdAt,
        tone: "leadership" as const
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [feedback, plan, selectedProgram, updates]);

  const loadReviewQueue = useCallback(async () => {
    if (!programs.length) {
      setReviewQueue([]);
      return;
    }

    const requestId = queueRequest.beginRequest();

    try {
      const response = await fetch("/api/leadership/review-queue", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { reviewQueue: ReviewQueueItem[] };
      if (!queueRequest.isLatestRequest(requestId)) return;
      setReviewQueue(payload.reviewQueue);
    } catch {
      if (!queueRequest.isLatestRequest(requestId)) return;
      setReviewQueue([]);
    }
  }, [programs.length, queueRequest]);

  useEffect(() => {
    void loadReviewQueue();
  }, [loadReviewQueue]);

  useEffect(() => {
    if (!queueMode || !displayedReviewQueue.length) return;
    if (displayedReviewQueue.some((entry) => entry.programId === selectedProgramId)) return;
    setSelectedProgramId(displayedReviewQueue[0].programId);
  }, [displayedReviewQueue, queueMode, selectedProgramId, setSelectedProgramId]);

  const loadProgramContext = useCallback(async () => {
    if (!selectedProgramId || !selectedProgram) return;
    const requestId = contextRequest.beginRequest();

    if (selectedProgramId === seededLeadershipProgram.id) {
      if (!contextRequest.isLatestRequest(requestId)) return;
      setUpdates(seededLeadershipUpdates);
      setPlan(seededLeadershipPlan);
      setFeedback(seededLeadershipFeedback);
      setReview(seededLeadershipFeedback[0].feedback);
      setStatus("Showing seeded leadership scenario. Save real programs to replace it with live data.");
      setSaveState("idle");
      return;
    }

    try {
      const [updatesResponse, planResponse, feedbackResponse] = await Promise.all([
        fetch(`/api/programs/${selectedProgramId}/updates`, { cache: "no-store" }),
        fetch(`/api/programs/${selectedProgramId}/guided-plan`, { cache: "no-store" }),
        fetch(`/api/programs/${selectedProgramId}/leadership-feedback`, { cache: "no-store" })
      ]);

      const updatesPayload = (await updatesResponse.json()) as { updates: StoredProgramUpdate[] };
      const planPayload = (await planResponse.json()) as { plan: GuidedPlan | null };
      const feedbackPayload = (await feedbackResponse.json()) as { feedback: LeadershipReviewRecord[] };
      if (!contextRequest.isLatestRequest(requestId)) return;

      const latestSavedFeedback = feedbackPayload.feedback[0];

      setUpdates(updatesPayload.updates);
      setPlan(planPayload.plan);
      setFeedback(feedbackPayload.feedback);
      setReview((current) => ({
        ...current,
        programName: selectedProgram.intake.programName,
        timelineSummary:
          latestSavedFeedback?.feedback.timelineSummary ??
          firstSignal(selectedProgram.intake.currentStatus || updatesPayload.updates[0]?.review.currentPhase || "", ""),
        progressHighlights:
          latestSavedFeedback?.feedback.progressHighlights ??
          firstSignal(updatesPayload.updates[0]?.review.progressSinceLastReview || selectedProgram.intake.outcomes || "", ""),
        activeRisks:
          latestSavedFeedback?.feedback.activeRisks ??
          firstSignal(updatesPayload.updates[0]?.review.activeRisks || selectedProgram.intake.risks || "", ""),
        leadershipGuidance: latestSavedFeedback?.feedback.leadershipGuidance ?? "",
        supportRequests: latestSavedFeedback?.feedback.supportRequests ?? "",
        feedbackToDeliveryLead: latestSavedFeedback?.feedback.feedbackToDeliveryLead ?? ""
      }));
      setStatus(planPayload.plan ? "Leadership view synced with latest saved plan and program signals." : "Leadership view synced with saved program signals.");
      setSaveState("idle");
    } catch {
      if (!contextRequest.isLatestRequest(requestId)) return;
      setStatus("Leadership view could not load the latest program context.");
    }
  }, [contextRequest, selectedProgram, selectedProgramId]);

  useEffect(() => {
    void loadProgramContext();
  }, [loadProgramContext]);

  const refreshLeadershipView = useCallback(() => {
    void refreshPrograms({ silent: true });
    void loadReviewQueue();
    void loadProgramContext();
  }, [loadProgramContext, loadReviewQueue, refreshPrograms]);
  useForegroundRefresh(refreshLeadershipView, { enabled: true, intervalMs: selectedProgramId ? 15000 : null });

  function updateField(field: keyof LeadershipReviewInput, value: string) {
    setReview((current) => ({ ...current, [field]: value }));
  }

  async function handleCadenceChange(nextCadence: ReviewCadence) {
    if (!selectedProgram) return;

    const previousPrograms = programs;
    const nextPrograms = programs.map((program) =>
      program.id === selectedProgram.id
        ? {
            ...program,
            updatedAt: new Date().toISOString(),
            intake: {
              ...program.intake,
              leadershipReviewCadence: nextCadence
            }
          }
        : program
    );

    setPrograms(nextPrograms, selectedProgram.id);
    setStatus("Saving review cadence...");

    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...selectedProgram.intake,
          leadershipReviewCadence: nextCadence
        })
      });

      if (!response.ok) throw new Error("Cadence save failed.");
      const payload = (await response.json()) as { program: StoredProgram };
      setPrograms((current) => current.map((program) => (program.id === payload.program.id ? payload.program : program)), payload.program.id);
      setStatus("Leadership review cadence saved.");
    } catch {
      setPrograms(previousPrograms, selectedProgram.id);
      setStatus("Leadership review cadence could not be saved.");
    }
  }

  function clearQueueFilter() {
    router.replace(pathname);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProgramId || !selectedProgram) return;

    setSaveState("saving");
    setStatus("Saving leadership review...");

    try {
      const response = await fetch(`/api/programs/${selectedProgramId}/leadership-feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...review,
          programName: selectedProgram.intake.programName
        })
      });

      if (!response.ok) throw new Error("Leadership feedback save failed.");
      const payload = (await response.json()) as { feedback: LeadershipReviewRecord; plan: GuidedPlan | null };
      setFeedback((current) => [payload.feedback, ...current.filter((entry) => entry.id !== payload.feedback.id)]);
      setPlan(payload.plan);
      setSaveState("saved");
      void loadReviewQueue();
      setStatus(
        payload.plan
          ? "Leadership review saved. Guidance was regenerated with leadership signal translated into the current plan."
          : "Leadership review saved. The signal is now part of the program context."
      );
    } catch {
      setSaveState("error");
      setStatus("Leadership review could not be saved.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Leadership review"
        title="Leader Console"
        description="Review program posture, progress, and delivery risk in one place. Leadership input entered here is translated into concise delivery signal and fed back into the next guidance cycle."
      />

      <section className="mt-10 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <LeadershipReviewSidebar
          programs={programs}
          selectedProgramId={selectedProgramId}
          selectedProgram={selectedProgram}
          selectedCadence={selectedCadence}
          selectedLane={selectedLane}
          laneOptions={laneOptions}
          reviewCycleStatus={reviewCycleStatus}
          queueMode={queueMode}
          displayedReviewQueue={displayedReviewQueue}
          status={status}
          onProgramChange={setSelectedProgramId}
          onCadenceChange={(nextCadence) => void handleCadenceChange(nextCadence)}
          onLaneChange={(nextLane) => {
            setLaneWasManuallyChanged(true);
            setSelectedLane(nextLane);
          }}
          onClearQueueFilter={clearQueueFilter}
          onFocusReviewCycle={focusReviewCycle}
          formatTimestamp={formatTimestamp}
        />

        <section className="grid gap-6">
          <LeadershipExecutiveSummary
            executiveSummary={executiveSummary}
            leaderReadout={leaderReadout}
            quickContextSignals={quickContextSignals}
          />

          <LeadershipReviewWorkbench
            review={review}
            leadershipFields={leadershipFields}
            reviewCycleStatus={reviewCycleStatus}
            latestReviewCycle={latestReviewCycle}
            clarifyItems={clarifyItems}
            feedback={feedback}
            quickReviewPrompt={quickReviewPrompt}
            saveState={saveState}
            selectedLaneLabel={selectedLaneOption.label}
            selectedProgramId={selectedProgramId}
            formatTimestamp={formatTimestamp}
            onUpdateField={updateField}
            onSubmit={handleSubmit}
            onLoadReview={setReview}
            summarizeFeedback={(entry) => firstSignal(entry.interpretation?.summary ?? entry.feedback.leadershipGuidance, "Leadership review")}
            summarizeFeedbackDetail={(entry) =>
              entry.interpretation?.deliveryLeadMessage ||
              entry.feedback.feedbackToDeliveryLead ||
              entry.feedback.supportRequests ||
              "No detail captured."
            }
          />

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-white/10 bg-zinc-950/70 px-5 py-4 text-zinc-100 transition-colors hover:border-amber-300/25">
              <span className="font-medium">Program history</span>
              <span className="text-xs uppercase tracking-[0.14em] text-zinc-500">Optional detail</span>
            </summary>
            <div className="mt-4">
              <LeadershipProgramTimeline
                selectedProgram={Boolean(selectedProgram)}
                currentPhaseLabel={currentPhase.label}
                ganttPhases={ganttPhases}
                timeline={timeline}
                formatTimestamp={formatTimestamp}
              />
            </div>
          </details>
        </section>
      </section>
    </main>
  );
}
