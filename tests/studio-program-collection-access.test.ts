import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import {
  getAssignedProgramIdSet, hasActiveUserCredentials, shouldScopeManagedUserPrograms,
  type ManagedAppUser
} from "../src/lib/admin-user-types.ts";

const now = "2026-10-19T20:00:00.000Z";
const assignment = { id: "ASSIGNMENT", programId: "assigned-program", programName: "Assigned program", role: "Reviewer", isPrimary: true, createdAt: now, updatedAt: now };
const actor: ManagedAppUser = {
  id: "REGISTERED-USER", name: "Registered user", email: "reviewer@example.test", userType: "contractor",
  credentialStatus: "active", assignments: [assignment], createdAt: now, updatedAt: now
};
const programs = [{ id: assignment.programId, privateContext: "ASSIGNED-PROGRAM-CONTEXT" }, { id: "unassigned-program", privateContext: "UNSHARED-PROGRAM-CONTEXT" }];

// Execute the actual collection handler with synthetic dependencies only.
// No server, account, database, credentials, or network calls are used.
function collection(currentUser: ManagedAppUser | null, siteAuthorized = false) {
  const path = "src/app/api/programs/route.ts";
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.ES2022, true);
  const declaration = parsed.statements.find((entry): entry is ts.FunctionDeclaration => ts.isFunctionDeclaration(entry) && entry.name?.text === "GET");
  assert.ok(declaration);
  const compiled = ts.transpileModule(declaration.getText(parsed).replace(/^export\s+/, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  let reads = 0;
  let siteChecks = 0;
  const dependencies = {
    NextResponse: Response,
    isDemoMode: async () => false,
    requireInternalWorkspaceRouteAccess: async () => { throw new Error("Unexpected sample-mode gate"); },
    getCurrentManagedUser: async () => currentUser,
    requireSiteAccessRequest: () => { siteChecks++; return siteAuthorized ? null : Response.json({ error: "Unauthorized." }, { status: 401 }); },
    getAssignedProgramIdSet, hasActiveUserCredentials, shouldScopeManagedUserPrograms,
    listPrograms: async () => { reads++; return programs; }
  };
  const get = new Function(...Object.keys(dependencies), `${compiled}\nreturn GET;`)(...Object.values(dependencies)) as (request: Request) => Promise<Response>;
  return { get, reads: () => reads, siteChecks: () => siteChecks };
}

test("contractor collection access is denied before loading programs or trying site-session fallback", async () => {
  for (const credentialStatus of ["active", "invited", "not-invited", "disabled"] as const) {
    for (const assignments of [[], [assignment]]) {
      for (const siteAuthorized of [false, true]) {
        const fixture = collection({ ...actor, credentialStatus, assignments }, siteAuthorized);
        const response = await fixture.get(new Request("https://northstar.example.test/api/programs", { headers: siteAuthorized ? { cookie: "site_access_session=synthetic-only" } : {} }));
        assert.equal(response.status, 403);
        assert.deepEqual(await response.json(), { error: "Program access denied." });
        assert.equal(fixture.reads(), 0, "Denied contractors must not load program records.");
        assert.equal(fixture.siteChecks(), 0, "A shared site session must not override the contractor role.");
      }
    }
  }
});

test("assigned clients and contributors retain their scoped collection rather than a broad external-role denial", async () => {
  for (const userType of ["client", "client-dashboard-contributor"] as const) {
    const fixture = collection({ ...actor, userType });
    const response = await fixture.get(new Request("https://northstar.example.test/api/programs"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { programs: [programs[0]] });
    assert.equal(fixture.reads(), 1);
  }
});

test("internal members retain assigned scope and administrators retain their existing full collection", async () => {
  for (const userType of ["team-member", "admin"] as const) {
    const fixture = collection({ ...actor, userType });
    const response = await fixture.get(new Request("https://northstar.example.test/api/programs"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { programs: userType === "admin" ? programs : [programs[0]] });
    assert.equal(fixture.reads(), 1);
  }
});

test("an unauthenticated collection request still fails before loading program records", async () => {
  const fixture = collection(null);
  const response = await fixture.get(new Request("https://northstar.example.test/api/programs"));
  assert.equal(response.status, 401);
  assert.equal(fixture.reads(), 0);
});
