import type { ProgramArtifact } from "@/lib/program-intake-types";

export type TeamRoleUpdateStatus = "on-track" | "at-risk" | "blocked";

export type TeamRoleUpdate = {
  role: string;
  updatedBy: string;
  progressUpdate: string;
  changesObserved: string;
  activeRisks: string;
  blockers: string;
  decisionsNeeded: string;
  supportNeeded: string;
  status: TeamRoleUpdateStatus;
  needsLeadershipAttention: boolean;
  lastUpdatedAt?: string;
};

export type ActiveProgramReview = {
  programName: string;
  originalNorthStar: string;
  currentPhase: string;
  progressSinceLastReview: string;
  planChanges: string;
  activeRisks: string;
  stakeholderTemperature: string;
  decisionsPending: string;
  deliveryHealth: string;
  supportNeeded: string;
  updateCadence?: "weekly" | "biweekly";
  cycleLabel?: string;
  cycleStartedAt?: string;
  programSynthesisNote?: string;
  lastUpdatedRole?: string;
  teamRoleUpdates?: TeamRoleUpdate[];
  artifacts: ProgramArtifact[];
};

export type ActiveProgramUpdate = {
  id: string;
  programId: string;
  programName: string;
  createdAt: string;
  review: ActiveProgramReview;
};

export type StoredProgramUpdate = ActiveProgramUpdate & {
  updatedAt?: string;
};
