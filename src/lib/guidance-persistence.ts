import "server-only";
import { randomUUID } from "crypto";
import { enhanceLeadershipFeedback } from "@/lib/leadership-feedback-service";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import type { GuidanceJustificationRecord } from "@/lib/program-intelligence-types";
import type { ProgramRepository } from "@/lib/program-repository-types";
import {
  buildOpenAIUsageRecord,
  ensurePostgresSchema,
  getPool,
  mapGuidanceFeedbackFlagRow,
  mapGuidanceJustificationRow,
  mapLeadershipRow,
  mapOpenAIUsageRecordRow,
  mapPlanRow,
  normalizeMeetingInput,
  readFileStore,
  sortByUpdatedDesc,
  writeFileStore
} from "@/lib/program-repository-shared";
import { generateGuidedPlan } from "@/lib/guided-plan-service";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { AssistantConversationTurn } from "@/lib/assistant-conversation-types";
import type { ProgramMeetingInput } from "@/lib/program-intelligence-types";
import type { StoredProgram } from "@/lib/program-intake-types";

type GuidancePersistenceDependencies = Pick<
  ProgramRepository,
  | "getProgram"
  | "listProgramUpdates"
  | "listLeadershipFeedback"
  | "listAssistantConversations"
  | "listMeetingInputs"
  | "createOpenAIUsageRecord"
  | "createGuidanceJustification"
  | "listGuidanceFeedbackFlags"
>;

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

export function createFileGuidancePersistence(): Pick<
  ProgramRepository,
  | "getLatestGuidedPlan"
  | "createGuidedPlan"
  | "listLeadershipFeedback"
  | "listAllLeadershipFeedback"
  | "createLeadershipFeedback"
  | "listGuidanceJustifications"
  | "createGuidanceJustification"
  | "listGuidanceFeedbackFlags"
  | "createGuidanceFeedbackFlag"
  | "reviewGuidanceFeedbackFlag"
  | "listOpenAIUsageRecords"
  | "listAllOpenAIUsageRecords"
  | "createOpenAIUsageRecord"
> {
  return {
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

      const record = {
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
      const record = {
        id: randomUUID(),
        programId,
        programName: program?.intake.programName || "Untitled program",
        status: "pending" as const,
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

      const updated = {
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
    }
  };
}

export function createPostgresGuidancePersistence(
  repository: GuidancePersistenceDependencies
): ReturnType<typeof createFileGuidancePersistence> {
  return {
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
      const program = await repository.getProgram(programId);
      if (!program) return null;

      const updates = await repository.listProgramUpdates(programId);
      const leadershipFeedbacks = await repository.listLeadershipFeedback(programId);
      const assistantConversations = await repository.listAssistantConversations(programId);
      const meetingInputs = await repository.listMeetingInputs(programId);
      const plan = await generateGuidedPlan({ program, updates, leadershipFeedbacks, assistantConversations, meetingInputs });

      await getPool().query(
        `
          INSERT INTO guided_plans (id, program_id, program_name, plan, created_at)
          VALUES ($1, $2, $3, $4::jsonb, $5)
        `,
        [plan.id, programId, plan.programName, JSON.stringify(plan), new Date(plan.createdAt)]
      );
      if (plan.modelUsage) {
        await repository.createOpenAIUsageRecord(programId, { ...plan.modelUsage, sourceId: plan.id });
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
      await repository.createGuidanceJustification(justification);
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
      const program = await repository.getProgram(programId);
      const normalizedFeedback = normalizeLeadershipInput({
        ...feedback,
        programName: feedback.programName || program?.intake.programName || "Untitled program"
      });
      const latestExisting = await this.listLeadershipFeedback(programId);
      if (latestExisting[0] && leadershipFeedbacksMatch(latestExisting[0].feedback, normalizedFeedback)) {
        return latestExisting[0];
      }

      const interpretation = await enhanceLeadershipFeedback(normalizedFeedback, { programId });
      const record = {
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
        await repository.createOpenAIUsageRecord(programId, { ...interpretation.modelUsage, sourceId: record.id });
      }
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
      const program = await repository.getProgram(programId);
      const record = {
        id: randomUUID(),
        programId,
        programName: program?.intake.programName || "Untitled program",
        status: "pending" as const,
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
      const existing = (await repository.listGuidanceFeedbackFlags(programId)).find((record) => record.id === flagId);
      if (!existing) return null;

      const updated = {
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
      const program = await repository.getProgram(programId);
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
    }
  };
}
