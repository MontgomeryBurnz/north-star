import { loadEnvFile, withSafariBrowser } from "./browser-webdriver.mjs";

loadEnvFile(process.env.NORTHSTAR_ENV_FILE ?? ".env.local");

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;

function requireCredential(value, label) {
  if (value) return value;
  throw new Error(`Missing ${label}. Run npm run qa:ensure-user or set ${label} before running the Admin user removal smoke test.`);
}

async function authenticate(session) {
  const email = requireCredential(testUserEmail, "NORTHSTAR_TEST_USER_EMAIL");
  const password = requireCredential(testUserPassword, "NORTHSTAR_TEST_USER_PASSWORD");

  await session.navigate(`${baseUrl}/login?redirect=%2Fadmin`);
  const origin = await session.execute("return location.origin;");
  if (origin !== baseUrl) {
    throw new Error(`Authentication opened the unexpected origin ${origin}.`);
  }

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

async function assertAdminAuthorized(session, stage) {
  const result = await session.execute(`
    return fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => ({
        ok: response.ok,
        status: response.status,
        payload: await response.json().catch(() => ({}))
      }));
  `);

  if (!result.ok) {
    throw new Error(
      `Admin session lost ${stage}: HTTP ${result.status} ${result.payload?.error || "Unknown error"}.`
    );
  }
}

async function createDisposableUser(session, email) {
  const result = await session.execute(
    `
      return fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Codex Remove Smoke",
          email: arguments[0],
          userType: "admin",
          credentialStatus: "not-invited",
          sendInvite: false,
          assignments: [],
          replaceAssignments: true
        })
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        payload: await response.json().catch(() => ({}))
      }));
    `,
    [email]
  );

  if (!result.ok || !result.payload?.user?.id) {
    throw new Error(result.payload?.error || `Disposable user creation failed with HTTP ${result.status}.`);
  }

  return result.payload.user;
}

async function linkDisposableAuthUser(session, userId) {
  const result = await session.execute(
    `
      return fetch("/api/admin/users/setup-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: arguments[0] })
      }).then(async (response) => ({
        ok: response.ok,
        status: response.status,
        payload: await response.json().catch(() => ({}))
      }));
    `,
    [userId]
  );

  if (!result.ok || !result.payload?.user?.authUserId) {
    throw new Error(result.payload?.error || `Disposable Auth user creation failed with HTTP ${result.status}.`);
  }

  return result.payload.user;
}

async function deleteUserById(session, userId) {
  if (!userId) return;

  await session.execute(
    `
      return fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: arguments[0] })
      }).catch(() => null);
    `,
    [userId]
  );
}

async function cleanupDisposableUsers(session) {
  await session.execute(`
    return fetch("/api/admin/users", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { users: [] })
      .then(async (payload) => {
        const users = Array.isArray(payload.users) ? payload.users : [];
        const targets = users.filter((user) => String(user.email || "").startsWith("codex-remove-smoke-"));
        await Promise.all(targets.map((user) =>
          fetch("/api/admin/users", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: user.id })
          }).catch(() => null)
        ));
        return targets.length;
      })
      .catch(() => 0);
  `);
}

async function verifyUserAbsent(session, userId, email) {
  const present = await session.execute(
    `
      return fetch("/api/admin/users", { cache: "no-store" })
        .then((response) => response.json())
        .then((payload) => (payload.users || []).some((user) =>
          user.id === arguments[0]
          || String(user.email || "").trim().toLowerCase() === String(arguments[1] || "").trim().toLowerCase()
        ));
    `,
    [userId, email]
  );

  if (present) {
    throw new Error("Removed user still appears in /api/admin/users.");
  }
}

async function main() {
  await withSafariBrowser(async (session) => {
    await authenticate(session);
    await assertAdminAuthorized(session, "after authentication");
    await cleanupDisposableUsers(session);

    const email = `codex-remove-smoke-${Date.now()}@north-star.live`;
    const createdUser = await createDisposableUser(session, email);
    await assertAdminAuthorized(session, "after disposable user creation");
    const user = await linkDisposableAuthUser(session, createdUser.id);
    await assertAdminAuthorized(session, "after disposable Auth linking");

    try {
      await session.navigate(`${baseUrl}/admin?smoke=user-removal`);
      await session.waitFor("Admin user management row", () =>
        session.execute(
          `
            return Boolean(
              document.querySelector(\`[data-admin-user-row="\${arguments[0]}"]\`)
              && document.querySelector(\`[data-admin-user-remove="\${arguments[0]}"]\`)
            );
          `,
          [user.id]
        ),
        30_000
      );
      await assertAdminAuthorized(session, "after Admin page navigation");

      const clicked = await session.execute(
        `
          const button = document.querySelector(\`[data-admin-user-remove="\${arguments[0]}"]\`);
          button?.click();
          return Boolean(button);
        `,
        [user.id]
      );

      if (!clicked) {
        throw new Error("Admin remove user button was not clickable.");
      }
      await assertAdminAuthorized(session, "after opening removal confirmation");

      await session.waitFor("Admin user removal confirmation visible", () =>
        session.execute(
          `
            return Boolean(
              document.querySelector(\`[data-admin-user-remove-confirmation="\${arguments[0]}"]\`)
              && document.querySelector(\`[data-admin-user-confirm-remove="\${arguments[0]}"]\`)
            );
          `,
          [user.id]
        ),
        30_000
      );

      const confirmed = await session.execute(
        `
          const button = document.querySelector(\`[data-admin-user-confirm-remove="\${arguments[0]}"]\`);
          button?.click();
          return Boolean(button);
        `,
        [user.id]
      );

      if (!confirmed) {
        throw new Error("Admin remove confirmation button was not clickable.");
      }

      try {
        await session.waitFor("Admin user row removed", () =>
          session.execute(
            `
              const row = document.querySelector(\`[data-admin-user-row="\${arguments[0]}"]\`);
              const status = document.querySelector("[data-admin-user-management-status]");
              const toast = document.querySelector("[data-admin-user-removal-toast]");
              const statusText = status?.textContent || "";
              const toastText = toast?.textContent || "";
              return !row
                && status?.dataset.adminUserManagementStatusTone === "success"
                && statusText.includes("was removed from Admin")
                && statusText.includes("linked login account was deleted")
                && toastText.includes("Access list updated");
            `,
            [user.id]
          ),
          30_000
        );
      } catch (error) {
        const diagnostics = await session.execute(
          `
            const row = document.querySelector(\`[data-admin-user-row="\${arguments[0]}"]\`);
            const status = document.querySelector("[data-admin-user-management-status]");
            const toast = document.querySelector("[data-admin-user-removal-toast]");
            return {
              rowPresent: Boolean(row),
              statusText: status?.textContent?.trim() || "",
              statusTone: status?.dataset.adminUserManagementStatusTone || "",
              toastText: toast?.textContent?.trim() || ""
            };
          `,
          [user.id]
        );
        throw new Error(`${error.message} Diagnostics: ${JSON.stringify(diagnostics)}`);
      }

      await verifyUserAbsent(session, user.id, user.email);
    } finally {
      await deleteUserById(session, user.id);
      await cleanupDisposableUsers(session);
    }
  });

  console.log("Admin user removal smoke passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
