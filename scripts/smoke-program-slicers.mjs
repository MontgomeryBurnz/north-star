import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sitePassword = process.env.NORTHSTAR_SITE_PASSWORD ?? process.env.SITE_ACCESS_PASSWORD;
const leadershipUsername = process.env.NORTHSTAR_LEADERSHIP_USERNAME ?? process.env.LEADERSHIP_AUTH_USERNAME ?? "leadership";
const leadershipPassword = process.env.NORTHSTAR_LEADERSHIP_PASSWORD ?? process.env.LEADERSHIP_AUTH_PASSWORD;

const surfaces = [
  { name: "Guided Plans", path: "/systems" },
  { name: "Leadership", path: "/leadership" },
  { name: "Guide", path: "/assistant" },
  { name: "Active Program", path: "/active-program" }
];

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Set ${label} or the matching app env var before running this smoke test.`);
}

async function authenticate(session) {
  const requiredSitePassword = requireCredential(sitePassword, "NORTHSTAR_SITE_PASSWORD");
  const requiredLeadershipPassword = requireCredential(leadershipPassword, "NORTHSTAR_LEADERSHIP_PASSWORD");

  await session.navigate(`${baseUrl}/login?redirect=%2F`);
  await session.waitFor("login page origin", () =>
    session.execute("return location.origin === arguments[0];", [baseUrl])
  );

  const authResult = await session.execute(
    `
      const sitePassword = arguments[0];
      const leadershipUsername = arguments[1];
      const leadershipPassword = arguments[2];

      return Promise.all([
        fetch("/api/auth/site-access/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: sitePassword })
        }),
        fetch("/api/auth/leadership/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username: leadershipUsername, password: leadershipPassword })
        })
      ]).then(([site, leadership]) => ({
        site: site.status,
        leadership: leadership.status
      }));
    `,
    [requiredSitePassword, leadershipUsername, requiredLeadershipPassword]
  );

  if (authResult.site !== 200 || authResult.leadership !== 200) {
    throw new Error(`Authentication failed. Site=${authResult.site}; leadership=${authResult.leadership}.`);
  }
}

async function smokeSurface(session, surface) {
  await session.navigate(`${baseUrl}${surface.path}?smoke=slicers`);
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
        loginVisible: document.body.textContent.includes("Enter Alpha Password"),
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
      loginVisible: document.body.textContent.includes("Enter Alpha Password")
    };
  `);

  if (before.loginVisible) {
    throw new Error(`${surface.name} redirected to the site login.`);
  }

  const buttonId = await session.findByCss('[data-program-slicer] button[aria-haspopup="listbox"]');
  await session.click(buttonId);
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

  const optionId = await session.findByCss('[role="option"]');
  const optionText = (await session.text(optionId)).split("\n")[0]?.trim();
  await session.click(optionId);

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
        loginVisible: document.body.textContent.includes("Enter Alpha Password"),
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
