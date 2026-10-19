import assert from "node:assert/strict";
import { loadEnvFile } from "./browser-webdriver.mjs";

loadEnvFile(process.env.NORTHSTAR_ENV_FILE ?? ".env.local");
const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const programId = "demo-regional-service-modernization";
const email = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const password = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
if (!email || !password) throw new Error("Set a North Star smoke-test user before checking the connected sample experience.");

function browserSession(initial = []) {
  const jar = new Map(initial);
  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      redirect: "manual",
      headers: { cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "), origin: baseUrl, ...options.headers }
    });
    for (const cookie of response.headers.getSetCookie()) {
      const first = cookie.split(";", 1)[0];
      const divider = first.indexOf("=");
      const name = first.slice(0, divider);
      const value = first.slice(divider + 1);
      if (/max-age=0/i.test(cookie) || !value) jar.delete(name);
      else jar.set(name, value);
    }
    return response;
  }
  async function json(path, options) {
    const response = await request(path, options);
    assert.equal(response.status, 200, `${path} returned HTTP ${response.status}: ${(await response.clone().text()).slice(0, 300)}`);
    return response.json();
  }
  async function changeMode(action) {
    const response = await request("/api/demo-session", { method: "POST", body: new URLSearchParams({ action, next: "/active-program?mode=manage" }) });
    assert.equal(response.status, 303);
  }
  return { jar, request, json, changeMode };
}

const browser = browserSession();
await browser.json("/api/auth/user/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
const otherBrowser = browserSession([...browser.jar]);
const realCatalog = await browser.json("/api/programs");
await browser.changeMode("start");
const catalog = await browser.json("/api/programs");
assert.deepEqual(catalog.programs.map((program) => program.id), [programId]);
const originalUpdates = await browser.json(`/api/programs/${programId}/updates`);
const bundle = await browser.json(`/api/programs/${programId}/bundle`);
assert.ok(bundle.plan);
assert.equal(originalUpdates.updates[0].review.teamRoleUpdates.length, 6);
assert.ok((await browser.json("/api/leadership/review-queue")).reviewQueue.length);
for (const path of ["/", "/active-program?mode=manage", "/systems", "/leadership", "/client-updates", "/client", "/artifacts"]) {
  const response = await browser.request(path);
  assert.equal(response.status, 200, `${path} must render in sample mode`);
  const html = await response.text();
  assert.match(html, /data-demo-mode/);
  assert.doesNotMatch(html, />Sample<\/a>/);
}
console.log("✓ The actual Program Hub, Guided Plans, Leadership, Client Updates, Client Portal, and Studio render with connected sample data.");

const checkpoint = "Sample session API verification: pilot coordinator feedback incorporated.";
const saved = await browser.json(`/api/programs/${programId}/updates`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...originalUpdates.updates[0].review, progressSinceLastReview: checkpoint }) });
assert.equal(saved.update.review.progressSinceLastReview, checkpoint);
assert.equal((await browser.json(`/api/programs/${programId}/updates`)).updates[0].review.progressSinceLastReview, checkpoint);
assert.ok((await browser.json(`/api/programs/${programId}/bundle`)).plan.sourceRecordIds.includes(saved.update.id));
const leadership = await browser.json(`/api/programs/${programId}/leadership-feedback`);
const leadershipSave = await browser.json(`/api/programs/${programId}/leadership-feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...leadership.feedback[0].feedback, leadershipGuidance: "Pilot exception approval owner confirmed in this sample session." }) });
assert.ok(leadershipSave.plan.sourceRecordIds.includes(leadershipSave.feedback.id));
const publications = await browser.json(`/api/programs/${programId}/client-updates`);
await browser.json(`/api/programs/${programId}/client-updates`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...publications.updates[0], executiveOverview: checkpoint }) });
assert.equal((await browser.json(`/api/programs/${programId}/client-updates`)).updates[0].executiveOverview, checkpoint);
for (const path of ["/api/admin/users", "/api/artifacts/upload", "/api/security/supabase-rls-check"]) {
  const response = await browser.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(response.status, 403, `${path} must not mutate the real workspace while sample data is active`);
}
assert.deepEqual(await otherBrowser.json("/api/programs"), realCatalog);
const sampleCookieBytes = [...browser.jar].filter(([name]) => name.startsWith("northstar-demo-state-")).reduce((sum, [, value]) => sum + value.length, 0);
assert.ok(sampleCookieBytes <= 8400);
console.log(`✓ Isolated team edits, refreshed guidance, leadership review, and client publication persist across requests (${sampleCookieBytes} bytes of sample state).`);
console.log("✓ Another browser sees the unchanged real catalog; administration, storage, and security mutations are blocked in sample mode.");

await browser.changeMode("reset");
assert.equal((await browser.json(`/api/programs/${programId}/updates`)).updates[0].id, "demo-program-update");
assert.equal((await browser.json(`/api/programs/${programId}/client-updates`)).updates[0].id, "demo-client-publication");
await browser.changeMode("exit");
assert.deepEqual(await browser.json("/api/programs"), realCatalog);
console.log("✓ Reset restores the connected example, and exit returns to the original workspace.");
