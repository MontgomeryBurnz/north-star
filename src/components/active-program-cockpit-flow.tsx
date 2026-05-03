"use client";

import type { ActiveProgramReview, ActiveProgramUpdate, TeamRoleUpdate } from "@/lib/active-program-types";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import { ActiveProgramCockpitCard } from "@/components/active-program-cockpit-card";

type ActiveProgramCockpitFlowProps = {
  review: ActiveProgramReview;
  teamRoleUpdates: TeamRoleUpdate[];
  teamCoverage: { submitted: number; total: number };
  ownerCoverage: { configured: number; total: number };
  cycleLabel: string;
  latestUpdate?: ActiveProgramUpdate;
  leadershipSignal: DeliveryLeadershipSignal | null;
  meetingInputsCount: number;
  formatTimestamp: (value: string) => string;
  isActive: boolean;
};

export function ActiveProgramCockpitFlow({
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
}: ActiveProgramCockpitFlowProps) {
  return (
    <ActiveProgramCockpitCard
      review={review}
      teamRoleUpdates={teamRoleUpdates}
      teamCoverage={teamCoverage}
      ownerCoverage={ownerCoverage}
      cycleLabel={cycleLabel}
      latestUpdate={latestUpdate}
      leadershipSignal={leadershipSignal}
      meetingInputsCount={meetingInputsCount}
      formatTimestamp={formatTimestamp}
      isActive={isActive}
    />
  );
}
