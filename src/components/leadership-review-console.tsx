"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const [programs, setPrograms] = useState<StoredProgram[]>([seededLeadershipProgram]);
  const [selectedProgramId, setSelectedProgramId] = useState(seededLeadershipProgram.id);
  const [updates, setUpdates] = useState<StoredProgramUpdate[]>(seededLeadershipUpdates);
  const [plan, setPlan] = useState<GuidedPlan | null>(seededLeadershipPlan);
  const [feedback, setFeedback] = useState<LeadershipReviewRecord[]>(seededLeadershipFeedback);
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

              {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <Flag className="h-4 w-4 text-cyan-200" />
                Leadership snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {[
                ["North star", selectedProgram?.intake.vision || selectedProgram?.intake.outcomes || "No north star captured."],
                ["Current phase", latestUpdate?.review.currentPhase || selectedProgram?.intake.currentStatus || "No active phase captured."],
                ["Progress highlight", latestUpdate?.review.progressSinceLastReview || review.progressHighlights || "No progress highlight captured."],
                ["Active risk", latestUpdate?.review.activeRisks || review.activeRisks || "No active risk captured."],
                ["Leadership direction", latestFeedback?.feedback.leadershipGuidance || "No leadership guidance saved yet."]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>

        <section className="grid gap-6">
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
                Leadership input
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="grid gap-4">
                {leadershipFields.map((field) => (
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
                  Leadership history
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
                        <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-zinc-500">
                          load
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
