import type { ProgramArtifact } from "@/lib/program-intake-types";
import type { ProgramMeetingAttachment } from "@/lib/program-intelligence-types";

export type TeamRoleUpdateStatus = "on-track" | "at-risk" | "blocked";

export type DeliveryBoardStatus = "not-started" | "in-progress" | "needs-review" | "blocked" | "done";
export type ProgramTimelineScale = "year" | "month" | "week";
export type ProgramTimelineMilestoneStatus = "complete" | "current" | "next";

export type ProgramTimelineMilestone = {
  id: string;
  name: string;
  date: string;
  status: ProgramTimelineMilestoneStatus;
  priority?: "High" | "Medium" | "Low";
  note: string;
};

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
  attachments?: ProgramMeetingAttachment[];
  lastUpdatedAt?: string;
};

export type DeliveryBoardItem = {
  id: string;
  role: string;
  sharedRoles: string[];
  title: string;
  description: string;
  owner: string;
  status: DeliveryBoardStatus;
  startDate: string;
  dueDate: string;
  latestNote: string;
  attachments: ProgramMeetingAttachment[];
  createdAt?: string;
  updatedAt?: string;
};

export type ActiveProgramReview = {
  programName: string;
  executiveSponsor?: string;
  programLead?: string;
  pmo?: string;
  originalNorthStar: string;
  currentPhase: string;
  programCompletionPercent?: string;
  completionDelta?: string;
  nextMilestoneName?: string;
  nextMilestoneDate?: string;
  nextMilestonePriority?: string;
  programStartDate?: string;
  programTargetFinishDate?: string;
  clientStatusNote?: string;
  progressSinceLastReview: string;
  planChanges: string;
  activeRisks: string;
  stakeholderTemperature: string;
  decisionsPending: string;
  deliveryHealth: string;
  supportNeeded: string;
  updateCadence?: "weekly" | "biweekly";
  timelineScale?: ProgramTimelineScale;
  timelineYear?: string;
  timelineMonth?: string;
  timelineWeek?: string;
  programMilestones?: ProgramTimelineMilestone[];
  cycleLabel?: string;
  cycleStartedAt?: string;
  programSynthesisNote?: string;
  lastUpdatedRole?: string;
  teamRoleUpdates?: TeamRoleUpdate[];
  deliveryBoardItems?: DeliveryBoardItem[];
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

export type ActiveProgramSaveConfirmation = {
  detail?: string;
  savedAt?: string;
  scope: string;
  status: "error" | "saved" | "saving" | "warning";
} | null;
