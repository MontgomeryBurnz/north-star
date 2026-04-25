import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";

export type GuidedPlanSection = {
  title: string;
  items: string[];
};

export type GuidedPlanRolePlan = {
  role:
    | "Product Management"
    | "Business Analysis"
    | "User Experience"
    | "Application Development"
    | "Data Engineering"
    | "Change Management";
  actionPlan: string[];
  keyFocusAreas: string[];
  keyOutcomes: string[];
  risksAndMitigations: string[];
};

export type GuidedPlanRolePlans = {
  title: string;
  roles: GuidedPlanRolePlan[];
};

export type GuidedPlan = {
  id: string;
  programId: string;
  programName: string;
  createdAt: string;
  northStar: string;
  summary: string;
  sourceInputs: GuidedPlanSection;
  assistantDialogue: GuidedPlanSection;
  signalFromNoise: GuidedPlanSection;
  workPath: GuidedPlanSection;
  planningApproach: GuidedPlanSection;
  keyOutcomes: GuidedPlanSection;
  criticalRequirements: GuidedPlanSection;
  keyOutputs: GuidedPlanSection;
  risksAndDecisions: GuidedPlanSection;
  leadershipChanges: GuidedPlanSection;
  rolePlans?: GuidedPlanRolePlans;
  leadershipSignal: DeliveryLeadershipSignal;
  followUpQuestions: string[];
  sourceRecordIds: string[];
};
