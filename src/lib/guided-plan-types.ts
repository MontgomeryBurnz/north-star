import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";

export type GuidedPlanSection = {
  title: string;
  items: string[];
};

export type GuidedPlan = {
  id: string;
  programId: string;
  programName: string;
  createdAt: string;
  northStar: string;
  summary: string;
  signalFromNoise: GuidedPlanSection;
  workPath: GuidedPlanSection;
  planningApproach: GuidedPlanSection;
  keyOutcomes: GuidedPlanSection;
  criticalRequirements: GuidedPlanSection;
  keyOutputs: GuidedPlanSection;
  risksAndDecisions: GuidedPlanSection;
  leadershipChanges: GuidedPlanSection;
  leadershipSignal: DeliveryLeadershipSignal;
  followUpQuestions: string[];
  sourceRecordIds: string[];
};
