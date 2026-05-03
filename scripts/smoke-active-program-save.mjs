import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sitePassword = process.env.NORTHSTAR_SITE_PASSWORD ?? process.env.SITE_ACCESS_PASSWORD;
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
const targetProgramName = process.env.NORTHSTAR_SMOKE_PROGRAM_NAME ?? "";
const targetRoleName = process.env.NORTHSTAR_SMOKE_ACTIVE_ROLE ?? "";
const cleanupMode = (process.env.NORTHSTAR_SMOKE_CLEANUP ?? "off").toLowerCase();
const shouldCleanup = ["1", "true", "prune", "refresh"].includes(cleanupMode);
const shouldRefreshAfterCleanup =
  cleanupMode === "refresh" || process.env.NORTHSTAR_SMOKE_REFRESH_AFTER_CLEANUP === "true";

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Set ${label} or the matching app env var before running this smoke test.`);
}

async function authenticate(session) {
  await session.navigate(`${baseUrl}/login?redirect=%2Factive-program`);
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
  await session.navigate(`${baseUrl}/active-program?smoke=active-program-save`);
  await session.waitFor("Active Program slicer", async () => {
    const state = await session.execute(`
      const slicer = document.querySelector("[data-program-slicer]");
      const button = slicer?.querySelector('button[aria-haspopup="listbox"]');
      return {
        found: Boolean(slicer),
        disabled: button?.disabled ?? true,
        loginVisible: document.body.textContent.includes("North Star access") && document.body.textContent.includes("Email / username")
      };
    `);

    return state.found && !state.disabled && !state.loginVisible;
  }, 20_000);

  const programs = await session.execute(`
    return fetch("/api/programs", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
      .then((payload) => payload.programs.map((program) => ({ id: program.id, label: program.intake.programName })));
  `);

  if (!programs.length) {
    throw new Error("No programs available for Active Program save smoke.");
  }

  const selectedProgram =
    programs.find((program) => program.label.toLowerCase().includes(argumentsTarget(targetProgramName))) ?? programs[0];

  await session.execute('document.querySelector("[data-program-slicer] button[aria-haspopup=\\"listbox\\"]")?.click();');
  await session.waitFor("Active Program open listbox", async () => {
    return session.execute(`
      const button = document.querySelector('[data-program-slicer] button[aria-haspopup="listbox"]');
      return button?.getAttribute("aria-expanded") === "true" && document.querySelectorAll('[role="option"]').length > 0;
    `);
  });

  const clickedLabel = await session.execute(
    `
      const wanted = arguments[0].toLowerCase();
      const options = Array.from(document.querySelectorAll('[role="option"]'));
      const target = options.find((option) => option.textContent.toLowerCase().includes(wanted)) ?? options[0];
      const label = target?.querySelector("span")?.textContent?.trim() ?? target?.textContent?.trim() ?? "";
      target?.click();
      return label;
    `,
    [selectedProgram.label]
  );

  await session.waitFor("Active Program selected program", async () => {
    const state = await session.execute(`
      const slicer = document.querySelector("[data-program-slicer]");
      const button = slicer?.querySelector('button[aria-haspopup="listbox"]');
      return {
        text: button?.textContent?.trim() ?? "",
        expanded: button?.getAttribute("aria-expanded") ?? "",
        cards: document.querySelectorAll("[data-active-role-signal-card]").length
      };
    `);

    return state.expanded === "false" && state.cards > 0 && state.text.includes(selectedProgram.label);
  }, 20_000);

  return {
    ...selectedProgram,
    label: clickedLabel || selectedProgram.label
  };
}

function argumentsTarget(value) {
  return value.trim().toLowerCase();
}

async function verifyOperatingView(session) {
  const state = await session.execute(`
    const bodyText = document.body.textContent ?? "";
    const roleCards = Array.from(document.querySelectorAll("[data-active-role-signal-card]"));
    return {
      hasCockpit: bodyText.includes("Program cockpit") && bodyText.includes("Phase progress"),
      hasRoleLanes: bodyText.includes("Role lanes") && roleCards.some((card) => card.textContent.includes("risk") && card.textContent.includes("decision")),
      hasTimeline: bodyText.includes("This week timeline") && bodyText.includes("What changed across roles, leadership, meetings, and artifacts"),
      roleFormOpen: Boolean(document.querySelector("[data-active-role-progress]"))
    };
  `);

  if (!state.hasCockpit) {
    throw new Error("Active Program cockpit did not render after program selection.");
  }

  if (!state.hasRoleLanes) {
    throw new Error("Active Program compact role lanes did not render risk and decision counts.");
  }

  if (!state.hasTimeline) {
    throw new Error("Active Program weekly timeline did not render.");
  }

  if (state.roleFormOpen) {
    throw new Error("Active Program role lane was expanded before the user selected a role to update.");
  }
}

async function saveRoleSignal(session, program) {
  const smokeText = `North Star active-program save smoke ${new Date().toISOString()}`;
  const selectedRole = await session.execute(
    `
      const wanted = arguments[0].trim().toLowerCase();
      const cards = Array.from(document.querySelectorAll("[data-active-role-signal-card]"));
      const target = wanted
        ? cards.find((card) => (card.getAttribute("data-active-role-signal-card") ?? "").includes(wanted) || card.textContent.toLowerCase().includes(wanted))
        : cards[0];
      if (!target) return null;
      const button = target.querySelector("[data-active-role-signal-toggle]");
      const role = target.querySelector("p")?.textContent?.trim() ?? target.getAttribute("data-active-role-signal-card") ?? "";
      button?.click();
      return role;
    `,
    [targetRoleName]
  );

  if (!selectedRole) {
    throw new Error("No role signal card found on Active Program.");
  }

  await session.waitFor("Active Program expanded role signal", async () => {
    return session.execute(`
      return Boolean(document.querySelector("[data-active-role-progress]")) &&
        Boolean(document.querySelector("[data-active-role-save]"));
    `);
  });

  await session.execute(
    `
      const progress = document.querySelector("[data-active-role-progress]");
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(progress, arguments[0]);
      progress.dispatchEvent(new Event("input", { bubbles: true }));

      const onTrack = document.querySelector('[data-active-role-status="on-track"]');
      onTrack?.click();
    `,
    [smokeText]
  );

  await session.waitFor("Active Program save signal enabled", async () => {
    return session.execute(`
      const button = document.querySelector("[data-active-role-save]");
      return Boolean(button) && !button.disabled && button.textContent.includes("Save signal");
    `);
  });

  await session.execute('document.querySelector("[data-active-role-save]")?.click();');
  await session.waitFor("Active Program save completion", async () => {
    const state = await session.execute(`
      const confirmation = document.querySelector("[data-active-program-save-confirmation]");
      return {
        found: Boolean(confirmation),
        text: confirmation?.textContent ?? ""
      };
    `);

    if (state.found && state.text.includes("Saved locally only")) {
      throw new Error(`Active Program save did not complete server-side: ${state.text.trim()}`);
    }

    return state.found && state.text.includes("Update saved") && state.text.includes("guidance refreshed");
  }, 120_000);

  const persisted = await session.execute(
    `
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/updates", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
        .then((payload) => payload.updates.some((update) =>
          (update.review.teamRoleUpdates ?? []).some((roleUpdate) =>
            roleUpdate.role === arguments[1] && roleUpdate.progressUpdate.includes(arguments[2])
          )
        ));
    `,
    [program.id, selectedRole, smokeText]
  );

  if (!persisted) {
    throw new Error(`Saved role signal for ${selectedRole} was not returned by the updates API.`);
  }

  console.log(`✓ Active Program: saved ${selectedRole} weekly signal for ${program.label}.`);
  return { role: selectedRole, tag: smokeText };
}

async function cleanupRoleSignal(session, program, savedSignal) {
  if (!shouldCleanup) {
    console.log("ℹ Active Program smoke cleanup skipped. Set NORTHSTAR_SMOKE_CLEANUP=prune or refresh to remove tagged test updates.");
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
    [program.id, savedSignal.tag, shouldRefreshAfterCleanup]
  );

  if (!result.ok) {
    throw new Error(`Active Program smoke cleanup failed with HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
  }

  const deletedCount = result.payload?.deletedCount ?? 0;
  if (deletedCount < 1) {
    throw new Error(`Active Program smoke cleanup did not prune the tagged update for ${savedSignal.role}.`);
  }

  const stillPresent = await session.execute(
    `
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/updates", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
        .then((payload) => payload.updates.some((update) => JSON.stringify(update.review).includes(arguments[1])));
    `,
    [program.id, savedSignal.tag]
  );

  if (stillPresent) {
    throw new Error(`Active Program smoke cleanup left the tagged update visible in history for ${savedSignal.role}.`);
  }

  const refreshMessage = shouldRefreshAfterCleanup ? " and refreshed guidance" : "";
  console.log(`✓ Active Program: pruned ${deletedCount} tagged smoke update${deletedCount === 1 ? "" : "s"}${refreshMessage}.`);
}

async function main() {
  await withSafariBrowser(async (session) => {
    await authenticate(session);
    const program = await selectProgram(session);
    await verifyOperatingView(session);
    const savedSignal = await saveRoleSignal(session, program);
    await cleanupRoleSignal(session, program, savedSignal);
  });

  console.log("Active Program save browser smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
