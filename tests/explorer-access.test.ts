import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { isExplorerRequestAllowed, isExplorerMutationLabel } from "../src/lib/explorer-policy.ts";
import { demoProgramId } from "../src/lib/demo-mode.ts";
import { appUserTypes, canAccessAdminSurface, canAccessLeadershipSurface, canAccessProgramScope, canAccessClientDashboardScope, isProgramScopedUserType } from "../src/lib/admin-user-types.ts";
import { buildManagedAppUserRecord } from "../src/lib/admin-user-service.ts";
import { buildRoleAwareUiProfile } from "../src/lib/role-aware-ui.ts";
import { sampleDiscoverySynthesis, sampleProgram } from "../src/data/sample-program.ts";

const root = path.resolve(import.meta.dirname, "..");
const explorer = { id: "explorer-1", name: "Peer", email: "peer@example.com", credentialStatus: "active" as const, userType: "explorer" as const, assignments: [], createdAt: "2026-10-22", updatedAt: "2026-10-22" };

// Execute real handlers with an identity double. Any unexpected call into
// persistence or a provider throws, so these tests never spend API credits.
function load(file: string, mocks: Record<string, unknown>) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const compiled = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} as Record<string, (...args: unknown[]) => Promise<Response>> };
  const require = (name: string) => name in mocks ? mocks[name] : name === "server-only" ? {} : new Proxy({}, { get: (_, key) => () => { throw new Error(`Unexpected side effect: ${name}.${String(key)}`); } });
  new Function("require", "module", "exports", compiled)(require, module, module.exports);
  return module.exports;
}
const json = (body: unknown, init?: ResponseInit) => Response.json(body, init);
function guardFor(user: unknown = explorer) {
  return load("src/lib/explorer-access.ts", {
    "next/server": { NextResponse: { json } },
    "@/lib/current-managed-user": { getCurrentManagedUser: async () => user },
    "@/lib/explorer-policy": { isExplorerRequestAllowed, explorerRestrictionMessage: "Explorer mode is read-only." },
    "@/lib/supabase/server": { isSupabaseConfigured: () => true }
  }).denyExplorerRequest;
}

test("Explorer can be provisioned without assignments and cannot inherit live access", () => {
  assert.ok(appUserTypes.includes("explorer"));
  assert.equal(isProgramScopedUserType("explorer"), false);
  const record = buildManagedAppUserRecord({ input: explorer, programs: [], now: "2026-10-22", idFactory: () => "id" });
  assert.equal(record.ok, true);
  if (record.ok) assert.deepEqual(record.record.assignments, []);
  const invalid = buildManagedAppUserRecord({ input: { ...explorer, assignment: { programId: "live", role: "Owner" } }, programs: [], now: "2026-10-22", idFactory: () => "id" });
  assert.equal(invalid.ok, false);
  const stale = { ...explorer, assignments: [{ id: "old", programId: "live", programName: "Live", role: "Owner", isPrimary: true, createdAt: "", updatedAt: "" }] };
  assert.equal(canAccessAdminSurface(stale), false);
  assert.equal(canAccessLeadershipSurface(stale), false);
  assert.equal(canAccessProgramScope(stale, "live"), false);
  assert.equal(canAccessClientDashboardScope(stale, "live"), false);
  assert.equal(buildRoleAwareUiProfile(stale, "live", ["Owner"]).assignedRole, null);
  const converted = buildManagedAppUserRecord({ existing: { ...stale, userType: "admin" }, input: { userType: "explorer" }, programs: [], now: "2026-10-22", idFactory: () => "id" });
  assert.equal(converted.ok, true);
  if (converted.ok) assert.deepEqual(converted.record.assignments, []);
});

test("Explorer policy allows explicit sample reads only and sample export", () => {
  for (const suffix of ["bundle", "guided-plan", "updates", "role-artifacts", "discovery-synthesis", "client-updates"]) {
    assert.equal(isExplorerRequestAllowed("GET", `/api/programs/${demoProgramId}/${suffix}`), true);
    assert.equal(isExplorerRequestAllowed("GET", `/api/programs/live/${suffix}`), false);
  }
  assert.equal(isExplorerRequestAllowed("POST", "/api/studio/export"), true);
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    for (const url of ["/api/programs", `/api/programs/${demoProgramId}/updates`, "/api/studio/discovery-synthesis", "/api/artifacts/extract", "/api/artifacts/upload", "/api/studio/packages", "/api/assistant", "/api/admin/users", "/api/demo-session", "/api/audit-events", "/api/new-feature"]) assert.equal(isExplorerRequestAllowed(method, url), false, `${method} ${url}`);
  }
  for (const url of [`/api/programs/${demoProgramId}/role-artifact-suggestions`, "/api/openai-billing", "/api/admin/users", "/api/health", "/api/studio/packages", "/api/studio/packages/live/shared-export", "/api/new-feature"]) assert.equal(isExplorerRequestAllowed("GET", url), false, url);
});

test("actual guard rejects disabled Explorers and ignores forged sample cookies", async () => {
  const request = new Request("https://north-star.live/api/studio/discovery-synthesis", { method: "POST", headers: { cookie: "northstar-demo=regional-service-modernization" } });
  const denied = await guardFor()(request);
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).code, "EXPLORER_READ_ONLY");
  assert.equal((await guardFor({ ...explorer, credentialStatus: "disabled" })(new Request("https://north-star.live/api/programs"))).status, 403);
  assert.equal(await guardFor()(new Request("https://north-star.live/api/programs")), null);
});

test("Explorer guard leaves existing role authorization unchanged", async () => {
  for (const role of appUserTypes.filter(role => role !== "explorer")) assert.equal(await guardFor({ ...explorer, userType: role })(new Request("https://north-star.live/api/studio/discovery-synthesis", { method: "POST" })), null);
  const anonymous = await guardFor(null)(new Request("https://north-star.live/api/programs", { headers: { cookie: "site_access_session=legacy-token" } }));
  assert.equal(anonymous.status, 401);
  assert.equal((await anonymous.json()).code, "NAMED_ACCOUNT_REQUIRED");
});

function routeFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(file) : entry.name === "route.ts" ? [file] : [];
  });
}

test("every non-auth API handler guards first; rejected routes perform no side effects", async () => {
  let checked = 0;
  for (const absolute of routeFiles(path.join(root, "src/app/api"))) {
    const relative = path.relative(root, absolute);
    if (relative.includes("api/auth/")) continue;
    const source = fs.readFileSync(absolute, "utf8");
    const ast = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true);
    const route = load(relative, { "@/lib/explorer-access": { denyExplorerRequest: guardFor() }, "next/server": { NextResponse: { json } } });
    const url = "/" + relative.replace(/^src\/app\//, "").replace(/\/route\.ts$/, "").replace(/\[id\]/g, demoProgramId).replace(/\[flagId\]/g, "flag");
    for (const node of ast.statements) {
      if (!ts.isFunctionDeclaration(node) || !node.name || !node.body || !/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(node.name.text)) continue;
      assert.match(node.body.statements[0].getText(ast), /await denyExplorerRequest\(request\)/, relative);
      assert.match(node.body.statements[1].getText(ast), /if \(explorerDenied\) return explorerDenied/, relative);
      if (isExplorerRequestAllowed(node.name.text, url)) continue;
      const request = new Request(`https://north-star.live${url}`, { method: node.name.text });
      const result = await route[node.name.text](request, { params: Promise.resolve({ id: demoProgramId, flagId: "flag" }) });
      assert.equal(result.status, 403, `${relative} ${node.name.text}`);
      checked++;
    }
  }
  assert.ok(checked >= 38, `Only ${checked} blocked handlers exercised`);
});

test("Explorer sample mode needs no cookie and ignores editable sample-state cookies", async () => {
  const session = load("src/lib/demo-session.ts", {
    "next/headers": { cookies: () => { throw new Error("Explorer must not depend on cookies"); } },
    "@/lib/current-managed-user": { getCurrentManagedUser: async () => explorer }
  });
  assert.equal(await session.isDemoMode(), true);
  const repository = load("src/lib/demo-program-repository.ts", {
    "next/headers": { cookies: () => { throw new Error("Do not read editable cookies"); } },
    "@/lib/current-managed-user": { getCurrentManagedUser: async () => explorer },
    "@/lib/demo-program-repository-core": { createDemoProgramRepository: (cookies: unknown) => cookies }
  });
  const cookies = await repository.getDemoProgramRepository() as unknown as { get: (name: string) => unknown; set: () => void };
  assert.equal(cookies.get("northstar-demo-state-0"), undefined);
  assert.throws(() => cookies.set(), /read-only/);
});

test("Explorer export overrides forged package data with server-owned sample content", async () => {
  let exported: unknown;
  const route = load("src/app/api/studio/export/route.ts", {
    "@/lib/explorer-access": { denyExplorerRequest: guardFor() },
    "next/server": { NextResponse: { json } },
    "@/lib/api-route-access": { requireInternalWorkspaceRouteAccess: async () => ({ response: null }) },
    "@/lib/current-managed-user": { getCurrentManagedUser: async () => explorer },
    "@/data/sample-program": { sampleProgram, sampleDiscoverySynthesis },
    "@/lib/studio-export": { MAX_STUDIO_EXPORT_BYTES: 4_000_000, normalizeStudioExportRequest: (body: unknown) => body, generateStudioExport: async (body: unknown) => { exported = body; return { buffer: new Uint8Array([1, 2]), contentType: "application/octet-stream", filename: "sample.xlsx" }; } }
  });
  const response = await route.POST(new Request("https://north-star.live/api/studio/export", { method: "POST", body: JSON.stringify({ format: "xlsx", outputs: ["stories"], packageId: "live-id", revisionId: "live-revision", workspaceName: "PRIVATE", synthesis: { executiveSummary: "FORGED" } }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(exported, { format: "xlsx", outputs: ["stories"], workspaceName: sampleProgram.name, synthesis: sampleDiscoverySynthesis });
});

test("Explorer UI keeps exploration and downloads available but marks mutations", () => {
  for (const label of ["Save", "Upload files", "Apply feedback and create revision", "Re-analyze package", "Refresh guidance", "Approve for Dev", "Start fresh", "Exit sample data"]) assert.equal(isExplorerMutationLabel(label), true, label);
  for (const label of ["Delivery handoff", "Full output package", "Preview delivery handoff", "Download .xlsx", "Copy Markdown", "Review US-03", "View evidence", "Review gaps and add context"]) assert.equal(isExplorerMutationLabel(label), false, label);
});

test("sample-session middleware permits identity setup and sign-in without opening product mutations", () => {
  const source = fs.readFileSync(path.join(root, "src/middleware.ts"), "utf8");
  const ast = ts.createSourceFile("middleware.ts", source, ts.ScriptTarget.Latest, true);
  const fn = ast.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "isDemoMutationAllowed");
  assert.ok(fn);
  const code = ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const allowed = new Function("demoProgramId", `${code}; return isDemoMutationAllowed;`)(demoProgramId);
  for (const name of ["login", "activate", "activate-invite", "password", "recover", "logout"]) assert.equal(allowed(`/api/auth/user/${name}`), true);
  assert.equal(allowed("/api/admin/users"), false);
  assert.equal(allowed("/api/studio/packages"), false);
  assert.equal(isExplorerRequestAllowed("POST", "/api/studio/discovery-synthesis"), false);
});

test("inactive Explorer identities cannot open protected workspace or client pages", async () => {
  const redirect = (url: string) => { throw new Error(`redirect:${url}`); };
  for (const status of ["disabled", "invited", "not-invited"] as const) {
    const user = { ...explorer, credentialStatus: status };
    const types = await import("../src/lib/admin-user-types.ts");
    const mocks = {
      "next/navigation": { redirect },
      "@/lib/current-managed-user": { getCurrentManagedUser: async () => user, tryGetCurrentManagedUser: async () => user },
      "@/lib/admin-user-types": types,
      "@/lib/app-page-access": { hasSiteAccessPageSession: async () => true }
    };
    const pages = load("src/lib/app-page-access.ts", mocks);
    const client = load("src/lib/client-portal-data.ts", mocks);
    const target = status === "disabled" ? /redirect:\/login/ : /redirect:\/auth\/setup/;
    await assert.rejects(pages.requireSiteAccessPage("/knowledge"), target);
    await assert.rejects(client.loadClientPortalData("/client"), target);
  }
});

test("clearing individual auth never turns a legacy shared cookie into production API access", async () => {
  for (const [method, url] of [["GET", "/api/programs"], ["POST", "/api/studio/discovery-synthesis"], ["POST", "/api/studio/export"], ["GET", `/api/programs/${demoProgramId}/role-artifact-suggestions`]]) {
    const result = await guardFor(null)(new Request(`https://north-star.live${url}`, { method, headers: { cookie: "site_access_session=legacy-token; northstar-demo=regional-service-modernization" } }));
    assert.equal(result.status, 401);
  }
});

test("Explorer sign-in clears legacy access, issues no broad site grant, and lands in Studio", async () => {
  const types = await import("../src/lib/admin-user-types.ts");
  const deleted: string[] = [];
  const auth = load("src/app/api/auth/user/login/route.ts", {
    "next/server": { NextResponse: { json: (body: unknown, options?: ResponseInit) => Object.assign(Response.json(body, options), { cookies: { delete: (name: string) => deleted.push(name) } }) } },
    "@/lib/admin-user-types": types,
    "@/lib/current-managed-user": { syncManagedUserFromAuthUser: async () => explorer },
    "@/lib/supabase/server": { isSupabaseConfigured: () => true, createSupabaseServerClient: async () => ({ auth: { signInWithPassword: async () => ({ data: { user: { id: explorer.id } }, error: null }) } }) }
  });
  const response = await auth.POST(new Request("https://north-star.live/api/auth/user/login", { method: "POST", body: JSON.stringify({ email: explorer.email, password: "fixture-only" }) }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).redirectTo, "/artifacts");
  assert.deepEqual(deleted, ["site_access_session"]);
  for (const file of ["src/app/api/auth/user/activate-invite/route.ts", "src/app/api/auth/user/password/route.ts", "src/app/auth/callback/route.ts"]) {
    assert.match(fs.readFileSync(path.join(root, file), "utf8"), /userType === "explorer"\) \{\s*response.cookies.delete\("site_access_session"\);\s*return response;/);
  }
});

test("legacy-cookie-only visits show sign-in instead of redirecting into a loop", async () => {
  const site = load("src/app/login/page.tsx", {
    "next/navigation": { redirect: (url: string) => { throw new Error(`Unexpected redirect:${url}`); } },
    "next/headers": { cookies: async () => ({ get: () => ({ value: "legacy" }), getAll: () => [{ name: "site_access_session", value: "legacy" }] }) },
    "@/lib/site-access": { getSiteAccessConfig: () => ({ enabled: true }), siteAccessSessionCookieName: "site_access_session", isSiteAccessSessionTokenValid: () => true },
    "@/lib/supabase/server": { isSupabaseConfigured: () => true },
    "@/components/site-access-login-form": { SiteAccessLoginForm: "sign-in-form" },
    "react/jsx-runtime": { jsx: (component: unknown, props: unknown) => ({ component, props }) }
  });
  const view = await site.default({ searchParams: Promise.resolve({}) }) as unknown as { props: { userAuthEnabled: boolean } };
  assert.equal(view.props.userAuthEnabled, true);
});
