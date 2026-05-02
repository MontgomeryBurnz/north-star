import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile(process.env.NORTHSTAR_ENV_FILE ?? ".env.local");

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
const targetProgram = (process.env.NORTHSTAR_SMOKE_PROGRAM_NAME ?? "").trim().toLowerCase();
const targetRole = (process.env.NORTHSTAR_SMOKE_STUDIO_ROLE ?? "Product Management").trim();
const targetBrief = (process.env.NORTHSTAR_SMOKE_STUDIO_BRIEF ?? "").trim().toLowerCase();
const exportFormat = (process.env.NORTHSTAR_SMOKE_EXPORT_FORMAT ?? "csv").trim().toLowerCase();

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

  const loginStatus = await session.execute(
    `
      return fetch("/api/auth/user/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: arguments[0], password: arguments[1] })
      }).then((response) => response.status);
    `,
    [email, password]
  );

  if (loginStatus !== 200) {
    throw new Error(`User authentication failed with HTTP ${loginStatus}.`);
  }
}

async function selectProgram(session) {
  await session.navigate(`${baseUrl}/artifacts?smoke=studio`);
  await session.waitFor("Studio program slicer", async () => {
    const state = await session.execute(`
      const slicer = document.querySelector("[data-program-slicer]");
      const button = slicer?.querySelector('button[aria-haspopup="listbox"]');
      return {
        found: Boolean(slicer && button),
        loginVisible: document.body.textContent.includes("North Star access"),
        disabled: button?.disabled ?? true
      };
    `);

    return state.found && !state.loginVisible && !state.disabled;
  }, 20_000);

  await session.execute('document.querySelector("[data-program-slicer] button[aria-haspopup=\\"listbox\\"]")?.click();');
  await session.waitFor("Studio program options", () =>
    session.execute("return document.querySelectorAll('[role=\"option\"]').length > 0;")
  );

  const selected = await session.execute(
    `
      const preferred = arguments[0];
      const options = Array.from(document.querySelectorAll('[role="option"]'));
      const option = preferred
        ? options.find((item) => item.textContent.toLowerCase().includes(preferred))
        : options[0];

      if (!option) {
        return {
          error: "No matching program option.",
          options: options.map((item) => item.textContent.trim()).slice(0, 8)
        };
      }

      option.click();
      return { label: option.textContent.trim() };
    `,
    [targetProgram]
  );

  if (selected?.error) {
    throw new Error(`${selected.error} Available: ${selected.options.join(" | ")}`);
  }

  await session.waitFor("Studio selected program", () =>
    session.execute(`
      const button = document.querySelector('[data-program-slicer] button[aria-haspopup="listbox"]');
      return button?.getAttribute("aria-expanded") === "false" && !button.textContent.includes("Select a program");
    `)
  );

  return selected.label;
}

async function selectRole(session) {
  await session.waitFor("Studio role select", () =>
    session.execute(`
      const select = document.querySelector("[data-studio-role-select]");
      return Boolean(select && !select.disabled && select.options.length > 1);
    `)
  );

  const selected = await session.execute(
    `
      const target = arguments[0].toLowerCase();
      const select = document.querySelector("[data-studio-role-select]");
      const options = Array.from(select.options).filter((option) => option.value);
      const option = options.find((item) => item.value.toLowerCase() === target)
        ?? options.find((item) => item.textContent.toLowerCase().includes(target));

      if (!option) {
        return {
          error: "No matching Studio role.",
          options: options.map((item) => item.textContent.trim())
        };
      }

      select.value = option.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { label: option.textContent.trim(), value: option.value };
    `,
    [targetRole]
  );

  if (selected?.error) {
    throw new Error(`${selected.error} Available: ${selected.options.join(" | ")}`);
  }

  await session.waitFor("Studio recommended briefs", () =>
    session.execute("return document.querySelectorAll('[data-studio-load-brief]').length > 0;")
  );

  return selected.label;
}

async function loadBrief(session) {
  const loaded = await session.execute(
    `
      const preferred = arguments[0];
      const buttons = Array.from(document.querySelectorAll("[data-studio-load-brief]"));
      const button = preferred
        ? buttons.find((item) => item.textContent.toLowerCase().includes(preferred))
        : buttons[0];

      if (!button) return { error: "No matching brief button." };
      const label = button.textContent.trim();
      button.click();
      return { label };
    `,
    [targetBrief]
  );

  if (loaded?.error) {
    throw new Error(loaded.error);
  }

  await session.waitFor("Studio workbench brief loaded", () =>
    session.execute(`
      const generate = document.querySelector("[data-studio-generate-artifact]");
      const brief = document.querySelector("textarea");
      return Boolean(generate && !generate.disabled && brief?.value?.trim());
    `)
  );

  return loaded.label;
}

async function generateArtifact(session) {
  await session.execute('document.querySelector("[data-studio-generate-artifact]")?.click();');
  await session.waitFor("Studio generated artifact", () =>
    session.execute(`
      const output = document.querySelector("[data-studio-artifact-output]");
      const csv = document.querySelector("[data-studio-export-csv]");
      const docx = document.querySelector("[data-studio-export-docx]");
      const slice = output?.querySelector("details:not([open]) summary");
      return Boolean(
        slice?.textContent.includes("Slice")
        && !output?.textContent.includes("Generated work product")
        && !output?.textContent.includes("Inputs behind this artifact")
        && csv
        && docx
        && !csv.disabled
        && !docx.disabled
      );
    `),
    75_000
  );
}

async function patchDownloadCapture(session) {
  await session.execute(`
    window.__northStarSmokeDownloads = [];
    if (!window.__northStarSmokeDownloadPatched) {
      HTMLAnchorElement.prototype.click = function () {
        window.__northStarSmokeDownloads.push({
          download: this.download,
          hrefPrefix: String(this.href).slice(0, 16)
        });
      };
      window.__northStarSmokeDownloadPatched = true;
    }
  `);
}

async function clickExport(session, selector, extension) {
  await session.execute("document.querySelector(arguments[0])?.click();", [selector]);
  await session.waitFor(`Studio ${extension.toUpperCase()} export`, () =>
    session.execute(
      `
        return window.__northStarSmokeDownloads?.some((download) =>
          download.download?.toLowerCase().endsWith(arguments[0])
        );
      `,
      [extension]
    ),
    20_000
  );
}

async function verifyExport(session) {
  await patchDownloadCapture(session);

  if (exportFormat === "docx" || exportFormat === "both") {
    await clickExport(session, "[data-studio-export-docx]", ".docx");
  }

  if (exportFormat === "csv" || exportFormat === "both") {
    await clickExport(session, "[data-studio-export-csv]", ".csv");
  }

  const downloads = await session.execute("return window.__northStarSmokeDownloads ?? [];");
  return downloads.map((download) => download.download).join(", ");
}

async function main() {
  await withSafariBrowser(async (session) => {
    await authenticate(session);
    const program = await selectProgram(session);
    const role = await selectRole(session);
    const brief = await loadBrief(session);
    await generateArtifact(session);
    const downloads = await verifyExport(session);

    console.log(`✓ Studio program selected: ${program}`);
    console.log(`✓ Studio role selected: ${role}`);
    console.log(`✓ Studio brief loaded: ${brief}`);
    console.log("✓ Studio artifact generated.");
    console.log(`✓ Studio export verified: ${downloads}`);
  });

  console.log("Studio browser smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
