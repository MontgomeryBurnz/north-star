import fs from "node:fs";

function loadEnvFile(filePath = ".env.local") {
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

loadEnvFile(process.env.NORTHSTAR_ENV_FILE ?? ".env.local");

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Set ${label} before running the Admin model settings smoke test.`);
}

function cookieHeaderFrom(response) {
  const cookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);

  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function readJson(response, fallback) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `${fallback} failed with HTTP ${response.status}.`);
  }

  return payload;
}

async function authenticate() {
  const email = requireCredential(testUserEmail, "NORTHSTAR_TEST_USER_EMAIL");
  const password = requireCredential(testUserPassword, "NORTHSTAR_TEST_USER_PASSWORD");
  const response = await fetch(`${baseUrl}/api/auth/user/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  await readJson(response, "User login");
  return cookieHeaderFrom(response);
}

async function getSettings(cookieHeader) {
  const response = await fetch(`${baseUrl}/api/admin/model-settings`, {
    headers: { cookie: cookieHeader },
    cache: "no-store"
  });
  return readJson(response, "Read model settings");
}

async function putSettings(cookieHeader, settings) {
  const response = await fetch(`${baseUrl}/api/admin/model-settings`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader
    },
    body: JSON.stringify(settings)
  });
  return readJson(response, "Save model settings");
}

function reversibleSettings(settings) {
  const nextVerbosity = settings.textVerbosity === "low" ? "medium" : "low";
  return {
    model: settings.model,
    provider: settings.provider,
    reasoningEffort: settings.reasoningEffort,
    textVerbosity: nextVerbosity
  };
}

async function main() {
  const cookieHeader = await authenticate();
  const original = await getSettings(cookieHeader);
  const originalSettings = original.settings;
  if (!originalSettings?.model || !originalSettings?.provider) {
    throw new Error("Model settings API did not return an active settings payload.");
  }

  const testSettings = reversibleSettings(originalSettings);
  const changed = await putSettings(cookieHeader, testSettings);
  if (changed.settings.textVerbosity !== testSettings.textVerbosity) {
    throw new Error("Model settings smoke did not persist the temporary change.");
  }

  const reverted = await putSettings(cookieHeader, {
    model: originalSettings.model,
    provider: originalSettings.provider,
    reasoningEffort: originalSettings.reasoningEffort,
    textVerbosity: originalSettings.textVerbosity
  });
  if (
    reverted.settings.model !== originalSettings.model ||
    reverted.settings.provider !== originalSettings.provider ||
    reverted.settings.reasoningEffort !== originalSettings.reasoningEffort ||
    reverted.settings.textVerbosity !== originalSettings.textVerbosity
  ) {
    throw new Error("Model settings smoke changed settings but did not revert them.");
  }

  console.log(
    `Admin model settings smoke passed. Temporarily changed verbosity to ${testSettings.textVerbosity}, then reverted to ${originalSettings.textVerbosity}.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
