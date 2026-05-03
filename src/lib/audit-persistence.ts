import "server-only";
import type { ProgramRepository } from "@/lib/program-repository-types";
import {
  buildAuditEventRecord,
  ensurePostgresSchema,
  getPool,
  mapAuditEventRow,
  readFileStore,
  sortByUpdatedDesc,
  writeFileStore
} from "@/lib/program-repository-shared";

export function createFileAuditPersistence(): Pick<ProgramRepository, "listAuditEvents" | "createAuditEvent"> {
  return {
    async listAuditEvents(limit = 50) {
      const store = await readFileStore();
      return sortByUpdatedDesc(store.auditEvents).slice(0, limit);
    },
    async createAuditEvent(input) {
      const store = await readFileStore();
      const record = buildAuditEventRecord(input);
      store.auditEvents = [record, ...store.auditEvents];
      await writeFileStore(store);
      return record;
    }
  };
}

export function createPostgresAuditPersistence(): ReturnType<typeof createFileAuditPersistence> {
  return {
    async listAuditEvents(limit = 50) {
      await ensurePostgresSchema();
      const result = await getPool().query(
        `
          SELECT record
          FROM audit_events
          ORDER BY created_at DESC
          LIMIT $1
        `,
        [limit]
      );
      return result.rows.map(mapAuditEventRow);
    },
    async createAuditEvent(input) {
      await ensurePostgresSchema();
      const record = buildAuditEventRecord(input);
      await getPool().query(
        `
          INSERT INTO audit_events (
            id, event_type, surface, program_id, program_name, entity_type, entity_id, entity_label, actor, summary, metadata, record, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb, $12::jsonb, $13)
        `,
        [
          record.id,
          record.eventType,
          record.surface,
          record.programId ?? null,
          record.programName ?? null,
          record.entityType,
          record.entityId ?? null,
          record.entityLabel ?? null,
          JSON.stringify(record.actor ?? null),
          record.summary,
          JSON.stringify(record.metadata ?? {}),
          JSON.stringify(record),
          new Date(record.createdAt)
        ]
      );
      return record;
    }
  };
}
