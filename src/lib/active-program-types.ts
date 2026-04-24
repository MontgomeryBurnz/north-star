import type { ProgramArtifact } from "@/lib/program-intake-types";

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
