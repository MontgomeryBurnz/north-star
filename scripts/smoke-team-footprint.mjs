import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sitePassword = process.env.NORTHSTAR_SITE_PASSWORD ?? process.env.SITE_ACCESS_PASSWORD;
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
const targetProgramName = process.env.NORTHSTAR_SMOKE_PROGRAM_NAME ?? "";
const authMode = (process.env.NORTHSTAR_SMOKE_AUTH_MODE ?? "auto").toLowerCase();

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Set ${label} or the matching app env var before running this smoke test.`);
}

async function authenticate(session) {
  await session.navigate(`${baseUrl}/login?redirect=%2Factive-program`);
  await session.waitFor("login page origin", () =>
    session.execute("return location.origin === arguments[0];", [baseUrl])
  );

  if (authMode !== "site" && testUserEmail && testUserPassword) {
    const userResult = await session.execute(
      `
        return fetch("/api/auth/user/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: arguments[0], password: arguments[1] })
        }).then((response) => response.status);
      `,
      [testUserEmail, testUserPassword]
    );

    if (userResult !== 200) {
      throw new Error(`User authentication failed with HTTP ${userResult}.`);
    }
    return;
  }

  const requiredSitePassword = requireCredential(sitePassword, "NORTHSTAR_SITE_PASSWORD");
  const siteResult = await session.execute(
    `
      return fetch("/api/auth/site-access/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: arguments[0] })
      }).then((response) => response.status);
    `,
    [requiredSitePassword]
  );

  if (siteResult !== 200) {
    throw new Error(`Site authentication failed with HTTP ${siteResult}.`);
  }
}

async function selectProgram(session) {
  const programs = await session.execute(`
    return fetch("/api/programs", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
      .then((payload) => payload.programs.map((program) => ({
        id: program.id,
        name: program.intake.programName,
        teamFootprint: program.intake.teamFootprint ?? []
      })));
  `);

  if (!programs.length) {
    throw new Error("No programs available for Team Footprint smoke.");
  }

  const wanted = targetProgramName.trim().toLowerCase();
  return wanted
    ? programs.find((program) => program.name.toLowerCase().includes(wanted)) ?? programs[0]
    : programs[0];
}

async function patchFootprint(session, programId, teamFootprint) {
  const result = await session.execute(
    `
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamFootprint: arguments[1] })
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        payload: await response.json().catch(() => ({}))
      }));
    `,
    [programId, teamFootprint]
  );

  if (!result.ok) {
    throw new Error(`Team Footprint PATCH failed with HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
  }

  return result.payload;
}

async function verifyGuidedPlanConsumesFootprint(session, programId, roleName, owner, responsibility) {
  const state = await session.waitFor("Guided Plans footprint consumption", async () => {
    return session.execute(
      `
        return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/bundle", { cache: "no-store" })
          .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
          .then((bundle) => {
            const roles = bundle.plan?.rolePlans?.roles ?? [];
            const role = roles.find((item) => item.role === arguments[1]);
            return role
              ? { found: true, summary: JSON.stringify(role) }
              : false;
          });
      `,
      [programId, roleName]
    );
  }, 120_000);

  if (!state?.found || (!state.summary.includes(owner) && !state.summary.includes(responsibility))) {
    throw new Error(`Guided Plans did not consume Team Footprint role ${roleName}: ${JSON.stringify(state)}`);
  }

  await session.navigate(`${baseUrl}/systems?smoke=team-footprint`);
  await session.waitFor("Guided Plans page loads after footprint edit", () =>
    session.execute(`
      const text = document.body.textContent ?? "";
      return text.includes("Guided Plans") || text.includes("Team Action Plans") || text.includes("Select a program");
    `)
  );
}

async function verifyClientPortalConsumesFootprint(session, roleName, responsibility) {
  await session.navigate(`${baseUrl}/client?smoke=team-footprint`);
  const state = await session.waitFor("Client Portal footprint consumption", async () => {
    return session.execute(
      `
        const text = document.body.textContent ?? "";
        const state = {
          hasRole: text.includes(arguments[0]),
          hasResponsibility: text.includes(arguments[1]),
          hasPortal: text.includes("Portfolio Dashboard") || text.includes("Workstream Status")
        };
        return state.hasPortal && state.hasRole && state.hasResponsibility ? state : false;
      `,
      [roleName, responsibility]
    );
  }, 30_000);

  if (!state.hasPortal || !state.hasRole || !state.hasResponsibility) {
    throw new Error(`Client Portal did not consume Team Footprint: ${JSON.stringify(state)}`);
  }
}

async function main() {
  await withSafariBrowser(async (session) => {
    await session.command("POST", "/timeouts", { script: 180_000 });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const roleName = `North Star Smoke Role ${stamp}`;
    const owner = `Codex QA Owner ${stamp}`;
    const responsibility = `Validate Team Footprint propagation ${stamp}`;
    let program = null;
    let originalFootprint = null;

    try {
      await authenticate(session);
      program = await selectProgram(session);
      originalFootprint = program.teamFootprint;

      const nextFootprint = [
        ...originalFootprint.filter((item) => !String(item.role ?? "").startsWith("North Star Smoke Role")),
        {
          active: true,
          id: `north-star-smoke-role-${stamp}`,
          owner,
          responsibility,
          role: roleName
        }
      ];

      await patchFootprint(session, program.id, nextFootprint);
      await verifyGuidedPlanConsumesFootprint(session, program.id, roleName, owner, responsibility);
      await verifyClientPortalConsumesFootprint(session, roleName, responsibility);

      console.log(`✓ Team Footprint: ${roleName} reached Guided Plans and Client Portal.`);
    } finally {
      if (program && originalFootprint) {
        await patchFootprint(session, program.id, originalFootprint);
        console.log(`✓ Team Footprint: restored original footprint for ${program.name}.`);
      }
    }
  });

  console.log("Team Footprint production smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
