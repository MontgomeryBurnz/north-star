import { NextResponse, type NextRequest } from "next/server";
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
  "role_artifacts",
  "client_decision_requests",
  "guidance_justifications",
  "guidance_feedback_flags",
  "openai_usage_records",
  "managed_users",
  "audit_events"
];

const exposedRoles = ["anon", "authenticated"];
const checkedPrivileges = ["SELECT", "INSERT", "UPDATE", "DELETE"];

export const runtime = "nodejs";

function createUnauthorizedResponse() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function getConnectionString() {
  return process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
}

async function auditSupabaseRls() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    return {
      ok: false,
      status: 500,
      violations: ["Missing SUPABASE_DATABASE_URL or DATABASE_URL."]
    };
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

    const violations = [
      ...tableRows.filter((row) => !row.exists).map((row) => `Missing expected public table: ${row.table_name}`),
      ...tableRows
        .filter((row) => row.exists && !row.rls_enabled)
        .map((row) => `RLS is disabled on public.${row.table_name}`),
      ...roleRows.map((row) => `${row.role_name} has ${row.privilege_name} on public.${row.table_name}`)
    ];

    return {
      ok: violations.length === 0,
      status: violations.length ? 500 : 200,
      checkedTables: appTables.length,
      violations
    };
  } finally {
    await pool.end();
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const isAuthorized = Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);

  if (cronSecret && !isAuthorized) {
    return createUnauthorizedResponse();
  }

  const result = await auditSupabaseRls();
  if (isAuthorized) {
    return NextResponse.json(result, { status: result.status });
  }

  return NextResponse.json(
    {
      ok: result.ok,
      checkedTables: result.checkedTables,
      violationCount: result.violations.length
    },
    { status: result.status }
  );
}
