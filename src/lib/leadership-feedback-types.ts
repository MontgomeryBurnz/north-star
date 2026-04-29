import type { OpenAIUsageMetadata } from "@/lib/program-intelligence-types";

export type LeadershipReviewInput = {
  programName: string;
  timelineSummary: string;
  progressHighlights: string;
  activeRisks: string;
  leadershipGuidance: string;
  supportRequests: string;
  feedbackToDeliveryLead: string;
};

export type LeadershipRoleImpact = {
  role: "Product Management" | "Business Analysis" | "User Experience" | "Application Development" | "Data Engineering" | "Change Management";
  focus: string;
};

export type LeadershipFeedbackInterpretation = {
  provider: "local" | "openai";
  model?: string;
  generatedAt: string;
  summary: string;
  deliveryLeadMessage: string;
  planImpacts: string[];
  riskAdjustments: string[];
  roleImpacts: LeadershipRoleImpact[];
  modelUsage?: OpenAIUsageMetadata;
};

export type LeadershipReviewRecord = {
  id: string;
  programId: string;
  programName: string;
  createdAt: string;
  updatedAt?: string;
  feedback: LeadershipReviewInput;
  interpretation?: LeadershipFeedbackInterpretation;
};

export type DeliveryLeadershipSignal = {
  status: "none" | "new" | "incorporated";
  summary: string;
  highlights: string[];
  updatedAt?: string;
  sourceFeedbackId?: string;
};
