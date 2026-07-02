import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
const targetProgramName = process.env.NORTHSTAR_SMOKE_PROGRAM_NAME ?? "";
const cleanupMode = (
  process.env.NORTHSTAR_CLIENT_PORTAL_SMOKE_CLEANUP ??
  process.env.NORTHSTAR_SMOKE_CLEANUP ??
  "prune"
).toLowerCase();
const shouldCleanup = ["1", "true", "prune", "refresh"].includes(cleanupMode);
const shouldRefreshAfterCleanup =
  cleanupMode === "refresh" ||
  process.env.NORTHSTAR_CLIENT_PORTAL_SMOKE_REFRESH_AFTER_CLEANUP === "true" ||
  process.env.NORTHSTAR_SMOKE_REFRESH_AFTER_CLEANUP === "true";
const shouldCaptureScreenshots = process.env.NORTHSTAR_CLIENT_PORTAL_SCREENSHOT_SMOKE !== "false";
const screenshotDirectory =
  process.env.NORTHSTAR_CLIENT_PORTAL_SCREENSHOT_DIR ??
  process.env.NORTHSTAR_SMOKE_SCREENSHOT_DIR ??
  "/tmp/north-star-smoke-screenshots";

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Set ${label} before running the logged-in Client Portal smoke test.`);
}

function formatDateInput(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildScheduleWindow() {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(utcToday);
  start.setUTCDate(utcToday.getUTCDate() - 1);
  const finish = new Date(utcToday);
  finish.setUTCDate(utcToday.getUTCDate() + 1);
  return {
    expectedPercent: 50,
    finishDate: formatDateInput(finish),
    startDate: formatDateInput(start)
  };
}

function safeFileSegment(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "client-portal";
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
    throw new Error(`Client Portal smoke user authentication failed with HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
  }

  console.log(`✓ Client Portal: signed in with QA user ${email}.`);
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
    throw new Error(
      `Client Portal smoke could not list programs with the logged-in user. ` +
        `Use a QA user with Admin, Leadership, Delivery Lead, or Team Member access. HTTP ${result.status}: ${JSON.stringify(result.payload)}`
    );
  }

  const programs = result.payload?.programs ?? [];
  if (!programs.length) {
    throw new Error("No programs are available for the Client Portal smoke test.");
  }

  const wanted = targetProgramName.trim().toLowerCase();
  const selectedProgram =
    (wanted
      ? programs.find((program) => program.intake?.programName?.toLowerCase().includes(wanted))
      : undefined) ?? programs[0];

  if (!selectedProgram?.id || !selectedProgram?.intake?.programName) {
    throw new Error("Client Portal smoke received an invalid program payload.");
  }

  console.log(`✓ Client Portal: selected ${selectedProgram.intake.programName}.`);
  return selectedProgram;
}

async function cleanupStaleClientPortalUpdates(session, program) {
  const staleTags = await session.execute(
    `
      const smokeTagPattern = /North Star active-program save smoke client-portal [0-9]+/g;
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/client-updates", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
        .then((payload) => Array.from(new Set(
          payload.updates
            .flatMap((update) => JSON.stringify(update).match(smokeTagPattern) ?? [])
        )));
    `,
    [program.id]
  );

  if (!staleTags.length) return;

  for (const tag of staleTags) {
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
      [program.id, tag]
    );

    if (!result.ok) {
      throw new Error(`Client Portal smoke stale cleanup failed with HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
    }
  }

  console.log(`✓ Client Portal: pruned ${staleTags.length} stale client-portal smoke tag${staleTags.length === 1 ? "" : "s"}.`);
}

function buildSeededReview(program, smokeText) {
  const primaryRole = program.intake.teamRoles?.[0] ?? "Delivery Lead";
  const now = new Date().toISOString();
  const schedule = buildScheduleWindow();

  return {
    activeRisks: `Client Portal smoke top risk ${smokeText}: dependency pressure requires executive visibility.`,
    artifacts: [],
    clientStatusNote: `Client Portal smoke status ${smokeText}: executive dashboard should render this update.`,
    clientRoadmapItems: [
      {
        category: "Component",
        endMonth: "2026-06",
        id: `client-portal-smoke-roadmap-${Date.now()}`,
        note: `Client Portal smoke roadmap note ${smokeText}.`,
        owner: "Client Portal Smoke",
        startMonth: "2026-05",
        status: "in-progress",
        title: `Client Portal smoke roadmap item ${smokeText}`
      }
    ],
    completionDelta: "+5%",
    currentPhase: "Execute",
    decisionsPending: `Client Portal smoke decision ${smokeText}: approve milestone protection path.`,
    deliveryBoardItems: [
      {
        attachments: [],
        createdAt: now,
        description: `Client Portal smoke delivery board item ${smokeText}.`,
        dueDate: "2026-05-08",
        id: `client-portal-smoke-${Date.now()}`,
        latestNote: `Client Portal smoke board note ${smokeText}.`,
        owner: "Client Portal Smoke",
        role: primaryRole,
        sharedRoles: [],
        startDate: "2026-05-01",
        status: "needs-review",
        title: `Client Portal smoke board item ${smokeText}`,
        updatedAt: now
      }
    ],
    deliveryHealth: "At risk from client portal smoke validation.",
    executiveSponsor: "Client Portal Smoke Sponsor",
    nextMilestoneDate: "2026-05-08",
    nextMilestoneName: `Client Portal smoke milestone ${smokeText}`,
    nextMilestonePriority: "High",
    overallStatus: "amber",
    originalNorthStar: program.intake.vision || `Client Portal smoke north star ${smokeText}.`,
    pmo: "Client Portal Smoke PMO",
    programCompletionPercent: "",
    programStartDate: schedule.startDate,
    programTargetFinishDate: schedule.finishDate,
    programLead: "Client Portal Smoke Lead",
    programName: program.intake.programName,
    executiveOverview: `Client Portal smoke synthesis ${smokeText}: program signal was generated from a reviewed client update.`,
    progressSinceLastReview: `Client Portal smoke progress ${smokeText}: role updates are feeding the executive view.`,
    supportNeeded: `Client Portal smoke support ${smokeText}: keep leadership decision path clear.`,
    timelineScale: "year",
    timelineYear: "FY99",
    timelineMonth: "",
    timelineWeek: "",
    programMilestones: [
      {
        id: `client-portal-smoke-intake-${Date.now()}`,
        name: `Client Portal smoke intake gate ${smokeText}`,
        date: "2026-05-01",
        status: "complete",
        priority: "Low",
        note: `Client Portal smoke intake note ${smokeText}.`
      },
      {
        id: `client-portal-smoke-current-${Date.now()}`,
        name: `Client Portal smoke milestone ${smokeText}`,
        date: "2026-05-08",
        status: "current",
        priority: "High",
        note: `Client Portal smoke current checkpoint ${smokeText}.`
      },
      {
        id: `client-portal-smoke-value-${Date.now()}`,
        name: `Client Portal smoke value gate ${smokeText}`,
        date: "2026-05-22",
        status: "next",
        priority: "Medium",
        note: `Client Portal smoke value checkpoint ${smokeText}.`
      }
    ],
    domainUpdates: [
      {
        attachments: 0,
        decisionsOrOutcomes: `Client Portal smoke role decision ${smokeText}.`,
        owner: "Client Portal Smoke",
        pursuit: `Client Portal smoke role progress ${smokeText}.`,
        risksOrBlockers: `Client Portal smoke role risk ${smokeText}.`,
        role: primaryRole,
        status: "at-risk"
      }
    ],
    upcomingWork: `Client Portal smoke upcoming work ${smokeText}: prepare sponsor readout.`
  };
}

async function seedProgramUpdate(session, program, smokeText) {
  const review = buildSeededReview(program, smokeText);
  await session.command("POST", "/timeouts", { script: 180_000 });

  const result = await session.execute(
    `
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/client-updates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(arguments[1])
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        payload: await response.json().catch(() => ({}))
      }));
    `,
    [program.id, review]
  );

  if (!result.ok) {
    throw new Error(`Client Portal smoke update seed failed with HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
  }

  const update = result.payload?.update;
  if (!update?.id || !update.clientStatusNote?.includes(smokeText)) {
    throw new Error(`Client Portal smoke update seed returned an unexpected payload: ${JSON.stringify(result.payload)}`);
  }

  console.log("✓ Client Portal: seeded tagged reviewed client update.");
  return { review, update };
}

async function verifyClientPortal(session, program, smokeText, review) {
  const primaryRole = program.intake.teamRoles?.[0] ?? "Delivery Lead";
  const expectedClientName = program.intake.clientName?.trim() || "Unassigned client";
  const expectedExecutiveOverview = review.executiveOverview;

  await session.navigate(`${baseUrl}/client?smoke=client-portal-seeded-update`);
  await session.waitFor("Client Portal portfolio loaded", async () => {
    return session.execute(`
      const bodyText = document.body.textContent ?? "";
      return bodyText.includes("North Star Client Portal") &&
        bodyText.includes("Portfolio Dashboard") &&
        Boolean(document.querySelector("[data-client-program-detail]"));
    `);
  }, 20_000);

  const clientSelected = await session.execute(
    `
      const options = Array.from(document.querySelectorAll("[data-client-portfolio-option]"));
      if (!options.length) return (document.body.textContent ?? "").includes(arguments[0]);
      const option = options.find((element) => (element.textContent ?? "").trim() === arguments[0]);
      option?.click();
      return Boolean(option);
    `,
    [expectedClientName]
  );

  if (!clientSelected) {
    throw new Error(`Client Portal smoke could not find client portfolio option ${expectedClientName}.`);
  }

  await session.waitFor("Client Portal selected client program visible", () =>
    session.execute(
      `
        const detail = Array.from(document.querySelectorAll("[data-client-program-detail]"))
          .some((element) => element.getAttribute("data-client-program-detail") === arguments[0]);
        const option = Array.from(document.querySelectorAll("[data-client-program-option]"))
          .some((element) => element.getAttribute("data-client-program-option") === arguments[0]);
        return detail || option;
      `,
      [program.id]
    )
  );

  const selected = await session.execute(
    `
      const detail = Array.from(document.querySelectorAll("[data-client-program-detail]"))
        .find((element) => element.getAttribute("data-client-program-detail") === arguments[0]);
      if (detail) return true;
      const option = Array.from(document.querySelectorAll("[data-client-program-option]"))
        .find((element) => element.getAttribute("data-client-program-option") === arguments[0]);
      option?.click();
      return Boolean(option);
    `,
    [program.id]
  );

  if (!selected) {
    throw new Error(`Client Portal smoke could not find the seeded program card for ${program.intake.programName}.`);
  }

  const rendered = await session.waitFor("Client Portal seeded executive fields rendered", async () => {
    const state = await session.execute(
      `
        const detail = Array.from(document.querySelectorAll("[data-client-program-detail]"))
          .find((element) => element.getAttribute("data-client-program-detail") === arguments[0]);
        const roadmapItem = detail?.querySelector("[data-client-work-roadmap-item]");
        const functionCard = Array.from(detail?.querySelectorAll("[data-client-function-update-card]") ?? [])
          .find((element) => (element.textContent ?? "").includes(arguments[2]));
        const detailText = detail?.textContent ?? "";
        const roadmapText = roadmapItem?.textContent ?? "";
        const functionText = functionCard?.textContent ?? "";

        return {
          detail: Boolean(detail),
          functionText,
          roadmap: Boolean(roadmapItem),
          roadmapText,
          detailText,
          ok: Boolean(detail) &&
            Boolean(roadmapItem) &&
            Boolean(functionCard) &&
            roadmapText.includes("Client Portal smoke roadmap item") &&
            roadmapText.includes("In progress") &&
            detailText.includes("Client Portal Smoke Sponsor") &&
            !detailText.includes("Client Portal Smoke Lead") &&
            !detailText.includes("Client Portal Smoke PMO") &&
            !detailText.includes("% Complete") &&
            !detailText.includes("At risk in Execute. Focus:") &&
            detailText.includes("Execute") &&
            detailText.includes(arguments[3]) &&
            detailText.includes("approve milestone protection path") &&
            functionText.includes("Client Portal smoke role progress")
        };
      `,
      [program.id, smokeText, primaryRole, expectedExecutiveOverview]
    );

    return state.ok ? state : false;
  }, 20_000);

  if (!rendered.ok) {
    throw new Error("Client Portal smoke did not render seeded executive fields from the saved update.");
  }

  await captureClientPortalScreenshots(session, program, smokeText);
  await verifyClientPortalPdfExport(session, program, smokeText);
  console.log("✓ Client Portal: portfolio and program detail rendered executive fields from the seeded update.");
}

async function verifyClientPortalPdfExport(session, program, smokeText) {
  const state = await session.execute(
    `
      return fetch("/api/client-portal/export/pdf?scope=program&programId=" + encodeURIComponent(arguments[0]), {
        cache: "no-store"
      }).then(async (response) => {
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let text = "";
        for (let index = 0; index < bytes.length; index += 8192) {
          text += String.fromCharCode(...bytes.slice(index, Math.min(index + 8192, bytes.length)));
        }
        return {
          contentDisposition: response.headers.get("content-disposition") ?? "",
          contentType: response.headers.get("content-type") ?? "",
          includesExecutiveSummary: text.includes("EXECUTIVE SUMMARY"),
          includesRoadmap: text.includes("Roadmap") && text.includes(arguments[1]),
          includesSmokeText: text.includes(arguments[2]),
          includesUpcomingWork: text.includes("Upcoming Work"),
          hasReportBasis: /Report Basis/i.test(text),
          ok: response.ok,
          signature: text.slice(0, 5),
          size: bytes.length,
          status: response.status
        };
      });
    `,
    [program.id, program.intake.programName.replace(/\b(application|app)\s+build\b/gi, "").replace(/\bbuild\b/gi, "").trim() || program.intake.programName, smokeText]
  );

  if (
    !state.ok ||
    state.signature !== "%PDF-" ||
    state.size < 1000 ||
    !state.contentType.includes("application/pdf") ||
    !state.contentDisposition.includes(".pdf") ||
    !state.includesExecutiveSummary ||
    !state.includesRoadmap ||
    !state.includesSmokeText ||
    !state.includesUpcomingWork ||
    state.hasReportBasis
  ) {
    throw new Error(`Client Portal PDF export smoke failed: ${JSON.stringify(state)}`);
  }

  console.log("✓ Client Portal: PDF export is nonblank and aligned to the visible portal sections.");
}

async function assertClientPortalLayout(session, program, label) {
  const state = await session.execute(
    `
      const detail = Array.from(document.querySelectorAll("[data-client-program-detail]"))
        .find((element) => element.getAttribute("data-client-program-detail") === arguments[0]);
      const hero = detail?.querySelector("[data-client-program-hero]");
      const metrics = Array.from(detail?.querySelectorAll("[data-client-hero-metric]") ?? []);
      const phaseMetric = detail?.querySelector("[data-client-hero-metric='current-phase']");
      const phaseText = (phaseMetric?.textContent ?? "").replace(/\\s+/g, " ").trim();
      const viewportWidth = document.documentElement.clientWidth;
      const documentWidth = document.documentElement.scrollWidth;
      const heroRect = hero?.getBoundingClientRect();
      const metricRects = metrics.map((metric) => metric.getBoundingClientRect());
      const minimumMetricWidth = viewportWidth < 600 ? 72 : Math.min(180, heroRect?.width ?? 180);
      const metricInsideHero = Boolean(heroRect) && metricRects.every((rect) =>
        rect.left >= heroRect.left - 2 &&
        rect.right <= heroRect.right + 2 &&
        rect.width >= minimumMetricWidth
      );

      return {
        documentWidth,
        hero: Boolean(hero),
        heroHeight: heroRect?.height ?? 0,
        heroWidth: heroRect?.width ?? 0,
        minimumMetricWidth,
        metricCount: metrics.length,
        metricInsideHero,
        ok: Boolean(hero) &&
          metrics.length === 2 &&
          metricInsideHero &&
          !phaseText.includes("Right now") &&
          !phaseText.includes("working to") &&
          phaseText.length <= 80 &&
          documentWidth <= viewportWidth + 8 &&
          (heroRect?.height ?? 9999) <= (viewportWidth < 600 ? 820 : 520),
        phaseText,
        viewportWidth
      };
    `,
    [program.id]
  );

  if (!state.ok) {
    throw new Error(`Client Portal ${label} screenshot layout guard failed: ${JSON.stringify(state)}`);
  }

  return true;
}

async function captureClientPortalScreenshots(session, program, smokeText) {
  if (!shouldCaptureScreenshots) {
    console.log("ℹ Client Portal screenshot smoke skipped.");
    return;
  }

  mkdirSync(screenshotDirectory, { recursive: true });
  const slug = safeFileSegment(`${program.intake.programName}-${smokeText}`);
  const desktopPath = join(screenshotDirectory, `${slug}-client-portal-desktop.png`);
  const mobilePath = join(screenshotDirectory, `${slug}-client-portal-mobile.png`);

  await session.setWindowRect({ height: 1100, width: 1440, x: 0, y: 0 });
  await session.waitFor("Client Portal desktop screenshot layout", () => assertClientPortalLayout(session, program, "desktop"));
  await session.screenshot(desktopPath);

  await session.setWindowRect({ height: 900, width: 390, x: 0, y: 0 });
  await session.waitFor("Client Portal mobile screenshot layout", () => assertClientPortalLayout(session, program, "mobile"));
  await session.screenshot(mobilePath);

  console.log(`✓ Client Portal: captured desktop screenshot at ${desktopPath}.`);
  console.log(`✓ Client Portal: captured mobile screenshot at ${mobilePath}.`);
}

async function cleanupProgramUpdate(session, program, smokeText) {
  if (!shouldCleanup) {
    console.log("ℹ Client Portal smoke cleanup skipped. Set NORTHSTAR_CLIENT_PORTAL_SMOKE_CLEANUP=prune or refresh to remove the tagged update.");
    return;
  }

  const result = await session.execute(
    `
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/client-updates", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tag: arguments[1]
        })
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        payload: await response.json().catch(() => ({}))
      }));
    `,
    [program.id, smokeText, shouldRefreshAfterCleanup]
  );

  if (!result.ok) {
    throw new Error(`Client Portal smoke cleanup failed with HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
  }

  const deletedCount = result.payload?.deletedCount ?? 0;
  if (deletedCount < 1) {
    throw new Error("Client Portal smoke cleanup did not prune the tagged seeded update.");
  }

  const stillPresent = await session.execute(
    `
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/client-updates", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
        .then((payload) => payload.updates.some((update) => JSON.stringify(update).includes(arguments[1])));
    `,
    [program.id, smokeText]
  );

  if (stillPresent) {
    throw new Error("Client Portal smoke cleanup left the tagged seeded update visible in history.");
  }

  const refreshMessage = shouldRefreshAfterCleanup ? " and refreshed guidance" : "";
  console.log(`✓ Client Portal: pruned ${deletedCount} tagged smoke update${deletedCount === 1 ? "" : "s"}${refreshMessage}.`);
}

async function main() {
  await withSafariBrowser(async (session) => {
    const smokeId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const smokeText = `North Star active-program save smoke client-portal ${smokeId}`;
    await authenticate(session);
    const program = await selectProgram(session);
    await cleanupStaleClientPortalUpdates(session, program);
    const { review } = await seedProgramUpdate(session, program, smokeText);
    await verifyClientPortal(session, program, smokeText, review);
    await cleanupProgramUpdate(session, program, smokeText);
  });

  console.log("Logged-in Client Portal seeded update smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
