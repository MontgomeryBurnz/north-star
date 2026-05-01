import "server-only";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Pool } from "pg";
import type { ManagedAppUser, ManagedAppUserInput } from "@/lib/admin-user-types";
import { buildManagedAppUserRecord } from "@/lib/admin-user-service";
import type { ActiveProgramReview, StoredProgramUpdate } from "@/lib/active-program-types";
import type { AssistantConversationTurn } from "@/lib/assistant-conversation-types";
import type { AssistantServiceResponse } from "@/lib/assistant-types";
import { generateGuidedPlan } from "@/lib/guided-plan-service";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import { enhanceLeadershipFeedback } from "@/lib/leadership-feedback-service";
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

type ProgramRepository = {
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
  listManagedUsers(): Promise<ManagedAppUser[]>;
  upsertManagedUser(input: ManagedAppUserInput): Promise<ManagedAppUser>;
  deleteManagedUser(userId: string): Promise<ManagedAppUser | null>;
};

type ProgramStoreFile = {
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
  managedUsers: ManagedAppUser[];
};

const emptyFileStore: ProgramStoreFile = {
  programs: [],
  updates: [],
  assistantConversations: [],
  guidedPlans: [],
  leadershipFeedbacks: [],
  meetingInputs: [],
  roleArtifacts: [],
  clientDecisionRequests: [],
  guidanceJustifications: [],
  guidanceFeedbackFlags: [],
  openAIUsageRecords: [],
  managedUsers: []
};

function buildGuidanceJustificationRecord(input: {
  programId: string;
  programName: string;
  program: StoredProgram;
  plan: GuidedPlan;
  updates: StoredProgramUpdate[];
  leadershipFeedbacks: LeadershipReviewRecord[];
  assistantConversations: AssistantConversationTurn[];
  meetingInputs: ProgramMeetingInput[];
}): GuidanceJustificationRecord {
  const latestUpdate = input.updates[0];
  const latestLeadership = input.leadershipFeedbacks[0];
  const latestAssistant = input.assistantConversations[0];
  const latestMeetingInput = input.meetingInputs[0];
  const artifactsById = new Map(input.program.intake.artifacts.map((artifact) => [artifact.id, artifact]));
  const citations: GuidanceJustificationRecord["citations"] = [];
  const triggeredBy: GuidanceJustificationRecord["triggeredBy"] = [];

  for (const recordId of input.plan.sourceRecordIds) {
    const artifact = artifactsById.get(recordId);
    if (artifact) {
      triggeredBy.push("artifact");
      citations.push({
        sourceType: "artifact",
        sourceId: recordId,
        label: artifact.name,
        rationale:
          input.plan.sourceInputs.items.find((item) => item.includes(artifact.name)) ??
          artifact.extractedText?.trim()?.slice(0, 180) ??
          "Uploaded artifact evidence shaped this plan."
      });
    }
  }

  if (latestUpdate) {
    triggeredBy.push("active-update");
    citations.push({
      sourceType: "active-update",
      sourceId: latestUpdate.id,
      label: "Latest active-program update",
      rationale: input.plan.sourceInputs.items.find((item) => item.startsWith("Active-program update")) ?? "Current active-program update influenced this plan."
    });
  }

  if (latestLeadership) {
    triggeredBy.push("leadership-feedback");
    citations.push({
      sourceType: "leadership-feedback",
      sourceId: latestLeadership.id,
      label: "Leadership feedback",
      rationale:
        input.plan.leadershipChanges.items[0] ??
        input.plan.sourceInputs.items.find((item) => item.startsWith("Leadership feedback")) ??
        "Leadership feedback adjusted the plan."
    });
  }

  if (latestAssistant) {
    triggeredBy.push("assistant-dialogue");
    citations.push({
      sourceType: "assistant-dialogue",
      sourceId: latestAssistant.id,
      label: "Guide dialogue",
      rationale:
        input.plan.assistantDialogue.items[1] ??
        "Guide dialogue added operator context that shaped the refreshed plan."
    });
  }

  if (latestMeetingInput) {
    triggeredBy.push("meeting-input");
    citations.push({
      sourceType: "meeting-input",
      sourceId: latestMeetingInput.id,
      label: latestMeetingInput.title,
      rationale:
        latestMeetingInput.recommendedPlanAdjustments[0] ??
        latestMeetingInput.extractedSignals[0] ??
        latestMeetingInput.summary
    });
  }

  return {
    id: randomUUID(),
    programId: input.programId,
    programName: input.programName,
    guidedPlanId: input.plan.id,
    summary: `Guidance refreshed for ${input.programName} using the latest grounded program inputs.`,
    triggeredBy: Array.from(new Set(triggeredBy)),
    citations,
    createdAt: input.plan.createdAt
  };
}

const storeDirectory = path.join(process.cwd(), ".data");
const storePath = path.join(storeDirectory, "work-path-store.json");

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function sortByUpdatedDesc<T extends { updatedAt?: string; createdAt?: string }>(records: T[]) {
  return [...records].sort((a, b) => {
    const aValue = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bValue = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bValue - aValue;
  });
}

function sortRoleArtifactsDesc(records: RoleArtifactDraft[]) {
  return [...records].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
}

function nextRoleArtifactVersion(records: RoleArtifactDraft[]) {
  return records.reduce((highest, artifact) => Math.max(highest, artifact.version ?? 0), 0) + 1;
}

function buildRoleArtifactRecord(input: {
  artifact: RoleArtifactDraft;
  programId: string;
  programName: string;
  version: number;
}): RoleArtifactDraft {
  return {
    ...input.artifact,
    id: input.artifact.id || randomUUID(),
    programId: input.programId,
    programName: input.programName,
    version: input.version,
    feedback: input.artifact.feedback?.trim() || undefined,
    generatedAt: input.artifact.generatedAt || new Date().toISOString()
  };
}

function normalizeLeadershipInput(feedback: LeadershipReviewInput): LeadershipReviewInput {
  return {
    programName: feedback.programName.trim(),
    timelineSummary: feedback.timelineSummary.trim(),
    progressHighlights: feedback.progressHighlights.trim(),
    activeRisks: feedback.activeRisks.trim(),
    leadershipGuidance: feedback.leadershipGuidance.trim(),
    supportRequests: feedback.supportRequests.trim(),
    feedbackToDeliveryLead: feedback.feedbackToDeliveryLead.trim()
  };
}

function leadershipFeedbacksMatch(a: LeadershipReviewInput, b: LeadershipReviewInput) {
  const left = normalizeLeadershipInput(a);
  const right = normalizeLeadershipInput(b);

  return (
    left.programName === right.programName &&
    left.timelineSummary === right.timelineSummary &&
    left.progressHighlights === right.progressHighlights &&
    left.activeRisks === right.activeRisks &&
    left.leadershipGuidance === right.leadershipGuidance &&
    left.supportRequests === right.supportRequests &&
    left.feedbackToDeliveryLead === right.feedbackToDeliveryLead
  );
}

function dedupeLeadershipFeedbacks(records: LeadershipReviewRecord[]) {
  const seen = new Set<string>();
  const deduped: LeadershipReviewRecord[] = [];

  for (const record of sortByUpdatedDesc(records)) {
    const normalized = normalizeLeadershipInput(record.feedback);
    const key = JSON.stringify(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(record);
  }

  return deduped;
}

function dedupeLeadershipFeedbacksByProgram(records: LeadershipReviewRecord[]) {
  const grouped = new Map<string, LeadershipReviewRecord[]>();

  for (const record of records) {
    const current = grouped.get(record.programId);
    if (current) {
      current.push(record);
    } else {
      grouped.set(record.programId, [record]);
    }
  }

  return sortByUpdatedDesc(
    Array.from(grouped.values()).flatMap((group) => dedupeLeadershipFeedbacks(group))
  );
}

function buildOpenAIUsageRecord(input: {
  programId: string;
  programName: string;
  usage: OpenAIUsageRecordInput;
  createdAt?: string;
}): OpenAIUsageRecord {
  return {
    id: randomUUID(),
    programId: input.programId,
    programName: input.programName,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...input.usage
  };
}

async function ensureFileStore() {
  await mkdir(storeDirectory, { recursive: true });
}

async function readFileStore(): Promise<ProgramStoreFile> {
  await ensureFileStore();

  try {
    const raw = await readFile(storePath, "utf8");
    return { ...emptyFileStore, ...JSON.parse(raw) };
  } catch {
    await writeFileStore(emptyFileStore);
    return emptyFileStore;
  }
}

async function writeFileStore(store: ProgramStoreFile) {
  await ensureFileStore();
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

const fileRepository: ProgramRepository = {
  provider: "file",
  async listPrograms() {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.programs);
  },
  async getProgram(programId) {
    const store = await readFileStore();
    return store.programs.find((program) => program.id === programId) ?? null;
  },
  async upsertProgram(intake) {
    const store = await readFileStore();
    const now = new Date().toISOString();
    const nameSlug = slugify(intake.programName);
    const existing = store.programs.find((program) => slugify(program.intake.programName) === nameSlug && nameSlug);

    if (existing) {
      const updatedProgram: StoredProgram = {
        ...existing,
        updatedAt: now,
        intake
      };
      store.programs = store.programs.map((program) => (program.id === existing.id ? updatedProgram : program));
      await writeFileStore(store);
      return updatedProgram;
    }

    const program: StoredProgram = {
      id: nameSlug || randomUUID(),
      createdAt: now,
      updatedAt: now,
      intake
    };

    store.programs = [program, ...store.programs];
    await writeFileStore(store);
    return program;
  },
  async listProgramUpdates(programId) {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.updates.filter((update) => update.programId === programId));
  },
  async listAllProgramUpdates() {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.updates);
  },
  async createProgramUpdate(programId, review) {
    const store = await readFileStore();
    const now = new Date().toISOString();
    const program = store.programs.find((item) => item.id === programId);
    const programName = review.programName || program?.intake.programName || "Untitled active program";

    const update: StoredProgramUpdate = {
      id: randomUUID(),
      programId,
      programName,
      createdAt: now,
      updatedAt: now,
      review: {
        ...review,
        programName
      }
    };

    store.updates = [update, ...store.updates];
    store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
    await writeFileStore(store);
    return update;
  },
  async listAssistantConversations(programId) {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.assistantConversations.filter((conversation) => conversation.programId === programId));
  },
  async createAssistantConversation(programId, prompt, response) {
    const store = await readFileStore();
    const now = new Date().toISOString();
    const program = store.programs.find((item) => item.id === programId);
    const record: AssistantConversationTurn = {
      id: randomUUID(),
      programId,
      programName: program?.intake.programName || "Untitled program",
      prompt,
      response,
      createdAt: now,
      updatedAt: now
    };

    store.assistantConversations = [record, ...store.assistantConversations];
    if (response.debug.modelProfile?.usage) {
      store.openAIUsageRecords = [
        buildOpenAIUsageRecord({
          programId,
          programName: record.programName,
          usage: { ...response.debug.modelProfile.usage, sourceId: record.id },
          createdAt: now
        }),
        ...store.openAIUsageRecords
      ];
    }
    store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
    await writeFileStore(store);
    return record;
  },
  async getLatestGuidedPlan(programId) {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.guidedPlans.filter((plan) => plan.programId === programId))[0] ?? null;
  },
  async createGuidedPlan(programId) {
    const store = await readFileStore();
    const program = store.programs.find((item) => item.id === programId);
    if (!program) return null;

    const updates = sortByUpdatedDesc(store.updates.filter((update) => update.programId === programId));
    const leadershipFeedbacks = sortByUpdatedDesc(
      store.leadershipFeedbacks.filter((feedback) => feedback.programId === programId)
    );
    const assistantConversations = sortByUpdatedDesc(
      store.assistantConversations.filter((conversation) => conversation.programId === programId)
    );
    const meetingInputs = sortByUpdatedDesc(store.meetingInputs.filter((input) => input.programId === programId)).map(
      normalizeMeetingInput
    );
    const plan = await generateGuidedPlan({ program, updates, leadershipFeedbacks, assistantConversations, meetingInputs });

    store.guidedPlans = [plan, ...store.guidedPlans];
    if (plan.modelUsage) {
      store.openAIUsageRecords = [
        buildOpenAIUsageRecord({
          programId,
          programName: plan.programName,
          usage: { ...plan.modelUsage, sourceId: plan.id },
          createdAt: plan.createdAt
        }),
        ...store.openAIUsageRecords
      ];
    }
    const justification = buildGuidanceJustificationRecord({
      programId,
      programName: plan.programName,
      program,
      plan,
      updates,
      leadershipFeedbacks,
      assistantConversations,
      meetingInputs
    });
    store.guidanceJustifications = [justification, ...store.guidanceJustifications];
    await writeFileStore(store);
    return plan;
  },
  async listLeadershipFeedback(programId) {
    const store = await readFileStore();
    return dedupeLeadershipFeedbacks(store.leadershipFeedbacks.filter((feedback) => feedback.programId === programId));
  },
  async listAllLeadershipFeedback() {
    const store = await readFileStore();
    return dedupeLeadershipFeedbacksByProgram(store.leadershipFeedbacks);
  },
  async createLeadershipFeedback(programId, feedback) {
    const store = await readFileStore();
    const now = new Date().toISOString();
    const program = store.programs.find((item) => item.id === programId);
    const normalizedFeedback = normalizeLeadershipInput({
      ...feedback,
      programName: feedback.programName || program?.intake.programName || "Untitled program"
    });
    const existingLatest = sortByUpdatedDesc(
      store.leadershipFeedbacks.filter((item) => item.programId === programId)
    )[0];

    if (existingLatest && leadershipFeedbacksMatch(existingLatest.feedback, normalizedFeedback)) {
      return existingLatest;
    }

    const interpretation = await enhanceLeadershipFeedback(normalizedFeedback, { programId });

    const record: LeadershipReviewRecord = {
      id: randomUUID(),
      programId,
      programName: normalizedFeedback.programName,
      createdAt: now,
      updatedAt: now,
      feedback: normalizedFeedback,
      interpretation
    };

    store.leadershipFeedbacks = [record, ...store.leadershipFeedbacks];
    if (interpretation.modelUsage) {
      store.openAIUsageRecords = [
        buildOpenAIUsageRecord({
          programId,
          programName: record.programName,
          usage: { ...interpretation.modelUsage, sourceId: record.id },
          createdAt: now
        }),
        ...store.openAIUsageRecords
      ];
    }
    store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
    await writeFileStore(store);
    return record;
  },
  async listMeetingInputs(programId) {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.meetingInputs.filter((input) => input.programId === programId)).map(normalizeMeetingInput);
  },
  async createMeetingInput(programId, input) {
    const store = await readFileStore();
    const now = new Date().toISOString();
    const program = store.programs.find((item) => item.id === programId);
    const record: ProgramMeetingInput = {
      id: randomUUID(),
      programId,
      programName: program?.intake.programName || "Untitled program",
      createdAt: now,
      updatedAt: now,
      ...input,
      attachments: input.attachments ?? []
    };

    store.meetingInputs = [record, ...store.meetingInputs];
    store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
    await writeFileStore(store);
    return record;
  },
  async listRoleArtifacts(programId, artifactType) {
    const store = await readFileStore();
    const records = store.roleArtifacts.filter(
      (artifact) => artifact.programId === programId && (!artifactType || artifact.artifactType === artifactType)
    );
    return sortRoleArtifactsDesc(records);
  },
  async createRoleArtifact(programId, artifact) {
    const store = await readFileStore();
    const now = new Date().toISOString();
    const program = store.programs.find((item) => item.id === programId);
    const programName = program?.intake.programName || artifact.programName || "Untitled program";
    const existing = store.roleArtifacts.filter(
      (record) => record.programId === programId && record.artifactType === artifact.artifactType
    );
    const record = buildRoleArtifactRecord({
      artifact: {
        ...artifact,
        generatedAt: artifact.generatedAt || now
      },
      programId,
      programName,
      version: nextRoleArtifactVersion(existing)
    });

    store.roleArtifacts = [record, ...store.roleArtifacts];
    store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
    await writeFileStore(store);
    return record;
  },
  async listClientDecisionRequests(programId) {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.clientDecisionRequests.filter((request) => request.programId === programId));
  },
  async createClientDecisionRequest(programId, input) {
    const store = await readFileStore();
    const now = new Date().toISOString();
    const program = store.programs.find((item) => item.id === programId);
    const record: ClientDecisionRequest = {
      id: randomUUID(),
      programId,
      programName: program?.intake.programName || "Untitled program",
      decisionText: input.decisionText.trim(),
      requestedBy: input.requestedBy?.trim() || undefined,
      status: "open",
      createdAt: now,
      updatedAt: now
    };

    store.clientDecisionRequests = [record, ...store.clientDecisionRequests];
    store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
    await writeFileStore(store);
    return record;
  },
  async listGuidanceJustifications(programId) {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.guidanceJustifications.filter((record) => record.programId === programId));
  },
  async createGuidanceJustification(record) {
    const store = await readFileStore();
    store.guidanceJustifications = [record, ...store.guidanceJustifications];
    await writeFileStore(store);
    return record;
  },
  async listGuidanceFeedbackFlags(programId) {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.guidanceFeedbackFlags.filter((record) => record.programId === programId));
  },
  async createGuidanceFeedbackFlag(programId, flag) {
    const store = await readFileStore();
    const now = new Date().toISOString();
    const program = store.programs.find((item) => item.id === programId);
    const record: GuidanceFeedbackFlag = {
      id: randomUUID(),
      programId,
      programName: program?.intake.programName || "Untitled program",
      status: "pending",
      createdAt: now,
      updatedAt: now,
      ...flag
    };

    store.guidanceFeedbackFlags = [record, ...store.guidanceFeedbackFlags];
    await writeFileStore(store);
    return record;
  },
  async reviewGuidanceFeedbackFlag(programId, flagId, review) {
    const store = await readFileStore();
    const existing = store.guidanceFeedbackFlags.find((record) => record.programId === programId && record.id === flagId);
    if (!existing) return null;

    const updated: GuidanceFeedbackFlag = {
      ...existing,
      ...review,
      updatedAt: new Date().toISOString()
    };

    store.guidanceFeedbackFlags = store.guidanceFeedbackFlags.map((record) => (record.id === flagId ? updated : record));
    await writeFileStore(store);
    return updated;
  },
  async listOpenAIUsageRecords(programId) {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.openAIUsageRecords.filter((record) => record.programId === programId));
  },
  async listAllOpenAIUsageRecords() {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.openAIUsageRecords);
  },
  async createOpenAIUsageRecord(programId, usage) {
    const store = await readFileStore();
    const program = store.programs.find((item) => item.id === programId);
    const record = buildOpenAIUsageRecord({
      programId,
      programName: program?.intake.programName || "Untitled program",
      usage
    });
    store.openAIUsageRecords = [record, ...store.openAIUsageRecords];
    await writeFileStore(store);
    return record;
  },
  async listManagedUsers() {
    const store = await readFileStore();
    return sortByUpdatedDesc(store.managedUsers);
  },
  async upsertManagedUser(input) {
    const store = await readFileStore();
    const email = input.email?.trim().toLowerCase();
    const existing = store.managedUsers.find((user) => user.id === input.id || (email && user.email === email));
    const result = buildManagedAppUserRecord({
      existing,
      idFactory: randomUUID,
      input,
      now: new Date().toISOString(),
      programs: store.programs
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    store.managedUsers = [result.record, ...store.managedUsers.filter((user) => user.id !== result.record.id)];
    await writeFileStore(store);
    return result.record;
  },
  async deleteManagedUser(userId) {
    const store = await readFileStore();
    const user = store.managedUsers.find((item) => item.id === userId) ?? null;

    if (!user) {
      return null;
    }

    store.managedUsers = store.managedUsers.filter((item) => item.id !== userId);
    await writeFileStore(store);
    return user;
  }
};

let pool: Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

async function ensurePostgresSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const client = await getPool().connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS programs (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            intake JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS program_updates (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            program_name TEXT NOT NULL,
            review JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS guided_plans (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            program_name TEXT NOT NULL,
            plan JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS leadership_feedback (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            program_name TEXT NOT NULL,
            feedback JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS assistant_conversations (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            program_name TEXT NOT NULL,
            prompt TEXT NOT NULL,
            response JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS artifacts (
            id TEXT PRIMARY KEY,
            program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
            file_name TEXT NOT NULL,
            mime_type TEXT,
            size_bytes BIGINT NOT NULL,
            storage_provider TEXT NOT NULL,
            storage_key TEXT NOT NULL,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            extraction JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS meeting_inputs (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            program_name TEXT NOT NULL,
            title TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_provider TEXT NOT NULL,
            meeting_series_id TEXT,
            captured_at TIMESTAMPTZ NOT NULL,
            input JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS role_artifacts (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            program_name TEXT NOT NULL,
            artifact_type TEXT NOT NULL,
            version INTEGER NOT NULL,
            record JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS client_decision_requests (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            program_name TEXT NOT NULL,
            decision_text TEXT NOT NULL,
            status TEXT NOT NULL,
            record JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS guidance_justifications (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            program_name TEXT NOT NULL,
            guided_plan_id TEXT NOT NULL,
            record JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS guidance_feedback_flags (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            program_name TEXT NOT NULL,
            guidance_justification_id TEXT NOT NULL,
            record JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS openai_usage_records (
            id TEXT PRIMARY KEY,
            program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
            program_name TEXT NOT NULL,
            workflow TEXT NOT NULL,
            source_id TEXT,
            record JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS managed_users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            user_type TEXT NOT NULL,
            credential_status TEXT NOT NULL,
            record JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_program_updates_program_id_created_at
            ON program_updates(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_guided_plans_program_id_created_at
            ON guided_plans(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_leadership_feedback_program_id_created_at
            ON leadership_feedback(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_assistant_conversations_program_id_created_at
            ON assistant_conversations(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_artifacts_program_id_created_at
            ON artifacts(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_meeting_inputs_program_id_created_at
            ON meeting_inputs(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_role_artifacts_program_id_created_at
            ON role_artifacts(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_role_artifacts_program_id_type_created_at
            ON role_artifacts(program_id, artifact_type, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_client_decision_requests_program_id_created_at
            ON client_decision_requests(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_guidance_justifications_program_id_created_at
            ON guidance_justifications(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_guidance_feedback_flags_program_id_created_at
            ON guidance_feedback_flags(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_guidance_feedback_flags_justification_id_created_at
            ON guidance_feedback_flags(guidance_justification_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_openai_usage_records_program_id_created_at
            ON openai_usage_records(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_openai_usage_records_program_id_workflow_created_at
            ON openai_usage_records(program_id, workflow, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_managed_users_updated_at
            ON managed_users(updated_at DESC);

          DO $$
          DECLARE
            app_table_name TEXT;
            exposed_role_name TEXT;
            app_table_names TEXT[] := ARRAY[
              'programs',
              'program_updates',
              'guided_plans',
              'leadership_feedback',
              'assistant_conversations',
              'artifacts',
              'meeting_inputs',
              'role_artifacts',
              'client_decision_requests',
              'guidance_justifications',
              'guidance_feedback_flags',
              'openai_usage_records',
              'managed_users'
            ];
            exposed_role_names TEXT[] := ARRAY['anon', 'authenticated'];
          BEGIN
            FOREACH app_table_name IN ARRAY app_table_names LOOP
              EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', app_table_name);
            END LOOP;

            FOREACH exposed_role_name IN ARRAY exposed_role_names LOOP
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = exposed_role_name) THEN
                FOREACH app_table_name IN ARRAY app_table_names LOOP
                  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', app_table_name, exposed_role_name);
                END LOOP;

                EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', exposed_role_name);
                EXECUTE format(
                  'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
                  exposed_role_name
                );
                EXECUTE format(
                  'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',
                  exposed_role_name
                );
              END IF;
            END LOOP;
          END $$;
        `);
      } finally {
        client.release();
      }
    })();
  }

  return schemaReadyPromise;
}

function mapProgramRow(row: { id: string; intake: ProgramIntake; created_at: Date; updated_at: Date }): StoredProgram {
  return {
    id: row.id,
    intake: row.intake,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapUpdateRow(row: {
  id: string;
  program_id: string;
  program_name: string;
  review: ActiveProgramReview;
  created_at: Date;
  updated_at: Date;
}): StoredProgramUpdate {
  return {
    id: row.id,
    programId: row.program_id,
    programName: row.program_name,
    review: row.review,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapPlanRow(row: { plan: GuidedPlan }): GuidedPlan {
  return row.plan;
}

function mapAssistantConversationRow(row: {
  id: string;
  program_id: string;
  program_name: string;
  prompt: string;
  response: AssistantServiceResponse;
  created_at: Date;
  updated_at: Date;
}): AssistantConversationTurn {
  return {
    id: row.id,
    programId: row.program_id,
    programName: row.program_name,
    prompt: row.prompt,
    response: row.response,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapLeadershipRow(row: {
  id: string;
  program_id: string;
  program_name: string;
  feedback: LeadershipReviewInput | LeadershipReviewRecord;
  created_at: Date;
  updated_at: Date;
}): LeadershipReviewRecord {
  const payload = row.feedback as LeadershipReviewInput | LeadershipReviewRecord;
  const normalizedFeedback = "feedback" in payload ? payload.feedback : payload;
  const interpretation = "interpretation" in payload ? payload.interpretation : undefined;

  return {
    id: row.id,
    programId: row.program_id,
    programName: row.program_name,
    feedback: normalizedFeedback,
    interpretation,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function normalizeMeetingInput(input: ProgramMeetingInput): ProgramMeetingInput {
  return {
    ...input,
    attachments: Array.isArray(input.attachments) ? input.attachments : []
  };
}

function mapMeetingInputRow(row: { input: ProgramMeetingInput }): ProgramMeetingInput {
  return normalizeMeetingInput(row.input);
}

function mapRoleArtifactRow(row: { record: RoleArtifactDraft }): RoleArtifactDraft {
  return row.record;
}

function mapClientDecisionRequestRow(row: { record: ClientDecisionRequest }): ClientDecisionRequest {
  return row.record;
}

function mapGuidanceJustificationRow(row: { record: GuidanceJustificationRecord }): GuidanceJustificationRecord {
  return row.record;
}

function mapGuidanceFeedbackFlagRow(row: { record: GuidanceFeedbackFlag }): GuidanceFeedbackFlag {
  return row.record;
}

function mapOpenAIUsageRecordRow(row: { record: OpenAIUsageRecord }): OpenAIUsageRecord {
  return row.record;
}

function mapManagedUserRow(row: { record: ManagedAppUser }): ManagedAppUser {
  return row.record;
}

const postgresRepository: ProgramRepository = {
  provider: "postgres",
  async listPrograms() {
    await ensurePostgresSchema();
    const result = await getPool().query("SELECT id, intake, created_at, updated_at FROM programs ORDER BY updated_at DESC");
    return result.rows.map(mapProgramRow);
  },
  async getProgram(programId) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      "SELECT id, intake, created_at, updated_at FROM programs WHERE id = $1 LIMIT 1",
      [programId]
    );
    return result.rows[0] ? mapProgramRow(result.rows[0]) : null;
  },
  async upsertProgram(intake) {
    await ensurePostgresSchema();
    const now = new Date();
    const slug = slugify(intake.programName) || randomUUID();
    const existing = await getPool().query("SELECT id, created_at FROM programs WHERE slug = $1 LIMIT 1", [slug]);

    if (existing.rows[0]) {
      const id = existing.rows[0].id as string;
      await getPool().query(
        `
          UPDATE programs
          SET name = $2, intake = $3::jsonb, updated_at = $4
          WHERE id = $1
        `,
        [id, intake.programName, JSON.stringify(intake), now]
      );
      return {
        id,
        intake,
        createdAt: new Date(existing.rows[0].created_at).toISOString(),
        updatedAt: now.toISOString()
      };
    }

    const id = slug;
    await getPool().query(
      `
        INSERT INTO programs (id, slug, name, intake, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $5)
      `,
      [id, slug, intake.programName, JSON.stringify(intake), now]
    );

    return {
      id,
      intake,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  },
  async listProgramUpdates(programId) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT id, program_id, program_name, review, created_at, updated_at
        FROM program_updates
        WHERE program_id = $1
        ORDER BY created_at DESC
      `,
      [programId]
    );
    return result.rows.map(mapUpdateRow);
  },
  async listAllProgramUpdates() {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT id, program_id, program_name, review, created_at, updated_at
        FROM program_updates
        ORDER BY created_at DESC
      `
    );
    return result.rows.map(mapUpdateRow);
  },
  async createProgramUpdate(programId, review) {
    await ensurePostgresSchema();
    const now = new Date();
    const program = await this.getProgram(programId);
    const programName = review.programName || program?.intake.programName || "Untitled active program";
    const update: StoredProgramUpdate = {
      id: randomUUID(),
      programId,
      programName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      review: {
        ...review,
        programName
      }
    };

    await getPool().query(
      `
        INSERT INTO program_updates (id, program_id, program_name, review, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $5)
      `,
      [update.id, programId, programName, JSON.stringify(update.review), now]
    );
    await getPool().query("UPDATE programs SET updated_at = $2 WHERE id = $1", [programId, now]);
    return update;
  },
  async listAssistantConversations(programId) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT id, program_id, program_name, prompt, response, created_at, updated_at
        FROM assistant_conversations
        WHERE program_id = $1
        ORDER BY created_at DESC
      `,
      [programId]
    );
    return result.rows.map(mapAssistantConversationRow);
  },
  async createAssistantConversation(programId, prompt, response) {
    await ensurePostgresSchema();
    const now = new Date();
    const program = await this.getProgram(programId);
    const record: AssistantConversationTurn = {
      id: randomUUID(),
      programId,
      programName: program?.intake.programName || "Untitled program",
      prompt,
      response,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await getPool().query(
      `
        INSERT INTO assistant_conversations (id, program_id, program_name, prompt, response, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $6)
      `,
      [record.id, programId, record.programName, prompt, JSON.stringify(response), now]
    );
    if (response.debug.modelProfile?.usage) {
      await this.createOpenAIUsageRecord(programId, { ...response.debug.modelProfile.usage, sourceId: record.id });
    }
    await getPool().query("UPDATE programs SET updated_at = $2 WHERE id = $1", [programId, now]);
    return record;
  },
  async getLatestGuidedPlan(programId) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT plan
        FROM guided_plans
        WHERE program_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [programId]
    );
    return result.rows[0] ? mapPlanRow(result.rows[0]) : null;
  },
  async createGuidedPlan(programId) {
    await ensurePostgresSchema();
    const program = await this.getProgram(programId);
    if (!program) return null;

    const updates = await this.listProgramUpdates(programId);
    const leadershipFeedbacks = await this.listLeadershipFeedback(programId);
    const assistantConversations = await this.listAssistantConversations(programId);
    const meetingInputs = await this.listMeetingInputs(programId);
    const plan = await generateGuidedPlan({ program, updates, leadershipFeedbacks, assistantConversations, meetingInputs });

    await getPool().query(
      `
        INSERT INTO guided_plans (id, program_id, program_name, plan, created_at)
        VALUES ($1, $2, $3, $4::jsonb, $5)
      `,
      [plan.id, programId, plan.programName, JSON.stringify(plan), new Date(plan.createdAt)]
    );
    if (plan.modelUsage) {
      await this.createOpenAIUsageRecord(programId, { ...plan.modelUsage, sourceId: plan.id });
    }
    const justification = buildGuidanceJustificationRecord({
      programId,
      programName: plan.programName,
      program,
      plan,
      updates,
      leadershipFeedbacks,
      assistantConversations,
      meetingInputs
    });
    await this.createGuidanceJustification(justification);
    return plan;
  },
  async listLeadershipFeedback(programId) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT id, program_id, program_name, feedback, created_at, updated_at
        FROM leadership_feedback
        WHERE program_id = $1
        ORDER BY created_at DESC
      `,
      [programId]
    );
    return dedupeLeadershipFeedbacks(result.rows.map(mapLeadershipRow));
  },
  async listAllLeadershipFeedback() {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT id, program_id, program_name, feedback, created_at, updated_at
        FROM leadership_feedback
        ORDER BY created_at DESC
      `
    );
    return dedupeLeadershipFeedbacksByProgram(result.rows.map(mapLeadershipRow));
  },
  async createLeadershipFeedback(programId, feedback) {
    await ensurePostgresSchema();
    const now = new Date();
    const program = await this.getProgram(programId);
    const normalizedFeedback = normalizeLeadershipInput({
      ...feedback,
      programName: feedback.programName || program?.intake.programName || "Untitled program"
    });
    const latestExisting = await this.listLeadershipFeedback(programId);
    if (latestExisting[0] && leadershipFeedbacksMatch(latestExisting[0].feedback, normalizedFeedback)) {
      return latestExisting[0];
    }

    const interpretation = await enhanceLeadershipFeedback(normalizedFeedback, { programId });
    const record: LeadershipReviewRecord = {
      id: randomUUID(),
      programId,
      programName: normalizedFeedback.programName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      feedback: normalizedFeedback,
      interpretation
    };

    await getPool().query(
      `
        INSERT INTO leadership_feedback (id, program_id, program_name, feedback, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $5)
      `,
      [record.id, programId, record.programName, JSON.stringify(record), now]
    );
    if (interpretation.modelUsage) {
      await this.createOpenAIUsageRecord(programId, { ...interpretation.modelUsage, sourceId: record.id });
    }
    await getPool().query("UPDATE programs SET updated_at = $2 WHERE id = $1", [programId, now]);
    return record;
  },
  async listMeetingInputs(programId) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT input
        FROM meeting_inputs
        WHERE program_id = $1
        ORDER BY created_at DESC
      `,
      [programId]
    );
    return result.rows.map(mapMeetingInputRow);
  },
  async createMeetingInput(programId, input) {
    await ensurePostgresSchema();
    const now = new Date();
    const program = await this.getProgram(programId);
    const record: ProgramMeetingInput = {
      id: randomUUID(),
      programId,
      programName: program?.intake.programName || "Untitled program",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...input,
      attachments: input.attachments ?? []
    };

    await getPool().query(
      `
        INSERT INTO meeting_inputs (
          id, program_id, program_name, title, source_type, source_provider, meeting_series_id, captured_at, input, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $10)
      `,
      [
        record.id,
        programId,
        record.programName,
        record.title,
        record.sourceType,
        record.sourceProvider,
        record.meetingSeriesId ?? null,
        new Date(record.capturedAt),
        JSON.stringify(record),
        now
      ]
    );
    await getPool().query("UPDATE programs SET updated_at = $2 WHERE id = $1", [programId, now]);
    return record;
  },
  async listRoleArtifacts(programId, artifactType) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT record
        FROM role_artifacts
        WHERE program_id = $1
          AND ($2::text IS NULL OR artifact_type = $2)
        ORDER BY created_at DESC
      `,
      [programId, artifactType ?? null]
    );
    return result.rows.map(mapRoleArtifactRow);
  },
  async createRoleArtifact(programId, artifact) {
    await ensurePostgresSchema();
    const now = new Date();
    const program = await this.getProgram(programId);
    const programName = program?.intake.programName || artifact.programName || "Untitled program";
    const existing = await this.listRoleArtifacts(programId, artifact.artifactType);
    const record = buildRoleArtifactRecord({
      artifact: {
        ...artifact,
        generatedAt: artifact.generatedAt || now.toISOString()
      },
      programId,
      programName,
      version: nextRoleArtifactVersion(existing)
    });

    await getPool().query(
      `
        INSERT INTO role_artifacts (id, program_id, program_name, artifact_type, version, record, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $7)
      `,
      [record.id, programId, record.programName, record.artifactType, record.version, JSON.stringify(record), now]
    );
    await getPool().query("UPDATE programs SET updated_at = $2 WHERE id = $1", [programId, now]);
    return record;
  },
  async listClientDecisionRequests(programId) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT record
        FROM client_decision_requests
        WHERE program_id = $1
        ORDER BY created_at DESC
      `,
      [programId]
    );
    return result.rows.map(mapClientDecisionRequestRow);
  },
  async createClientDecisionRequest(programId, input) {
    await ensurePostgresSchema();
    const now = new Date();
    const program = await this.getProgram(programId);
    const record: ClientDecisionRequest = {
      id: randomUUID(),
      programId,
      programName: program?.intake.programName || "Untitled program",
      decisionText: input.decisionText.trim(),
      requestedBy: input.requestedBy?.trim() || undefined,
      status: "open",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await getPool().query(
      `
        INSERT INTO client_decision_requests (
          id, program_id, program_name, decision_text, status, record, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $7)
      `,
      [
        record.id,
        programId,
        record.programName,
        record.decisionText,
        record.status,
        JSON.stringify(record),
        now
      ]
    );
    await getPool().query("UPDATE programs SET updated_at = $2 WHERE id = $1", [programId, now]);
    return record;
  },
  async listGuidanceJustifications(programId) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT record
        FROM guidance_justifications
        WHERE program_id = $1
        ORDER BY created_at DESC
      `,
      [programId]
    );
    return result.rows.map(mapGuidanceJustificationRow);
  },
  async createGuidanceJustification(record) {
    await ensurePostgresSchema();
    await getPool().query(
      `
        INSERT INTO guidance_justifications (id, program_id, program_name, guided_plan_id, record, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      `,
      [record.id, record.programId, record.programName, record.guidedPlanId, JSON.stringify(record), new Date(record.createdAt)]
    );
    return record;
  },
  async listGuidanceFeedbackFlags(programId) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT record
        FROM guidance_feedback_flags
        WHERE program_id = $1
        ORDER BY created_at DESC
      `,
      [programId]
    );
    return result.rows.map(mapGuidanceFeedbackFlagRow);
  },
  async createGuidanceFeedbackFlag(programId, flag) {
    await ensurePostgresSchema();
    const now = new Date();
    const program = await this.getProgram(programId);
    const record: GuidanceFeedbackFlag = {
      id: randomUUID(),
      programId,
      programName: program?.intake.programName || "Untitled program",
      status: "pending",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...flag
    };

    await getPool().query(
      `
        INSERT INTO guidance_feedback_flags (id, program_id, program_name, guidance_justification_id, record, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $6)
      `,
      [record.id, programId, record.programName, record.guidanceJustificationId, JSON.stringify(record), now]
    );
    return record;
  },
  async reviewGuidanceFeedbackFlag(programId, flagId, review) {
    await ensurePostgresSchema();
    const existing = (await this.listGuidanceFeedbackFlags(programId)).find((record) => record.id === flagId);
    if (!existing) return null;

    const updated: GuidanceFeedbackFlag = {
      ...existing,
      ...review,
      updatedAt: new Date().toISOString()
    };

    await getPool().query(
      `
        UPDATE guidance_feedback_flags
        SET record = $3::jsonb, updated_at = $4
        WHERE program_id = $1 AND id = $2
      `,
      [programId, flagId, JSON.stringify(updated), new Date(updated.updatedAt)]
    );
    return updated;
  },
  async listOpenAIUsageRecords(programId) {
    await ensurePostgresSchema();
    const result = await getPool().query(
      `
        SELECT record
        FROM openai_usage_records
        WHERE program_id = $1
        ORDER BY created_at DESC
      `,
      [programId]
    );
    return result.rows.map(mapOpenAIUsageRecordRow);
  },
  async listAllOpenAIUsageRecords() {
    await ensurePostgresSchema();
    const result = await getPool().query(`
      SELECT record
      FROM openai_usage_records
      ORDER BY created_at DESC
    `);
    return result.rows.map(mapOpenAIUsageRecordRow);
  },
  async createOpenAIUsageRecord(programId, usage) {
    await ensurePostgresSchema();
    const now = new Date();
    const program = await this.getProgram(programId);
    const record = buildOpenAIUsageRecord({
      programId,
      programName: program?.intake.programName || "Untitled program",
      usage,
      createdAt: now.toISOString()
    });

    await getPool().query(
      `
        INSERT INTO openai_usage_records (id, program_id, program_name, workflow, source_id, record, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      `,
      [record.id, programId, record.programName, record.workflow, record.sourceId ?? null, JSON.stringify(record), now]
    );
    return record;
  },
  async listManagedUsers() {
    await ensurePostgresSchema();
    const result = await getPool().query(`
      SELECT record
      FROM managed_users
      ORDER BY updated_at DESC
    `);
    return result.rows.map(mapManagedUserRow);
  },
  async upsertManagedUser(input) {
    await ensurePostgresSchema();
    const users = await this.listManagedUsers();
    const email = input.email?.trim().toLowerCase();
    const existing = users.find((user) => user.id === input.id || (email && user.email === email));
    const programs = await this.listPrograms();
    const result = buildManagedAppUserRecord({
      existing,
      idFactory: randomUUID,
      input,
      now: new Date().toISOString(),
      programs
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    const record = result.record;
    await getPool().query(
      `
        INSERT INTO managed_users (id, email, name, user_type, credential_status, record, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            name = EXCLUDED.name,
            user_type = EXCLUDED.user_type,
            credential_status = EXCLUDED.credential_status,
            record = EXCLUDED.record,
            updated_at = EXCLUDED.updated_at
      `,
      [
        record.id,
        record.email,
        record.name,
        record.userType,
        record.credentialStatus,
        JSON.stringify(record),
        new Date(record.createdAt),
        new Date(record.updatedAt)
      ]
    );
    return record;
  },
  async deleteManagedUser(userId) {
    await ensurePostgresSchema();
    const existing = await getPool().query(
      `
        SELECT record
        FROM managed_users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );
    const user = existing.rows[0] ? mapManagedUserRow(existing.rows[0]) : null;

    if (!user) {
      return null;
    }

    await getPool().query("DELETE FROM managed_users WHERE id = $1", [userId]);
    return user;
  }
};

export function getConfiguredPersistenceProvider(): "file" | "postgres" {
  const configured = process.env.PERSISTENCE_PROVIDER;
  if (configured === "postgres" || configured === "file") return configured;
  return process.env.DATABASE_URL ? "postgres" : "file";
}

export function getProgramRepository(): ProgramRepository {
  return getConfiguredPersistenceProvider() === "postgres" ? postgresRepository : fileRepository;
}
