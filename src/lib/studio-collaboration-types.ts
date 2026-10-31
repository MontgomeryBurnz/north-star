import type { DiscoverySynthesis, DiscoverySynthesisRequest, DiscoveryTestCase } from "./discovery-studio-types.ts";
import type { ProgramArtifact } from "./program-intake-types.ts";

export type StudioActor = { id: string; name: string; userType: string; credentialStatus: string };
export type StudioProvenance = "server-generated" | "prepared-example" | "imported";
export type StudioReviewStatus = "pending" | "approved" | "changes-requested";
export type StudioReview = { status: StudioReviewStatus; reviewedBy?: string; reviewedAt?: string; note?: string };
export type StudioItemState = { storyId: string; review: StudioReview; assigneeId?: string; assigneeName?: string };
export type StudioRevisionSummary = { id: string; number: number; createdAt: string; provenance: StudioProvenance };
export type StudioGapStatus = "open" | "in-progress" | "resolved";
export type StudioGapState = {
  gapId: string; status: StudioGapStatus; ownerId?: string; ownerName?: string;
  affectedStoryIds: string[]; evidenceSourceIds: string[]; resolution: string;
  updatedAt?: string; updatedBy?: string;
};
export type StudioRefinement = {
  id: string; storyId: string; body: string; evidenceSourceIds: string[];
  status: "draft" | "submitted" | "addressed"; decision: string;
  createdAt: string; createdBy: string; updatedAt: string; updatedBy: string;
};
export type StudioWorkflow = {
  gaps: StudioGapState[]; refinements: StudioRefinement[];
  events: { id: string; targetId: string; actorId: string; at: string; description: string }[];
};
export type StudioRevision = StudioRevisionSummary & {
  title: string; parentRevisionId?: string; createdBy: string; synthesis: DiscoverySynthesis; sources: ProgramArtifact[];
  resolutionNotes: string; selectedOutputs: NonNullable<DiscoverySynthesisRequest["selectedOutputs"]>;
  externalResearch: boolean; researchTopic: string; items: StudioItemState[];
  workflow?: StudioWorkflow;
};
export type StudioShareGrant = {
  id: string; revisionId: string; recipientId: string; storyIds: string[]; sharedContext: string;
  createdAt: string; createdBy: string; recipientLabel?: string; expiresAt?: string; revokedAt?: string;
};
export type StudioComment = {
  id: string; revisionId: string; storyId: string; authorId: string; authorName: string;
  body: string; visibility: "shared" | "internal"; createdAt: string;
};
export type StudioPackageRecord = {
  schemaVersion: 1; id: string; ownerId: string; title: string; version: number; createdAt: string; updatedAt: string;
  headRevisionId: string; revisions: StudioRevision[]; grants: StudioShareGrant[]; comments: StudioComment[];
};
export type StudioCollaborationItem = {
  id: string; title: string; story: string; acceptanceCriteria: string[]; testCases: DiscoveryTestCase[];
  readiness: "ready" | "needs-input"; lane: "development-review" | "refinement";
  review: StudioReview; assigneeId?: string; assigneeName?: string; sourceIds?: string[];
};
export type StudioPackageSummary = {
  id: string; title: string; access: "manage" | "shared"; version: number;
  revisionId: string; revisionNumber: number; updatedAt: string;
};
type StudioViewBase = {
  id: string; title: string; version: number; items: StudioCollaborationItem[]; comments: StudioComment[];
};
export type StudioManagedPackageView = StudioViewBase & {
  access: "manage"; canManage: true; ownerId: string; headRevisionId: string;
  revision: StudioRevision; revisions: StudioRevisionSummary[]; grants: StudioShareGrant[];
};
export type StudioSharedPackageView = StudioViewBase & {
  access: "shared"; canManage: false; revision: StudioRevisionSummary; sharedContext: string[];
};
export type StudioPackageView = StudioManagedPackageView | StudioSharedPackageView;
export type StudioRevisionInput = {
  title: string; synthesis: DiscoverySynthesis; sources: ProgramArtifact[]; resolutionNotes?: string;
  selectedOutputs?: DiscoverySynthesisRequest["selectedOutputs"]; externalResearch?: boolean; researchTopic?: string;
  provenance: StudioProvenance;
};
export type StudioPackageAction =
  | { type: "manage-gap"; revisionId: string; gapId: string; status: StudioGapStatus; ownerId: string | null; affectedStoryIds: string[]; evidenceSourceIds: string[]; resolution: string }
  | { type: "save-refinement"; revisionId: string; storyId: string; refinementId?: string; body: string; evidenceSourceIds: string[] }
  | { type: "refinement-status"; revisionId: string; refinementId: string; status: "submitted" | "addressed" | "draft"; decision: string }
  | { type: "comment"; revisionId: string; storyId: string; body: string; visibility: "shared" | "internal" }
  | { type: "return"; revisionId: string; storyId: string; reason: string }
  | { type: "approve"; revisionId: string; storyId: string; confirmReviewed: boolean }
  | { type: "assign"; revisionId: string; storyId: string; assigneeId: string | null }
  | { type: "share"; revisionId: string; recipientId: string; storyIds: string[]; sharedContext?: string; expiresAt?: string }
  | { type: "revoke"; grantId: string };

export class StudioCollaborationError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) { super(message); this.name = "StudioCollaborationError"; this.status = status; }
}
