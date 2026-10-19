import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { sampleDiscoverySources, sampleDiscoverySynthesis } from "../src/data/sample-program.ts";
import type { StudioActor } from "../src/lib/studio-collaboration-types.ts";

// Isolated in-process DB double: no network, credentials or production state.
const stateUrl = `data:text/javascript,${encodeURIComponent(`
  export const state={provider:'postgres',records:new Map(),users:new Map(),queries:[],failConnect:false,failUpdate:false,locks:new Map()};
  async function lock(id){const previous=state.locks.get(id)||Promise.resolve();let release;const held=new Promise(resolve=>release=resolve);state.locks.set(id,previous.then(()=>held));await previous;return release;}
  export const pool={
    async query(sql,args=[]){state.queries.push({sql,args});
      if(sql.includes('CREATE TABLE'))return {rows:[],rowCount:0};
      if(sql.startsWith('INSERT INTO studio_packages')){state.records.set(args[0],{record:JSON.parse(args[2]),version:args[3],owner_id:args[1]});return {rows:[],rowCount:1};}
      if(sql.startsWith('SELECT record FROM studio_packages WHERE id'))return {rows:state.records.has(args[0])?[structuredClone(state.records.get(args[0]))]:[]};
      if(sql.startsWith('SELECT record FROM studio_packages WHERE owner_id'))return {rows:[...state.records.values()].filter(row=>row.owner_id===args[0]||args[1]||row.record.grants.some(g=>g.recipientId===args[0])).map(row=>structuredClone(row))};
      throw new Error('Unexpected stub query');
    },
    async connect(){if(state.failConnect)throw new Error('PRIVATE-DATABASE-CONNECTION-DETAIL');let release;let pending;return {
      async query(sql,args=[]){state.queries.push({sql,args});
        if(sql==='BEGIN')return {rows:[]};
        if(sql.includes('FOR UPDATE')){release=await lock(args[0]);return {rows:state.records.has(args[0])?[structuredClone(state.records.get(args[0]))]:[]};}
        if(sql.startsWith('SELECT record FROM managed_users'))return {rows:state.users.has(args[0])?[{record:state.users.get(args[0])}]:[]};
        if(sql.startsWith('UPDATE studio_packages')){if(state.failUpdate)throw new Error('PRIVATE-DATABASE-UPDATE-DETAIL');const row=state.records.get(args[0]);if(!row||row.version!==args[4])return {rows:[],rowCount:0};pending={id:args[0],row:{record:JSON.parse(args[1]),version:args[2],owner_id:row.owner_id}};return {rows:[],rowCount:1};}
        if(sql==='COMMIT'){if(pending)state.records.set(pending.id,pending.row);release?.();release=undefined;return {rows:[]};}
        if(sql==='ROLLBACK'){pending=undefined;release?.();release=undefined;return {rows:[]};}
        throw new Error('Unexpected client query');
      },release(){release?.();release=undefined;}
    };}
  };
  export function getPool(){return pool;}
  export function getConfiguredPersistenceProvider(){return state.provider;}
`)}`;
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
  if (["@/lib/program-repository-shared", "@/lib/program-repository"].includes(specifier)) return { url: stateUrl, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const persistence = await import("../src/lib/studio-collaboration-persistence.ts");
const { state } = await import(stateUrl);
hooks.deregister();
process.env.DATABASE_URL = "postgresql://synthetic-test-only/not-used";
const owner: StudioActor = { id: "OWNER", name: "Internal Owner", userType: "team-member", credentialStatus: "active" };
const reviewer: StudioActor = { id: "REVIEWER", name: "Registered Reviewer", userType: "contractor", credentialStatus: "active" };
const other: StudioActor = { id: "OTHER", name: "Other Reviewer", userType: "contractor", credentialStatus: "active" };
const input = () => ({ title: "Stored R1", synthesis: structuredClone(sampleDiscoverySynthesis), sources: structuredClone(sampleDiscoverySources), provenance: "prepared-example" as const });
function reset() { state.provider = "postgres"; state.records.clear(); state.users.clear(); state.queries.length = 0; state.failConnect = false; state.failUpdate = false; state.locks.clear(); state.users.set(reviewer.id, reviewer); state.users.set(other.id, other); }

test("persistence refuses local-file fallback and schema explicitly hardens the aggregate table", async () => {
  reset(); state.provider = "file";
  await assert.rejects(persistence.listStudioPackages(owner), /requires the configured PostgreSQL/);
  assert.equal(state.queries.length, 0);
  state.provider = "postgres";
  await persistence.ensureStudioCollaborationSchema();
  const ddl = state.queries.find((item: { sql: string }) => item.sql.includes("CREATE TABLE")).sql;
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS studio_packages/);
  assert.match(ddl, /ENABLE ROW LEVEL SECURITY/);
  assert.match(ddl, /REVOKE ALL ON TABLE studio_packages FROM (?:PUBLIC|anon|authenticated)/);
  assert.match(ddl, /FROM anon/); assert.match(ddl, /FROM authenticated/);
});

test("create, explicit share, scoped list/detail and full-export denial use the real persistence boundary", async () => {
  reset();
  const saved = await persistence.createStudioPackage(owner, input());
  assert.equal(saved.access, "manage");
  assert.equal(saved.revision.number, 1);
  assert.deepEqual(await persistence.listStudioPackages(reviewer), []);
  const shared = await persistence.mutateStudioPackage(owner, saved.id, saved.version, { type: "share", revisionId: saved.revision.id, recipientId: reviewer.id, storyIds: ["US-01"] });
  assert.equal(shared.access === "manage" ? shared.grants[0].recipientLabel : undefined, reviewer.name);
  const view = await persistence.getStudioPackage(reviewer, saved.id);
  assert.equal(view.access, "shared"); assert.equal(view.items.length, 1);
  assert.equal((await persistence.listStudioPackages(reviewer)).length, 1);
  await assert.rejects(persistence.getStudioPackage(other, saved.id), /not available/);
  await assert.rejects(persistence.getStudioExport(reviewer, saved.id, saved.revision.id), /internal only/);
  assert.ok(state.queries.some((item: { sql: string }) => item.sql.includes("FOR UPDATE")));
  assert.ok(state.queries.some((item: { sql: string }) => item.sql === "COMMIT"));
});

test("transactional stale writers cannot overwrite each other's comments", async () => {
  reset();
  const saved = await persistence.createStudioPackage(owner, input());
  const action = (body: string) => ({ type: "comment" as const, revisionId: saved.revision.id, storyId: "US-01", body, visibility: "internal" as const });
  const results = await Promise.allSettled([persistence.mutateStudioPackage(owner, saved.id, saved.version, action("Writer one")), persistence.mutateStudioPackage(owner, saved.id, saved.version, action("Writer two"))]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const failure = results.find(result => result.status === "rejected") as PromiseRejectedResult;
  assert.equal(failure.reason.status, 409);
  const view = await persistence.getStudioPackage(owner, saved.id);
  assert.equal(view.comments.length, 1); assert.equal(view.version, 2);
  assert.ok(state.queries.some((item: { sql: string }) => item.sql === "ROLLBACK"));
});

test("disabled recipient lookup fails without persisting a grant and unknown IDs are parameterized", async () => {
  reset(); state.users.set(reviewer.id, { ...reviewer, credentialStatus: "disabled" });
  const saved = await persistence.createStudioPackage(owner, input());
  await assert.rejects(persistence.mutateStudioPackage(owner, saved.id, saved.version, { type: "share", revisionId: saved.revision.id, recipientId: reviewer.id, storyIds: ["US-01"] }), /active named account/);
  assert.equal((await persistence.getStudioPackage(owner, saved.id)).access, "manage");
  const id = "x' OR 1=1 --";
  await assert.rejects(persistence.getStudioPackage(other, id), /not available/);
  const query = state.queries.at(-1);
  assert.equal(query.sql.includes(id), false); assert.equal(query.args[0], id);
});

test("failed writes roll back and database diagnostics stay out of caller errors", async () => {
  reset();
  const saved = await persistence.createStudioPackage(owner, input());
  state.failUpdate = true;
  await assert.rejects(persistence.mutateStudioPackage(owner, saved.id, saved.version, { type: "comment", revisionId: saved.revision.id, storyId: "US-01", body: "A private comment", visibility: "internal" }), (error: Error) => { assert.match(error.message, /storage is unavailable/); assert.doesNotMatch(error.message, /PRIVATE-DATABASE|private comment/); return true; });
  assert.equal((await persistence.getStudioPackage(owner, saved.id)).comments.length, 0);
  state.failUpdate = false; state.failConnect = true;
  await assert.rejects(persistence.mutateStudioPackage(owner, saved.id, saved.version, { type: "return", revisionId: saved.revision.id, storyId: "US-01", reason: "Need a change" }), /storage is unavailable/);
});

test("revision append is atomic, canonicalizes saved numbers and historical export title", async () => {
  reset();
  const saved = await persistence.createStudioPackage(owner, input());
  const revised = await persistence.appendStudioRevision(owner, saved.id, saved.version, { ...input(), title: "Stored R2", parentRevisionId: saved.revision.id });
  assert.equal(revised.access, "manage");
  if (revised.access !== "manage") throw new Error("Expected internal revision");
  assert.equal(revised.revision.synthesis.revision?.number, 2);
  assert.equal((await persistence.getStudioExport(owner, saved.id, saved.revision.id)).title, "Stored R1");
  await assert.rejects(persistence.appendStudioRevision(owner, saved.id, saved.version, { ...input(), parentRevisionId: saved.revision.id }), /changed/);
});

test("persistence introduces no source, comment or generated-output telemetry", async () => {
  const source = await readFile(new URL("../src/lib/studio-collaboration-persistence.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /console\.(?:log|info|error|warn)|fetch\(|writeFile|readFileStore/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /WHERE id = \$1 AND version = \$5/);
});
