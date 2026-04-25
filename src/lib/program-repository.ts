import "server-only";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Pool } from "pg";
import type { ActiveProgramReview, StoredProgramUpdate } from "@/lib/active-program-types";
import { generateGuidedPlan } from "@/lib/guided-plan-service";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import { enhanceLeadershipFeedback } from "@/lib/leadership-feedback-service";
import type { LeadershipReviewInput, LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import type { ProgramIntake, StoredProgram } from "@/lib/program-intake-types";

type ProgramRepository = {
  provider: "file" | "postgres";
  listPrograms(): Promise<StoredProgram[]>;
  getProgram(programId: string): Promise<StoredProgram | null>;
  upsertProgram(intake: ProgramIntake): Promise<StoredProgram>;
  listProgramUpdates(programId: string): Promise<StoredProgramUpdate[]>;
  createProgramUpdate(programId: string, review: ActiveProgramReview): Promise<StoredProgramUpdate>;
  getLatestGuidedPlan(programId: string): Promise<GuidedPlan | null>;
  createGuidedPlan(programId: string): Promise<GuidedPlan | null>;
  listLeadershipFeedback(programId: string): Promise<LeadershipReviewRecord[]>;
  createLeadershipFeedback(programId: string, feedback: LeadershipReviewInput): Promise<LeadershipReviewRecord>;
};

type ProgramStoreFile = {
  programs: StoredProgram[];
  updates: StoredProgramUpdate[];
  guidedPlans: GuidedPlan[];
  leadershipFeedbacks: LeadershipReviewRecord[];
};

const emptyFileStore: ProgramStoreFile = {
  programs: [],
  updates: [],
  guidedPlans: [],
  leadershipFeedbacks: []
};

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
    const plan = await generateGuidedPlan({ program, updates, leadershipFeedbacks });

    store.guidedPlans = [plan, ...store.guidedPlans];
    await writeFileStore(store);
    return plan;
  },
  async listLeadershipFeedback(programId) {
    const store = await readFileStore();
    return dedupeLeadershipFeedbacks(store.leadershipFeedbacks.filter((feedback) => feedback.programId === programId));
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

    const interpretation = await enhanceLeadershipFeedback(normalizedFeedback);

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
    store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
    await writeFileStore(store);
    return record;
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

          CREATE INDEX IF NOT EXISTS idx_program_updates_program_id_created_at
            ON program_updates(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_guided_plans_program_id_created_at
            ON guided_plans(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_leadership_feedback_program_id_created_at
            ON leadership_feedback(program_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_artifacts_program_id_created_at
            ON artifacts(program_id, created_at DESC);
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
    const plan = await generateGuidedPlan({ program, updates, leadershipFeedbacks });

    await getPool().query(
      `
        INSERT INTO guided_plans (id, program_id, program_name, plan, created_at)
        VALUES ($1, $2, $3, $4::jsonb, $5)
      `,
      [plan.id, programId, plan.programName, JSON.stringify(plan), new Date(plan.createdAt)]
    );
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

    const interpretation = await enhanceLeadershipFeedback(normalizedFeedback);
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
    await getPool().query("UPDATE programs SET updated_at = $2 WHERE id = $1", [programId, now]);
    return record;
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
