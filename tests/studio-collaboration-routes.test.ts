import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { sampleDiscoverySources, sampleDiscoverySynthesis } from "../src/data/sample-program.ts";
import { hasActiveUserCredentials, isExternalOnlyUserType } from "../src/lib/admin-user-types.ts";
import { applyStudioPackageAction, createStudioPackageRecord, projectStudioPackage } from "../src/lib/studio-collaboration.ts";
import { StudioCollaborationError } from "../src/lib/studio-collaboration-types.ts";
import type { StudioActor, StudioPackageAction } from "../src/lib/studio-collaboration-types.ts";
import { MAX_STUDIO_EXPORT_BYTES, normalizeStudioExportRequest, StudioExportError } from "../src/lib/studio-export.ts";
import { isStudioRequestSameOrigin } from "../src/lib/studio-request-origin.ts";

const origin = "https://northstar.example.test";
const owner: StudioActor = { id: "OWNER", name: "Package owner", userType: "team-member", credentialStatus: "active" };
const contractor: StudioActor = { id: "CONTRACTOR", name: "Scoped reviewer", userType: "contractor", credentialStatus: "active" };
const outsider: StudioActor = { id: "OUTSIDER", name: "Other user", userType: "team-member", credentialStatus: "active" };
const clock = { now: "2026-10-20T12:00:00.000Z", idFactory: (() => { let id = 0; return () => `SYNTHETIC-${++id}`; })() };
const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// Execute the actual route/helper function bodies with synthetic dependencies.
// No Next server, account, database, filesystem write, or network call is used.
function actualFunction(path: string, name: string, dependencies: Record<string, unknown>) {
  const text = source(path);
  const parsed = ts.createSourceFile(path, text, ts.ScriptTarget.ES2022, true);
  const entry = parsed.statements.find((item): item is ts.FunctionDeclaration => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(entry, `${path}: ${name}`);
  const compiled = ts.transpileModule(entry.getText(parsed).replace(/^export\s+(?:default\s+)?/, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return new Function(...Object.keys(dependencies), `${compiled}\nreturn ${name};`)(...Object.values(dependencies));
}

function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}${path}`, body === undefined ? { headers } : { method: "POST", headers: { "content-type": "application/json", origin, ...headers }, body: JSON.stringify(body) });
}

function routeHelpers(actor: StudioActor | null) {
  const studioJson = actualFunction("src/lib/studio-route-access.ts", "studioJson", { NextResponse: Response });
  const studioRouteError = actualFunction("src/lib/studio-route-access.ts", "studioRouteError", { StudioCollaborationError, studioJson });
  const requireStudioIdentity = actualFunction("src/lib/studio-route-access.ts", "requireStudioIdentity", { getCurrentManagedUser: async () => actor, hasActiveUserCredentials, StudioCollaborationError });
  const readStudioJson = actualFunction("src/lib/studio-route-access.ts", "readStudioJson", { StudioCollaborationError, isStudioRequestSameOrigin });
  return { studioJson, studioRouteError, requireStudioIdentity, readStudioJson, StudioCollaborationError };
}

function fixture(actor: StudioActor = owner) {
  const synthesis = structuredClone(sampleDiscoverySynthesis);
  synthesis.evidenceSummary = "PRIVATE-DISCOVERY-CONTEXT";
  let record = createStudioPackageRecord(owner, {
    title: "Private package", synthesis, sources: structuredClone(sampleDiscoverySources),
    resolutionNotes: "PRIVATE-RESOLUTION-NOTES", provenance: "prepared-example"
  }, clock);
  const people = [
    { ...owner, email: "owner@example.test" }, { ...contractor, email: "reviewer@example.test" },
    { ...outsider, email: "outsider@example.test" }, { ...contractor, id: "DISABLED", email: "disabled@example.test", credentialStatus: "disabled" }
  ];
  let identityReads = 0;
  let mutationCalls = 0;
  const getStudioPackage = async (user: StudioActor, id: string, revisionId?: string) => {
    if (id !== record.id) throw new StudioCollaborationError("This Studio package is not available.", 404);
    return projectStudioPackage(record, user, revisionId, clock.now);
  };
  const mutateStudioPackage = async (user: StudioActor, id: string, expectedVersion: number, action: StudioPackageAction) => {
    mutationCalls++;
    if (id !== record.id) throw new StudioCollaborationError("This Studio package is not available.", 404);
    record = applyStudioPackageAction(record, user, expectedVersion, action, {
      ...clock, recipient: action.type === "share" ? people.find(person => person.id === action.recipientId) : undefined,
      assignee: action.type === "assign" ? people.find(person => person.id === action.assigneeId) : undefined
    });
    return projectStudioPackage(record, user, action.type === "revoke" ? undefined : action.revisionId, clock.now);
  };
  const dependencies = { ...routeHelpers(actor), getStudioPackage, mutateStudioPackage, listManagedUsers: async () => { identityReads++; return people; } };
  const get = actualFunction("src/app/api/studio/packages/[id]/route.ts", "GET", dependencies);
  const post = actualFunction("src/app/api/studio/packages/[id]/route.ts", "POST", dependencies);
  const context = () => ({ params: Promise.resolve({ id: record.id }) });
  const share = () => {
    record = applyStudioPackageAction(record, owner, record.version, { type: "share", revisionId: record.headRevisionId, recipientId: contractor.id, storyIds: ["US-01"], sharedContext: "EXPLICIT-SHARED-CONTEXT" }, { ...clock, recipient: contractor });
    record = applyStudioPackageAction(record, owner, record.version, { type: "comment", revisionId: record.headRevisionId, storyId: "US-01", body: "PRIVATE-INTERNAL-COMMENT", visibility: "internal" }, clock);
    record = applyStudioPackageAction(record, owner, record.version, { type: "comment", revisionId: record.headRevisionId, storyId: "US-02", body: "UNSHARED-SIBLING-COMMENT", visibility: "shared" }, clock);
  };
  return { get, post, context, getStudioPackage, share, record: () => record, identityReads: () => identityReads, mutationCalls: () => mutationCalls, dependencies };
}

test("saved-package routes reject site-only, inactive and absent managed identities before storage reads", async () => {
  for (const actor of [null, { ...owner, credentialStatus: "disabled" }, { ...owner, credentialStatus: "invited" }]) {
    let reads = 0;
    const get = actualFunction("src/app/api/studio/packages/route.ts", "GET", {
      ...routeHelpers(actor), listStudioPackages: async () => { reads++; return []; }
    });
    const response = await get(request("/api/studio/packages", undefined, { cookie: "northstar-site-access=synthetic-not-an-identity" }));
    assert.equal(response.status, 401);
    assert.equal(reads, 0);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  }
});

test("an internal outsider and an ungranted contractor cannot read a private package by ID", async () => {
  for (const actor of [outsider, contractor]) {
    const f = fixture(actor);
    const response = await f.get(request(`/api/studio/packages/${f.record().id}`), f.context());
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /PRIVATE-DISCOVERY|PRIVATE-RESOLUTION|US-01/);
  }
});

test("share email lookup happens only after management authorization, not for arbitrary reviewers", async () => {
  for (const withGrant of [false, true]) {
    const f = fixture(contractor);
    if (withGrant) f.share();
    const response = await f.post(request(`/api/studio/packages/${f.record().id}`, {
      expectedVersion: f.record().version,
      action: { type: "share", revisionId: f.record().headRevisionId, recipientEmail: "owner@example.test", recipientId: owner.id, storyIds: ["US-01"] }
    }), f.context());
    assert.equal(response.status, withGrant ? 403 : 404);
    assert.equal(f.identityReads(), 0);
    assert.equal(f.mutationCalls(), 0);
  }
});

test("sharing resolves the exact active email and ignores a forged recipient ID/name", async () => {
  const f = fixture();
  const response = await f.post(request(`/api/studio/packages/${f.record().id}`, {
    expectedVersion: f.record().version,
    action: { type: "share", revisionId: f.record().headRevisionId, recipientEmail: "  REVIEWER@example.test  ", recipientId: outsider.id, recipientLabel: "Forged label", storyIds: ["US-01"] }
  }), f.context());
  assert.equal(response.status, 200);
  assert.equal(f.identityReads(), 1);
  assert.equal(f.record().grants[0].recipientId, contractor.id);
  assert.equal(f.record().grants[0].recipientLabel, contractor.name);
  assert.equal(f.record().grants[0].storyIds.join(), "US-01");
});

test("disabled or non-exact recipient emails cannot create a grant", async () => {
  for (const email of ["disabled@example.test", "reviewer@example.test.evil", "reviewer"]) {
    const f = fixture();
    const response = await f.post(request(`/api/studio/packages/${f.record().id}`, {
      expectedVersion: f.record().version,
      action: { type: "share", revisionId: f.record().headRevisionId, recipientEmail: email, storyIds: ["US-01"] }
    }), f.context());
    assert.equal(response.status, 400);
    assert.equal(f.mutationCalls(), 0);
    assert.equal(f.record().grants.length, 0);
  }
});

test("scoped comments use the authenticated author and cannot target sibling stories or internal notes", async () => {
  const f = fixture(contractor); f.share();
  const revisionId = f.record().headRevisionId;
  const response = await f.post(request(`/api/studio/packages/${f.record().id}`, {
    expectedVersion: f.record().version,
    action: { type: "comment", revisionId, storyId: "US-01", body: "Please clarify.", visibility: "shared", authorId: owner.id, authorName: owner.name }
  }), f.context());
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.package.comments[0].authorId, contractor.id);
  assert.equal(payload.package.comments[0].authorName, contractor.name);
  for (const action of [
    { type: "comment", revisionId, storyId: "US-02", body: "Unshared", visibility: "shared" },
    { type: "comment", revisionId, storyId: "US-01", body: "Private", visibility: "internal" },
    { type: "approve", revisionId, storyId: "US-01", confirmReviewed: true },
    { type: "assign", revisionId, storyId: "US-01", assigneeEmail: "reviewer@example.test" }
  ]) {
    const denied = await f.post(request(`/api/studio/packages/${f.record().id}`, { expectedVersion: f.record().version, action }), f.context());
    assert.equal(denied.status, action.storyId === "US-02" ? 404 : 403);
  }
});

test("collaboration JSON changes enforce content type, origin, fetch-site and streamed size bounds", async () => {
  const { readStudioJson } = routeHelpers(owner);
  const rejects = (status: number) => (error: unknown) => error instanceof StudioCollaborationError && error.status === status;
  await assert.rejects(readStudioJson(new Request(`${origin}/api/studio/packages`, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" })), rejects(415));
  await assert.rejects(readStudioJson(request("/api/studio/packages", {}, { origin: "https://other.example.test" })), rejects(403));
  await assert.rejects(readStudioJson(request("/api/studio/packages", {}, { "sec-fetch-site": "cross-site" })), rejects(403));
  await assert.rejects(readStudioJson(request("/api/studio/packages", {}, { "content-length": "100" }), 8), rejects(413));
  await assert.rejects(readStudioJson(request("/api/studio/packages", { long: "untrusted content" }), 8), rejects(413));
  await assert.rejects(readStudioJson(new Request(`${origin}/api/studio/packages`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" })), rejects(400));
  await assert.rejects(readStudioJson(request("/api/studio/packages", [])), rejects(400));
  assert.deepEqual(await readStudioJson(request("/api/studio/packages", { expectedVersion: 1 })), { expectedVersion: 1 });
});

test("saved full export loads the authorized canonical snapshot, not browser-submitted output", async () => {
  const f = fixture();
  let exported: ReturnType<typeof normalizeStudioExportRequest> | undefined;
  const readExportBody = actualFunction("src/app/api/studio/export/route.ts", "readExportBody", { MAX_STUDIO_EXPORT_BYTES, StudioExportError });
  const post = actualFunction("src/app/api/studio/export/route.ts", "POST", {
    requireInternalWorkspaceRouteAccess: async () => ({ currentUser: owner, response: null }), readExportBody,
    MAX_STUDIO_EXPORT_BYTES, StudioExportError, StudioCollaborationError, NextResponse: Response,
    requireStudioIdentity: async () => owner,
    getStudioExport: async (actor: StudioActor, id: string, revisionId: string) => {
      const view = await f.getStudioPackage(actor, id, revisionId);
      if (!view.canManage) throw new StudioCollaborationError("Internal exports only", 403);
      return { title: view.revision.title, synthesis: view.revision.synthesis };
    }, normalizeStudioExportRequest,
    generateStudioExport: async (input: ReturnType<typeof normalizeStudioExportRequest>) => { exported = input; return { buffer: Buffer.from("synthetic-export"), contentType: "application/octet-stream", filename: "synthetic.xlsx" }; }
  });
  const response = await post(request("/api/studio/export", { packageId: f.record().id, revisionId: f.record().headRevisionId, workspaceName: "Forged title", synthesis: { executiveSummary: "FORGED" }, format: "xlsx", outputs: ["stories", "tests"] }));
  assert.equal(response.status, 200);
  assert.equal(exported?.workspaceName, "Private package");
  assert.equal(exported?.synthesis.evidenceSummary, "PRIVATE-DISCOVERY-CONTEXT");
  assert.deepEqual(exported?.synthesis.stories, f.record().revisions[0].synthesis.stories);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("a contractor cannot use legacy or saved full-package export even with a site cookie", async () => {
  let loads = 0;
  const post = actualFunction("src/app/api/studio/export/route.ts", "POST", {
    requireInternalWorkspaceRouteAccess: async () => ({ currentUser: contractor, response: Response.json({ error: "Workspace access denied." }, { status: 403 }) }),
    getStudioExport: async () => { loads++; throw new Error("Must not read a full snapshot"); }
  });
  for (const body of [{ packageId: "PRIVATE", revisionId: "PRIVATE-REVISION", format: "xlsx" }, { synthesis: sampleDiscoverySynthesis, format: "xlsx" }]) {
    const response = await post(request("/api/studio/export", body, { cookie: "northstar-site-access=synthetic" }));
    assert.equal(response.status, 403);
  }
  assert.equal(loads, 0);
});

test("an internal outsider cannot turn a guessed package locator into a canonical export", async () => {
  const f = fixture(outsider);
  let exports = 0;
  const readExportBody = actualFunction("src/app/api/studio/export/route.ts", "readExportBody", { MAX_STUDIO_EXPORT_BYTES, StudioExportError });
  const post = actualFunction("src/app/api/studio/export/route.ts", "POST", {
    requireInternalWorkspaceRouteAccess: async () => ({ currentUser: outsider, response: null }), readExportBody,
    MAX_STUDIO_EXPORT_BYTES, StudioExportError, StudioCollaborationError, NextResponse: Response,
    requireStudioIdentity: async () => outsider,
    getStudioExport: async (actor: StudioActor, id: string, revisionId: string) => f.getStudioPackage(actor, id, revisionId),
    generateStudioExport: async () => { exports++; throw new Error("Unauthorized snapshot must not be exported"); }
  });
  const response = await post(request("/api/studio/export", { packageId: f.record().id, revisionId: f.record().headRevisionId, format: "xlsx", outputs: ["stories"] }));
  assert.equal(response.status, 404);
  assert.equal(exports, 0);
  assert.doesNotMatch(await response.text(), /PRIVATE-DISCOVERY|PRIVATE-RESOLUTION/);
});

test("shared Markdown and JSON serialize only the permitted revision/story projection", async () => {
  const f = fixture(contractor); f.share();
  const get = actualFunction("src/app/api/studio/packages/[id]/shared-export/route.ts", "GET", {
    ...f.dependencies, plain: (value: string) => value.replace(/[<>\u0000\r]/g, "")
  });
  const path = `/api/studio/packages/${f.record().id}`;
  const jsonResponse = await f.get(request(`${path}?revisionId=${f.record().headRevisionId}`), f.context());
  assert.equal(jsonResponse.status, 200);
  const payload = await jsonResponse.json();
  assert.deepEqual(payload.package.items.map((item: { id: string }) => item.id), ["US-01"]);
  assert.equal(payload.package.canManage, false);
  const exported = await get(request(`${path}/shared-export?revisionId=${f.record().headRevisionId}`), f.context());
  assert.equal(exported.status, 200);
  const markdown = await exported.text();
  assert.match(markdown, /EXPLICIT-SHARED-CONTEXT|Acceptance criteria|Test cases/);
  for (const value of [JSON.stringify(payload), markdown]) assert.doesNotMatch(value, /PRIVATE-DISCOVERY|PRIVATE-RESOLUTION|PRIVATE-INTERNAL|UNSHARED-SIBLING|sample-capability-assessment|Current-State-Capability|US-02|"sources"|"synthesis"|"grants"|"headRevisionId"/);
  const missingRevision = await get(request(`${path}/shared-export`), f.context());
  assert.equal(missingRevision.status, 400);
  const otherRevision = await get(request(`${path}/shared-export?revisionId=NOT-GRANTED`), f.context());
  assert.equal(otherRevision.status, 404);
});

test("contractors cannot save browser-submitted packages or create the example", async () => {
  let writes = 0;
  const post = actualFunction("src/app/api/studio/packages/route.ts", "POST", {
    ...routeHelpers(contractor), isExternalOnlyUserType, createStudioPackage: async () => { writes++; }
  });
  const response = await post(request("/api/studio/packages", { action: "create-example", synthesis: sampleDiscoverySynthesis }));
  assert.equal(response.status, 403);
  assert.equal(writes, 0);
});
