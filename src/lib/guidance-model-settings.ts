import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Pool } from "pg";
import {
  normalizeGuidanceModelSettings,
  type GuidanceModelSettings,
  type GuidanceProviderId
} from "@/lib/guidance-model-settings-types";

const settingsKey = "guidance_model_settings";
const settingsDirectory = path.join(process.cwd(), ".data");
const settingsPath = path.join(settingsDirectory, "guidance-model-settings.json");

let pool: Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

function getConfiguredProvider(): GuidanceProviderId {
  const configured = process.env.GUIDED_PLAN_PROVIDER?.trim();
  if (configured === "openai" || configured === "local") return configured;
  return process.env.ASSISTANT_PROVIDER === "openai" ? "openai" : "local";
}

export function getEnvGuidanceModelSettings(): GuidanceModelSettings {
  const fallback: GuidanceModelSettings = {
    model: process.env.OPENAI_MODEL?.trim() || "unconfigured",
    provider: getConfiguredProvider(),
    reasoningEffort: "medium",
    textVerbosity: "low"
  };

  return normalizeGuidanceModelSettings(
    {
      model: fallback.model,
      provider: fallback.provider,
      reasoningEffort: process.env.OPENAI_REASONING_EFFORT?.trim() as GuidanceModelSettings["reasoningEffort"],
      textVerbosity: process.env.OPENAI_TEXT_VERBOSITY?.trim() as GuidanceModelSettings["textVerbosity"]
    },
    fallback
  );
}

function getConfiguredPersistenceProvider() {
  const configured = process.env.PERSISTENCE_PROVIDER;
  if (configured === "postgres" || configured === "file") return configured;
  return process.env.DATABASE_URL ? "postgres" : "file";
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

async function ensurePostgresSettingsSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          record JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at
          ON app_settings(updated_at DESC);

        ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

        DO $$
        DECLARE
          exposed_role_name TEXT;
          exposed_role_names TEXT[] := ARRAY['anon', 'authenticated'];
        BEGIN
          FOREACH exposed_role_name IN ARRAY exposed_role_names LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = exposed_role_name) THEN
              EXECUTE format('REVOKE ALL ON TABLE public.app_settings FROM %I', exposed_role_name);
            END IF;
          END LOOP;
        END $$;
      `);
    })();
  }

  return schemaReadyPromise;
}

async function readFileSettings() {
  try {
    const raw = await readFile(settingsPath, "utf8");
    return JSON.parse(raw) as Partial<GuidanceModelSettings>;
  } catch {
    return null;
  }
}

async function writeFileSettings(settings: GuidanceModelSettings) {
  await mkdir(settingsDirectory, { recursive: true });
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

export async function getGuidanceModelSettings(): Promise<GuidanceModelSettings> {
  const fallback = getEnvGuidanceModelSettings();

  if (getConfiguredPersistenceProvider() === "postgres") {
    try {
      await ensurePostgresSettingsSchema();
      const result = await getPool().query("SELECT record FROM app_settings WHERE key = $1 LIMIT 1", [settingsKey]);
      return normalizeGuidanceModelSettings(result.rows[0]?.record, fallback);
    } catch {
      return fallback;
    }
  }

  const fileSettings = await readFileSettings();
  return normalizeGuidanceModelSettings(fileSettings, fallback);
}

export async function saveGuidanceModelSettings(
  input: Partial<GuidanceModelSettings>,
  updatedBy?: string
): Promise<GuidanceModelSettings> {
  const existing = await getGuidanceModelSettings();
  const settings = normalizeGuidanceModelSettings(
    {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
      updatedBy
    },
    getEnvGuidanceModelSettings()
  );

  if (getConfiguredPersistenceProvider() === "postgres") {
    await ensurePostgresSettingsSchema();
    await getPool().query(
      `
        INSERT INTO app_settings (key, record, updated_at)
        VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (key) DO UPDATE
        SET record = EXCLUDED.record,
            updated_at = EXCLUDED.updated_at
      `,
      [settingsKey, JSON.stringify(settings), new Date(settings.updatedAt ?? Date.now())]
    );
    return settings;
  }

  await writeFileSettings(settings);
  return settings;
}
