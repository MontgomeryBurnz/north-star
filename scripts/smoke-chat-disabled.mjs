import { loadEnvFile } from "./browser-webdriver.mjs";

loadEnvFile();

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sitePassword = process.env.NORTHSTAR_SITE_PASSWORD ?? process.env.SITE_ACCESS_PASSWORD;
const testUserEmail = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const testUserPassword = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;

let cookieHeader = "";

function rememberCookies(response) {
  const setCookieHeaders =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

  if (!setCookieHeaders.length) return;

  const cookies = new Map(
    cookieHeader
      .split("; ")
      .filter(Boolean)
      .map((cookie) => [cookie.split("=")[0], cookie])
  );

  for (const header of setCookieHeaders) {
    const cookie = header.split(";")[0];
    if (cookie) cookies.set(cookie.split("=")[0], cookie);
  }

  cookieHeader = [...cookies.values()].join("; ");
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (cookieHeader) headers.set("cookie", cookieHeader);

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    redirect: init.redirect ?? "manual"
  });
  rememberCookies(response);
  return response;
}

async function authenticate() {
  if (testUserEmail && testUserPassword) {
    const response = await request("/api/auth/user/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testUserEmail, password: testUserPassword })
    });

    if (response.status !== 200) {
      const body = await response.text();
      throw new Error(`User authentication failed with HTTP ${response.status}: ${body}`);
    }

    return "user";
  }

  if (sitePassword) {
    const response = await request("/api/auth/site-access/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: sitePassword })
    });

    if (response.status !== 200) {
      const body = await response.text();
      throw new Error(`Site-access authentication failed with HTTP ${response.status}: ${body}`);
    }

    return "site";
  }

  throw new Error("Missing smoke credentials. Set NORTHSTAR_TEST_USER_EMAIL and NORTHSTAR_TEST_USER_PASSWORD, or NORTHSTAR_SITE_PASSWORD.");
}

function assertAssistantRedirect(response) {
  const location = response.headers.get("location") ?? "";
  if (![307, 308].includes(response.status) || !location.includes("/systems")) {
    throw new Error(`/assistant should redirect to /systems. Received HTTP ${response.status} with location ${location || "none"}.`);
  }
}

async function assertAssistantApiGone() {
  const response = await request("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "smoke test should remain disabled" })
  });
  const payload = (await response.json().catch(() => null)) ?? {};

  if (response.status !== 410) {
    throw new Error(`/api/assistant should return HTTP 410. Received HTTP ${response.status}.`);
  }

  if (!String(payload.error ?? "").includes("chat guidance has been disabled")) {
    throw new Error(`/api/assistant returned HTTP 410 without the expected disabled-chat message: ${JSON.stringify(payload)}`);
  }
}

const authMode = await authenticate();
const assistantPageResponse = await request("/assistant", { method: "GET" });
assertAssistantRedirect(assistantPageResponse);
await assertAssistantApiGone();

console.log(`Chat-disabled smoke passed against ${baseUrl} using ${authMode} authentication.`);
