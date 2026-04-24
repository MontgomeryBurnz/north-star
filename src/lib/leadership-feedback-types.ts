export type LeadershipReviewInput = {
  programName: string;
  timelineSummary: string;
  progressHighlights: string;
  activeRisks: string;
  leadershipGuidance: string;
  supportRequests: string;
  feedbackToDeliveryLead: string;
};

export type LeadershipReviewRecord = {
  id: string;
  programId: string;
  programName: string;
  createdAt: string;
  updatedAt?: string;
  feedback: LeadershipReviewInput;
};

export type DeliveryLeadershipSignal = {
  status: "none" | "new" | "incorporated";
  summary: string;
  highlights: string[];
  updatedAt?: string;
  sourceFeedbackId?: string;
};
