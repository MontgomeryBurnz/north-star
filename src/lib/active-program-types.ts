import type { ProgramArtifact } from "@/lib/program-intake-types";

export type TeamRoleUpdateConfidence = "high" | "medium" | "low";

export type TeamRoleUpdate = {
  role: string;
  updatedBy: string;
  progressUpdate: string;
  changesObserved: string;
  activeRisks: string;
  blockers: string;
  decisionsNeeded: string;
  supportNeeded: string;
  confidence: TeamRoleUpdateConfidence;
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
