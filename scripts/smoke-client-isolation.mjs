import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
const unassignedClientName = "Unassigned client";
const forbiddenClients = (process.env.NORTHSTAR_CLIENT_ISOLATION_FORBIDDEN_CLIENTS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Set ${label} before running the Client Portal isolation smoke test.`);
}

function normalizeClientName(value) {
  const trimmed = value?.trim();
  return trimmed || unassignedClientName;
}

function compareClientNames(a, b) {
  if (a === b) return 0;
  if (a === unassignedClientName) return 1;
  if (b === unassignedClientName) return -1;
  return a.localeCompare(b);
}

async function authenticate(session) {
  const email = requireCredential(testUserEmail, "NORTHSTAR_TEST_USER_EMAIL");
  const password = requireCredential(testUserPassword, "NORTHSTAR_TEST_USER_PASSWORD");

  await session.navigate(`${baseUrl}/login?redirect=%2Fclient`);
  await session.waitFor("login page origin", () =>
    session.execute("return location.origin === arguments[0];", [baseUrl])
  );

  const result = await session.execute(
    `
      return fetch("/api/auth/user/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: arguments[0], password: arguments[1] })
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        payload: await response.json().catch(() => ({}))
      }));
    `,
    [email, password]
  );

  if (!result.ok) {
    throw new Error(`Client Portal isolation authentication failed with HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
  }

  console.log(`✓ Client isolation: signed in with QA user ${email}.`);
}

async function listAssignedClientNames(session) {
  const result = await session.execute(`
    return fetch("/api/programs", { cache: "no-store" }).then(async (response) => ({
      ok: response.ok,
      status: response.status,
      payload: await response.json().catch(() => ({}))
    }));
  `);

  if (!result.ok) {
    throw new Error(`Client isolation could not list assigned programs. HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
  }

  const programs = result.payload?.programs ?? [];
  if (!programs.length) {
    throw new Error("Client isolation smoke requires at least one program assigned to the QA user.");
  }

  const clientNames = Array.from(new Set(programs.map((program) => normalizeClientName(program.intake?.clientName)))).sort(compareClientNames);
  console.log(`✓ Client isolation: assigned client portfolios are ${clientNames.join(" | ")}.`);
  return clientNames;
}

async function readClientPortal(session) {
  await session.navigate(`${baseUrl}/client?isolation-smoke=${Date.now()}`);
  await session.waitFor("Client Portal to render", () =>
    session.execute('return document.body && document.body.innerText.includes("Portfolio Dashboard");')
  );

  return session.execute(`
    const visibleText = document.body.innerText || "";
    return {
      clientSelectorCount: document.querySelectorAll("[data-client-portfolio-option]").length,
      clientSelectorLabels: Array.from(document.querySelectorAll("[data-client-portfolio-option]"))
        .map((node) => node.textContent?.trim())
        .filter(Boolean),
      programSelectorLabels: Array.from(document.querySelectorAll("[data-client-program-option]"))
        .map((node) => node.textContent?.trim())
        .filter(Boolean),
      visibleText
    };
  `);
}

function assertClientIsolation(portal, clientNames) {
  if (portal.clientSelectorCount > 0) {
    throw new Error(
      `Client Portal rendered ${portal.clientSelectorCount} cross-client selector option(s): ${portal.clientSelectorLabels.join(" | ")}`
    );
  }

  const defaultClient = clientNames[0];
  if (!portal.visibleText.toLowerCase().includes(defaultClient.toLowerCase())) {
    throw new Error(`Client Portal did not render the default assigned client "${defaultClient}".`);
  }

  const nonDefaultClients = clientNames.slice(1);
  const leakedClients = nonDefaultClients.filter((clientName) =>
    portal.visibleText.toLowerCase().includes(clientName.toLowerCase())
  );
  if (leakedClients.length) {
    throw new Error(`Client Portal leaked non-selected client portfolio name(s): ${leakedClients.join(" | ")}`);
  }

  const forbiddenLeaks = forbiddenClients.filter((clientName) =>
    portal.visibleText.toLowerCase().includes(clientName.toLowerCase())
  );
  if (forbiddenLeaks.length) {
    throw new Error(`Client Portal rendered forbidden client name(s): ${forbiddenLeaks.join(" | ")}`);
  }
}

async function main() {
  await withSafariBrowser(async (session) => {
    await authenticate(session);
    const clientNames = await listAssignedClientNames(session);
    const portal = await readClientPortal(session);
    assertClientIsolation(portal, clientNames);
  });

  console.log("Client Portal isolation smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
