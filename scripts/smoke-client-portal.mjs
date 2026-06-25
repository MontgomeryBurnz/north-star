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
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/updates", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
        .then((payload) => Array.from(new Set(
          payload.updates
            .flatMap((update) => JSON.stringify(update.review).match(smokeTagPattern) ?? [])
        )));
    `,
    [program.id]
  );

  if (!staleTags.length) return;

  for (const tag of staleTags) {
    const result = await session.execute(
      `
        return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/updates", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tag: arguments[1], refreshGuidance: false })
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
    lastUpdatedRole: primaryRole,
    nextMilestoneDate: "2026-05-08",
    nextMilestoneName: `Client Portal smoke milestone ${smokeText}`,
    nextMilestonePriority: "High",
    originalNorthStar: program.intake.vision || `Client Portal smoke north star ${smokeText}.`,
    pmo: "Client Portal Smoke PMO",
    programCompletionPercent: "",
    programStartDate: schedule.startDate,
    programTargetFinishDate: schedule.finishDate,
    programLead: "Client Portal Smoke Lead",
    programName: program.intake.programName,
    programSynthesisNote: `Client Portal smoke synthesis ${smokeText}: program signal was generated from a saved update.`,
    progressSinceLastReview: `Client Portal smoke progress ${smokeText}: role updates are feeding the executive view.`,
    stakeholderTemperature: `Client Portal smoke stakeholder signal ${smokeText}: sponsors are aligned but watching risk.`,
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
    teamRoleUpdates: [
      {
        activeRisks: `Client Portal smoke role risk ${smokeText}.`,
        attachments: [],
        blockers: "",
        changesObserved: `Client Portal smoke role change ${smokeText}.`,
        decisionsNeeded: `Client Portal smoke role decision ${smokeText}.`,
        lastUpdatedAt: now,
        needsLeadershipAttention: false,
        progressUpdate: `Client Portal smoke role progress ${smokeText}.`,
        role: primaryRole,
        status: "at-risk",
        supportNeeded: `Client Portal smoke role support ${smokeText}.`,
        updatedBy: "Client Portal Smoke"
      }
    ],
    updateCadence: "weekly",
    cycleLabel: "Client Portal smoke cycle",
    cycleStartedAt: now,
    planChanges: `Client Portal smoke plan change ${smokeText}: update seeded for render verification.`
  };
}

async function seedProgramUpdate(session, program, smokeText) {
  const review = buildSeededReview(program, smokeText);
  await session.command("POST", "/timeouts", { script: 180_000 });

  const result = await session.execute(
    `
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/updates", {
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
  if (!update?.id || !update.review?.clientStatusNote?.includes(smokeText)) {
    throw new Error(`Client Portal smoke update seed returned an unexpected payload: ${JSON.stringify(result.payload)}`);
  }

  console.log("✓ Client Portal: seeded tagged active-program update.");
  return { review, update };
}

async function verifyClientPortal(session, program, smokeText) {
  const primaryRole = program.intake.teamRoles?.[0] ?? "Delivery Lead";
  const expectedProgramPercent = `${buildScheduleWindow().expectedPercent}%`;

  await session.navigate(`${baseUrl}/client?smoke=client-portal-seeded-update`);
  await session.waitFor("Client Portal portfolio loaded", async () => {
    return session.execute(`
      const bodyText = document.body.textContent ?? "";
      return bodyText.includes("North Star Client Portal") &&
        bodyText.includes("Portfolio Dashboard") &&
        Boolean(document.querySelector("[data-client-program-card]"));
    `);
  }, 20_000);

  const selected = await session.execute(
    `
      const cards = Array.from(document.querySelectorAll("[data-client-program-card]"));
      const card = cards.find((element) => element.getAttribute("data-client-program-card") === arguments[0]);
      card?.click();
      return Boolean(card);
    `,
    [program.id]
  );

  if (!selected) {
    throw new Error(`Client Portal smoke could not find the seeded program card for ${program.intake.programName}.`);
  }

  const rendered = await session.waitFor("Client Portal seeded executive fields rendered", async () => {
    const state = await session.execute(
      `
        const card = Array.from(document.querySelectorAll("[data-client-program-card]"))
          .find((element) => element.getAttribute("data-client-program-card") === arguments[0]);
        const detail = Array.from(document.querySelectorAll("[data-client-program-detail]"))
          .find((element) => element.getAttribute("data-client-program-detail") === arguments[0]);
        const roadmapRow = Array.from(document.querySelectorAll("[data-client-roadmap-row]"))
          .find((element) => element.getAttribute("data-client-roadmap-row") === arguments[0]);
        const currentRoadmapSegment = roadmapRow?.querySelector("[data-client-roadmap-segment-state='current']");
        const roadmapMarker = roadmapRow?.querySelector("[data-client-roadmap-marker]");
        const workstreamCard = Array.from(detail?.querySelectorAll("[data-client-workstream-card]") ?? [])
          .find((element) => (element.textContent ?? "").includes(arguments[2]));
        const cardText = card?.textContent ?? "";
        const detailText = detail?.textContent ?? "";
        const workstreamText = workstreamCard?.textContent ?? "";
        const workstreamPercent = workstreamCard?.getAttribute("data-client-workstream-percent") ?? "";
        const currentRoadmapSegmentText = currentRoadmapSegment?.textContent ?? "";
        const markerPosition = roadmapMarker?.getAttribute("data-client-roadmap-marker-position") ?? "";

        return {
          card: Boolean(card),
          detail: Boolean(detail),
          currentRoadmapSegmentText,
          markerPosition,
          roadmap: Boolean(roadmapRow),
          workstreamPercent,
          workstreamText,
          cardText,
          detailText,
          ok: Boolean(card) &&
            Boolean(detail) &&
            Boolean(roadmapRow) &&
            Boolean(workstreamCard) &&
            currentRoadmapSegmentText.includes("Execute") &&
            markerPosition === "50" &&
            cardText.includes(arguments[3]) &&
            cardText.includes("Client Portal smoke milestone") &&
            detailText.includes("Client Portal Smoke Sponsor") &&
            detailText.includes("Client Portal Smoke Lead") &&
            detailText.includes("Client Portal Smoke PMO") &&
            detailText.includes(arguments[3]) &&
            detailText.includes("+5%") &&
            detailText.includes("Schedule") &&
            detailText.includes("Execute") &&
            detailText.includes("FY99") &&
            detailText.includes("Client Portal smoke milestone") &&
            detailText.includes("Client Portal smoke value gate") &&
            detailText.includes(arguments[1]) &&
            detailText.includes("approve milestone protection path") &&
            workstreamPercent === "90" &&
            workstreamText.includes("0/1 tasks done") &&
            workstreamText.includes("May 01 -> May 08")
        };
      `,
      [program.id, smokeText, primaryRole, expectedProgramPercent]
    );

    return state.ok ? state : false;
  }, 20_000);

  if (!rendered.ok) {
    throw new Error("Client Portal smoke did not render seeded executive fields from the saved update.");
  }

  console.log("✓ Client Portal: portfolio and program detail rendered executive fields from the seeded update.");
}

async function cleanupProgramUpdate(session, program, smokeText) {
  if (!shouldCleanup) {
    console.log("ℹ Client Portal smoke cleanup skipped. Set NORTHSTAR_CLIENT_PORTAL_SMOKE_CLEANUP=prune or refresh to remove the tagged update.");
    return;
  }

  const result = await session.execute(
    `
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/updates", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tag: arguments[1],
          refreshGuidance: arguments[2]
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
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/updates", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
        .then((payload) => payload.updates.some((update) => JSON.stringify(update.review).includes(arguments[1])));
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
    await seedProgramUpdate(session, program, smokeText);
    await verifyClientPortal(session, program, smokeText);
    await cleanupProgramUpdate(session, program, smokeText);
  });

  console.log("Logged-in Client Portal seeded update smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
