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
  await session.execute(`return fetch('/api/demo-session', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'action=exit' }).then((response) => response.status);`);
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
    standaloneCopy: document.body.textContent.includes('Use Studio with or without an active program'),
    outputOptions: Array.from(document.querySelectorAll('[data-studio-output]')).map((element) => element.getAttribute('data-studio-output')),
    selectedOutputs: document.querySelectorAll('[data-studio-output]:checked').length,
    exportFormats: Array.from(document.querySelector('[data-studio-export-format]').options).map((option) => option.value),
    researchOptIn: Boolean(document.querySelector('[data-studio-external-research]')),
    researchStartsOff: !document.querySelector('[data-studio-external-research]').checked
  };`);

  if (!ui.hasWorkspaceName || !ui.hasUpload || !ui.hasAnalyze || !ui.analyzeStartsDisabled || !ui.formats || !ui.standaloneCopy) {
    throw new Error("Standalone Discovery Studio workspace is incomplete.");
  }
  if (ui.hasProgramSlicer) throw new Error("Discovery Studio still requires a program selection.");
  if (ui.outputOptions.join(',') !== 'roadmap,backlog,stories,tests,gaps,analysis' || ui.selectedOutputs !== 6 || ui.exportFormats.join(',') !== 'docx,xlsx,pptx,md') throw new Error("Studio deliverable and Office export selection is incomplete.");
  if (!ui.researchOptIn || !ui.researchStartsOff) throw new Error("Public research must be an explicit opt-in.");

  await session.execute(`document.querySelector('[data-studio-load-sample]').click(); return true;`);
  await session.waitFor("prepared discovery outputs with feedback controls", () => session.execute(`return Boolean(document.querySelector('[data-studio-feedback-input]') && document.querySelector('[data-studio-revision-history]') && document.querySelector('[data-studio-download]'));`));
  await session.execute(`const format = document.querySelector('[data-studio-export-format]'); format.value = 'xlsx'; format.dispatchEvent(new Event('change', { bubbles: true })); return true;`);
  await session.waitFor("selected Excel download", () => session.execute(`return document.querySelector('[data-studio-download]').textContent.includes('.xlsx');`));
  await session.execute(`document.querySelector('[data-studio-output="roadmap"]').click(); return true;`);
  await session.waitFor("selected deliverables update the preview", () => session.execute(`return !document.querySelector('section[aria-label="Studio results"]').textContent.includes('Product roadmap');`));
  const resultUi = await session.execute(`return {
    preparedExample: document.querySelector('[data-studio-quality-review]').textContent.includes('Illustrative sample output'),
    feedbackStartsDisabled: document.querySelector('[data-studio-refine]').disabled,
    hasRestore: Boolean(document.querySelector('[data-studio-restore-revision]')),
    showsTestSteps: Boolean(document.querySelector('section[aria-label="Studio results"] ol li')),
    showsEvidenceNames: document.querySelector('section[aria-label="Studio results"]').textContent.includes('Evidence:')
  };`);
  if (!Object.values(resultUi).every(Boolean)) throw new Error("Studio review, provenance, test steps, or revision controls are incomplete.");
  await session.execute(`document.querySelector('[data-studio-clear]').click(); return true;`);
  await session.waitFor("fresh workspace", () => session.execute(`return !document.querySelector('[data-studio-feedback-input]') && document.querySelector('[data-studio-analyze]').disabled;`));
}

async function main() {
  await withSafariBrowser(async (session) => {
    await authenticate(session);
    await verifyWorkspace(session);
    console.log("✓ Standalone Discovery Studio workspace rendered.");
    console.log("✓ No active-program selector is required.");
    console.log("✓ Multi-format source intake is available.");
    console.log("✓ Analysis waits for readable discovery evidence.");
    console.log("✓ Office formats and selected deliverables update the output controls.");
    console.log("✓ Example output exposes evidence, test steps, feedback, and revision history.");
    console.log("✓ Public research requires explicit opt-in.");
  });
  console.log("Discovery Studio browser smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
