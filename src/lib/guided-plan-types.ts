import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";

export type GuidedPlanSection = {
  title: string;
  items: string[];
};

export type GuidedPlanRoleFocus = {
  role: "Delivery Lead" | "Business Analyst" | "Tech Lead" | "UX" | "Communications & Change Mgmt";
  areas: string[];
};

export type GuidedPlanRoleCoverage = {
  title: string;
  roles: GuidedPlanRoleFocus[];
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
  roleCoverage?: GuidedPlanRoleCoverage;
  leadershipSignal: DeliveryLeadershipSignal;
  followUpQuestions: string[];
  sourceRecordIds: string[];
};
