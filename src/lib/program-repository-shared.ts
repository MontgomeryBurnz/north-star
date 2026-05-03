import "server-only";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Pool } from "pg";
import type { AuditEventInput, AuditEventRecord } from "@/lib/audit-event-types";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import type { ActiveProgramReview, StoredProgramUpdate } from "@/lib/active-program-types";
import type { AssistantConversationTurn } from "@/lib/assistant-conversation-types";
import type { AssistantServiceResponse } from "@/lib/assistant-types";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import type {
  ClientDecisionRequest,
  GuidanceFeedbackFlag,
  GuidanceJustificationRecord,
  OpenAIUsageRecord,
  OpenAIUsageRecordInput,
  ProgramMeetingInput
} from "@/lib/program-intelligence-types";
import type { ProgramIntake, StoredProgram } from "@/lib/program-intake-types";
import type { RoleArtifactDraft } from "@/lib/role-artifact-types";
import type { ProgramStoreFile } from "@/lib/program-repository-types";

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
  auditEvents: [],
  managedUsers: []
};

const storeDirectory = path.join(process.cwd(), ".data");
const storePath = path.join(storeDirectory, "work-path-store.json");
let pool: Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

export function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function sortByUpdatedDesc<T extends { updatedAt?: string; createdAt?: string }>(records: T[]) {
  return [...records].sort((a, b) => {
    const aValue = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bValue = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bValue - aValue;
  });
}

export function sortRoleArtifactsDesc(records: RoleArtifactDraft[]) {
  return [...records].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
}

export function nextRoleArtifactVersion(records: RoleArtifactDraft[]) {
  return records.reduce((highest, artifact) => Math.max(highest, artifact.version ?? 0), 0) + 1;
}

export function buildRoleArtifactRecord(input: {
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

export function buildOpenAIUsageRecord(input: {
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

export function buildAuditEventRecord(input: AuditEventInput): AuditEventRecord {
  return {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString()
  };
}

export function normalizeMeetingInput(input: ProgramMeetingInput): ProgramMeetingInput {
  return {
    ...input,
    attachments: Array.isArray(input.attachments) ? input.attachments : []
  };
}

async function ensureFileStore() {
  await mkdir(storeDirectory, { recursive: true });
}

export async function readFileStore(): Promise<ProgramStoreFile> {
  await ensureFileStore();

  try {
    const raw = await readFile(storePath, "utf8");
    return { ...emptyFileStore, ...JSON.parse(raw) };
  } catch {
    await writeFileStore(emptyFileStore);
    return emptyFileStore;
  }
}

export async function writeFileStore(store: ProgramStoreFile) {
  await ensureFileStore();
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

export async function ensurePostgresSchema() {
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

          CREATE TABLE IF NOT EXISTS audit_events (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            surface TEXT NOT NULL,
            program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
            program_name TEXT,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            entity_label TEXT,
            actor JSONB,
            summary TEXT NOT NULL,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            record JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            record JSONB NOT NULL,
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
          CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
            ON audit_events(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_audit_events_program_id_created_at
            ON audit_events(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_audit_events_event_type_created_at
            ON audit_events(event_type, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at
            ON app_settings(updated_at DESC);

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
              'managed_users',
              'audit_events',
              'app_settings'
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

export function mapProgramRow(row: { id: string; intake: ProgramIntake; created_at: Date; updated_at: Date }): StoredProgram {
  return {
    id: row.id,
    intake: row.intake,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export function mapUpdateRow(row: {
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

export function mapPlanRow(row: { plan: GuidedPlan }): GuidedPlan {
  return row.plan;
}

export function mapAssistantConversationRow(row: {
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

export function mapLeadershipRow(row: {
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

export function mapMeetingInputRow(row: { input: ProgramMeetingInput }): ProgramMeetingInput {
  return normalizeMeetingInput(row.input);
}

export function mapRoleArtifactRow(row: { record: RoleArtifactDraft }): RoleArtifactDraft {
  return row.record;
}

export function mapClientDecisionRequestRow(row: { record: ClientDecisionRequest }): ClientDecisionRequest {
  return row.record;
}

export function mapGuidanceJustificationRow(row: { record: GuidanceJustificationRecord }): GuidanceJustificationRecord {
  return row.record;
}

export function mapGuidanceFeedbackFlagRow(row: { record: GuidanceFeedbackFlag }): GuidanceFeedbackFlag {
  return row.record;
}

export function mapOpenAIUsageRecordRow(row: { record: OpenAIUsageRecord }): OpenAIUsageRecord {
  return row.record;
}

export function mapAuditEventRow(row: { record: AuditEventRecord }): AuditEventRecord {
  return row.record;
}

export function mapManagedUserRow(row: { record: ManagedAppUser }): ManagedAppUser {
  return row.record;
}
