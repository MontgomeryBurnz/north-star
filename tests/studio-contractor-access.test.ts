import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import {
  appUserTypes, canAccessAdminSurface, canAccessClientDashboardScope, canAccessClientDashboardUpdateSurface,
  canAccessLeadershipSurface, canAccessProgramScope, getAssignedProgramIdSet, hasActiveUserCredentials,
  hasAssignedProgram, isClientDashboardOnlyUserType, isExternalOnlyUserType, isProgramScopedUserType,
  requiresUserSetup, shouldScopeManagedUserPrograms, type ManagedAppUser
} from "../src/lib/admin-user-types.ts";
import { buildManagedAppUserRecord } from "../src/lib/admin-user-service.ts";
import { buildRoleAwareUiProfile, getProgramAssignmentForUser } from "../src/lib/role-aware-ui.ts";
import type { StoredProgram } from "../src/lib/program-intake-types.ts";

const now = "2026-10-19T18:00:00.000Z";
const staleAssignment = { id: "OLD-ASSIGNMENT", programId: "private-program", programName: "Private program", role: "Delivery Lead", isPrimary: true, createdAt: now, updatedAt: now };
const contractor: ManagedAppUser = {
  id: "contractor-1", name: "Contractor Example", email: "contractor@example.test", userType: "contractor",
  credentialStatus: "active", authUserId: "auth-contractor", assignments: [staleAssignment], createdAt: now, updatedAt: now
};
const program: StoredProgram = {
  id: staleAssignment.programId, createdAt: now, updatedAt: now,
  intake: { programName: staleAssignment.programName, programOwner: "", vision: "", sowSummary: "", outcomes: "", stakeholders: "", risks: "", constraints: "", currentStatus: "", decisionsNeeded: "", blockers: "", teamRoles: ["Delivery Lead"], artifacts: [] }
};

function source(path: string) { return readFileSync(new URL(`../${path}`, import.meta.url), "utf8"); }
function compiledFunction(path: string, name: string, dependencies: Record<string, unknown>) {
  const value = source(path);
  const parsed = ts.createSourceFile(path, value, ts.ScriptTarget.ES2022, true, path.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const declaration = parsed.statements.find((entry): entry is ts.FunctionDeclaration => ts.isFunctionDeclaration(entry) && entry.name?.text === name);
  assert.ok(declaration, `${path}: ${name}`);
  const text = declaration.getText(parsed).replace(/^export\s+(?:default\s+)?/, "");
  const compiled = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React } }).outputText;
  return new Function(...Object.keys(dependencies), `${compiled}\nreturn ${name};`)(...Object.values(dependencies));
}

test("a contractor account can be created with no program assignment or program inventory", () => {
  assert.ok(appUserTypes.includes("contractor"));
  const result = buildManagedAppUserRecord({ input: { name: contractor.name, email: contractor.email, userType: "contractor", credentialStatus: "not-invited" }, programs: [], now, idFactory: () => contractor.id });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.record.userType, "contractor");
  assert.deepEqual(result.record.assignments, []);
  assert.equal(result.record.credentialStatus, "not-invited");
});

test("contractors cannot receive new program assignments and conversion removes stale assignments", () => {
  for (const assignmentInput of [{ assignment: staleAssignment }, { assignments: [staleAssignment] }]) {
    const rejected = buildManagedAppUserRecord({ input: { name: contractor.name, email: contractor.email, userType: "contractor", ...assignmentInput }, programs: [program], now, idFactory: () => contractor.id });
    assert.equal(rejected.ok, false);
    if (!rejected.ok) assert.match(rejected.error, /Shared Studio grants/);
  }
  for (const existing of [contractor, { ...contractor, userType: "team-member" as const }]) {
    const converted = buildManagedAppUserRecord({ existing, input: { userType: "contractor" }, programs: [program], now, idFactory: () => contractor.id });
    assert.equal(converted.ok, true);
    if (converted.ok) assert.deepEqual(converted.record.assignments, []);
  }
});

test("all contractor program, dashboard, admin and leadership access stays denied despite stale assignments", () => {
  assert.equal(isExternalOnlyUserType("contractor"), true);
  assert.equal(isProgramScopedUserType("contractor"), false);
  assert.equal(isClientDashboardOnlyUserType("contractor"), false);
  assert.equal(shouldScopeManagedUserPrograms(contractor), true, "Never treat the contractor as global admin scope.");
  assert.equal(getAssignedProgramIdSet(contractor).size, 0);
  assert.equal(hasAssignedProgram(contractor, staleAssignment.programId), false);
  assert.equal(getProgramAssignmentForUser(contractor, staleAssignment.programId), null);
  const profile = buildRoleAwareUiProfile(contractor, staleAssignment.programId, ["Private role"]);
  assert.equal(profile.assignment, null);
  assert.deepEqual(profile.roleOptions, []);
  for (const credentialStatus of ["active", "invited", "not-invited", "disabled"] as const) {
    const user = { ...contractor, credentialStatus };
    assert.equal(canAccessProgramScope(user, staleAssignment.programId), false);
    assert.equal(canAccessClientDashboardScope(user, staleAssignment.programId), false);
    assert.equal(canAccessClientDashboardUpdateSurface(user), false);
    assert.equal(canAccessAdminSurface(user), false);
    assert.equal(canAccessLeadershipSurface(user), false);
    assert.equal(hasActiveUserCredentials(user), credentialStatus === "active");
  }
});

test("contractor predicates do not remove the existing assigned client and internal access model", () => {
  const admin = { ...contractor, userType: "admin" as const };
  const member = { ...contractor, userType: "team-member" as const };
  const client = { ...contractor, userType: "client" as const };
  assert.equal(canAccessAdminSurface(admin), true);
  assert.equal(canAccessProgramScope(admin, "other-program"), true);
  assert.equal(canAccessProgramScope(member, staleAssignment.programId), true);
  assert.equal(canAccessClientDashboardScope(client, staleAssignment.programId), true);
  assert.equal(canAccessProgramScope(client, staleAssignment.programId), false);
});

test("the internal route gate rejects a contractor before any shared site-session fallback", async () => {
  let fallbackCalls = 0;
  const gate = compiledFunction("src/lib/api-route-access.ts", "requireInternalWorkspaceRouteAccess", {
    getCurrentManagedUser: async () => contractor, hasActiveUserCredentials, isExternalOnlyUserType,
    NextResponse: Response, requireSiteAccessRequest: () => { fallbackCalls++; return null; }
  });
  const result = await gate(new Request("https://example.test/api/studio/export"));
  assert.equal(result.response.status, 403);
  assert.equal(fallbackCalls, 0);
});

test("program route gates deny contractor internal and client-dashboard scopes, including sample mode", async () => {
  for (const demoMode of [false, true]) {
    const gate = compiledFunction("src/lib/api-route-access.ts", "requireProgramRouteAccess", {
      getCurrentManagedUser: async () => contractor, isDemoMode: async () => demoMode, demoProgramId: staleAssignment.programId,
      hasActiveUserCredentials, isExternalOnlyUserType, isClientDashboardOnlyUserType, canAccessProgramScope,
      canAccessClientDashboardScope, NextResponse: Response, isSiteAccessRequestAuthorized: () => true,
      createSiteAccessDeniedResponse: () => Response.json({ error: "Denied" }, { status: 401 })
    });
    for (const scope of ["internal", "client-dashboard"]) {
      const result = await gate(new Request("https://example.test/api/programs/private-program"), staleAssignment.programId, { scope });
      assert.equal(result.response.status, 403);
    }
  }
});

test("internal pages and client-update page guards redirect contractors to Shared Studio", async () => {
  const redirect = (path: string) => { throw new Error(`redirect:${path}`); };
  const internalRedirect = compiledFunction("src/lib/app-page-access.ts", "redirectExternalOnlyUser", { requiresUserSetup, redirect });
  assert.throws(() => internalRedirect(contractor), /redirect:\/studio\/shared/);
  const updateGuard = compiledFunction("src/lib/app-page-access.ts", "requireClientDashboardUpdatePage", {
    getCurrentManagedUser: async () => contractor, hasSiteAccessPageSession: async () => true,
    requiresUserSetup, canAccessClientDashboardUpdateSurface, isExternalOnlyUserType, redirect
  });
  await assert.rejects(updateGuard("/client-updates"), /redirect:\/studio\/shared/);
});

test("generic protected pages redirect contractors before legacy or disabled site-gate fallback", async () => {
  for (const credentialStatus of ["active", "invited", "disabled"] as const) {
    let configReads = 0;
    const gate = compiledFunction("src/lib/app-page-access.ts", "requireSiteAccessPage", {
      tryGetCurrentManagedUser: async () => ({ ...contractor, credentialStatus }), requiresUserSetup,
      redirect: (path: string) => { throw new Error(`redirect:${path}`); },
      getSiteAccessConfig: () => { configReads++; return { enabled: false }; }
    });
    await assert.rejects(gate("/knowledge"), credentialStatus === "invited" ? /redirect:\/auth\/setup/ : /redirect:\/studio\/shared/);
    assert.equal(configReads, 0);
  }
});

test("Client Portal and Client Updates redirect before loading any program context", async () => {
  let programReads = 0;
  const dependencies = {
    getCurrentManagedUser: async () => contractor, hasSiteAccessPageSession: async () => true,
    loadClientPortalData: async () => ({ currentUser: contractor }), canAccessClientDashboardUpdateSurface,
    hasActiveUserCredentials,
    redirect: (path: string) => { throw new Error(`redirect:${path}`); },
    listPrograms: async () => { programReads++; throw new Error("Program data must not be read"); }
  };
  const portal = compiledFunction("src/lib/client-portal-data.ts", "loadClientPortalData", dependencies);
  await assert.rejects(portal(), /redirect:\/studio\/shared/);
  const updates = compiledFunction("src/app/client-updates/page.tsx", "ClientUpdatesPage", dependencies);
  await assert.rejects(updates(), /redirect:\/studio\/shared/);
  assert.equal(programReads, 0);
});

test("contractor navigation exposes only Shared Studio and keeps identity/logout controls", () => {
  const shared = [{ label: "Shared Studio", href: "/studio/shared" }];
  const getItems = compiledFunction("src/components/site-nav.tsx", "getVisibleNavItems", {
    contractorNavItems: shared, dashboardContributorNavItems: [{ href: "/client-updates" }], clientNavItems: [{ href: "/client" }], primaryNavItems: [{ href: "/active-program" }]
  });
  assert.deepEqual(getItems("contractor"), shared);
  const nav = source("src/components/site-nav.tsx");
  assert.match(nav, /const isSharedStudioSurface/);
  assert.match(nav, /!isClientSurface && !isSharedStudioSurface/);
  assert.match(nav, /inferredUserType === "contractor" \? "\/studio\/shared" : "\/"/);
  assert.match(nav, /CurrentUserMenu/);
  assert.match(nav, /action="\/api\/auth\/user\/logout"/);
});

test("login, password, invite activation and callback use the contractor landing page without an internal cookie", () => {
  for (const path of ["login", "password", "activate-invite"]) {
    const route = source(`src/app/api/auth/user/${path}/route.ts`);
    assert.match(route, /userType === "contractor"\s*\? "\/studio\/shared"/);
    assert.match(route, /return isExternalOnlyUserType\([^)]*userType\) \? response : attachSiteAccessCookie\(response\)/);
  }
  const login = source("src/app/login/page.tsx");
  assert.match(login, /currentUser\?\.userType === "contractor" && currentUser\.credentialStatus === "active"/);
  const callback = source("src/app/auth/callback/route.ts");
  assert.match(callback, /managedUser\?\.userType === "contractor" && hasActiveUserCredentials\(managedUser\) && !passwordSetupPath/);
  assert.match(callback, /return NextResponse\.redirect\(new URL\("\/studio\/shared", url\.origin\)\)/);
  assert.match(callback, /\["\/auth\/setup", "\/auth\/reset-password"\]/, "Do not break password setup or recovery.");
  assert.match(callback, /isExternalOnlyUserType\(managedUser\.userType\) \? response : attachSiteAccessCookie\(response\)/);
});

test("identity and assignment UI do not expose stale contractor program assignments", () => {
  assert.match(source("src/app/api/me/route.ts"), /user: managedUser\.userType === "contractor" \? \{ \.\.\.managedUser, assignments: \[\] \} : managedUser/);
  assert.match(source("src/hooks/use-current-user-assignments.ts"), /currentUser\?\.userType === "contractor" \? \[\] : currentUser\?\.assignments/);
  const admin = source("src/components/admin-user-management-card.tsx");
  assert.match(admin, /contractor: "Contractor · Shared Studio only"/);
  assert.match(admin, /disabled=\{form\.userType === "contractor" \|\| form\.userType === "explorer"\}/);
  assert.match(admin, /Shared Studio grants only/);
  assert.match(admin, /Contractors do not receive program access/);
});
