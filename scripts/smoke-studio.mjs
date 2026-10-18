import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile(process.env.NORTHSTAR_ENV_FILE ?? ".env.local");

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
const requestedProgram = (process.env.NORTHSTAR_SMOKE_PROGRAM_NAME ?? "").trim().toLowerCase();

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

async function findDiscoveryProgram(session) {
  const result = await session.execute(
    `return fetch("/api/programs", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json();
      const preferred = arguments[0];
      const programs = payload.programs ?? [];
      const program = preferred
        ? programs.find((item) => item.intake?.programName?.toLowerCase().includes(preferred))
        : programs.find((item) => item.intake?.artifacts?.some((artifact) => artifact.extractedText?.trim()));
      return program ? { id: program.id, name: program.intake.programName } : { error: "No assigned program has readable discovery evidence." };
    });`,
    [requestedProgram]
  );
  if (result.error) throw new Error(result.error);
  return result;
}

async function selectProgram(session, target) {
  await session.navigate(`${baseUrl}/artifacts?smoke=studio`);
  await session.waitFor("Discovery Studio program slicer", () =>
    session.execute(`const button = document.querySelector('[data-program-slicer] button[aria-haspopup="listbox"]'); return Boolean(document.querySelector('[data-discovery-studio]') && button && !button.disabled);`),
    20_000
  );
  await session.execute('document.querySelector("[data-program-slicer] button[aria-haspopup=\\"listbox\\"]")?.click();');
  await session.waitFor("Discovery Studio program options", () => session.execute("return document.querySelectorAll('[role=\"option\"]').length > 0;"));
  const selected = await session.execute(
    `const name = arguments[0].toLowerCase(); const option = Array.from(document.querySelectorAll('[role="option"]')).find((item) => item.textContent.toLowerCase().includes(name)); if (!option) return false; option.click(); return true;`,
    [target.name]
  );
  if (!selected) throw new Error(`Could not select Studio program ${target.name}.`);
  await session.waitFor("Discovery Studio sources", () =>
    session.execute(`const analyze = document.querySelector('[data-studio-analyze]'); return Boolean(document.querySelector('[data-studio-source-input]') && analyze && !analyze.disabled && document.body.textContent.includes('Add discovery evidence'));`),
    20_000
  );
}

async function verifyWorkspace(session, target) {
  const state = await session.execute(
    `return fetch('/api/programs/' + encodeURIComponent(arguments[0]) + '/discovery-synthesis', { cache: 'no-store' }).then(async (response) => ({ status: response.status, payload: await response.json() }));`,
    [target.id]
  );
  if (state.status !== 200) throw new Error(`Discovery synthesis history returned HTTP ${state.status}.`);

  const ui = await session.execute(`return {
    hasUpload: Boolean(document.querySelector('[data-studio-source-input]')),
    hasAnalyze: Boolean(document.querySelector('[data-studio-analyze]:not([disabled])')),
    formats: document.body.textContent.includes('Word, Excel, PowerPoint, PDF, CSV, Markdown, JSON, or text'),
    hasLatestTabs: document.body.textContent.includes('2 · Understanding') && document.body.textContent.includes('4 · Build package')
  };`);
  if (!ui.hasUpload || !ui.hasAnalyze || !ui.formats) throw new Error("Discovery Studio source workspace is incomplete.");
  if (state.payload.synthesis && !ui.hasLatestTabs) throw new Error("Latest discovery synthesis did not render its output navigation.");
  return Boolean(state.payload.synthesis);
}

async function main() {
  await withSafariBrowser(async (session) => {
    await authenticate(session);
    const target = await findDiscoveryProgram(session);
    await selectProgram(session, target);
    const hasLatestSynthesis = await verifyWorkspace(session, target);
    console.log(`✓ Discovery Studio program selected: ${target.name}`);
    console.log("✓ Multi-format source workspace verified.");
    console.log("✓ Discovery analysis action is available.");
    console.log(hasLatestSynthesis ? "✓ Latest build package rendered." : "✓ No prior build package required for non-mutating smoke.");
  });
  console.log("Discovery Studio browser smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
