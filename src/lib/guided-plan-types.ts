import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { OpenAIUsageMetadata } from "@/lib/program-intelligence-types";

export type GuidedPlanSection = {
  title: string;
  items: string[];
};

export type GuidedPlanRolePlan = {
  role: string;
  actionPlan: string[];
  keyFocusAreas: string[];
  keyOutcomes: string[];
  risksAndMitigations: string[];
};

export type GuidedPlanRolePlans = {
  title: string;
  roles: GuidedPlanRolePlan[];
};

export type GuidedProgramGuide = {
  title: string;
  focus: string;
  whyItMatters: string;
  nextStep: string;
  sponsorReadout: string;
};

export type GuidedPlan = {
  id: string;
  programId: string;
  programName: string;
  createdAt: string;
  northStar: string;
  summary: string;
  programGuide?: GuidedProgramGuide;
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
  modelUsage?: OpenAIUsageMetadata;
};
