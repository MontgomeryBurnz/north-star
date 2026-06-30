import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
const targetProgramName = process.env.NORTHSTAR_SMOKE_PROGRAM_NAME ?? "";
const cleanupMode = (process.env.NORTHSTAR_CLIENT_DASHBOARD_SMOKE_CLEANUP ?? process.env.NORTHSTAR_SMOKE_CLEANUP ?? "prune").toLowerCase();
const shouldCleanup = ["1", "true", "prune", "refresh"].includes(cleanupMode);

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Set ${label} before running the Client Updates smoke test.`);
}

async function authenticate(session) {
  const email = requireCredential(testUserEmail, "NORTHSTAR_TEST_USER_EMAIL");
  const password = requireCredential(testUserPassword, "NORTHSTAR_TEST_USER_PASSWORD");

  await session.navigate(`${baseUrl}/login?redirect=%2Fclient-updates`);
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
    throw new Error(`Client Updates smoke authentication failed with HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
  }

  console.log(`✓ Client Updates: signed in with QA user ${email}.`);
}

async function selectProgram(session) {
  const result = await session.execute(`
    return fetch("/api/programs", { cache: "no-store" }).then(async (response) => ({
      ok: response.ok,
      status: response.status,
      payload: await response.json().catch(() => ({}))
    }));
  `);

  if (!result.ok) {
    throw new Error(`Client Updates smoke could not list programs. HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
  }

  const programs = result.payload?.programs ?? [];
  if (!programs.length) {
    throw new Error("No programs are available for the Client Updates smoke test.");
  }

  const wanted = targetProgramName.trim().toLowerCase();
  return (wanted
    ? programs.find((program) => program.intake?.programName?.toLowerCase().includes(wanted))
    : undefined) ?? programs[0];
}

async function selectProgramInUi(session, program) {
  await session.execute(
    `
      const slicer = document.querySelector("[data-program-slicer]");
      if (!slicer) throw new Error("Program slicer was not rendered.");
      const button = slicer.querySelector("button");
      button.click();
      const options = Array.from(document.querySelectorAll('[role="option"]'));
      const option = options.find((node) => node.textContent.includes(arguments[0])) || options[0];
      if (!option) throw new Error("No program options were rendered.");
      option.click();
      return true;
    `,
    [program.intake.programName]
  );

  await session.waitFor("selected program card", () =>
    session.execute("return document.body.innerText.includes(arguments[0]);", [program.intake.programName])
  );
}

async function setTextarea(session, selector, value) {
  await session.execute(
    `
      const element = document.querySelector(arguments[0]);
      if (!element) throw new Error("Missing textarea " + arguments[0]);
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(element, arguments[1]);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    `,
    [selector, value]
  );
}

async function publishClientDashboardUpdate(session, program, smokeText) {
  await setTextarea(session, "[data-client-dashboard-overview]", `${smokeText}: executive dashboard publication verified.`);
  await setTextarea(session, "[data-client-dashboard-progress]", `${smokeText}: recent accomplishment rendered in the portal.`);
  await setTextarea(session, "[data-client-dashboard-upcoming]", `${smokeText}: next client-visible activity rendered.`);

  await session.execute(`
    const button = document.querySelector("[data-client-dashboard-publish]");
    if (!button) throw new Error("Publish button was not rendered.");
    button.click();
    return true;
  `);

  await session.waitFor("client dashboard publish confirmation", () =>
    session.execute(`
      const confirmation = document.querySelector("[data-client-dashboard-confirmation]");
      return confirmation && confirmation.textContent.includes("Client dashboard update published");
    `)
  );

  console.log(`✓ Client Updates: published tagged update for ${program.intake.programName}.`);
}

async function verifyClientPortal(session, smokeText) {
  await session.navigate(`${baseUrl}/client?clientDashboardSmoke=${Date.now()}`);
  await session.waitFor("Client Portal smoke text", () =>
    session.execute("return document.body.innerText.includes(arguments[0]);", [smokeText])
  );
  console.log("✓ Client Updates: Client Portal renders the published dashboard input.");
}

async function cleanup(session, program, smokeText) {
  if (!shouldCleanup) return;

  const result = await session.execute(
    `
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/client-updates", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tag: arguments[1] })
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        payload: await response.json().catch(() => ({}))
      }));
    `,
    [program.id, smokeText]
  );

  if (!result.ok) {
    throw new Error(`Client Updates smoke cleanup failed with HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
  }

  console.log(`✓ Client Updates: pruned ${result.payload.deletedCount ?? 0} smoke update(s).`);
}

await withSafariBrowser(async (session) => {
  await authenticate(session);
  const program = await selectProgram(session);
  const smokeText = `North Star client dashboard smoke ${Date.now()}`;

  await session.navigate(`${baseUrl}/client-updates`);
  await session.waitFor("Client Updates console", () =>
    session.execute("return Boolean(document.querySelector('[data-client-dashboard-updates-console]'));")
  );
  await selectProgramInUi(session, program);
  await publishClientDashboardUpdate(session, program, smokeText);
  await verifyClientPortal(session, smokeText);
  await cleanup(session, program, smokeText);
});

console.log("Client Updates smoke passed.");
