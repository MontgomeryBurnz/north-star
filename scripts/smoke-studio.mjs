import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile(process.env.NORTHSTAR_ENV_FILE ?? ".env.local");

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Run npm run qa:ensure-user or set ${label} before running the Studio smoke test.`);
}

async function authenticate(session) {
  const email = requireCredential(testUserEmail, "NORTHSTAR_TEST_USER_EMAIL");
  const password = requireCredential(testUserPassword, "NORTHSTAR_TEST_USER_PASSWORD");
  await session.navigate(`${baseUrl}/login?redirect=%2Fartifacts`);
  await session.waitFor("North Star login page", () =>
    session.execute("return location.origin === arguments[0] && document.body.textContent.includes('North Star access');", [baseUrl])
  );
  const status = await session.execute(
    `return fetch("/api/auth/user/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: arguments[0], password: arguments[1] }) }).then((response) => response.status);`,
    [email, password]
  );
  if (status !== 200) throw new Error(`User authentication failed with HTTP ${status}.`);
}

async function verifyWorkspace(session) {
  await session.navigate(`${baseUrl}/artifacts?smoke=studio`);
  await session.waitFor("standalone Discovery Studio workspace", () =>
    session.execute(`return Boolean(
      document.querySelector('[data-discovery-studio][data-studio-agnostic]') &&
      document.querySelector('[data-studio-workspace-name]') &&
      document.querySelector('[data-studio-source-input]') &&
      document.querySelector('[data-studio-analyze]')
    );`),
    20_000
  );

  const ui = await session.execute(`return {
    hasWorkspaceName: Boolean(document.querySelector('[data-studio-workspace-name]')),
    hasUpload: Boolean(document.querySelector('[data-studio-source-input]')),
    hasAnalyze: Boolean(document.querySelector('[data-studio-analyze]')),
    analyzeStartsDisabled: Boolean(document.querySelector('[data-studio-analyze][disabled]')),
    hasProgramSlicer: Boolean(document.querySelector('[data-program-slicer]')),
    formats: document.body.textContent.includes('Word, Excel, PowerPoint, PDF, CSV, Markdown, JSON, or text'),
    standaloneCopy: document.body.textContent.includes('Nothing in this workspace depends on or updates an active program')
  };`);

  if (!ui.hasWorkspaceName || !ui.hasUpload || !ui.hasAnalyze || !ui.analyzeStartsDisabled || !ui.formats || !ui.standaloneCopy) {
    throw new Error("Standalone Discovery Studio workspace is incomplete.");
  }
  if (ui.hasProgramSlicer) throw new Error("Discovery Studio still requires a program selection.");
}

async function main() {
  await withSafariBrowser(async (session) => {
    await authenticate(session);
    await verifyWorkspace(session);
    console.log("✓ Standalone Discovery Studio workspace rendered.");
    console.log("✓ No active-program selector is required.");
    console.log("✓ Multi-format source intake is available.");
    console.log("✓ Analysis waits for readable discovery evidence.");
  });
  console.log("Discovery Studio browser smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
