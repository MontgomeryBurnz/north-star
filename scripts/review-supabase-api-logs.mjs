import fs from "node:fs";

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
  "audit_events",
  "app_settings"
];

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

function getProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    return new URL(url).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

loadEnvFile(".env.local");

const accessToken = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_MANAGEMENT_ACCESS_TOKEN;
const projectRef = getProjectRef();

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_MANAGEMENT_ACCESS_TOKEN for Supabase Management API log access.");
  process.exit(1);
}

if (!projectRef) {
  console.error("Missing SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL.");
  process.exit(1);
}

const start = process.env.SUPABASE_LOG_START || hoursAgo(24);
const end = process.env.SUPABASE_LOG_END || new Date().toISOString();
const tablePattern = appTables.join("|");
const sql = `
  select
    cast(timestamp as datetime) as timestamp,
    method,
    status_code,
    path,
    url,
    event_message
  from edge_logs
    cross join unnest(metadata) as metadata
    cross join unnest(response) as response
    cross join unnest(request) as request
  where regexp_contains(path, '^/rest/v1/(${tablePattern})(/|\\\\?|$)')
  order by timestamp desc
  limit 200
`;

const params = new URLSearchParams({
  iso_timestamp_start: start,
  iso_timestamp_end: end,
  sql
});
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/analytics/endpoints/logs.all?${params}`, {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});

if (!response.ok) {
  console.error(`Supabase log query failed with HTTP ${response.status}: ${await response.text()}`);
  process.exit(1);
}

const payload = await response.json();
const rows = Array.isArray(payload) ? payload : payload.result ?? payload.results ?? [];

console.log(`Supabase API log review for ${projectRef}`);
console.log(`Window: ${start} to ${end}`);
console.log(`Matching REST calls: ${rows.length}`);

if (rows.length) {
  console.table(rows.slice(0, 25));
  if (rows.length > 25) {
    console.log(`Showing 25 of ${rows.length} matching requests.`);
  }
}
