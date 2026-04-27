"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardPen,
  FileClock,
  Flag,
  MessageSquareQuote,
  Milestone,
  RefreshCw,
  ShieldAlert
} from "lucide-react";
import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import type { ProgramIntake, StoredProgram } from "@/lib/program-intake-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type ReviewCadence = "weekly" | "biweekly";

type ReviewCycleStatus = {
  cadence: ReviewCadence;
  lastReviewedLabel: string;
  nextReviewLabel: string;
  badgeLabel: string;
  badgeTone: "on-track" | "due" | "overdue";
  ctaLabel: string;
  helperText: string;
};

type ReviewQueueItem = {
  programId: string;
  programName: string;
  leadLabel: string;
  cadence: ReviewCadence;
  status: "due" | "overdue";
  badgeLabel: string;
  lastReviewedLabel: string;
  nextReviewLabel: string;
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

function deriveLeadLabel(program: StoredProgram) {
  const stakeholderLines = (program.intake.stakeholders || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  const explicitLead =
    stakeholderLines.find((item) => /\b(delivery lead|program lead|owner|engagement lead|program manager)\b/i.test(item)) ??
    stakeholderLines[0];

  return explicitLead || "Lead not named";
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

function buildReviewCycleStatusForCadence(entries: LeadershipReviewRecord[], cadence: ReviewCadence): ReviewCycleStatus {
  const cadenceDays = cadence === "weekly" ? 7 : 14;

  if (!entries.length) {
    return {
      cadence,
      lastReviewedLabel: "No review on file",
      nextReviewLabel: cadence === "weekly" ? "Start the first weekly review" : "Start the first bi-weekly review",
      badgeLabel: "Review needed",
      badgeTone: "due",
      ctaLabel: "Start new review cycle",
      helperText: "No leadership review has been saved for this program yet."
    };
  }

  const latestDate = new Date(entries[0].createdAt);
  const now = new Date();
  const daysSinceReview = differenceInDays(now, latestDate);
  const nextReviewDate = new Date(latestDate);
  nextReviewDate.setDate(nextReviewDate.getDate() + cadenceDays);
  const daysUntilNextReview = differenceInDays(nextReviewDate, now);

  let badgeTone: ReviewCycleStatus["badgeTone"] = "on-track";
  let badgeLabel = `${cadence === "weekly" ? "Weekly" : "Bi-weekly"} review on track`;
  if (daysUntilNextReview < 0) {
    badgeTone = "overdue";
      badgeLabel = `${cadence === "weekly" ? "Weekly" : "Bi-weekly"} review overdue`;
  } else if (daysUntilNextReview <= 1) {
    badgeTone = "due";
      badgeLabel = `${cadence === "weekly" ? "Weekly" : "Bi-weekly"} review due`;
  }

  return {
    cadence,
    lastReviewedLabel: `${formatTimestamp(entries[0].createdAt)} (${daysSinceReview === 0 ? "today" : `${daysSinceReview}d ago`})`,
    nextReviewLabel: `${formatTimestamp(nextReviewDate.toISOString())} (${daysUntilNextReview < 0 ? `${Math.abs(daysUntilNextReview)}d overdue` : formatRelativeDays(daysUntilNextReview)})`,
    badgeLabel,
    badgeTone,
    ctaLabel: daysSinceReview < 2 ? "Update this review cycle" : "Start new review cycle",
    helperText:
      badgeTone === "overdue"
        ? "Leadership input is past the expected review cadence for this program."
        : badgeTone === "due"
          ? "A new leadership review should be entered now so guidance stays current."
          : "The current leadership review is still within the expected review window."
  };
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
      const response = await fetch("/api/programs");
      const payload = (await response.json()) as { programs: StoredProgram[] };
      if (payload.programs.length) {
        setPrograms(payload.programs);
        setSelectedProgramId(payload.programs[0].id);
      } else {
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

      const queueEntries = await Promise.all(
        programs.map(async (program) => {
          const cadence = (program.intake.leadershipReviewCadence as ReviewCadence | undefined) ?? "weekly";
          const programFeedback =
            program.id === seededLeadershipProgram.id
              ? seededLeadershipFeedback
              : ((await fetch(`/api/programs/${program.id}/leadership-feedback`).then((response) => response.json())) as {
                  feedback: LeadershipReviewRecord[];
                }).feedback;
          const cycleStatus = buildReviewCycleStatusForCadence(programFeedback, cadence);
          if (cycleStatus.badgeTone === "on-track") {
            return null;
          }

          return {
            programId: program.id,
            programName: program.intake.programName,
            leadLabel: deriveLeadLabel(program),
            cadence,
            status: cycleStatus.badgeTone,
            badgeLabel: cycleStatus.badgeLabel,
            lastReviewedLabel: cycleStatus.lastReviewedLabel,
            nextReviewLabel: cycleStatus.nextReviewLabel
          } satisfies ReviewQueueItem;
        })
      );

      const dueQueue: ReviewQueueItem[] = queueEntries
        .filter((entry) => entry !== null)
        .sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === "overdue" ? -1 : 1;
          }

          return a.programName.localeCompare(b.programName);
        });

      setReviewQueue(dueQueue);
    }

    void loadReviewQueue();
  }, [feedback, programs]);

  useEffect(() => {
    if (!queueMode || !reviewQueue.length) return;
    if (reviewQueue.some((entry) => entry.programId === selectedProgramId)) return;
    setSelectedProgramId(reviewQueue[0].programId);
  }, [queueMode, reviewQueue, selectedProgramId]);

  useEffect(() => {
    async function loadProgramContext() {
      if (!selectedProgramId || !selectedProgram) return;

      if (selectedProgramId === seededLeadershipProgram.id) {
        setUpdates(seededLeadershipUpdates);
        setPlan(seededLeadershipPlan);
        setFeedback(seededLeadershipFeedback);
        setReview(seededLeadershipFeedback[0].feedback);
        setStatus("Showing seeded leadership scenario. Save real programs to replace it with live data.");
        setSaveState("idle");
        return;
      }

      const [updatesResponse, planResponse, feedbackResponse] = await Promise.all([
        fetch(`/api/programs/${selectedProgramId}/updates`),
        fetch(`/api/programs/${selectedProgramId}/guided-plan`),
        fetch(`/api/programs/${selectedProgramId}/leadership-feedback`)
      ]);

      const updatesPayload = (await updatesResponse.json()) as { updates: StoredProgramUpdate[] };
      const planPayload = (await planResponse.json()) as { plan: GuidedPlan | null };
      const feedbackPayload = (await feedbackResponse.json()) as { feedback: LeadershipReviewRecord[] };
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
        <aside className="grid gap-4 self-start lg:sticky lg:top-24">
          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <Milestone className="h-4 w-4 text-emerald-200" />
                Program selection
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Saved program</span>
                <select
                  value={selectedProgramId}
                  onChange={(event) => setSelectedProgramId(event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                >
                  {programs.length ? null : <option value="">No saved programs yet</option>}
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.intake.programName} {program.id === seededLeadershipProgram.id ? "(sample)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedProgram ? (
                <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-sm font-medium text-zinc-100">{selectedProgram.intake.programName}</p>
                  <p className="text-xs leading-5 text-zinc-400">
                    {selectedProgram.intake.vision || "No north star captured yet."}
                  </p>
                  <p className="text-xs text-zinc-500">Updated {formatTimestamp(selectedProgram.updatedAt)}</p>
                </div>
              ) : null}

              {selectedProgram ? (
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Review cadence</span>
                  <select
                    value={selectedCadence}
                    onChange={(event) => void handleCadenceChange(event.target.value as ReviewCadence)}
                    className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                  </select>
                </label>
              ) : null}

              {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <FileClock className="h-4 w-4 text-amber-200" />
                Review cadence
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <div
                className={`rounded-md border p-4 ${
                  reviewCycleStatus.badgeTone === "overdue"
                    ? "border-rose-300/25 bg-rose-300/10"
                    : reviewCycleStatus.badgeTone === "due"
                      ? "border-amber-300/25 bg-amber-300/10"
                      : "border-emerald-300/20 bg-emerald-300/[0.07]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-200">
                    {reviewCycleStatus.cadence === "weekly" ? "Weekly review loop" : "Bi-weekly review loop"}
                  </p>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                      reviewCycleStatus.badgeTone === "overdue"
                        ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
                        : reviewCycleStatus.badgeTone === "due"
                          ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                          : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                    }`}
                  >
                    {reviewCycleStatus.badgeLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{reviewCycleStatus.helperText}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Last reviewed</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-200">{reviewCycleStatus.lastReviewedLabel}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Next expected review</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-200">{reviewCycleStatus.nextReviewLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-zinc-50">
                  <RefreshCw className="h-4 w-4 text-fuchsia-200" />
                  {queueMode ? "Filtered review due queue" : "Review due queue"}
                </CardTitle>
                {queueMode ? (
                  <Button type="button" variant="ghost" size="sm" className="text-zinc-300" onClick={clearQueueFilter}>
                    Clear queue filter
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {queueMode ? (
                <div className="rounded-md border border-fuchsia-300/20 bg-fuchsia-300/[0.07] p-3 text-sm leading-6 text-zinc-300">
                  The Console sent you here because one or more leadership reviews are due now.
                </div>
              ) : null}

              {reviewQueue.length ? (
                reviewQueue.map((entry) => (
                  <div
                    key={entry.programId}
                    className={`rounded-md border p-3 transition-colors ${
                      entry.programId === selectedProgramId
                        ? "border-fuchsia-300/35 bg-fuchsia-300/[0.08]"
                        : "border-white/10 bg-white/[0.035] hover:border-fuchsia-300/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{entry.programName}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">Lead: {entry.leadLabel}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-300">
                          {entry.cadence === "weekly" ? "Weekly" : "Bi-weekly"}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                            entry.status === "overdue"
                              ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
                              : "border-amber-300/30 bg-amber-300/10 text-amber-100"
                          }`}
                        >
                          {entry.status === "overdue" ? "Overdue" : "Due"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{entry.lastReviewedLabel}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{entry.nextReviewLabel}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={entry.programId === selectedProgramId ? "default" : "secondary"}
                        onClick={() => setSelectedProgramId(entry.programId)}
                      >
                        Open program
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="text-zinc-200" onClick={() => focusReviewCycle(entry.programId)}>
                        Start review cycle
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-zinc-400">
                  No leadership reviews are due right now.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <MessageSquareQuote className="h-4 w-4 text-cyan-200" />
                Recent leadership signal
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {recentLeadershipSignals.length ? (
                recentLeadershipSignals.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setReview(entry.feedback)}
                    className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:border-cyan-300/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">
                        {index === 0 ? "Most recent" : formatTimestamp(entry.createdAt)}
                      </span>
                      <span className="text-[11px] text-zinc-500">{index === 0 ? formatTimestamp(entry.createdAt) : "load"}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-100">
                      {firstSignal(entry.interpretation?.summary ?? entry.feedback.leadershipGuidance, "Leadership review")}
                    </p>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-zinc-400">
                      {entry.interpretation?.deliveryLeadMessage ||
                        entry.feedback.feedbackToDeliveryLead ||
                        entry.feedback.supportRequests ||
                        "No detail captured."}
                    </p>
                  </button>
                ))
              ) : (
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-zinc-400">
                  No leadership guidance is saved yet.
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

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
