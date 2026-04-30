import fs from "node:fs";
import pg from "pg";

const { Pool } = pg;

const appTables = [
  "programs",
  "program_updates",
  "guided_plans",
  "leadership_feedback",
  "assistant_conversations",
  "artifacts",
  "meeting_inputs",
  "client_decision_requests",
  "guidance_justifications",
  "guidance_feedback_flags",
  "openai_usage_records",
  "managed_users"
];

const exposedRoles = ["anon", "authenticated"];
const checkedPrivileges = ["SELECT", "INSERT", "UPDATE", "DELETE"];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const delimiter = trimmed.indexOf("=");
    if (delimiter === -1) continue;

    const key = trimmed.slice(0, delimiter);
    if (process.env[key]) continue;

    let value = trimmed.slice(delimiter + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(".env.local");

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing SUPABASE_DATABASE_URL or DATABASE_URL.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "disable" ? undefined : { rejectUnauthorized: false }
});

try {
  const { rows: tableRows } = await pool.query(
    `
      WITH expected_tables AS (
        SELECT unnest($1::text[]) AS table_name
      )
      SELECT expected_tables.table_name,
             c.relname IS NOT NULL AS exists,
             COALESCE(c.relrowsecurity, false) AS rls_enabled
        FROM expected_tables
        LEFT JOIN pg_namespace n
          ON n.nspname = 'public'
        LEFT JOIN pg_class c
          ON c.relname = expected_tables.table_name
         AND c.relkind IN ('r', 'p')
         AND c.relnamespace = n.oid
       ORDER BY expected_tables.table_name;
    `,
    [appTables]
  );

  const { rows: roleRows } = await pool.query(
    `
      WITH app_tables AS (
        SELECT unnest($1::text[]) AS table_name
      ),
      exposed_roles AS (
        SELECT rolname
          FROM pg_roles
         WHERE rolname = ANY($2::text[])
      ),
      privileges AS (
        SELECT unnest($3::text[]) AS privilege_name
      )
      SELECT exposed_roles.rolname AS role_name,
             app_tables.table_name,
             privileges.privilege_name
        FROM app_tables
        CROSS JOIN exposed_roles
        CROSS JOIN privileges
       WHERE has_table_privilege(
               exposed_roles.rolname,
               format('public.%I', app_tables.table_name),
               privileges.privilege_name
             )
       ORDER BY exposed_roles.rolname, app_tables.table_name, privileges.privilege_name;
    `,
    [appTables, exposedRoles, checkedPrivileges]
  );

  const missingTables = tableRows.filter((row) => !row.exists);
  const rlsDisabledTables = tableRows.filter((row) => row.exists && !row.rls_enabled);
  const violations = [];

  for (const table of missingTables) {
    violations.push(`Missing expected public table: ${table.table_name}`);
  }

  for (const table of rlsDisabledTables) {
    violations.push(`RLS is disabled on public.${table.table_name}`);
  }

  for (const row of roleRows) {
    violations.push(`${row.role_name} has ${row.privilege_name} on public.${row.table_name}`);
  }

  if (violations.length) {
    console.error("Supabase RLS security check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log(`Supabase RLS security check passed for ${appTables.length} public app tables.`);
} finally {
  await pool.end();
}
