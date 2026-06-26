import type {
  DeliveryBoardItem,
  ProgramTimelineMilestone,
  ProgramTimelineScale,
  TeamRoleUpdateStatus
} from "@/lib/active-program-types";

export type ClientPortalDomainUpdate = {
  attachments?: number;
  decisionsOrOutcomes: string;
  owner: string;
  pursuit: string;
  risksOrBlockers: string;
  role: string;
  status: TeamRoleUpdateStatus;
};

export type ClientPortalUpdateInput = {
  activeRisks: string;
  clientStatusNote: string;
  completionDelta?: string;
  createdBy?: string;
  currentPhase: string;
  decisionsPending: string;
  deliveryBoardItems?: DeliveryBoardItem[];
  deliveryHealth: string;
  domainUpdates: ClientPortalDomainUpdate[];
  executiveOverview: string;
  executiveSponsor?: string;
  nextMilestoneDate?: string;
  nextMilestoneName?: string;
  nextMilestonePriority?: string;
  originalNorthStar?: string;
  pmo?: string;
  programCompletionPercent?: string;
  programLead?: string;
  programMilestones?: ProgramTimelineMilestone[];
  programStartDate?: string;
  programTargetFinishDate?: string;
  progressSinceLastReview: string;
  publicationNote?: string;
  supportNeeded?: string;
  timelineMonth?: string;
  timelineScale?: ProgramTimelineScale;
  timelineWeek?: string;
  timelineYear?: string;
  upcomingWork: string;
};

export type ClientPortalUpdateRecord = ClientPortalUpdateInput & {
  createdAt: string;
  id: string;
  programId: string;
  programName: string;
  status: "published";
  updatedAt: string;
};
