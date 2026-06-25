import { mkdirSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
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
        hasCockpit: bodyText.includes("Program cockpit") && bodyText.includes("Phase progress") && Boolean(document.querySelector("[data-active-program-phase-select]")),
        hasRoleLanes: bodyText.includes("Focus role") && roleCards.some((card) => card.textContent.includes("risk") && card.textContent.includes("decision")),
        hasWorkspaceTabs: document.querySelectorAll("[data-active-program-workspace-tab]").length >= 3,
        roleFormOpen: Boolean(document.querySelector("[data-active-role-progress]"))
      };
  `);

  if (!state.hasCockpit) {
    throw new Error("Active Program cockpit did not render after program selection.");
  }

  if (!state.hasRoleLanes) {
    throw new Error("Active Program compact role lanes did not render risk and decision counts.");
  }

  if (!state.hasWorkspaceTabs) {
    throw new Error("Active Program workspace tabs did not render.");
  }

  await session.execute('document.querySelector("[data-active-program-workspace-tab=\\"board\\"]")?.click();');
  await session.waitFor("Active Program Delivery Board workspace", async () => {
    return session.execute(`
      const bodyText = document.body.textContent ?? "";
      return Boolean(document.querySelector("[data-active-delivery-board]")) &&
        document.querySelectorAll("[data-delivery-board-lane]").length > 0 &&
        Boolean(document.querySelector("[data-delivery-board-open-add]")) &&
        bodyText.includes("This week timeline") &&
        bodyText.includes("What changed across roles, delivery board, leadership, meetings, and artifacts");
    `);
  });

  await session.execute('document.querySelector("[data-active-program-workspace-tab=\\"role\\"]")?.click();');

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

async function populateExecutiveClientPortalFields(session, smokeText) {
  const profileVisible = await session.execute(`
    return Boolean(document.querySelector("[data-active-program-client-portal-fields]"));
  `);

  if (!profileVisible) {
    await session.execute('document.querySelector("[data-active-program-profile-toggle]")?.click();');
  }

  await session.waitFor("Active Program Client Portal profile fields", async () => {
    return session.execute(`
      return Boolean(document.querySelector("[data-active-program-client-portal-fields]")) &&
        Boolean(document.querySelector("[data-active-executive-sponsor]")) &&
        Boolean(document.querySelector("[data-active-client-status-note]"));
    `);
  });

  const populated = await session.execute(
    `
      const setValue = (selector, value) => {
        const field = document.querySelector(selector);
        if (!field) return false;
        const prototype = field instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : field instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (!setter) return false;
        setter.call(field, value);
        field.dispatchEvent(new Event(field.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
        return true;
      };

      return [
        setValue("[data-active-executive-sponsor]", "Smoke Sponsor"),
        setValue("[data-active-program-lead]", "Smoke Program Lead"),
        setValue("[data-active-pmo]", "Smoke PMO"),
        setValue("[data-active-program-start-date]", "2026-05-01"),
        setValue("[data-active-program-target-finish-date]", "2026-05-31"),
        setValue("[data-active-program-completion]", "64"),
        setValue("[data-active-completion-delta]", "+4%"),
        setValue("[data-active-next-milestone-priority]", "High"),
        setValue("[data-active-next-milestone]", "Smoke executive milestone"),
        setValue("[data-active-next-milestone-date]", "2026-05-08"),
        setValue("[data-active-client-status-note]", "Client portal smoke status: " + arguments[0])
      ].every(Boolean);
    `,
    [smokeText]
  );

  if (!populated) {
    throw new Error("Active Program smoke could not populate Client Portal executive fields.");
  }

  const timelinePopulated = await session.execute(
    `
      const setValue = (field, value) => {
        if (!field) return false;
        const prototype = field instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : field instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (!setter) return false;
        setter.call(field, value);
        field.dispatchEvent(new Event(field.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
        return true;
      };

      const scale = document.querySelector("[data-active-timeline-scale]");
      const year = document.querySelector("[data-active-timeline-year]");
      return setValue(scale, "year") && setValue(year, "FY99");
    `
  );

  if (!timelinePopulated) {
    throw new Error("Active Program smoke could not populate timeline planning fields.");
  }

  await session.execute('document.querySelector("[data-active-program-add-milestone]")?.click();');
  await session.waitFor("Active Program custom milestone row", async () => {
    return session.execute(`
      return Boolean(document.querySelector("[data-active-program-milestone-row]")) &&
        Boolean(document.querySelector("[data-active-program-milestone-name]"));
    `);
  });

  const milestonePopulated = await session.execute(
    `
      const rows = Array.from(document.querySelectorAll("[data-active-program-milestone-row]"));
      const row = rows[rows.length - 1];
      if (!row) return false;

      const setValue = (selector, value) => {
        const field = row.querySelector(selector);
        if (!field) return false;
        const prototype = field instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : field instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (!setter) return false;
        setter.call(field, value);
        field.dispatchEvent(new Event(field.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
        return true;
      };

      return [
        setValue("[data-active-program-milestone-name]", "Smoke custom timeline milestone"),
        setValue("[data-active-program-milestone-date]", "2026-05-15"),
        setValue("[data-active-program-milestone-status]", "current"),
        setValue("[data-active-program-milestone-priority]", "Medium"),
        setValue("[data-active-program-milestone-note]", "Smoke custom timeline milestone note: " + arguments[0])
      ].every(Boolean);
    `,
    [smokeText]
  );

  if (!milestonePopulated) {
    throw new Error("Active Program smoke could not populate a custom timeline milestone.");
  }

  await session.execute('document.querySelector("[data-active-program-timeline-save]")?.click();');
  await session.waitFor("Active Program timeline save completed", async () => {
    const state = await session.execute(`
      const confirmation = document.querySelector("[data-active-program-timeline-save-confirmation]");
      return {
        found: Boolean(confirmation),
        text: confirmation?.textContent ?? ""
      };
    `);

    if (state.found && state.text.includes("Saved locally only")) {
      throw new Error(`Active Program timeline save did not complete server-side: ${state.text.trim()}`);
    }

    return state.found && state.text.includes("Timeline saved") && state.text.includes("Client Portal refresh started");
  }, 120_000);

  console.log("✓ Active Program: populated fields that feed Client Portal, including timeline and milestones.");
}

async function saveRoleSignal(session, program, smokeText) {
  await session.execute('document.querySelector("[data-active-program-workspace-tab=\\"board\\"]")?.click();');
  await session.waitFor("Active Program Delivery Board visible for save", async () => {
    return session.execute(`
      return Boolean(document.querySelector("[data-active-delivery-board]")) &&
        Boolean(document.querySelector("[data-delivery-board-open-add]")) &&
        !document.querySelector("[data-delivery-board-add-panel]");
    `);
  });

  await session.execute('document.querySelector("[data-delivery-board-open-add]")?.click();');
  await session.waitFor("Active Program Delivery Board add panel", async () => {
    return session.execute(`
      return Boolean(document.querySelector("[data-delivery-board-add-panel]")) &&
        Boolean(document.querySelector("[data-delivery-board-title]")) &&
        Boolean(document.querySelector("[data-delivery-board-add]"));
    `);
  });

  const deliveryCardAdded = await session.execute(
    `
      const title = document.querySelector("[data-delivery-board-title]");
      const startDate = document.querySelector("[data-delivery-board-start-date]");
      const finishDate = document.querySelector("[data-delivery-board-finish-date]");
      const addButton = document.querySelector("[data-delivery-board-add]");
      if (!title || !addButton) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(title, arguments[0]);
      title.dispatchEvent(new Event("input", { bubbles: true }));
      if (startDate) {
        setter.call(startDate, "2026-05-01");
        startDate.dispatchEvent(new Event("input", { bubbles: true }));
        startDate.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (finishDate) {
        setter.call(finishDate, "2026-05-08");
        finishDate.dispatchEvent(new Event("input", { bubbles: true }));
        finishDate.dispatchEvent(new Event("change", { bubbles: true }));
      }
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
        .some((card) => card.textContent.includes("North Star active-program save smoke"));
    `);
  });

  const deliveryCardDragStarted = await session.execute(`
    const card = Array.from(document.querySelectorAll("[data-delivery-board-card]"))
      .find((element) => element.textContent.includes("North Star active-program save smoke"));
    if (!card || typeof DataTransfer === "undefined" || typeof DragEvent === "undefined") return false;

    const dataTransfer = new DataTransfer();
    card.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }));
    return true;
  `);

  if (!deliveryCardDragStarted) {
    throw new Error("Active Program smoke could not start dragging the Delivery Board card.");
  }

  await session.waitFor("Active Program compact drag targets visible", async () => {
    return session.execute(`
      return Boolean(document.querySelector('[data-delivery-board-drop-target="in-progress"]')) &&
        Boolean(document.querySelector("[data-delivery-board-status-rail]"));
    `);
  });

  const deliveryCardMoved = await session.execute(`
    const card = Array.from(document.querySelectorAll("[data-delivery-board-card]"))
      .find((element) => element.textContent.includes("North Star active-program save smoke"));
    const target = document.querySelector('[data-delivery-board-drop-target="in-progress"]');
    if (!card || !target || typeof DataTransfer === "undefined" || typeof DragEvent === "undefined") return false;

    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", card.getAttribute("data-delivery-board-card") ?? "");
    target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }));
    target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
    card.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }));
    return true;
  `);

  if (!deliveryCardMoved) {
    throw new Error("Active Program smoke could not drag the Delivery Board card to a new status.");
  }

  await session.waitFor("Active Program Delivery Board card moved by drag and drop", async () => {
    return session.execute(`
      return Array.from(document.querySelectorAll('[data-delivery-board-column="in-progress"] [data-delivery-board-card]'))
        .some((card) => card.textContent.includes("North Star active-program save smoke"));
    `);
  });

  const deliveryCardOpened = await session.execute(`
    const card = Array.from(document.querySelectorAll("[data-delivery-board-card]"))
      .find((element) => element.textContent.includes("North Star active-program save smoke"));
    card?.querySelector("[data-delivery-board-card-open]")?.click();
    return Boolean(card);
  `);

  if (!deliveryCardOpened) {
    throw new Error("Active Program smoke could not open the Delivery Board card detail panel.");
  }

  await session.waitFor("Active Program Delivery Board card details opened", async () => {
    return session.execute(`
      const panel = document.querySelector("[data-delivery-board-detail-panel]");
      return Boolean(panel) &&
        panel.textContent.includes("North Star active-program save smoke") &&
      Boolean(panel.querySelector('[data-delivery-board-detail-status-chip="blocked"]')) &&
      Boolean(panel.querySelector("[data-delivery-board-attachment]"));
    `);
  });

  const detailStatusMoved = await session.execute(`
    const panel = document.querySelector("[data-delivery-board-detail-panel]");
    const chip = panel?.querySelector('[data-delivery-board-detail-status-chip="blocked"]');
    chip?.click();
    return Boolean(chip);
  `);

  if (!detailStatusMoved) {
    throw new Error("Active Program smoke could not move the Delivery Board card from the detail workspace.");
  }

  await session.waitFor("Active Program Delivery Board card moved from detail workspace", async () => {
    return session.execute(`
      return Array.from(document.querySelectorAll('[data-delivery-board-column="blocked"] [data-delivery-board-card]'))
        .some((card) => card.textContent.includes("North Star active-program save smoke"));
    `);
  });

  await session.execute('document.querySelector("[data-delivery-board-detail-close]")?.click();');
  await session.waitFor("Active Program Delivery Board detail panel closed", async () => {
    return session.execute(`
      return !document.querySelector("[data-delivery-board-detail-panel]");
    `);
  });

  await session.execute('document.querySelector("[data-active-program-workspace-tab=\\"role\\"]")?.click();');
  await session.waitFor("Active Program role workspace visible for save", async () => {
    return session.execute(`
      return document.querySelectorAll("[data-active-role-signal-card]").length > 0 &&
        Boolean(document.querySelector("[data-active-role-focus]"));
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
        Boolean(document.querySelector("[data-active-role-risks]")) &&
        Boolean(document.querySelector("[data-active-role-decisions]")) &&
        Boolean(document.querySelector("[data-active-role-save]"));
    `);
  });

  await session.execute(
    `
      const progress = document.querySelector("[data-active-role-progress]");
      const risks = document.querySelector("[data-active-role-risks]");
      const decisions = document.querySelector("[data-active-role-decisions]");
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(progress, arguments[0]);
      progress.dispatchEvent(new Event("input", { bubbles: true }));
      setter.call(risks, "Risk from smoke: dependency needs visibility before the next checkpoint.");
      risks.dispatchEvent(new Event("input", { bubbles: true }));
      setter.call(decisions, "Decision from smoke: confirm owner and next milestone outcome.");
      decisions.dispatchEvent(new Event("input", { bubbles: true }));

      const attachmentInput = document.querySelector("[data-active-role-attachments]");
      if (attachmentInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(new File([arguments[0]], "north-star-role-update-smoke.txt", { type: "text/plain" }));
        attachmentInput.files = dataTransfer.files;
        attachmentInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    `,
    [smokeText]
  );

  await session.waitFor("Active Program role attachment control processed", async () => {
    return session.execute(`
      const card = document.querySelector("[data-active-role-progress]")?.closest("[data-active-role-signal-card]");
      const text = card?.textContent ?? "";
      return text.includes("Attachment uploaded") || text.includes("north-star-role-update-smoke.txt");
    `);
  }, 60_000);

  await session.waitFor("Active Program save signal enabled", async () => {
    return session.execute(`
      const button = document.querySelector("[data-active-role-save]");
      return Boolean(button) && !button.disabled && button.textContent.includes("Save role update");
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
          update.review.executiveSponsor === "Smoke Sponsor" &&
          update.review.programLead === "Smoke Program Lead" &&
          update.review.pmo === "Smoke PMO" &&
          update.review.programStartDate === "2026-05-01" &&
          update.review.programTargetFinishDate === "2026-05-31" &&
          update.review.programCompletionPercent === "64" &&
          update.review.completionDelta === "+4%" &&
          update.review.nextMilestonePriority === "High" &&
          update.review.nextMilestoneName === "Smoke executive milestone" &&
          update.review.nextMilestoneDate === "2026-05-08" &&
          update.review.timelineScale === "year" &&
          update.review.timelineYear === "FY99" &&
          (update.review.programMilestones ?? []).some((milestone) =>
            milestone.name === "Smoke custom timeline milestone" &&
            milestone.date === "2026-05-15" &&
            milestone.status === "current" &&
            milestone.priority === "Medium" &&
            milestone.note.includes(arguments[2])
          ) &&
          update.review.clientStatusNote.includes(arguments[2]) &&
          (update.review.teamRoleUpdates ?? []).some((roleUpdate) =>
            roleUpdate.role === arguments[1] &&
            roleUpdate.progressUpdate.includes(arguments[2]) &&
            roleUpdate.activeRisks.includes("Risk from smoke") &&
            roleUpdate.decisionsNeeded.includes("Decision from smoke") &&
            (roleUpdate.attachments ?? []).some((attachment) => attachment.fileName === "north-star-role-update-smoke.txt")
          ) &&
          (update.review.deliveryBoardItems ?? []).some((item) =>
            item.title.includes(arguments[2]) &&
            item.startDate === "2026-05-01" &&
            item.dueDate === "2026-05-08"
          )
        ));
    `,
    [program.id, selectedRole, smokeText]
  );

  if (!persisted) {
    throw new Error(`Saved role signal for ${selectedRole} was not returned by the updates API.`);
  }

  await session.execute(`
    const select = document.querySelector("[data-active-program-phase-select]");
    select.value = "Recovery";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelector("[data-active-program-phase-save]")?.click();
  `);

  await session.waitFor("Active Program phase save completed", async () => {
    const state = await session.execute(`
      const confirmation = document.querySelector("[data-active-program-save-confirmation]");
      return {
        found: Boolean(confirmation),
        text: confirmation?.textContent ?? ""
      };
    `);

    if (state.found && state.text.includes("Saved locally only")) {
      throw new Error(`Active Program phase save did not complete server-side: ${state.text.trim()}`);
    }

    return state.found && state.text.includes("Program phase") && state.text.includes("guidance refreshed");
  }, 120_000);

  const phasePersisted = await session.execute(
    `
      return fetch("/api/programs/" + encodeURIComponent(arguments[0]) + "/updates", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
        .then((payload) => payload.updates.some((update) =>
          update.review.currentPhase === "Recovery" &&
          (update.review.teamRoleUpdates ?? []).some((roleUpdate) =>
            roleUpdate.role === arguments[1] &&
            roleUpdate.progressUpdate.includes(arguments[2])
          )
        ));
    `,
    [program.id, selectedRole, smokeText]
  );

  if (!phasePersisted) {
    throw new Error("Active Program phase change was not returned by the updates API.");
  }

  console.log(`✓ Active Program: saved ${selectedRole} weekly signal for ${program.label}.`);
  return { role: selectedRole, tag: smokeText };
}

async function verifyClientPortalExecutiveFields(session, program, smokeText) {
  let lastState = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await session.navigate(`${baseUrl}/client?smoke=client-portal-executive-fields&attempt=${attempt}`);
    await session.waitFor("Client Portal portfolio loaded", async () => {
      return session.execute(`
        const bodyText = document.body.textContent ?? "";
        return bodyText.includes("North Star Client Portal") &&
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
      throw new Error(`Client Portal smoke could not find program card for ${program.label}.`);
    }

    const rendered = await session.waitFor("Client Portal executive fields rendered", async () => {
      lastState = await session.execute(
        `
          const cards = Array.from(document.querySelectorAll("[data-client-program-card]"));
          const details = Array.from(document.querySelectorAll("[data-client-program-detail]"));
          const card = cards.find((element) => element.getAttribute("data-client-program-card") === arguments[0]);
          const detail = details.find((element) => element.getAttribute("data-client-program-detail") === arguments[0]);
          const cardText = card?.textContent ?? "";
          const detailText = detail?.textContent ?? "";
          return {
            cardFound: Boolean(card),
            detailFound: Boolean(detail),
            cardHasMilestone: cardText.includes("Smoke executive milestone"),
            cardHasPercent: cardText.includes("100%"),
            detailHasSponsor: detailText.includes("Smoke Sponsor"),
            detailHasLead: detailText.includes("Smoke Program Lead"),
            detailHasPmo: detailText.includes("Smoke PMO"),
            detailHasPercent: detailText.includes("100%"),
            detailHasScheduleBasis: detailText.includes("Schedule") && detailText.includes("May 01 -> May 31"),
            detailHasDelta: detailText.includes("+4%"),
            detailHasTimeline: detailText.includes("FY99"),
            detailHasMilestone: detailText.includes("Smoke custom timeline milestone"),
            detailHasTag: detailText.includes(arguments[1])
          };
        `,
        [program.id, smokeText]
      );

      return Object.values(lastState).every(Boolean);
    }, 15_000).catch(() => false);

    if (rendered) {
      console.log("✓ Client Portal: executive fields rendered in portfolio card and program detail view.");
      return;
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for Client Portal executive fields rendered. Last state: ${JSON.stringify(lastState)}`);
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
    const smokeText = `North Star active-program save smoke ${new Date().toISOString()}`;
    let program = null;
    let savedSignal = null;
    let shouldAttemptCleanup = false;

    try {
      await authenticate(session);
      program = await selectProgram(session);
      await populateExecutiveClientPortalFields(session, smokeText);
      shouldAttemptCleanup = true;
      await verifyOperatingView(session);
      await captureMobileRoleFocusScreenshot(session, program);
      savedSignal = await saveRoleSignal(session, program, smokeText);
      await verifyClientPortalExecutiveFields(session, program, smokeText);
    } finally {
      if (program && shouldAttemptCleanup) {
        await cleanupRoleSignal(session, program, savedSignal ?? { role: "timeline", tag: smokeText });
      }
    }
  });

  console.log("Active Program save and Client Portal browser smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
