import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sitePassword = process.env.NORTHSTAR_SITE_PASSWORD ?? process.env.SITE_ACCESS_PASSWORD;
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
const authMode = (process.env.NORTHSTAR_SMOKE_AUTH_MODE ?? "auto").toLowerCase();
const screenshotDirectory = process.env.NORTHSTAR_NEW_PROGRAM_SCREENSHOT_DIR;

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Set ${label} or the matching app env var before running this smoke test.`);
}

async function authenticate(session) {
  await session.navigate(`${baseUrl}/login?redirect=%2Factive-program%3Fmode%3Dsetup`);
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

async function main() {
  await withSafariBrowser(async (session) => {
    await session.setWindowRect({ height: 1000, width: 1440, x: 0, y: 0 });
    await authenticate(session);
    await session.navigate(`${baseUrl}/active-program?mode=setup&smoke=new-program`);

    const initialState = await session.waitFor("blank New Program roster", () =>
      session.execute(`
        const editor = document.querySelector("[data-team-footprint-editor]");
        if (!editor) return false;

        const text = document.body.textContent ?? "";
        const roleRows = editor.querySelectorAll("[data-team-footprint-row]").length;
        const emptyState = Boolean(editor.querySelector("[data-team-footprint-empty]"));
        const checklist = Boolean(document.querySelector("[data-program-setup-checklist]"));

        if (!emptyState || roleRows !== 0 || !checklist) return false;

        return {
          hasDemoCopy: text.includes("Load demo program") || text.includes("Demo path"),
          roleRows
        };
      `)
    );

    if (initialState.hasDemoCopy) {
      throw new Error("New Program still exposes demo actions or demo copy.");
    }

    if (screenshotDirectory) {
      mkdirSync(screenshotDirectory, { recursive: true });
      await session.execute(`
        document.querySelector("[data-team-footprint-editor]")?.scrollIntoView({ block: "start" });
        return true;
      `);
      await delay(300);
      await session.screenshot(join(screenshotDirectory, "new-program-roster-desktop.png"));

      await session.setWindowRect({ height: 844, width: 390, x: 0, y: 0 });
      await session.execute(`
        document.querySelector("[data-team-footprint-editor]")?.scrollIntoView({ block: "start" });
        return true;
      `);
      await delay(300);
      await session.screenshot(join(screenshotDirectory, "new-program-roster-mobile.png"));
      await session.setWindowRect({ height: 1000, width: 1440, x: 0, y: 0 });
    }

    const clicked = await session.execute(`
      const role = document.querySelector('[data-team-footprint-role-chip="Delivery Lead"]');
      if (!role) return false;
      role.click();
      return true;
    `);

    if (!clicked) {
      throw new Error("Delivery Lead role suggestion was not available.");
    }

    const addedState = await session.waitFor("single selected setup role", () =>
      session.execute(`
        const editor = document.querySelector("[data-team-footprint-editor]");
        if (!editor) return false;

        const rows = Array.from(editor.querySelectorAll("[data-team-footprint-row]"));
        if (rows.length !== 1) return false;

        return {
          emptyStateVisible: Boolean(editor.querySelector("[data-team-footprint-empty]")),
          roleValue: rows[0].querySelector("input")?.value ?? ""
        };
      `)
    );

    if (addedState.emptyStateVisible || addedState.roleValue !== "Delivery Lead") {
      throw new Error(`New Program role selection produced an unexpected roster: ${JSON.stringify(addedState)}`);
    }

    console.log("✓ New Program starts with a blank roster and adds only the selected role.");
  });

  console.log("New Program setup production smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
