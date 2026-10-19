import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const fixtureUrl = new URL("../src/data/sample-program.ts", import.meta.url).href;
const stateUrl = `data:text/javascript,${encodeURIComponent(`
  import {sampleDiscoverySynthesis} from ${JSON.stringify(fixtureUrl)};
  export const state={user:null,denied:false,calls:[],audits:[],fail:false};
  export class DiscoveryGenerationError extends Error {}
  export function validateDiscoverySynthesis(value){return value?.stories?value:null;}
  export function isDiscoveryEvidenceCheckpoint(value){return value?.reviewed===true;}
  export async function reviewDiscoverySources(program,notes,options){state.calls.push({phase:'evidence',program,notes,options});return {reviewed:true};}
  export async function generateDiscoverySynthesis(program,notes,options,checkpoint){state.calls.push({phase:'product',program,notes,options,checkpoint});if(state.fail)throw new DiscoveryGenerationError('Product validation failed; previous package preserved.');return sampleDiscoverySynthesis;}
  export async function requireInternalWorkspaceRouteAccess(){return {currentUser:state.user,response:state.denied?Response.json({error:'Unauthorized.'},{status:401}):null};}
  export function auditActorFromManagedUser(){return {kind:'test'};}
  export function buildSystemAuditActor(){return {kind:'test'};}
  export async function createAuditEvent(event){state.audits.push(event);}
`)}`;
const hooks = registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return {url:"data:text/javascript,export {};",shortCircuit:true};
  if (specifier === "next/server") return {url:"data:text/javascript,export const NextResponse={json:(body,options)=>Response.json(body,options)};",shortCircuit:true};
  if (["@/lib/api-route-access","@/lib/audit-event-service","@/lib/discovery-studio-service","@/lib/program-store"].includes(specifier)) return {url:stateUrl,shortCircuit:true};
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);
  return nextResolve(specifier,context);
}});
const {POST}=await import("../src/app/api/studio/discovery-synthesis/route.ts");
const {readDiscoveryEvidenceResponse,readDiscoveryStudioResponse}=await import("../src/lib/discovery-studio-transport.ts");
const {state}=await import(stateUrl);
hooks.deregister();
const input={workspaceName:"Private fixture",artifacts:[{id:"S1",name:"Source.txt",extractedText:"The pilot covers three regions."}],feedback:"Verify original evidence.",selectedOutputs:["stories"],externalResearch:true,researchTopic:"Public service delivery"};
function request(body:unknown,cookie?:string,origin="https://example.test",stream=false) {return new Request("https://example.test/api/studio/discovery-synthesis",{method:"POST",headers:{"content-type":"application/json",origin,...(cookie?{cookie}:{}),...(stream?{accept:"text/event-stream"}:{})},body:JSON.stringify(body)});}
async function setup(run:()=>Promise<void>) {
  const original=process.env.STUDIO_CHECKPOINT_SECRET;
  process.env.STUDIO_CHECKPOINT_SECRET="a".repeat(64);
  state.user=null;state.denied=false;state.calls=[];state.audits=[];state.fail=false;
  try{await run();}finally{if(original===undefined)delete process.env.STUDIO_CHECKPOINT_SECRET;else process.env.STUDIO_CHECKPOINT_SECRET=original;}
}
async function evidence() {
  const response=await POST(request({...input,phase:"evidence"}));
  assert.equal(response.status,200);
  const payload=await response.json();
  const cookie=response.headers.get("set-cookie")!.split(";")[0];
  return {payload,cookie,response};
}

test("authenticated browser-bound evidence is not a revision; product reuses identical workspace identity and audits only final output",async()=>setup(async()=>{
  const {payload,cookie,response}=await evidence();
  assert.equal(typeof payload.checkpoint,"string");
  assert.equal(payload.synthesis,undefined);
  assert.match(response.headers.get("set-cookie")!,/HttpOnly; SameSite=Strict/);
  assert.equal(state.audits.length,0);
  const product=await POST(request({...input,phase:"product",checkpoint:payload.checkpoint},cookie));
  assert.equal(product.status,200);
  assert.ok((await product.json()).synthesis);
  assert.deepEqual(state.calls.map((call:{phase:string})=>call.phase),["evidence","product"]);
  assert.equal(state.calls[0].program.id,state.calls[1].program.id);
  assert.deepEqual(state.calls[0].options,state.calls[1].options);
  assert.deepEqual(state.calls[1].checkpoint,{reviewed:true});
  assert.equal(state.audits.length,1);
  assert.doesNotMatch(JSON.stringify(state.audits),/checkpoint|Private fixture.*Source\.txt|pilot covers three regions/);
}));

test("changed inputs, browser or managed identity and tampered tokens fail before a product model call",async()=>setup(async()=>{
  const {payload,cookie}=await evidence();
  const calls=state.calls.length;
  for(const changed of [{...input,feedback:"Different feedback."},{...input,researchTopic:"Different topic"},{...input,workspaceName:"Other workspace"},{...input,artifacts:[{...input.artifacts[0],extractedText:"The pilot covers five regions."}]}]) {
    const response=await POST(request({...changed,phase:"product",checkpoint:payload.checkpoint},cookie));
    assert.notEqual(response.status,200);
  }
  assert.equal((await POST(request({...input,phase:"product",checkpoint:payload.checkpoint}))).status,409);
  const tampered=payload.checkpoint.slice(0,-3)+"abc";
  assert.notEqual((await POST(request({...input,phase:"product",checkpoint:tampered},cookie))).status,200);
  state.user={id:"OTHER-USER"};
  assert.notEqual((await POST(request({...input,phase:"product",checkpoint:payload.checkpoint},cookie))).status,200);
  assert.equal(state.calls.length,calls);
}));

test("authorization, input phase, origin, and missing signing configuration fail before evidence work",async()=>setup(async()=>{
  state.denied=true;
  assert.equal((await POST(request({...input,phase:"evidence"}))).status,401);
  state.denied=false;
  assert.equal((await POST(request({...input,phase:"unknown"}))).status,400);
  assert.equal((await POST(request({...input,phase:"evidence",checkpoint:"untrusted"}))).status,400);
  assert.equal((await POST(request({...input,phase:"evidence"},undefined,"https://attacker.test"))).status,403);
  delete process.env.STUDIO_CHECKPOINT_SECRET;
  assert.equal((await POST(request({...input,phase:"evidence"}))).status,503);
  assert.equal(state.calls.length,0);
  assert.equal(state.audits.length,0);
}));

test("failed product correction preserves the checkpoint response contract without creating a successful audit",async()=>setup(async()=>{
  const {payload,cookie}=await evidence();
  state.fail=true;
  const product=await POST(request({...input,phase:"product",checkpoint:payload.checkpoint},cookie));
  assert.equal(product.status,503);
  assert.match((await product.json()).error,/previous package preserved/);
  assert.equal(state.audits.length,0);
}));

test("streaming evidence sets the session cookie before its checkpoint and streaming product applies only the final result",async()=>setup(async()=>{
  const response=await POST(request({...input,phase:"evidence"},undefined,"https://example.test",true));
  assert.match(response.headers.get("content-type")!,/text\/event-stream/);
  const cookie=response.headers.get("set-cookie")!.split(";")[0];
  const checkpoint=await readDiscoveryEvidenceResponse(response);
  assert.equal(state.audits.length,0);
  const product=await POST(request({...input,phase:"product",checkpoint},cookie,"https://example.test",true));
  assert.ok((await readDiscoveryStudioResponse(product)).stories);
  assert.equal(state.audits.length,1);
}));

test("unhashable staged inputs fail safely before paid work while legacy calls need no handoff configuration",async()=>setup(async()=>{
  let nested:unknown="deep";
  for(let depth=0;depth<105;depth++)nested={nested};
  const staged=await POST(request({...input,phase:"evidence",artifacts:[{...input.artifacts[0],fileFormat:nested}]}));
  assert.equal(staged.status,503);
  assert.match((await staged.json()).error,/invalid or expired/);
  assert.equal(state.calls.length,0);
  delete process.env.STUDIO_CHECKPOINT_SECRET;
  const legacy=await POST(request(input));
  assert.equal(legacy.status,200);
  assert.ok((await legacy.json()).synthesis);
  assert.equal(state.calls.length,1);
}));
