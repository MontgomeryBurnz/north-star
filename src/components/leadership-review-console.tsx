"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardPen,
  FileClock,
  Flag,
  MessageSquareQuote,
  RefreshCw,
  ShieldAlert
} from "lucide-react";
import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import { buildReviewCycleStatusForCadence, type ReviewCadence, type ReviewCycleStatus, type ReviewQueueItem } from "@/lib/leadership-review-queue";
import type { ProgramIntake, StoredProgram } from "@/lib/program-intake-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadershipReviewSidebar } from "@/components/leadership-review-sidebar";
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
    placeholder: "What matters on the timeline right now? Include milestone posture, phase, and timing pressure.",
    rows: 3
  },
  {
    id: "progressHighlights",
    label: "Progress highlights",
    placeholder: "What is materially moving? Call out evidence, shipped work, and visible gains.",
    rows: 3
  },
  {
    id: "activeRisks",
    label: "Leadership risks",
    placeholder: "What concerns leadership most right now? Include escalation areas and signal worth watching.",
    rows: 3
  },
  {
    id: "leadershipGuidance",
    label: "Leadership guidance",
    placeholder: "What should the delivery lead optimize for over the next checkpoint?",
    rows: 3
  },
  {
    id: "supportRequests",
    label: "Support requested",
    placeholder: "What help, staffing, sponsor action, or decision support is needed from leadership?",
    rows: 3
  },
  {
    id: "feedbackToDeliveryLead",
    label: "Feedback to delivery lead",
    placeholder: "What direct feedback should be reflected in guidance, planning, and next-step outputs?",
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

type GanttPhase = {
  id: string;
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function firstSignal(value: string, fallback: string) {
  return (
    value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)[0] ?? fallback
  );
}

function phaseIndexFromLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("discovery")) return 0;
  if (normalized.includes("design") || normalized.includes("planning")) return 1;
  if (normalized.includes("build") || normalized.includes("execution")) return 2;
  if (normalized.includes("recovery") || normalized.includes("stabil")) return 3;
  if (normalized.includes("launch") || normalized.includes("rollout") || normalized.includes("scale")) return 4;
  return 2;
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}

function splitSignals(value: string, fallback: string) {
  const items = value
    .split(/\n|•|;/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : [fallback];
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

function formatRelativeDays(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

function buildReviewCycleStatus(entries: LeadershipReviewRecord[]): ReviewCycleStatus {
  const cadence = inferReviewCadence(entries);
  return buildReviewCycleStatusForCadence(entries, cadence);
}

function buildProgramGantt(program: StoredProgram | null, latestUpdate: StoredProgramUpdate | undefined): GanttPhase[] {
  const currentPhaseLabel = latestUpdate?.review.currentPhase || program?.intake.currentStatus || "Execution";
  const currentIndex = phaseIndexFromLabel(currentPhaseLabel);

  return [
    {
      id: "discover",
      label: "Discover",
      description: "North star, constraints, and problem shape were framed.",
      status: currentIndex > 0 ? "completed" : currentIndex === 0 ? "current" : "upcoming"
    },
    {
      id: "design",
      label: "Design",
      description: "Checkpoint structure, decision rights, and work path were defined.",
      status: currentIndex > 1 ? "completed" : currentIndex === 1 ? "current" : "upcoming"
    },
    {
      id: "execute",
      label: "Execute",
      description: "Delivery is moving and progress evidence is being produced.",
      status: currentIndex > 2 ? "completed" : currentIndex === 2 ? "current" : "upcoming"
    },
    {
      id: "stabilize",
      label: "Stabilize",
      description: "Recovery, risk control, and cleaner stakeholder signal are the focus.",
      status: currentIndex > 3 ? "completed" : currentIndex === 3 ? "current" : "upcoming"
    },
    {
      id: "scale",
      label: "Scale",
      description: "The operating path is repeatable, visible, and ready to widen.",
      status: currentIndex > 4 ? "completed" : currentIndex === 4 ? "current" : "upcoming"
    }
  ];
}

export function LeadershipReviewConsole() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queueMode = searchParams.get("queue") === "due";
  const programsRequestRef = useRef(0);
  const queueRequestRef = useRef(0);
  const contextRequestRef = useRef(0);
  const [programs, setPrograms] = useState<StoredProgram[]>([seededLeadershipProgram]);
  const [selectedProgramId, setSelectedProgramId] = useState(seededLeadershipProgram.id);
  const [updates, setUpdates] = useState<StoredProgramUpdate[]>(seededLeadershipUpdates);
  const [plan, setPlan] = useState<GuidedPlan | null>(seededLeadershipPlan);
  const [feedback, setFeedback] = useState<LeadershipReviewRecord[]>(seededLeadershipFeedback);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [review, setReview] = useState<LeadershipReviewInput>(emptyLeadershipReview);
  const [status, setStatus] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId) ?? null,
    [programs, selectedProgramId]
  );
  const latestUpdate = updates[0];
  const latestFeedback = feedback[0];
  const ganttPhases = useMemo(() => buildProgramGantt(selectedProgram, latestUpdate), [latestUpdate, selectedProgram]);
  const currentPhase = ganttPhases.find((phase) => phase.status === "current") ?? ganttPhases[ganttPhases.length - 1];
  const executiveSummary = useMemo(
    () =>
      firstNonEmpty(
        latestFeedback?.interpretation?.summary,
        plan?.summary,
        latestUpdate?.review.progressSinceLastReview,
        selectedProgram?.intake.vision,
        selectedProgram?.intake.outcomes
      ) || "No executive summary is available yet.",
    [latestFeedback?.interpretation?.summary, latestUpdate?.review.progressSinceLastReview, plan?.summary, selectedProgram?.intake.outcomes, selectedProgram?.intake.vision]
  );
  const leaderReadout = useMemo(
    () => [
      {
        label: "Program summary",
        value: executiveSummary
      },
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
    ],
    [
      executiveSummary,
      latestFeedback?.feedback.activeRisks,
      latestFeedback?.feedback.progressHighlights,
      latestUpdate?.review.activeRisks,
      latestUpdate?.review.decisionsPending,
      latestUpdate?.review.progressSinceLastReview,
      plan?.risksAndDecisions.items,
      selectedProgram?.intake.currentStatus,
      selectedProgram?.intake.decisionsNeeded,
      selectedProgram?.intake.risks
    ]
  );
  const quickContextSignals = useMemo(
    () => [
      {
        label: "Phase",
        value: latestUpdate?.review.currentPhase || selectedProgram?.intake.currentStatus || "No phase captured."
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
        label: "Support needed",
        value:
          firstNonEmpty(
            latestUpdate?.review.supportNeeded,
            latestFeedback?.feedback.supportRequests
          ) || "No sponsor or leadership support request is captured yet."
      }
    ],
    [
      latestFeedback?.feedback.leadershipGuidance,
      latestFeedback?.feedback.supportRequests,
      latestFeedback?.interpretation?.deliveryLeadMessage,
      latestUpdate?.review.currentPhase,
      latestUpdate?.review.supportNeeded,
      selectedProgram?.intake.currentStatus
    ]
  );
  const recentLeadershipSignals = useMemo(() => feedback.slice(0, 3), [feedback]);
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

  useEffect(() => {
    async function loadPrograms() {
      const requestId = ++programsRequestRef.current;

      try {
        const response = await fetch("/api/programs", { cache: "no-store" });
        const payload = (await response.json()) as { programs: StoredProgram[] };
        if (requestId !== programsRequestRef.current) return;

        if (payload.programs.length) {
          setPrograms(payload.programs);
          setSelectedProgramId((current) =>
            payload.programs.some((program) => program.id === current) ? current : payload.programs[0].id
          );
        } else {
          setPrograms([seededLeadershipProgram]);
          setSelectedProgramId(seededLeadershipProgram.id);
        }
      } catch {
        if (requestId !== programsRequestRef.current) return;
        setPrograms([seededLeadershipProgram]);
        setSelectedProgramId(seededLeadershipProgram.id);
      }
    }

    void loadPrograms();
  }, []);

  useEffect(() => {
    async function loadReviewQueue() {
      if (!programs.length) {
        setReviewQueue([]);
        return;
      }

      const requestId = ++queueRequestRef.current;

      try {
        const response = await fetch("/api/leadership/review-queue", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { reviewQueue: ReviewQueueItem[] };
        if (requestId !== queueRequestRef.current) return;
        setReviewQueue(payload.reviewQueue);
      } catch {
        if (requestId !== queueRequestRef.current) return;
        setReviewQueue([]);
      }
    }

    void loadReviewQueue();
  }, [feedback, programs]);

  useEffect(() => {
    if (!queueMode || !displayedReviewQueue.length) return;
    if (displayedReviewQueue.some((entry) => entry.programId === selectedProgramId)) return;
    setSelectedProgramId(displayedReviewQueue[0].programId);
  }, [displayedReviewQueue, queueMode, selectedProgramId]);

  useEffect(() => {
    async function loadProgramContext() {
      if (!selectedProgramId || !selectedProgram) return;
      const requestId = ++contextRequestRef.current;

      if (selectedProgramId === seededLeadershipProgram.id) {
        if (requestId !== contextRequestRef.current) return;
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
        if (requestId !== contextRequestRef.current) return;

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
        if (requestId !== contextRequestRef.current) return;
        setStatus("Leadership view could not load the latest program context.");
      }
    }

    void loadProgramContext();
  }, [selectedProgramId, selectedProgram]);

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

    setPrograms(nextPrograms);
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
      setPrograms((current) => current.map((program) => (program.id === payload.program.id ? payload.program : program)));
      setStatus("Leadership review cadence saved.");
    } catch {
      setPrograms(previousPrograms);
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
          reviewCycleStatus={reviewCycleStatus}
          queueMode={queueMode}
          displayedReviewQueue={displayedReviewQueue}
          recentLeadershipSignals={recentLeadershipSignals}
          status={status}
          onProgramChange={setSelectedProgramId}
          onCadenceChange={(nextCadence) => void handleCadenceChange(nextCadence)}
          onClearQueueFilter={clearQueueFilter}
          onFocusReviewCycle={focusReviewCycle}
          onLoadReview={setReview}
          formatTimestamp={formatTimestamp}
        />

        <section className="grid gap-6">
          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <Flag className="h-4 w-4 text-emerald-200" />
                Executive summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <div className="rounded-md border border-emerald-300/15 bg-emerald-300/[0.07] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Leader readout</p>
                <p className="mt-3 text-base leading-7 text-zinc-100">{executiveSummary}</p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {leaderReadout.map((item) => (
                  <div key={item.label} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {quickContextSignals.map((item) => (
                  <div key={item.label} className="rounded-md border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <FileClock className="h-4 w-4 text-amber-200" />
                Program timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {selectedProgram ? (
                <>
                  <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">Gantt summary</p>
                        <p className="mt-2 text-sm text-zinc-300">
                          Current phase: <span className="font-medium text-zinc-100">{currentPhase.label}</span>
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
                        Today
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-5">
                      {ganttPhases.map((phase) => (
                        <div key={phase.id} className="grid gap-2">
                          <div
                            className={`min-h-24 rounded-md border p-3 ${
                              phase.status === "completed"
                                ? "border-emerald-300/25 bg-emerald-300/10"
                                : phase.status === "current"
                                  ? "border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.15)]"
                                  : "border-white/10 bg-black/20"
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p
                                className={`text-xs font-medium uppercase tracking-[0.14em] ${
                                  phase.status === "completed"
                                    ? "text-emerald-100"
                                    : phase.status === "current"
                                      ? "text-cyan-100"
                                      : "text-zinc-500"
                                }`}
                              >
                                {phase.label}
                              </p>
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  phase.status === "completed"
                                    ? "bg-emerald-300"
                                    : phase.status === "current"
                                      ? "bg-cyan-300"
                                      : "bg-zinc-700"
                                }`}
                              />
                            </div>
                            <p className="text-xs leading-5 text-zinc-300">{phase.description}</p>
                          </div>
                          <div className="h-1 rounded-full bg-zinc-900">
                            <div
                              className={`h-full rounded-full ${
                                phase.status === "completed"
                                  ? "w-full bg-emerald-300"
                                  : phase.status === "current"
                                    ? "w-2/3 bg-cyan-300"
                                    : "w-1/5 bg-zinc-700"
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {timeline.map((item) => (
                      <div key={item.id} className="grid gap-2 rounded-md border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                                item.tone === "program"
                                  ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                                  : item.tone === "update"
                                    ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                                    : item.tone === "plan"
                                      ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                                      : "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100"
                              }`}
                            >
                              {item.label}
                            </span>
                            <span className="text-xs text-zinc-500">{formatTimestamp(item.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-zinc-300">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-zinc-400">
                  Select a saved program to view the timeline.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <ClipboardPen className="h-4 w-4 text-emerald-200" />
                Fresh leadership guidance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form id="leadership-review-form" onSubmit={handleSubmit} className="grid gap-4">
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
                        {reviewCycleStatus.ctaLabel}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        {latestReviewCycle
                          ? `The current leadership record on file was submitted ${formatTimestamp(latestReviewCycle.createdAt)}. Save this form to create the next cadence update and refresh the guided plan.`
                          : "No review has been captured yet. Save this form to establish the first leadership review cycle and refresh the guided plan."}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                      {reviewCycleStatus.cadence === "weekly" ? "7-day loop" : "14-day loop"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="grid gap-4">
                    {leadershipFields.slice(0, 4).map((field) => (
                      <label key={field.id} className="grid gap-2">
                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">{field.label}</span>
                        <textarea
                          value={review[field.id]}
                          onChange={(event) => updateField(field.id, event.target.value)}
                          rows={field.rows}
                          placeholder={field.placeholder}
                          className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-300/50"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">What leaders should clarify</p>
                      <div className="mt-3 grid gap-2">
                        {splitSignals(
                          firstNonEmpty(
                            latestUpdate?.review.decisionsPending,
                            selectedProgram?.intake.decisionsNeeded,
                            review.supportRequests
                          ),
                          "No decision pressure is currently saved."
                        ).map((item) => (
                          <p key={item} className="text-sm leading-6 text-zinc-300">
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    {leadershipFields.slice(4).map((field) => (
                      <label key={field.id} className="grid gap-2">
                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">{field.label}</span>
                        <textarea
                          value={review[field.id]}
                          onChange={(event) => updateField(field.id, event.target.value)}
                          rows={field.rows}
                          placeholder={field.placeholder}
                          className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-300/50"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" size="lg" disabled={!selectedProgramId || saveState === "saving"}>
                    <MessageSquareQuote className="h-4 w-4" />
                    {saveState === "saving" ? "Saving..." : "Save leadership review"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-zinc-950/80">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2 text-zinc-50">
                  <ShieldAlert className="h-4 w-4 text-cyan-200" />
                  Delivery-facing implication
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-5">
                {[
                  review.leadershipGuidance || "Add leadership guidance to shape the next delivery move.",
                  review.supportRequests || "Capture support requests so the delivery lead knows what to escalate.",
                  review.feedbackToDeliveryLead || "Add direct feedback so it can flow into delivery guidance."
                ].map((item) => (
                  <p key={item} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-6 text-zinc-300">
                    {item}
                  </p>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-zinc-950/80">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2 text-zinc-50">
                  <RefreshCw className="h-4 w-4 text-amber-200" />
                  Review cycle history
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-5">
                {feedback.length ? (
                  feedback.slice(0, 5).map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setReview(entry.feedback)}
                      className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:border-amber-300/30"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">
                          {formatTimestamp(entry.createdAt)}
                        </span>
                        <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                          review cycle
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-100">
                        {firstSignal(entry.interpretation?.summary ?? entry.feedback.leadershipGuidance, "Leadership review")}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                        {entry.interpretation?.deliveryLeadMessage ||
                          entry.feedback.feedbackToDeliveryLead ||
                          entry.feedback.supportRequests ||
                          "No detail captured."}
                      </p>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                        Click to load this review cycle into the guidance form
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-zinc-400">
                    No leadership reviews saved yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </section>
    </main>
  );
}
