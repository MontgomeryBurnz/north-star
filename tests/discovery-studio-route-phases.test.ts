import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const fixtureUrl = new URL("../src/data/sample-program.ts", import.meta.url).href;
const stateUrl = `data:text/javascript,${encodeURIComponent(`
  import {sampleDiscoverySynthesis} from ${JSON.stringify(fixtureUrl)};
  export const state={user:null,denied:false,calls:[],audits:[],saves:[],fail:false,auditFail:false,demo:false,head:'REV-1'};
  export class DiscoveryGenerationError extends Error {}
  export function validateDiscoverySynthesis(value){return value?.stories?value:null;}
  export function isDiscoveryEvidenceCheckpoint(value){return value?.reviewed===true;}
  export async function reviewDiscoverySources(program,notes,options){state.calls.push({phase:'evidence',program,notes,options});return {reviewed:true};}
  export async function generateDiscoverySynthesis(program,notes,options,checkpoint){state.calls.push({phase:'product',program,notes,options,checkpoint});if(state.fail)throw new DiscoveryGenerationError('Product validation failed; previous package preserved.');return sampleDiscoverySynthesis;}
  export async function requireInternalWorkspaceRouteAccess(){return {currentUser:state.user,response:state.denied?Response.json({error:'Unauthorized.'},{status:401}):null};}
  export const requireProgramRouteAccess=requireInternalWorkspaceRouteAccess;
  export async function getProgram(id){return {id,intake:{programName:'Saved fixture',artifacts:[{id:'S1',extractedText:'Fictional source evidence'}]}};}
  export function synthesisToArtifact(){return {title:'Prepared package',version:1};}
  export async function createRoleArtifact(id,artifact){state.saves.push({kind:'artifact',id});return {...artifact,id:'A1'};}
  export async function createOpenAIUsageRecord(){}
  export async function listRoleArtifacts(){return [];}
  export function auditActorFromManagedUser(){return {kind:'test'};}
  export function buildSystemAuditActor(){return {kind:'test'};}
  export async function createAuditEvent(event){if(state.auditFail)throw new Error('Audit unavailable');state.audits.push(event);}
  export async function ensureStudioCollaborationSchema(){}
  export async function isDemoMode(){return state.demo;}
  export async function getStudioPackage(user,id){return {id,canManage:true,version:3,headRevisionId:state.head,revision:{id:state.head,synthesis:sampleDiscoverySynthesis}};}
  export async function createStudioPackage(user,input){state.saves.push({kind:'create',user,input});return {id:'PACKAGE-1',version:1,canManage:true,revision:{id:'REV-1',synthesis:{...input.synthesis,revision:{number:1,summary:'Saved generation'}}}};}
  export async function appendStudioRevision(user,id,version,input){state.saves.push({kind:'append',user,id,version,input});return {id,version:4,canManage:true,revision:{id:'REV-2',synthesis:{...input.synthesis,revision:{number:2,summary:'Saved revision'}}}};}
`)}`;
const hooks = registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return {url:"data:text/javascript,export {};",shortCircuit:true};
  if (specifier === "next/server") return {url:"data:text/javascript,export const NextResponse={json:(body,options)=>Response.json(body,options)};",shortCircuit:true};
  if (["@/lib/api-route-access","@/lib/audit-event-service","@/lib/discovery-studio-service","@/lib/program-store","@/lib/studio-collaboration-persistence","@/lib/demo-session"].includes(specifier)) return {url:stateUrl,shortCircuit:true};
  if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);
  return nextResolve(specifier,context);
}});
const {POST}=await import("../src/app/api/studio/discovery-synthesis/route.ts");
const {POST:programPOST}=await import("../src/app/api/programs/[id]/discovery-synthesis/route.ts");
const {readDiscoveryEvidenceResponse,readDiscoveryStudioResponse}=await import("../src/lib/discovery-studio-transport.ts");
const {state}=await import(stateUrl);
hooks.deregister();
const input={paidGenerationConsent:{version:1,confirmed:true,externalResearch:true},workspaceName:"Private fixture",artifacts:[{id:"S1",name:"Source.txt",extractedText:"The pilot covers three regions."}],feedback:"Verify original evidence.",selectedOutputs:["stories"],externalResearch:true,researchTopic:"Public service delivery"};
function request(body:unknown,cookie?:string,origin="https://example.test",stream=false) {return new Request("https://example.test/api/studio/discovery-synthesis",{method:"POST",headers:{"content-type":"application/json",origin,...(cookie?{cookie}:{}),...(stream?{accept:"text/event-stream"}:{})},body:JSON.stringify(body)});}
async function setup(run:()=>Promise<void>) {
  const original=process.env.STUDIO_CHECKPOINT_SECRET;
  process.env.STUDIO_CHECKPOINT_SECRET="a".repeat(64);
  state.user=null;state.denied=false;state.calls=[];state.audits=[];state.saves=[];state.fail=false;state.auditFail=false;state.demo=false;state.head='REV-1';
  try{await run();}finally{if(original===undefined)delete process.env.STUDIO_CHECKPOINT_SECRET;else process.env.STUDIO_CHECKPOINT_SECRET=original;}
}
async function evidence() {
  const response=await POST(request({...input,phase:"evidence"}));
  assert.equal(response.status,200);
  const payload=await response.json();
  const cookie=response.headers.get("set-cookie")!.split(";")[0];
  return {payload,cookie,response};
}

test("all generation phases fail closed without a matching explicit billing acknowledgement",async()=>setup(async()=>{
  for (const phase of [undefined,"evidence","product"]) {
    for (const paidGenerationConsent of [undefined,null,false,{},[],{version:1,confirmed:"true",externalResearch:true},{version:1,confirmed:true,externalResearch:false},{version:0,confirmed:true,externalResearch:true}]) {
      const response=await POST(request({...input,phase,paidGenerationConsent}));
      assert.equal(response.status,428);
      assert.match((await response.json()).error,/requires confirmation/);
    }
  }
  assert.equal(state.calls.length,0);
  assert.equal(state.audits.length,0);
  assert.equal(state.saves.length,0);
}));

test("the legacy program generation route cannot bypass consent; approved fixtures never call a provider",async()=>setup(async()=>{
  const params={params:Promise.resolve({id:'PROGRAM-1'})};
  for (const paidGenerationConsent of [undefined,null,{},false,{version:1,confirmed:false,externalResearch:false}]) {
    assert.equal((await programPOST(request({paidGenerationConsent}),params)).status,428);
  }
  assert.equal(state.calls.length,0);
  assert.equal(state.saves.length,0);
  assert.equal((await programPOST(request({...input}),params)).status,400);
  assert.equal(state.calls.length,0);
  const response=await programPOST(request({externalResearch:false,paidGenerationConsent:{version:1,confirmed:true,externalResearch:false}}),params);
  assert.equal(response.status,200);
  assert.equal((await response.json()).synthesis.executiveSummary.length>0,true);
  assert.equal(state.calls.length,1);
  assert.equal(state.saves.length,1);
}));

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

test("named-user generation persists the complete final package before returning its saved revision locator",async()=>setup(async()=>{
  state.user={id:"USER-1",name:"Internal Owner",userType:"admin",credentialStatus:"active"};
  const {payload,cookie}=await evidence();
  assert.equal(state.saves.length,0);
  const response=await POST(request({...input,phase:"product",checkpoint:payload.checkpoint},cookie));
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(state.saves.length,1);
  assert.equal(state.saves[0].kind,"create");
  assert.equal(state.saves[0].input.provenance,"server-generated");
  assert.equal(state.saves[0].input.sources[0].extractedText,input.artifacts[0].extractedText);
  assert.ok(state.saves[0].input.synthesis.roadmap.length);
  assert.ok(state.saves[0].input.synthesis.stories[0].testCases.length);
  assert.deepEqual(result.synthesis.collaboration,{packageId:"PACKAGE-1",revisionId:"REV-1",version:1});
  assert.equal(result.synthesis.revision.number,1);
  assert.doesNotMatch(JSON.stringify(state.saves),/"checkpoint"/);
}));

test("saved refinement verifies the parent before model work and appends to the authorized immutable package",async()=>setup(async()=>{
  state.user={id:"USER-1",name:"Internal Owner",userType:"admin",credentialStatus:"active"};
  const stale=await POST(request({...input,phase:"evidence",studioPackageId:"PACKAGE-1",studioParentRevisionId:"OLD-REV"}));
  assert.equal(stale.status,409);
  assert.equal(state.calls.length,0);
  const staged={...input,studioPackageId:"PACKAGE-1",studioParentRevisionId:"REV-1"};
  const evidenceResponse=await POST(request({...staged,phase:"evidence"}));
  const checkpoint=(await evidenceResponse.json()).checkpoint;
  const cookie=evidenceResponse.headers.get("set-cookie")!.split(";")[0];
  const response=await POST(request({...staged,phase:"product",checkpoint},cookie));
  assert.equal(response.status,200);
  assert.equal(state.saves[0].kind,"append");
  assert.equal(state.saves[0].id,"PACKAGE-1");
  assert.equal(state.saves[0].input.parentRevisionId,"REV-1");
  assert.deepEqual((await response.json()).synthesis.collaboration,{packageId:"PACKAGE-1",revisionId:"REV-2",version:4});
}));

test("secondary audit failure cannot hide an already committed revision or cause a misleading generation failure",async()=>setup(async()=>{
  state.user={id:"USER-1",name:"Internal Owner",userType:"admin",credentialStatus:"active"};
  state.auditFail=true;
  const response=await POST(request(input));
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(state.saves.length,1);
  assert.equal(result.synthesis.collaboration.packageId,"PACKAGE-1");
  assert.equal(result.synthesis.collaboration.auditWarning,true);
}));

test("global sample exploration never persists generated packages or updates real saved revisions",async()=>setup(async()=>{
  state.user={id:"USER-1",name:"Internal Owner",userType:"admin",credentialStatus:"active"};
  state.demo=true;
  const response=await POST(request(input));
  assert.equal(response.status,200);
  assert.equal((await response.json()).synthesis.collaboration,undefined);
  assert.equal(state.saves.length,0);
  const calls=state.calls.length;
  assert.equal((await POST(request({...input,studioPackageId:"PACKAGE-1",studioParentRevisionId:"REV-1"}))).status,403);
  assert.equal(state.calls.length,calls);
}));
