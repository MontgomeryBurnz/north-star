import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "./browser-webdriver.mjs";

const envFile = process.env.NORTHSTAR_ENV_FILE ?? ".env.local";
loadEnvFile(envFile);

const qaEmail = (process.env.NORTHSTAR_TEST_USER_EMAIL ?? "codex.qa@north-star.live").trim().toLowerCase();
const qaName = process.env.NORTHSTAR_TEST_USER_NAME ?? "Codex QA";
const qaPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD || randomBytes(24).toString("base64url");

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (value) return value;
  throw new Error(`Missing ${name}. Pull production env vars before provisioning the QA user.`);
}

function setLocalEnvValue(key, value) {
  const existing = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(existing)
    ? existing.replace(pattern, line)
    : `${existing.replace(/\n?$/, "\n")}${line}\n`;
  fs.writeFileSync(envFile, next);
  process.env[key] = value;
}

function parseRecord(row) {
  if (!row?.record) return null;
  return typeof row.record === "string" ? JSON.parse(row.record) : row.record;
}

async function findAuthUserByEmail(supabase, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) break;
  }

  return null;
}

async function ensureAuthUser({ email, name, password }) {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const existing = await findAuthUserByEmail(supabase, email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        full_name: name,
        northStarUserType: "admin"
      }
    });
    if (error) throw new Error(error.message);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      full_name: name,
      northStarUserType: "admin"
    }
  });
  if (error || !data.user) throw new Error(error?.message || "Supabase did not return a QA auth user.");
  return data.user;
}

async function ensureManagedUser({ authUser, email, name }) {
  const pool = new Pool({
    connectionString: requireEnv("DATABASE_URL"),
    ssl: process.env.DATABASE_SSL === "require" || process.env.DATABASE_URL?.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined
  });

  try {
    const existingResult = await pool.query(
      "SELECT record FROM managed_users WHERE lower(email) = lower($1) LIMIT 1",
      [email]
    );
    const existing = parseRecord(existingResult.rows[0]);
    const now = new Date().toISOString();
    const record = {
      id: existing?.id ?? randomUUID(),
      name,
      email,
      userType: "admin",
      credentialStatus: "active",
      authUserId: authUser.id,
      invitedAt: existing?.invitedAt ?? now,
      lastAuthSyncAt: now,
      assignments: [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    await pool.query(
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
  } finally {
    await pool.end();
  }
}

async function main() {
  setLocalEnvValue("NORTHSTAR_TEST_USER_EMAIL", qaEmail);
  if (!process.env.NORTHSTAR_TEST_USER_PASSWORD) {
    setLocalEnvValue("NORTHSTAR_TEST_USER_PASSWORD", qaPassword);
  }

  const authUser = await ensureAuthUser({ email: qaEmail, name: qaName, password: qaPassword });
  const managedUser = await ensureManagedUser({ authUser, email: qaEmail, name: qaName });

  console.log(`✓ QA user ready: ${managedUser.email}`);
  console.log(`✓ User type: ${managedUser.userType}; credential status: ${managedUser.credentialStatus}`);
  console.log(`✓ Smoke-test credentials are stored in ${envFile} and are not committed.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
