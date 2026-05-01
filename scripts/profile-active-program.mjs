import { performance } from "node:perf_hooks";
import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sitePassword = process.env.NORTHSTAR_SITE_PASSWORD ?? process.env.SITE_ACCESS_PASSWORD;
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;

async function authenticateSite(session) {
  if (testUserEmail && testUserPassword) {
    await session.navigate(`${baseUrl}/login?redirect=%2Factive-program`);
    await session.waitFor("login page origin", () =>
      session.execute("return location.origin === arguments[0];", [baseUrl])
    );

    const status = await session.execute(
      `
        return fetch("/api/auth/user/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: arguments[0], password: arguments[1] })
        }).then((response) => response.status);
      `,
      [testUserEmail, testUserPassword]
    );

    if (status !== 200) {
      throw new Error(`User authentication failed with HTTP ${status}.`);
    }
    return;
  }

  if (!sitePassword) return;

  await session.navigate(`${baseUrl}/login?redirect=%2Factive-program`);
  await session.waitFor("login page origin", () =>
    session.execute("return location.origin === arguments[0];", [baseUrl])
  );

  const status = await session.execute(
    `
      return fetch("/api/auth/site-access/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: arguments[0] })
      }).then((response) => response.status);
    `,
    [sitePassword]
  );

  if (status !== 200) {
    throw new Error(`Site authentication failed with HTTP ${status}.`);
  }
}

async function main() {
  await withSafariBrowser(async (session) => {
    await authenticateSite(session);

    const startedAt = performance.now();
    await session.navigate(`${baseUrl}/active-program?profile=active-program`);
    await session.waitFor("Active Program interactive shell", async () => {
      const ready = await session.execute(`
      return document.readyState === "complete" &&
        Boolean(document.querySelector('[data-program-slicer]')) &&
        !(document.body.textContent.includes("North Star access") && document.body.textContent.includes("Email / username"));
    `);
      return ready;
    }, 15_000);
    const browserReadyMs = Math.round(performance.now() - startedAt);

    const metrics = await session.execute(`
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const scripts = resources.filter((entry) => entry.initiatorType === "script");
    const stylesheets = resources.filter((entry) => entry.initiatorType === "css" || entry.name.endsWith(".css"));

    return {
      browserReadyMs: arguments[0],
      domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      loadMs: nav ? Math.round(nav.loadEventEnd) : null,
      transferKb: Math.round(resources.reduce((total, entry) => total + (entry.transferSize || 0), 0) / 1024),
      resourceCount: resources.length,
      scriptCount: scripts.length,
      stylesheetCount: stylesheets.length,
      slicerCount: document.querySelectorAll("[data-program-slicer]").length,
      cardCount: document.querySelectorAll('[class*="rounded"], [class*="Card"]').length
    };
  `, [browserReadyMs]);

    console.table(metrics);
  });

  console.log("Active Program browser profile completed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
