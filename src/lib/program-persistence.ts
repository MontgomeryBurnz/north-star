import "server-only";
import { randomUUID } from "crypto";
import type { ProgramRepository } from "@/lib/program-repository-types";
import {
  buildOpenAIUsageRecord,
  ensurePostgresSchema,
  getPool,
  mapAssistantConversationRow,
  mapClientDecisionRequestRow,
  mapMeetingInputRow,
  mapProgramRow,
  mapUpdateRow,
  normalizeMeetingInput,
  readFileStore,
  slugify,
  sortByUpdatedDesc,
  writeFileStore
} from "@/lib/program-repository-shared";

type ProgramPersistenceDependencies = Pick<ProgramRepository, "getProgram" | "createOpenAIUsageRecord">;

export function createFileProgramPersistence(): Pick<
  ProgramRepository,
  | "listPrograms"
  | "getProgram"
  | "upsertProgram"
  | "listProgramUpdates"
  | "listAllProgramUpdates"
  | "createProgramUpdate"
  | "listAssistantConversations"
  | "createAssistantConversation"
  | "listMeetingInputs"
  | "createMeetingInput"
  | "listClientDecisionRequests"
  | "createClientDecisionRequest"
> {
  return {
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
        const updatedProgram = {
          ...existing,
          updatedAt: now,
          intake
        };
        store.programs = store.programs.map((program) => (program.id === existing.id ? updatedProgram : program));
        await writeFileStore(store);
        return updatedProgram;
      }

      const program = {
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

      const update = {
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
      const record = {
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
    async listMeetingInputs(programId) {
      const store = await readFileStore();
      return sortByUpdatedDesc(store.meetingInputs.filter((input) => input.programId === programId)).map(normalizeMeetingInput);
    },
    async createMeetingInput(programId, input) {
      const store = await readFileStore();
      const now = new Date().toISOString();
      const program = store.programs.find((item) => item.id === programId);
      const record = {
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
    async listClientDecisionRequests(programId) {
      const store = await readFileStore();
      return sortByUpdatedDesc(store.clientDecisionRequests.filter((request) => request.programId === programId));
    },
    async createClientDecisionRequest(programId, input) {
      const store = await readFileStore();
      const now = new Date().toISOString();
      const program = store.programs.find((item) => item.id === programId);
      const record = {
        id: randomUUID(),
        programId,
        programName: program?.intake.programName || "Untitled program",
        decisionText: input.decisionText.trim(),
        requestedBy: input.requestedBy?.trim() || undefined,
        status: "open" as const,
        createdAt: now,
        updatedAt: now
      };

      store.clientDecisionRequests = [record, ...store.clientDecisionRequests];
      store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
      await writeFileStore(store);
      return record;
    }
  };
}

export function createPostgresProgramPersistence(
  repository: ProgramPersistenceDependencies
): ReturnType<typeof createFileProgramPersistence> {
  return {
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
      const program = await repository.getProgram(programId);
      const programName = review.programName || program?.intake.programName || "Untitled active program";
      const update = {
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
      const program = await repository.getProgram(programId);
      const record = {
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
        await repository.createOpenAIUsageRecord(programId, { ...response.debug.modelProfile.usage, sourceId: record.id });
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
      const program = await repository.getProgram(programId);
      const record = {
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
      const program = await repository.getProgram(programId);
      const record = {
        id: randomUUID(),
        programId,
        programName: program?.intake.programName || "Untitled program",
        decisionText: input.decisionText.trim(),
        requestedBy: input.requestedBy?.trim() || undefined,
        status: "open" as const,
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
    }
  };
}
