import "server-only";
import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/program-repository-shared";
import { getConfiguredPersistenceProvider } from "@/lib/program-repository";
import { appendStudioRevisionRecord, applyStudioPackageAction, assertStudioActor, assertStudioPackageManager, canManageStudioPackage, createStudioPackageRecord, projectStudioPackage, summarizeStudioPackage } from "./studio-collaboration.ts";
import { StudioCollaborationError } from "./studio-collaboration-types.ts";
import type { StudioActor, StudioPackageAction, StudioPackageRecord, StudioPackageSummary, StudioPackageView, StudioRevisionInput } from "./studio-collaboration-types.ts";

let schemaReady: Promise<void> | undefined;
const clock = () => ({ now: new Date().toISOString(), idFactory: randomUUID });

/** Additive, server-only storage; never silently substitute instance-local files. */
export async function ensureStudioCollaborationSchema() {
  if (getConfiguredPersistenceProvider() !== "postgres" || !process.env.DATABASE_URL) throw new StudioCollaborationError("Durable Studio collaboration requires the configured PostgreSQL database.", 503);
  if (!schemaReady) schemaReady = getPool().query(`
    CREATE TABLE IF NOT EXISTS studio_packages (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      record JSONB NOT NULL,
      version INTEGER NOT NULL CHECK (version > 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_studio_packages_owner ON studio_packages(owner_id, updated_at DESC);
    ALTER TABLE studio_packages ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE studio_packages FROM PUBLIC;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE studio_packages FROM anon; END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE studio_packages FROM authenticated; END IF;
    END $$;
  `).then(() => undefined).catch(() => { schemaReady = undefined; throw new StudioCollaborationError("Studio package storage is unavailable. No collaboration change was applied.", 503); });
  await schemaReady;
}

function stored(value: unknown): StudioPackageRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StudioCollaborationError("Studio package storage could not be read safely.", 503);
  const record = value as StudioPackageRecord;
  if (record.schemaVersion !== 1 || typeof record.id !== "string" || typeof record.ownerId !== "string" || !Number.isSafeInteger(record.version) || record.version < 1
    || !Array.isArray(record.revisions) || !record.revisions.length || !Array.isArray(record.grants) || !Array.isArray(record.comments)) throw new StudioCollaborationError("Studio package storage could not be read safely.", 503);
  return record;
}
function safeFailure(error: unknown): never {
  if (error instanceof StudioCollaborationError) throw error;
  throw new StudioCollaborationError("Studio package storage is unavailable. No collaboration change was applied.", 503);
}

export async function listStudioPackages(user: StudioActor): Promise<StudioPackageSummary[]> {
  assertStudioActor(user); await ensureStudioCollaborationSchema();
  try {
    const result = await getPool().query("SELECT record FROM studio_packages WHERE owner_id = $1 OR $2::boolean OR EXISTS (SELECT 1 FROM jsonb_array_elements(record->'grants') AS grant_record WHERE grant_record->>'recipientId' = $1) ORDER BY updated_at DESC", [user.id, user.userType === "admin"]);
    const summaries: StudioPackageSummary[] = [];
    for (const row of result.rows) {
      try { summaries.push(summarizeStudioPackage(stored(row.record), user)); }
      catch (error) { if (!(error instanceof StudioCollaborationError) || error.status !== 404) throw error; }
    }
    return summaries;
  } catch (error) { safeFailure(error); }
}
export async function getStudioPackage(user: StudioActor, id: string, revisionId?: string): Promise<StudioPackageView> {
  assertStudioActor(user); await ensureStudioCollaborationSchema();
  try {
    const result = await getPool().query("SELECT record FROM studio_packages WHERE id = $1", [id]);
    if (!result.rows[0]) throw new StudioCollaborationError("This Studio package is not available.", 404);
    return projectStudioPackage(stored(result.rows[0].record), user, revisionId);
  } catch (error) { safeFailure(error); }
}
export async function createStudioPackage(user: StudioActor, input: StudioRevisionInput): Promise<StudioPackageView> {
  assertStudioActor(user);
  const record = createStudioPackageRecord(user, input, clock());
  await ensureStudioCollaborationSchema();
  try {
    await getPool().query("INSERT INTO studio_packages (id, owner_id, record, version, updated_at) VALUES ($1, $2, $3::jsonb, $4, $5)", [record.id, record.ownerId, JSON.stringify(record), record.version, record.updatedAt]);
    return projectStudioPackage(record, user);
  } catch (error) { safeFailure(error); }
}
async function update(user: StudioActor, id: string, expectedVersion: number, change: (record: StudioPackageRecord, resolve: (id: string) => Promise<StudioActor | undefined>) => Promise<StudioPackageRecord>) {
  assertStudioActor(user); await ensureStudioCollaborationSchema();
  const client = await getPool().connect().catch(error => safeFailure(error));
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT record, version, owner_id FROM studio_packages WHERE id = $1 FOR UPDATE", [id]);
    if (!result.rows[0]) throw new StudioCollaborationError("This Studio package is not available.", 404);
    const before = stored(result.rows[0].record);
    if (before.id !== id || before.ownerId !== result.rows[0].owner_id || before.version !== result.rows[0].version) throw new StudioCollaborationError("Studio package storage could not be read safely.", 503);
    // Resolve referenced identities server-side. Request bodies never establish a
    // recipient's status/name, and disabled accounts cannot receive assignments/grants.
    const resolve = async (userId: string) => {
      const found = await client.query("SELECT record FROM managed_users WHERE id = $1", [userId]);
      const actor = found.rows[0]?.record as StudioActor | undefined;
      return actor?.id === userId ? actor : undefined;
    };
    const after = await change(before, resolve);
    const written = await client.query("UPDATE studio_packages SET record = $2::jsonb, version = $3, updated_at = $4 WHERE id = $1 AND version = $5", [id, JSON.stringify(after), after.version, after.updatedAt, expectedVersion]);
    if (written.rowCount !== 1) throw new StudioCollaborationError("This package changed. Refresh before applying your update.", 409);
    await client.query("COMMIT");
    return after;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined); safeFailure(error);
  } finally { client.release(); }
}
export async function appendStudioRevision(user: StudioActor, id: string, expectedVersion: number, input: StudioRevisionInput & { parentRevisionId: string }): Promise<StudioPackageView> {
  const record = await update(user, id, expectedVersion, async before => appendStudioRevisionRecord(before, user, expectedVersion, input, clock()));
  return projectStudioPackage(record, user);
}
export async function mutateStudioPackage(user: StudioActor, id: string, expectedVersion: number, action: StudioPackageAction): Promise<StudioPackageView> {
  const record = await update(user, id, expectedVersion, async (before, resolve) => {
    // Do not resolve arbitrary identity IDs before the package management check.
    if (action?.type === "share" || action?.type === "assign" || action?.type === "revoke" || action?.type === "approve") assertStudioPackageManager(before, user);
    const recipient = action?.type === "share" ? await resolve(action.recipientId) : undefined;
    const assignee = action?.type === "assign" && action.assigneeId ? await resolve(action.assigneeId) : undefined;
    return applyStudioPackageAction(before, user, expectedVersion, action, { ...clock(), recipient, assignee });
  });
  const actionRevision = action.type === "revoke" ? undefined : action.revisionId;
  return projectStudioPackage(record, user, actionRevision);
}
export async function getStudioExport(user: StudioActor, id: string, revisionId: string) {
  const view = await getStudioPackage(user, id, revisionId);
  if (view.access !== "manage") throw new StudioCollaborationError("Use the explicitly shared work view. Full-package exports are internal only.", 403);
  return { title: view.revision.title, synthesis: view.revision.synthesis };
}

export { canManageStudioPackage };
