import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile(process.env.NORTHSTAR_ENV_FILE ?? ".env.local");

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Run npm run qa:ensure-user or set ${label} before running the Admin audit export smoke test.`);
}

async function authenticate(session) {
  const email = requireCredential(testUserEmail, "NORTHSTAR_TEST_USER_EMAIL");
  const password = requireCredential(testUserPassword, "NORTHSTAR_TEST_USER_PASSWORD");

  await session.navigate(`${baseUrl}/login?redirect=%2Fadmin`);
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

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function columnIndex(headers, name) {
  const index = headers.indexOf(name);
  if (index === -1) throw new Error(`Audit export is missing ${name} column.`);
  return index;
}

async function openAdminAudit(session) {
  await session.navigate(`${baseUrl}/admin?smoke=audit-export`);
  await session.waitFor("Admin audit history", () =>
    session.execute(`
      return Boolean(
        document.querySelector("[data-admin-audit-history]")
        && document.querySelector("[data-admin-audit-export]")
        && !document.body.textContent.includes("North Star access")
      );
    `),
    30_000
  );
}

async function chooseTargetEvent(session) {
  const target = await session.execute(`
    const rows = Array.from(document.querySelectorAll("[data-admin-audit-event-row]"));
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const targetRow = rows.find((row) =>
      row.dataset.adminAuditProgram
      && row.dataset.adminAuditActor
      && Number.isFinite(Date.parse(row.dataset.adminAuditCreatedAt || ""))
      && now - Date.parse(row.dataset.adminAuditCreatedAt || "") <= thirtyDays
    ) ?? rows.find((row) => row.dataset.adminAuditProgram && row.dataset.adminAuditActor) ?? rows[0];

    if (!targetRow) return { error: "No audit rows are available to filter and export." };

    return {
      actor: targetRow.dataset.adminAuditActor || "",
      createdAt: targetRow.dataset.adminAuditCreatedAt || "",
      eventType: targetRow.dataset.adminAuditEventType || "",
      program: targetRow.dataset.adminAuditProgram || "",
      summary: targetRow.dataset.adminAuditSummary || ""
    };
  `);

  if (target?.error) throw new Error(target.error);
  if (!target.eventType) throw new Error("Target audit row did not include an event type.");

  return target;
}

async function setFilter(session, filter, value) {
  if (!value) return false;

  const applied = await session.execute(
    `
      const select = document.querySelector(\`[data-admin-audit-filter="\${arguments[0]}"]\`);
      if (!select) return { applied: false, reason: "missing-select" };
      const option = Array.from(select.options).find((item) => item.value === arguments[1]);
      if (!option) return { applied: false, reason: "missing-option" };
      select.value = option.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { applied: true };
    `,
    [filter, value]
  );

  return Boolean(applied?.applied);
}

function isWithinLast30Days(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= 30 * 24 * 60 * 60 * 1000;
}

async function applyFilters(session, target) {
  const filters = {
    actor: await setFilter(session, "actor", target.actor),
    date: false,
    event: await setFilter(session, "event", target.eventType),
    program: await setFilter(session, "program", target.program)
  };

  if (isWithinLast30Days(target.createdAt)) {
    filters.date = await setFilter(session, "date", "last-30-days");
  }

  await session.waitFor("filtered Admin audit rows", () =>
    session.execute(
      `
        const rows = Array.from(document.querySelectorAll("[data-admin-audit-event-row]"));
        const target = arguments[0];
        const filters = arguments[1];
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

        return rows.length > 0 && rows.every((row) => {
          const matchesEvent = !filters.event || row.dataset.adminAuditEventType === target.eventType;
          const matchesProgram = !filters.program || row.dataset.adminAuditProgram === target.program;
          const matchesActor = !filters.actor || row.dataset.adminAuditActor === target.actor;
          const matchesDate = !filters.date || Date.parse(row.dataset.adminAuditCreatedAt || "") >= thirtyDaysAgo;
          return matchesEvent && matchesProgram && matchesActor && matchesDate;
        });
      `,
      [target, filters]
    ),
    10_000
  );

  return filters;
}

async function patchExportCapture(session) {
  await session.execute(`
    window.__northStarAuditSmokeDownloads = [];
    if (!window.__northStarAuditSmokePatched) {
      const originalCreateObjectURL = URL.createObjectURL.bind(URL);
      URL.createObjectURL = function (blob) {
        const url = originalCreateObjectURL(blob);
        const record = { download: "", hrefPrefix: url.slice(0, 16), text: "", type: blob?.type || "" };
        window.__northStarAuditSmokeDownloads.push(record);

        if (blob && typeof blob.text === "function") {
          blob.text()
            .then((text) => {
              record.text = text;
            })
            .catch(() => {
              record.text = "";
            });
        }

        return url;
      };

      HTMLAnchorElement.prototype.click = function () {
        const downloads = window.__northStarAuditSmokeDownloads;
        const latest = downloads[downloads.length - 1] || {};
        latest.download = this.download;
        latest.hrefPrefix = String(this.href).slice(0, 16);
      };

      window.__northStarAuditSmokePatched = true;
    }
  `);
}

async function exportFilteredAudit(session) {
  await patchExportCapture(session);
  await session.execute('document.querySelector("[data-admin-audit-export]")?.click();');
  await session.waitFor("Admin audit CSV export", () =>
    session.execute(`
      return window.__northStarAuditSmokeDownloads?.some((download) =>
        download.download?.toLowerCase().endsWith(".csv") && download.text.includes("eventType")
      );
    `),
    20_000
  );

  const downloads = await session.execute("return window.__northStarAuditSmokeDownloads ?? [];");
  const csvDownload = downloads.find((download) => download.download?.toLowerCase().endsWith(".csv"));
  if (!csvDownload?.text) throw new Error("Admin audit export did not produce readable CSV content.");

  return csvDownload;
}

function verifyFilteredCsv(csvText, target, filters) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error("Admin audit export CSV did not include any event rows.");

  const [headers, ...eventRows] = rows;
  const eventTypeIndex = columnIndex(headers, "eventType");
  const programIndex = columnIndex(headers, "programName");
  const actorIndex = columnIndex(headers, "actor");
  const createdAtIndex = columnIndex(headers, "createdAt");
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const invalidRow = eventRows.find((row) => {
    const matchesEvent = !filters.event || row[eventTypeIndex] === target.eventType;
    const matchesProgram = !filters.program || row[programIndex] === target.program;
    const matchesActor = !filters.actor || row[actorIndex] === target.actor;
    const matchesDate = !filters.date || Date.parse(row[createdAtIndex] || "") >= thirtyDaysAgo;
    return !(matchesEvent && matchesProgram && matchesActor && matchesDate);
  });

  if (invalidRow) {
    throw new Error("Admin audit export included a row outside the selected filters.");
  }

  return eventRows.length;
}

async function main() {
  await withSafariBrowser(async (session) => {
    await authenticate(session);
    await openAdminAudit(session);
    const target = await chooseTargetEvent(session);
    const filters = await applyFilters(session, target);
    const download = await exportFilteredAudit(session);
    const rowCount = verifyFilteredCsv(download.text, target, filters);

    console.log(`✓ Admin audit filters applied: ${Object.entries(filters).filter(([, value]) => value).map(([key]) => key).join(", ")}`);
    console.log(`✓ Admin audit export verified: ${download.download} (${rowCount} filtered rows).`);
  });

  console.log("Admin audit export browser smoke test passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
