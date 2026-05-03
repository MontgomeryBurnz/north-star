"use client";

import {
  Activity,
  Clock3,
  Compass,
  GitPullRequestArrow,
  HeartPulse,
  MessageSquareQuote,
  Milestone,
  ShieldAlert,
  Users2
} from "lucide-react";
import type { ActiveProgramReview, ActiveProgramUpdate, TeamRoleUpdate } from "@/lib/active-program-types";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import { firstSignal } from "@/lib/text-signals";
import { Card, CardContent } from "@/components/ui/card";

type ActiveProgramCockpitCardProps = {
  review: ActiveProgramReview;
  teamRoleUpdates: TeamRoleUpdate[];
  teamCoverage: {
    submitted: number;
    total: number;
  };
  ownerCoverage: {
    configured: number;
    total: number;
  };
  cycleLabel: string;
  latestUpdate?: ActiveProgramUpdate;
  leadershipSignal: DeliveryLeadershipSignal | null;
  meetingInputsCount: number;
  formatTimestamp: (value: string) => string;
  isActive: boolean;
};

function deriveHealth(teamRoleUpdates: TeamRoleUpdate[], deliveryHealth: string) {
  let blocked = 0;
  let atRisk = 0;

  for (const role of teamRoleUpdates) {
    if (role.status === "blocked") {
      blocked += 1;
    } else if (role.status === "at-risk") {
      atRisk += 1;
    }
  }

  const hasDeliveryHealth = deliveryHealth.trim().length > 0;

  if (blocked) {
    return {
      label: "Blocked",
      detail: `${blocked} role${blocked === 1 ? "" : "s"} blocked`,
      className: "border-rose-300/25 bg-rose-300/10 text-rose-100"
    };
  }

  if (atRisk) {
    return {
      label: "At risk",
      detail: `${atRisk} role${atRisk === 1 ? "" : "s"} at risk`,
      className: "border-amber-300/25 bg-amber-300/10 text-amber-100"
    };
  }

  if (hasDeliveryHealth) {
    return {
      label: "On track",
      detail: firstSignal(deliveryHealth, "Delivery health captured"),
      className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
    };
  }

  return {
    label: "Needs signal",
    detail: "Waiting for team updates",
    className: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
  };
}

const phaseStops = [
  { label: "Discover", keywords: ["discover", "intake", "new", "capture"], percent: 18 },
  { label: "Build", keywords: ["build", "develop", "design", "delivery"], percent: 45 },
  { label: "Launch", keywords: ["launch", "release", "pilot", "alpha"], percent: 72 },
  { label: "Stabilize", keywords: ["stabil", "operate", "run", "steady"], percent: 92 }
];

function derivePhaseProgress(currentPhase: string) {
  const normalizedPhase = currentPhase.trim().toLowerCase();
  const matchedPhase = phaseStops.find((phase) => phase.keywords.some((keyword) => normalizedPhase.includes(keyword)));

  if (matchedPhase) {
    return {
      label: matchedPhase.label,
      percent: matchedPhase.percent
    };
  }

  return {
    label: currentPhase.trim() || "Not set",
    percent: currentPhase.trim() ? 35 : 8
  };
}

export function ActiveProgramCockpitCard({
  review,
  teamRoleUpdates,
  teamCoverage,
  ownerCoverage,
  cycleLabel,
  latestUpdate,
  leadershipSignal,
  meetingInputsCount,
  formatTimestamp,
  isActive
}: ActiveProgramCockpitCardProps) {
  if (!isActive) {
    return (
      <Card className="overflow-hidden border-cyan-300/15 bg-zinc-950/85">
        <CardContent className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
              <Compass className="h-3.5 w-3.5" />
              Program cockpit
            </div>
            <h3 className="text-2xl font-semibold tracking-normal text-zinc-50">Select a program to activate the cockpit.</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Program setup feeds the operating view, role updates, meeting inputs, and timeline once a program is selected.
            </p>
          </div>
          <div className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-400 sm:grid-cols-3 lg:min-w-[360px]">
            <span className="rounded-md border border-white/10 bg-black/20 px-3 py-2">1. Select program</span>
            <span className="rounded-md border border-white/10 bg-black/20 px-3 py-2">2. Review cockpit</span>
            <span className="rounded-md border border-white/10 bg-black/20 px-3 py-2">3. Capture signal</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const health = deriveHealth(teamRoleUpdates, review.deliveryHealth);
  const phaseProgress = derivePhaseProgress(review.currentPhase);
  const topRisk = firstSignal(review.activeRisks, "No active risk captured yet.");
  const nextDecision = firstSignal(review.decisionsPending || review.supportNeeded, "No decision or support ask captured yet.");
  const currentMilestone = firstSignal(
    review.planChanges || review.progressSinceLastReview || review.currentPhase,
    "No current milestone captured yet."
  );
  const leadershipSummary =
    leadershipSignal && leadershipSignal.status !== "none"
      ? firstSignal(leadershipSignal.summary, "Leadership feedback is available.")
      : "No fresh leadership feedback yet.";

  const cockpitItems = [
    {
      label: "Phase",
      value: review.currentPhase || "Not set",
      detail: `${phaseProgress.percent}% directional progress`,
      icon: Activity,
      className: "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-100"
    },
    {
      label: "Milestone",
      value: currentMilestone,
      detail: "Current delivery point",
      icon: Milestone,
      className: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100"
    },
    {
      label: "Health",
      value: health.label,
      detail: health.detail,
      icon: HeartPulse,
      className: health.className
    },
    {
      label: "Top risk",
      value: topRisk,
      detail: "First risk shaping the next plan",
      icon: ShieldAlert,
      className: "border-amber-300/20 bg-amber-300/[0.07] text-amber-100"
    },
    {
      label: "Next decision",
      value: nextDecision,
      detail: "Decision or support ask to resolve",
      icon: GitPullRequestArrow,
      className: "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-100"
    },
    {
      label: "Leadership",
      value: leadershipSummary,
      detail: leadershipSignal?.updatedAt ? `Updated ${formatTimestamp(leadershipSignal.updatedAt)}` : "Waiting for review",
      icon: MessageSquareQuote,
      className: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100"
    },
    {
      label: "Team coverage",
      value: `${teamCoverage.submitted}/${teamCoverage.total} roles`,
      detail: `${ownerCoverage.configured}/${ownerCoverage.total} owners mapped`,
      icon: Users2,
      className: "border-white/10 bg-white/[0.045] text-zinc-100"
    }
  ];

  return (
    <Card className="overflow-hidden border-cyan-300/15 bg-zinc-950/85">
      <CardContent className="p-0">
        <div className="grid gap-4 border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),rgba(255,255,255,0.025)] p-4 sm:p-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                <Compass className="h-3.5 w-3.5" />
                Program cockpit
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-400">{cycleLabel}</span>
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-normal text-zinc-50 sm:text-3xl">
              {review.programName || "Choose a program to review"}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              Review the current delivery picture, capture team signal, and keep guidance pointed at the next move.
            </p>
          </div>
          <div className="grid content-start gap-4 rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Phase progress</p>
                <p className="mt-2 text-xl font-semibold text-zinc-50">{phaseProgress.label}</p>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                {phaseProgress.percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
              <div className="h-full rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(103,232,249,0.32)]" style={{ width: `${phaseProgress.percent}%` }} />
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              {phaseStops.map((phase) => {
                const complete = phase.percent <= phaseProgress.percent;
                return (
                  <div key={phase.label} className="grid gap-1">
                    <span className={`h-1.5 rounded-full ${complete ? "bg-emerald-300" : "bg-white/10"}`} />
                    <span className={`text-[11px] font-medium ${complete ? "text-emerald-100" : "text-zinc-500"}`}>{phase.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Latest save</p>
                <Clock3 className="h-4 w-4 text-zinc-500" />
              </div>
              <p className="mt-2 text-sm font-medium text-zinc-100">
                {latestUpdate ? formatTimestamp(latestUpdate.createdAt) : "No saved update yet"}
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {meetingInputsCount
                  ? `${meetingInputsCount} meeting input${meetingInputsCount === 1 ? "" : "s"} connected`
                  : "Meeting inputs will appear here once added."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {cockpitItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-lg border p-4 ${item.className}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] opacity-80">{item.label}</p>
                  <Icon className="h-4 w-4 opacity-80" />
                </div>
                <p className="line-clamp-2 text-sm font-semibold leading-6">{item.value}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 opacity-70">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
