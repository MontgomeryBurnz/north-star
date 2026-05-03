import { mkdirSync } from "node:fs";
import path from "node:path";
import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sitePassword = process.env.NORTHSTAR_SITE_PASSWORD ?? process.env.SITE_ACCESS_PASSWORD;
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
const targetProgramName = process.env.NORTHSTAR_SMOKE_PROGRAM_NAME ?? "";
const targetRoleName = process.env.NORTHSTAR_SMOKE_ACTIVE_ROLE ?? "";
const authMode = (process.env.NORTHSTAR_SMOKE_AUTH_MODE ?? "auto").toLowerCase();
const cleanupMode = (process.env.NORTHSTAR_SMOKE_CLEANUP ?? "off").toLowerCase();
const shouldCleanup = ["1", "true", "prune", "refresh"].includes(cleanupMode);
const shouldRefreshAfterCleanup =
  cleanupMode === "refresh" || process.env.NORTHSTAR_SMOKE_REFRESH_AFTER_CLEANUP === "true";
const shouldCaptureMobileScreenshot = process.env.NORTHSTAR_SMOKE_MOBILE_SCREENSHOT !== "false";
const screenshotDirectory = process.env.NORTHSTAR_SMOKE_SCREENSHOT_DIR ?? "/tmp/north-star-smoke-screenshots";

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
  await session.navigate(`${baseUrl}/active-program?mode=manage&smoke=active-program-save`);
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
      hasRoleLanes: bodyText.includes("Focus role") && roleCards.some((card) => card.textContent.includes("risk") && card.textContent.includes("decision")),
      hasDeliveryBoard: Boolean(document.querySelector("[data-active-delivery-board]")) &&
        document.querySelectorAll("[data-delivery-board-lane]").length > 0 &&
        document.querySelectorAll("[data-delivery-board-column]").length >= 5,
      hasTimeline: bodyText.includes("This week timeline") && bodyText.includes("What changed across roles, delivery board, leadership, meetings, and artifacts"),
      roleFormOpen: Boolean(document.querySelector("[data-active-role-progress]"))
    };
  `);

  if (!state.hasCockpit) {
    throw new Error("Active Program cockpit did not render after program selection.");
  }

  if (!state.hasRoleLanes) {
    throw new Error("Active Program compact role lanes did not render risk and decision counts.");
  }

  if (!state.hasDeliveryBoard) {
    throw new Error("Active Program Delivery Board did not render lanes, status columns, and attachment controls.");
  }

  if (!state.hasTimeline) {
    throw new Error("Active Program weekly timeline did not render.");
  }

  if (state.roleFormOpen) {
    throw new Error("Active Program role lane was expanded before the user selected a role to update.");
  }
}

async function captureMobileRoleFocusScreenshot(session, program) {
  if (!shouldCaptureMobileScreenshot) {
    console.log("ℹ Active Program mobile role-focus screenshot skipped.");
    return null;
  }

  await session.setWindowRect({ x: 0, y: 0, width: 390, height: 844 });

  const selectedFocus = await session.execute(
    `
      const select = document.querySelector("[data-active-role-focus]");
      const wanted = arguments[0].trim().toLowerCase();
      const options = Array.from(select?.options ?? []).filter((option) => option.value);
      const target = wanted
        ? options.find((option) => option.value.includes(wanted) || option.textContent.toLowerCase().includes(wanted))
        : options[0];

      if (!select || !target) return null;

      select.value = target.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));

      return {
        roleKey: target.value,
        roleLabel: target.textContent.trim()
      };
    `,
    [targetRoleName]
  );

  if (!selectedFocus?.roleKey) {
    throw new Error("Active Program mobile screenshot smoke could not select a focus role.");
  }

  await session.waitFor("Active Program persisted role focus", async () => {
    return session.execute(
      `
        const select = document.querySelector("[data-active-role-focus]");
        const stored = Object.entries(window.localStorage)
          .filter(([key]) => key.startsWith("north-star:active-program:role-focus:") && key.endsWith(":" + arguments[1]))
          .some(([, value]) => value === arguments[0]);
        return select?.value === arguments[0] && stored;
      `,
      [selectedFocus.roleKey, program.id]
    );
  });

  await session.waitFor("Active Program selected primary role card", async () => {
    return session.execute(
      `
        const roleCards = Array.from(document.querySelectorAll("[data-active-role-signal-card]"));
        const focusedCard = roleCards.find((card) => card.getAttribute("data-active-role-signal-card") === arguments[0]);
        return Boolean(focusedCard) && document.body.textContent.includes("Primary role lane");
      `,
      [selectedFocus.roleKey]
    );
  });

  await session.execute(
    `
      const roleCards = Array.from(document.querySelectorAll("[data-active-role-signal-card]"));
      const focusedCard = roleCards.find((card) => card.getAttribute("data-active-role-signal-card") === arguments[0]);
      if (focusedCard) {
        const targetTop = focusedCard.getBoundingClientRect().top + window.scrollY - 180;
        (document.scrollingElement ?? document.documentElement).scrollTo(0, Math.max(0, targetTop));
      }
    `,
    [selectedFocus.roleKey]
  );

  const visualState = await session.waitFor("Active Program mobile focused role lane in view", async () => {
    const state = await session.execute(
      `
        const select = document.querySelector("[data-active-role-focus]");
        const roleCards = Array.from(document.querySelectorAll("[data-active-role-signal-card]"));
        const focusedCard = roleCards.find((card) => card.getAttribute("data-active-role-signal-card") === arguments[0]);
        const focusedBounds = focusedCard?.getBoundingClientRect();
        const focusedCardVisible = Boolean(focusedBounds && focusedBounds.top < window.innerHeight && focusedBounds.bottom > 0);

        if (focusedCard && !focusedCardVisible) {
          const targetTop = focusedCard.getBoundingClientRect().top + window.scrollY - 180;
          (document.scrollingElement ?? document.documentElement).scrollTo(0, Math.max(0, targetTop));
        }

        return {
          selectedRole: select?.value ?? "",
          focusedCardVisible,
          focusedTop: focusedBounds?.top ?? null,
          focusedBottom: focusedBounds?.bottom ?? null,
          focusedHeight: focusedBounds?.height ?? null,
          width: window.innerWidth,
          scrollY: window.scrollY,
          documentScrollTop: (document.scrollingElement ?? document.documentElement).scrollTop,
          hasPrimaryLabel: document.body.textContent.includes("Primary role lane")
        };
      `,
      [selectedFocus.roleKey]
    );

    return state.focusedCardVisible ? state : false;
  }, 10_000);

  if (
    visualState.selectedRole !== selectedFocus.roleKey ||
    !visualState.focusedCardVisible ||
    !visualState.hasPrimaryLabel ||
    visualState.width > 430
  ) {
    throw new Error(`Active Program mobile role-focus layout did not verify: ${JSON.stringify(visualState)}`);
  }

  mkdirSync(screenshotDirectory, { recursive: true });
  const screenshotPath = path.join(
    screenshotDirectory,
    `active-program-role-focus-mobile-${program.id}-${selectedFocus.roleKey}-${Date.now()}.png`
  );
  await session.screenshot(screenshotPath);
  console.log(`✓ Active Program: captured mobile role focus screenshot for ${selectedFocus.roleLabel} at ${screenshotPath}.`);

  return selectedFocus;
}

async function saveRoleSignal(session, program) {
  const smokeText = `North Star active-program save smoke ${new Date().toISOString()}`;
  const deliveryCardAdded = await session.execute(
    `
      const title = document.querySelector("[data-delivery-board-title]");
      const addButton = document.querySelector("[data-delivery-board-add]");
      if (!title || !addButton) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(title, arguments[0]);
      title.dispatchEvent(new Event("input", { bubbles: true }));
      addButton.click();
      return true;
    `,
    [smokeText]
  );

  if (!deliveryCardAdded) {
    throw new Error("Active Program smoke could not add a Delivery Board card.");
  }

  await session.waitFor("Active Program Delivery Board card added", async () => {
    return session.execute(`
      return Array.from(document.querySelectorAll("[data-delivery-board-card]"))
        .some((card) => card.textContent.includes("North Star active-program save smoke") && card.querySelector("[data-delivery-board-attachment]"));
    `);
  });

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
          ) &&
          (update.review.deliveryBoardItems ?? []).some((item) => item.title.includes(arguments[2]))
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
    await captureMobileRoleFocusScreenshot(session, program);
    const savedSignal = await saveRoleSignal(session, program);
    await cleanupRoleSignal(session, program, savedSignal);
  });

  console.log("Active Program save browser smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
