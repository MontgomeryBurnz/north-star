import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sitePassword = process.env.NORTHSTAR_SITE_PASSWORD ?? process.env.SITE_ACCESS_PASSWORD;
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
const leadershipUsername = process.env.NORTHSTAR_LEADERSHIP_USERNAME ?? process.env.LEADERSHIP_AUTH_USERNAME ?? "leadership";
const leadershipPassword = process.env.NORTHSTAR_LEADERSHIP_PASSWORD ?? process.env.LEADERSHIP_AUTH_PASSWORD;

const surfaces = [
  { name: "Guided Plans", path: "/systems" },
  { name: "Leadership", path: "/leadership" },
  { name: "Guide", path: "/assistant" },
  { name: "Active Program", path: "/active-program?mode=manage" }
];

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Set ${label} or the matching app env var before running this smoke test.`);
}

async function authenticate(session) {
  await session.navigate(`${baseUrl}/login?redirect=%2F`);
  await session.waitFor("login page origin", () =>
    session.execute("return location.origin === arguments[0];", [baseUrl])
  );

  if (testUserEmail && testUserPassword) {
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
  const requiredLeadershipPassword = requireCredential(leadershipPassword, "NORTHSTAR_LEADERSHIP_PASSWORD");

  const authResult = await session.execute(
    `
      const sitePassword = arguments[0];
      const leadershipUsername = arguments[1];
      const leadershipPassword = arguments[2];

      return fetch("/api/auth/site-access/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: sitePassword })
      }).then((site) => fetch("/api/auth/leadership/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: leadershipUsername, password: leadershipPassword })
      }).then((leadership) => ({
        site: site.status,
        leadership: leadership.status
      })));
    `,
    [requiredSitePassword, leadershipUsername, requiredLeadershipPassword]
  );

  if (authResult.site !== 200 || authResult.leadership !== 200) {
    throw new Error(`Authentication failed. Site=${authResult.site}; leadership=${authResult.leadership}.`);
  }
}

function buildSmokePath(path, smoke) {
  const delimiter = path.includes("?") ? "&" : "?";
  return `${path}${delimiter}smoke=${smoke}`;
}

async function smokeProgramHubLanding(session) {
  await session.navigate(`${baseUrl}/active-program?smoke=program-hub-landing`);
  await session.waitFor("Program Hub landing entries", async () => {
    const state = await session.execute(`
      const landing = document.querySelector("[data-program-hub-landing]");
      const setup = document.querySelector('[data-program-hub-entry="setup"]');
      const manage = document.querySelector('[data-program-hub-entry="manage"]');
      return {
        landing: Boolean(landing),
        setupHref: setup?.getAttribute("href") ?? "",
        manageHref: manage?.getAttribute("href") ?? "",
        text: document.body.textContent ?? ""
      };
    `);

    return (
      state.landing &&
      state.setupHref.includes("mode=setup") &&
      state.manageHref.includes("mode=manage") &&
      state.text.includes("Set Up New Program") &&
      state.text.includes("Manage Active Program")
    );
  }, 15_000);

  await session.execute('document.querySelector("[data-program-hub-entry=\\"manage\\"]")?.click();');
  await session.waitFor("Program Hub manage route", async () => {
    const state = await session.execute(`
      return {
        search: location.search,
        hasSlicer: Boolean(document.querySelector("[data-program-slicer]")),
        title: document.body.textContent.includes("What changed, who owns it, and what needs action?")
      };
    `);

    return state.search.includes("mode=manage") && state.hasSlicer && state.title;
  }, 15_000);

  console.log("✓ Program Hub: landing routes into the active management workspace.");
}

async function smokeSurface(session, surface) {
  await session.navigate(`${baseUrl}${buildSmokePath(surface.path, "slicers")}`);
  await session.waitFor(`${surface.name} program slicer`, async () => {
    const count = await session.execute("return document.querySelectorAll('[data-program-slicer]').length;");
    return count > 0;
  });
  await session.waitFor(`${surface.name} program slicer options`, async () => {
    const state = await session.execute(`
      const slicer = document.querySelector("[data-program-slicer]");
      const button = slicer?.querySelector('button[aria-haspopup="listbox"]');
      return {
        disabled: button?.disabled ?? true,
        loginVisible: document.body.textContent.includes("North Star access") && document.body.textContent.includes("Email / username"),
        text: button?.textContent?.trim() ?? ""
      };
    `);

    return !state.loginVisible && !state.disabled && state.text && !state.text.includes("No saved programs yet");
  }, 15_000);

  const before = await session.execute(`
    const slicer = document.querySelector("[data-program-slicer]");
    const button = slicer?.querySelector('button[aria-haspopup="listbox"]');
    return {
      buttonText: button?.textContent?.trim() ?? "",
      expanded: button?.getAttribute("aria-expanded") ?? "",
      loginVisible: document.body.textContent.includes("North Star access") && document.body.textContent.includes("Email / username")
    };
  `);

  if (before.loginVisible) {
    throw new Error(`${surface.name} redirected to the site login.`);
  }

  await session.execute('document.querySelector("[data-program-slicer] button[aria-haspopup=\\"listbox\\"]")?.click();');
  await session.waitFor(`${surface.name} open listbox`, async () => {
    const expanded = await session.execute(`
      const button = document.querySelector('[data-program-slicer] button[aria-haspopup="listbox"]');
      return button?.getAttribute("aria-expanded") === "true" && document.querySelectorAll('[role="option"]').length > 0;
    `);
    return expanded;
  });

  const optionCount = await session.execute("return document.querySelectorAll('[role=\"option\"]').length;");
  if (optionCount < 1) {
    throw new Error(`${surface.name} has no selectable program options.`);
  }

  const optionText = await session.execute(`
    const option = document.querySelector('[role="option"]');
    const label = option?.textContent?.split("\\n")[0]?.trim() ?? "";
    option?.click();
    return label;
  `);

  await session.waitFor(`${surface.name} selected program`, async () => {
    const selected = await session.execute(`
      const slicer = document.querySelector("[data-program-slicer]");
      const button = slicer?.querySelector('button[aria-haspopup="listbox"]');
      return {
        text: button?.textContent?.trim() ?? "",
        expanded: button?.getAttribute("aria-expanded") ?? "",
        listboxOpen: Boolean(document.querySelector('[role="listbox"]'))
      };
    `);

    return selected.expanded === "false" && !selected.listboxOpen && selected.text && !selected.text.includes("Select a program");
  });

  console.log(`✓ ${surface.name}: opened slicer and selected ${optionText || "a saved program"}.`);
}

async function smokeAdminProgramRoleSelect(session) {
  await session.navigate(`${baseUrl}/admin?smoke=admin-program-role-select`);
  await session.waitFor("Admin program role select", async () => {
    const state = await session.execute(`
      const select = document.querySelector("[data-admin-program-select]");
      return {
        found: Boolean(select),
        loginVisible: document.body.textContent.includes("North Star access") && document.body.textContent.includes("Email / username"),
        leadershipLoginVisible: document.body.textContent.includes("Leadership login"),
        optionCount: select?.options?.length ?? 0
      };
    `);

    return !state.loginVisible && !state.leadershipLoginVisible && state.found && state.optionCount > 1;
  }, 15_000);

  const selectedProgram = await session.execute(`
    const select = document.querySelector("[data-admin-program-select]");
    select.selectedIndex = 1;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return select.options[select.selectedIndex]?.textContent?.trim() ?? "";
  `);

  await session.waitFor("Admin role coverage loaded", async () => {
    const state = await session.execute(`
      const roleSelect = document.querySelector("[data-admin-role-select]");
      const roleCoverage = document.querySelector("[data-admin-role-coverage]");
      return {
        roleOptionCount: roleSelect?.options?.length ?? 0,
        roleCoverageText: roleCoverage?.textContent?.trim() ?? ""
      };
    `);

    return state.roleOptionCount > 1 && state.roleCoverageText && !state.roleCoverageText.includes("No program");
  }, 15_000);

  console.log(`✓ Admin: selected ${selectedProgram || "a saved program"} and loaded role coverage.`);
}

async function main() {
  await withSafariBrowser(async (session) => {
    await authenticate(session);
    await smokeProgramHubLanding(session);

    for (const surface of surfaces) {
      await smokeSurface(session, surface);
    }

    await smokeAdminProgramRoleSelect(session);
  });

  console.log("Program slicer browser smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
