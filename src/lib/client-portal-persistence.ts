import "server-only";
import { randomUUID } from "crypto";
import type { ClientPortalUpdateInput, ClientPortalUpdateRecord } from "@/lib/client-portal-update-types";
import type { ProgramRepository } from "@/lib/program-repository-types";
import {
  ensurePostgresSchema,
  getPool,
  mapClientPortalUpdateRow,
  readFileStore,
  sortByUpdatedDesc,
  writeFileStore
} from "@/lib/program-repository-shared";

type ClientPortalPersistenceDependencies = Pick<ProgramRepository, "getProgram">;

function buildClientPortalUpdateRecord(input: {
  createdAt?: string;
  payload: ClientPortalUpdateInput;
  programId: string;
  programName: string;
}): ClientPortalUpdateRecord {
  const now = input.createdAt ?? new Date().toISOString();

  return {
    ...input.payload,
    id: randomUUID(),
    programId: input.programId,
    programName: input.programName,
    status: "published",
    createdAt: now,
    updatedAt: now
  };
}

export function createFileClientPortalPersistence(): Pick<
  ProgramRepository,
  "createClientPortalUpdate" | "deleteClientPortalUpdatesByTag" | "listClientPortalUpdates"
> {
  return {
    async listClientPortalUpdates(programId) {
      const store = await readFileStore();
      return sortByUpdatedDesc(store.clientPortalUpdates.filter((update) => update.programId === programId));
    },
    async createClientPortalUpdate(programId, input) {
      const store = await readFileStore();
      const now = new Date().toISOString();
      const program = store.programs.find((item) => item.id === programId);
      const record = buildClientPortalUpdateRecord({
        createdAt: now,
        payload: input,
        programId,
        programName: program?.intake.programName || "Untitled program"
      });

      store.clientPortalUpdates = [record, ...store.clientPortalUpdates];
      store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
      await writeFileStore(store);
      return record;
    },
    async deleteClientPortalUpdatesByTag(programId, tag) {
      const normalizedTag = tag.trim();
      if (!normalizedTag) return 0;

      const store = await readFileStore();
      const nextUpdates = store.clientPortalUpdates.filter((update) => {
        if (update.programId !== programId) return true;
        return !JSON.stringify(update).includes(normalizedTag);
      });
      const deletedCount = store.clientPortalUpdates.length - nextUpdates.length;

      if (!deletedCount) return 0;

      const now = new Date().toISOString();
      store.clientPortalUpdates = nextUpdates;
      store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
      await writeFileStore(store);
      return deletedCount;
    }
  };
}

export function createPostgresClientPortalPersistence(
  repository: ClientPortalPersistenceDependencies
): ReturnType<typeof createFileClientPortalPersistence> {
  return {
    async listClientPortalUpdates(programId) {
      await ensurePostgresSchema();
      const result = await getPool().query(
        `
          SELECT record
          FROM client_portal_updates
          WHERE program_id = $1
          ORDER BY created_at DESC
        `,
        [programId]
      );
      return result.rows.map(mapClientPortalUpdateRow);
    },
    async createClientPortalUpdate(programId, input) {
      await ensurePostgresSchema();
      const now = new Date();
      const program = await repository.getProgram(programId);
      const record = buildClientPortalUpdateRecord({
        createdAt: now.toISOString(),
        payload: input,
        programId,
        programName: program?.intake.programName || "Untitled program"
      });

      await getPool().query(
        `
          INSERT INTO client_portal_updates (
            id, program_id, program_name, status, record, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, $6)
        `,
        [record.id, programId, record.programName, record.status, JSON.stringify(record), now]
      );
      await getPool().query("UPDATE programs SET updated_at = $2 WHERE id = $1", [programId, now]);
      return record;
    },
    async deleteClientPortalUpdatesByTag(programId, tag) {
      await ensurePostgresSchema();
      const normalizedTag = tag.trim();
      if (!normalizedTag) return 0;

      const result = await getPool().query(
        `
          DELETE FROM client_portal_updates
          WHERE program_id = $1
            AND record::text LIKE $2
        `,
        [programId, `%${normalizedTag}%`]
      );

      const deletedCount = result.rowCount ?? 0;
      if (deletedCount) {
        await getPool().query("UPDATE programs SET updated_at = $2 WHERE id = $1", [programId, new Date()]);
      }

      return deletedCount;
    }
  };
}
