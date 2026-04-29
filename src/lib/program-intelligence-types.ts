export type ProgramMeetingSeries = {
  id: string;
  programId: string;
  title: string;
  provider: "teams" | "zoom" | "google-meet" | "manual";
  cadence: "weekly" | "biweekly" | "monthly" | "ad-hoc";
  linkedAt: string;
  notes?: string;
};

export type ProgramMeetingAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  provider: "local" | "blob" | "supabase";
  storageKey: string;
  createdAt: string;
};

export type ProgramMeetingInput = {
  id: string;
  programId: string;
  programName: string;
  title: string;
  sourceType: "recording" | "transcript" | "meeting-notes";
  sourceProvider: "upload" | "linked-series" | "manual";
  meetingSeriesId?: string;
  capturedAt: string;
  summary: string;
  transcriptExcerpt?: string;
  attachments: ProgramMeetingAttachment[];
  recommendedPlanAdjustments: string[];
  extractedSignals: string[];
  justificationStatus: "no-change" | "plan-refresh-recommended" | "plan-refreshed";
  createdAt: string;
  updatedAt: string;
};

export type GuidanceCitation = {
  sourceType: "artifact" | "active-update" | "leadership-feedback" | "assistant-dialogue" | "meeting-input";
  sourceId: string;
  label: string;
  rationale: string;
};

export type GuidanceJustificationRecord = {
  id: string;
  programId: string;
  programName: string;
  guidedPlanId: string;
  summary: string;
  triggeredBy: Array<"artifact" | "active-update" | "leadership-feedback" | "assistant-dialogue" | "meeting-input">;
  citations: GuidanceCitation[];
  createdAt: string;
};

export type GuidanceFeedbackFlagTargetType = "source-citation" | "whole-rationale" | "team-action-plan";

export type GuidanceFeedbackFlag = {
  id: string;
  programId: string;
  programName: string;
  guidanceJustificationId: string;
  citationId?: string;
  targetType?: GuidanceFeedbackFlagTargetType;
  targetLabel?: string;
  targetRole?: string;
  status: "pending" | "approved" | "denied";
  scope: "partial" | "whole";
  userReason: string;
  userContext: string;
  leadershipDisposition?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
};
