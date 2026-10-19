import assert from "node:assert/strict";
import test from "node:test";
import { brotliCompressSync } from "node:zlib";
import { createDemoProgramStore } from "../src/data/demo-program-store.ts";
import { createDemoProgramRepository, type DemoCookieStore } from "../src/lib/demo-program-repository-core.ts";
import { demoProgramId, demoStateCookiePrefix, getDemoRequestOrigin } from "../src/lib/demo-mode.ts";
import { buildClientPortalPortfolio } from "../src/lib/client-portal.ts";

function browserSession() {
  const values = new Map<string, string>();
  const cookies: DemoCookieStore = {
    get(name) { const value = values.get(name); return value === undefined ? undefined : { value }; },
    set(name, value, options) {
      assert.equal(options.httpOnly, true);
      assert.equal(options.sameSite, "lax");
      values.set(name, value);
    }
  };
  return { values, cookies, repository: () => createDemoProgramRepository(cookies) };
}

test("one fictional program connects evidence, execution, guidance, leadership, and the actual client portfolio", () => {
  const store = createDemoProgramStore();
  assert.equal(store.programs.length, 1);
  assert.equal(store.programs[0].id, demoProgramId);
  assert.equal(store.updates[0].review.teamRoleUpdates?.length, 6);
  assert.ok(store.updates[0].review.deliveryBoardItems?.some((item) => item.status === "blocked"));
  assert.ok(store.guidedPlans[0].sourceRecordIds.includes(store.leadershipFeedbacks[0].id));
  assert.equal(store.roleArtifacts[0].discoverySynthesis?.capabilities.length, 5);
  const portfolio = buildClientPortalPortfolio({ programs: [{ program: store.programs[0], latestClientUpdate: store.clientPortalUpdates[0], clientDecisions: store.clientDecisionRequests }] });
  assert.equal(portfolio.programs.length, 1);
  assert.equal(portfolio.programs[0].name, store.programs[0].intake.programName);
  assert.equal(portfolio.programs[0].domainSummaries.length, 6);
  assert.equal(portfolio.programs[0].clientDecisions.length, 2);
  assert.ok(portfolio.programs[0].metrics.programCompletionPercent > 0);
});

test("sample edits survive later requests in one browser and never appear in another browser", async () => {
  const first = browserSession();
  const second = browserSession();
  const program = (await first.repository().getProgram(demoProgramId))!;
  await first.repository().upsertProgram({ ...program.intake, programOwner: "A new sample owner" });
  assert.equal((await first.repository().getProgram(demoProgramId))?.intake.programOwner, "A new sample owner");
  assert.equal((await second.repository().getProgram(demoProgramId))?.intake.programOwner, "Maya Chen");
  assert.equal(createDemoProgramStore().programs[0].intake.programOwner, "Maya Chen");
  assert.equal(await first.repository().getProgram("real-production-program"), null);
  await assert.rejects(first.repository().createClientDecisionRequest("real-production-program", { decisionText: "No production write" }), /fictional program/);
});

test("team review, refreshed guidance, leadership feedback, and client publication fit a bounded browser session", async () => {
  const session = browserSession();
  const initial = createDemoProgramStore();
  const review = { ...initial.updates[0].review, progressSinceLastReview: "Pilot coordinators validated all request categories. Sample-only checkpoint update." };
  const update = await session.repository().createProgramUpdate(demoProgramId, review);
  const plan = await session.repository().createGuidedPlan(demoProgramId);
  assert.ok(plan?.sourceRecordIds.includes(update.id));
  assert.equal((await session.repository().listProgramUpdates(demoProgramId))[0].id, update.id);
  const feedback = await session.repository().createLeadershipFeedback(demoProgramId, { ...initial.leadershipFeedbacks[0].feedback, leadershipGuidance: "Approve the pilot exception policy for this sample session." });
  const refreshed = await session.repository().createGuidedPlan(demoProgramId);
  assert.ok(refreshed?.sourceRecordIds.includes(feedback.id));
  const publication = await session.repository().createClientPortalUpdate(demoProgramId, { ...initial.clientPortalUpdates[0], executiveOverview: "Pilot decisions are closed; regional onboarding can begin." });
  assert.equal((await session.repository().listClientPortalUpdates(demoProgramId))[0].executiveOverview, publication.executiveOverview);
  assert.ok([...session.values.values()].join("").length <= 8400);
  session.values.clear();
  assert.equal((await session.repository().listProgramUpdates(demoProgramId)).length, 1);
  assert.equal((await session.repository().listClientPortalUpdates(demoProgramId))[0].id, "demo-client-publication");
});

test("invalid session data falls back safely and injected real program records are excluded", async () => {
  const session = browserSession();
  session.values.set(`${demoStateCookiePrefix}0`, "not-valid-compressed-state");
  assert.equal((await session.repository().listPrograms())[0].id, demoProgramId);
  session.values.set(`${demoStateCookiePrefix}0`, brotliCompressSync(Buffer.from(JSON.stringify({ version: 2, tables: { programs: [[-1, [0, { id: "real-production-program", intake: { programName: "Injected" } }]]] } }))).toString("base64url"));
  assert.deepEqual(await session.repository().listPrograms(), []);
});

test("sample repository cannot administer actual users or retain production telemetry", async () => {
  const session = browserSession();
  const repository = session.repository();
  assert.deepEqual(await repository.listManagedUsers(), []);
  await assert.rejects(repository.upsertManagedUser({ email: "test@example.com" }), /administration is unavailable/);
  await assert.rejects(repository.deleteManagedUser("real-user"), /administration is unavailable/);
  assert.deepEqual(await repository.listAuditEvents(), []);
  assert.deepEqual(await repository.listAllOpenAIUsageRecords(), []);
  assert.equal(session.values.size, 0);
});

test("sample-session redirects use the browser origin behind local and production proxies", () => {
  assert.equal(getDemoRequestOrigin(new Request("http://localhost:3100/api/demo-session", { headers: { host: "127.0.0.1:3100", "x-forwarded-proto": "http" } })), "http://127.0.0.1:3100");
  assert.equal(getDemoRequestOrigin(new Request("http://internal:3000/api/demo-session", { headers: { "x-forwarded-host": "www.north-star.live", "x-forwarded-proto": "https" } })), "https://www.north-star.live");
});
