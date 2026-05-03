import "server-only";
import { randomUUID } from "crypto";
import { buildManagedAppUserRecord } from "@/lib/admin-user-service";
import type { ProgramRepository } from "@/lib/program-repository-types";
import {
  ensurePostgresSchema,
  getPool,
  mapManagedUserRow,
  readFileStore,
  sortByUpdatedDesc,
  writeFileStore
} from "@/lib/program-repository-shared";

type UserPersistenceDependencies = Pick<ProgramRepository, "listManagedUsers" | "listPrograms">;

export function createFileUserPersistence(): Pick<
  ProgramRepository,
  "listManagedUsers" | "upsertManagedUser" | "deleteManagedUser"
> {
  return {
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
}

export function createPostgresUserPersistence(
  repository: UserPersistenceDependencies
): ReturnType<typeof createFileUserPersistence> {
  return {
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
      const users = await repository.listManagedUsers();
      const email = input.email?.trim().toLowerCase();
      const existing = users.find((user) => user.id === input.id || (email && user.email === email));
      const programs = await repository.listPrograms();
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
}
