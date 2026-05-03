import type { AuditEventInput, AuditEventRecord } from "@/lib/audit-event-types";
import type { ManagedAppUser, ManagedAppUserInput } from "@/lib/admin-user-types";
import type { ActiveProgramReview, StoredProgramUpdate } from "@/lib/active-program-types";
import type { AssistantConversationTurn } from "@/lib/assistant-conversation-types";
import type { AssistantServiceResponse } from "@/lib/assistant-types";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import type {
  ClientDecisionRequest,
  ClientDecisionRequestInput,
  GuidanceFeedbackFlag,
  GuidanceJustificationRecord,
  OpenAIUsageRecord,
  OpenAIUsageRecordInput,
  ProgramMeetingInput
} from "@/lib/program-intelligence-types";
import type { ProgramIntake, StoredProgram } from "@/lib/program-intake-types";
import type { RoleArtifactDraft, RoleArtifactType } from "@/lib/role-artifact-types";

export type ProgramRepository = {
  provider: "file" | "postgres";
  listPrograms(): Promise<StoredProgram[]>;
  getProgram(programId: string): Promise<StoredProgram | null>;
  upsertProgram(intake: ProgramIntake): Promise<StoredProgram>;
  listProgramUpdates(programId: string): Promise<StoredProgramUpdate[]>;
  listAllProgramUpdates(): Promise<StoredProgramUpdate[]>;
  createProgramUpdate(programId: string, review: ActiveProgramReview): Promise<StoredProgramUpdate>;
  listAssistantConversations(programId: string): Promise<AssistantConversationTurn[]>;
  createAssistantConversation(programId: string, prompt: string, response: AssistantServiceResponse): Promise<AssistantConversationTurn>;
  getLatestGuidedPlan(programId: string): Promise<GuidedPlan | null>;
  createGuidedPlan(programId: string): Promise<GuidedPlan | null>;
  listLeadershipFeedback(programId: string): Promise<LeadershipReviewRecord[]>;
  listAllLeadershipFeedback(): Promise<LeadershipReviewRecord[]>;
  createLeadershipFeedback(programId: string, feedback: LeadershipReviewInput): Promise<LeadershipReviewRecord>;
  listMeetingInputs(programId: string): Promise<ProgramMeetingInput[]>;
  createMeetingInput(programId: string, input: Omit<ProgramMeetingInput, "id" | "programId" | "programName" | "createdAt" | "updatedAt">): Promise<ProgramMeetingInput>;
  listRoleArtifacts(programId: string, artifactType?: RoleArtifactType): Promise<RoleArtifactDraft[]>;
  createRoleArtifact(programId: string, artifact: RoleArtifactDraft): Promise<RoleArtifactDraft>;
  listClientDecisionRequests(programId: string): Promise<ClientDecisionRequest[]>;
  createClientDecisionRequest(programId: string, input: ClientDecisionRequestInput): Promise<ClientDecisionRequest>;
  listGuidanceJustifications(programId: string): Promise<GuidanceJustificationRecord[]>;
  createGuidanceJustification(record: GuidanceJustificationRecord): Promise<GuidanceJustificationRecord>;
  listGuidanceFeedbackFlags(programId: string): Promise<GuidanceFeedbackFlag[]>;
  createGuidanceFeedbackFlag(programId: string, flag: Omit<GuidanceFeedbackFlag, "id" | "programId" | "programName" | "createdAt" | "updatedAt" | "status">): Promise<GuidanceFeedbackFlag>;
  reviewGuidanceFeedbackFlag(programId: string, flagId: string, review: { status: "approved" | "denied"; reviewedBy: string; leadershipDisposition: string }): Promise<GuidanceFeedbackFlag | null>;
  listOpenAIUsageRecords(programId: string): Promise<OpenAIUsageRecord[]>;
  listAllOpenAIUsageRecords(): Promise<OpenAIUsageRecord[]>;
  createOpenAIUsageRecord(programId: string, usage: OpenAIUsageRecordInput): Promise<OpenAIUsageRecord>;
  listAuditEvents(limit?: number): Promise<AuditEventRecord[]>;
  createAuditEvent(input: AuditEventInput): Promise<AuditEventRecord>;
  listManagedUsers(): Promise<ManagedAppUser[]>;
  upsertManagedUser(input: ManagedAppUserInput): Promise<ManagedAppUser>;
  deleteManagedUser(userId: string): Promise<ManagedAppUser | null>;
};

export type ProgramStoreFile = {
  programs: StoredProgram[];
  updates: StoredProgramUpdate[];
  assistantConversations: AssistantConversationTurn[];
  guidedPlans: GuidedPlan[];
  leadershipFeedbacks: LeadershipReviewRecord[];
  meetingInputs: ProgramMeetingInput[];
  roleArtifacts: RoleArtifactDraft[];
  clientDecisionRequests: ClientDecisionRequest[];
  guidanceJustifications: GuidanceJustificationRecord[];
  guidanceFeedbackFlags: GuidanceFeedbackFlag[];
  openAIUsageRecords: OpenAIUsageRecord[];
  auditEvents: AuditEventRecord[];
  managedUsers: ManagedAppUser[];
};
