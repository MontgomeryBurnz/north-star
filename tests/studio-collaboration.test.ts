import assert from "node:assert/strict";
import test from "node:test";
import { sampleDiscoverySources, sampleDiscoverySynthesis } from "../src/data/sample-program.ts";
import { appendStudioRevisionRecord, applyStudioPackageAction, createStudioPackageRecord, projectStudioPackage, summarizeStudioPackage } from "../src/lib/studio-collaboration.ts";
import { StudioCollaborationError } from "../src/lib/studio-collaboration-types.ts";
import type { StudioActor, StudioPackageRecord, StudioRevisionInput } from "../src/lib/studio-collaboration-types.ts";

const owner: StudioActor = { id: "OWNER", name: "Internal Owner", userType: "team-member", credentialStatus: "active" };
const contractor: StudioActor = { id: "CONTRACTOR", name: "Delivery Reviewer", userType: "contractor", credentialStatus: "active" };
const other: StudioActor = { id: "OTHER", name: "Other Internal User", userType: "team-member", credentialStatus: "active" };
const admin: StudioActor = { id: "ADMIN", name: "Administrator", userType: "admin", credentialStatus: "active" };
function fixture() {
  let id = 0;
  const clock = { now: "2026-10-20T12:00:00.000Z", idFactory: () => `ID-${++id}` };
  const input: StudioRevisionInput = { title: "Private package R1", synthesis: structuredClone(sampleDiscoverySynthesis), sources: structuredClone(sampleDiscoverySources), provenance: "prepared-example", resolutionNotes: "PRIVATE-OWNER-NOTE", selectedOutputs: ["stories", "tests"], externalResearch: true, researchTopic: "Public methods" };
  input.synthesis.evidenceSummary = "PRIVATE-DISCOVERY-SUMMARY";
  const record = createStudioPackageRecord(owner, input, clock);
  const share = (current: StudioPackageRecord, storyIds = ["US-01"], recipient = contractor) => applyStudioPackageAction(current, owner, current.version, { type: "share", revisionId: current.headRevisionId, recipientId: recipient.id, storyIds, sharedContext: "Explicitly approved handoff context" }, { ...clock, recipient });
  return { clock, input, record, share };
}
function status(code: number) { return (error: unknown) => error instanceof StudioCollaborationError && error.status === code; }

test("a package preserves the complete immutable output, sources and configuration independently of caller state", () => {
  const { record, input } = fixture();
  assert.equal(record.revisions[0].synthesis.stories.length, sampleDiscoverySynthesis.stories.length);
  assert.deepEqual(record.revisions[0].sources, sampleDiscoverySources);
  assert.equal(record.revisions[0].resolutionNotes, "PRIVATE-OWNER-NOTE");
  assert.deepEqual(record.revisions[0].selectedOutputs, ["stories", "tests"]);
  assert.equal(record.revisions[0].synthesis.revision?.number, 1);
  input.synthesis.stories[0].title = "Changed in caller";
  input.sources[0].extractedText = "Changed source";
  assert.notEqual(record.revisions[0].synthesis.stories[0].title, input.synthesis.stories[0].title);
  assert.notEqual(record.revisions[0].sources[0].extractedText, input.sources[0].extractedText);
});

test("named active identities are mandatory and owner/admin management does not become workspace-wide", () => {
  const { record, input, clock } = fixture();
  for (const actor of [null, { ...owner, credentialStatus: "disabled" }, { ...owner, credentialStatus: "invited" }]) assert.throws(() => projectStudioPackage(record, actor as StudioActor), status(403));
  assert.throws(() => createStudioPackageRecord(contractor, input, clock), status(403));
  assert.throws(() => createStudioPackageRecord({ ...owner, userType: "viewer" }, input, clock), status(403));
  assert.throws(() => projectStudioPackage(record, { ...owner, userType: "viewer" }), status(404));
  assert.throws(() => projectStudioPackage(record, other), status(404));
  assert.equal(projectStudioPackage(record, admin).access, "manage");
  assert.throws(() => projectStudioPackage(record, { ...owner, userType: "contractor" }), status(404));
});

test("the shared DTO is an explicit item projection, never a spread of package/source/history data", () => {
  const { record, share, clock } = fixture();
  let shared = share(record);
  Object.assign(shared.revisions[0].synthesis.stories[0].testCases[0], { sourceIds: ["PRIVATE-TEST-SOURCE"], rawSourceText: "PRIVATE-TEST-DOCUMENT" });
  shared = applyStudioPackageAction(shared, owner, shared.version, { type: "comment", revisionId: shared.headRevisionId, storyId: "US-01", body: "PRIVATE-COMMENT", visibility: "internal" }, clock);
  shared = applyStudioPackageAction(shared, owner, shared.version, { type: "comment", revisionId: shared.headRevisionId, storyId: "US-02", body: "UNSHARED-SIBLING-COMMENT", visibility: "shared" }, clock);
  const view = projectStudioPackage(shared, contractor);
  assert.equal(view.access, "shared");
  assert.deepEqual(view.items.map(item => item.id), ["US-01"]);
  assert.equal(view.items[0].sourceIds, undefined);
  assert.deepEqual(view.comments, []);
  assert.doesNotMatch(JSON.stringify(view), /PRIVATE-DISCOVERY|PRIVATE-OWNER|PRIVATE-COMMENT|PRIVATE-TEST|UNSHARED-SIBLING|sample-capability-assessment|Current-State-Capability|headRevisionId|"sources"|"synthesis"|"revisions"|"grants"|sourceCount/);
  assert.deepEqual(Object.keys(view.revision).sort(), ["createdAt", "id", "number", "provenance"]);
  assert.deepEqual(view.access === "shared" ? view.sharedContext : [], ["Explicitly approved handoff context"]);
  assert.equal(projectStudioPackage(share(record, ["US-01"], other), other).access, "shared", "A non-owner internal user also receives only an explicit projection.");
});

test("reviewers can comment and request changes only on granted revision/item pairs", () => {
  const { record, share, clock } = fixture();
  const shared = share(record);
  const before = JSON.stringify(shared);
  const commented = applyStudioPackageAction(shared, contractor, shared.version, { type: "comment", revisionId: shared.headRevisionId, storyId: "US-01", body: "Please clarify this acceptance criterion.", visibility: "shared" }, clock);
  assert.equal(JSON.stringify(shared), before);
  assert.equal(projectStudioPackage(commented, contractor).comments[0].authorId, contractor.id);
  assert.throws(() => applyStudioPackageAction(shared, contractor, shared.version, { type: "comment", revisionId: shared.headRevisionId, storyId: "US-02", body: "Out of scope", visibility: "shared" }, clock), status(404));
  assert.throws(() => applyStudioPackageAction(shared, contractor, shared.version, { type: "comment", revisionId: shared.headRevisionId, storyId: "US-01", body: "Private reviewer note", visibility: "internal" }, clock), status(403));
  const returned = applyStudioPackageAction(commented, contractor, commented.version, { type: "return", revisionId: shared.headRevisionId, storyId: "US-01", reason: "The confirmation behavior needs clarification." }, clock);
  const view = projectStudioPackage(returned, contractor);
  assert.equal(view.items[0].lane, "refinement");
  assert.equal(view.items[0].review.status, "changes-requested");
  assert.throws(() => applyStudioPackageAction(returned, owner, returned.version, { type: "approve", revisionId: shared.headRevisionId, storyId: "US-01", confirmReviewed: true }, clock), status(409));
});

test("a sharing grant never grants approval, assignment or grant-management authority", () => {
  const { record, share, clock } = fixture();
  const shared = share(record);
  for (const action of [
    { type: "approve", revisionId: shared.headRevisionId, storyId: "US-01", confirmReviewed: true },
    { type: "assign", revisionId: shared.headRevisionId, storyId: "US-01", assigneeId: contractor.id },
    { type: "share", revisionId: shared.headRevisionId, recipientId: other.id, storyIds: ["US-01"] },
    { type: "revoke", grantId: shared.grants[0].id }
  ] as const) assert.throws(() => applyStudioPackageAction(shared, contractor, shared.version, action as Parameters<typeof applyStudioPackageAction>[3], { ...clock, recipient: other, assignee: contractor }), status(403));
});

test("human approval needs a ready nonprovisional story and explicit blocker/dependency review", () => {
  const { record, clock } = fixture();
  assert.throws(() => applyStudioPackageAction(record, owner, record.version, { type: "approve", revisionId: record.headRevisionId, storyId: "US-01", confirmReviewed: false }, clock), status(409));
  assert.throws(() => applyStudioPackageAction(record, owner, record.version, { type: "approve", revisionId: record.headRevisionId, storyId: "US-03", confirmReviewed: true }, clock), status(409));
  const provisional = structuredClone(record);
  provisional.revisions[0].synthesis.quality = { status: "provisional", checks: [], warnings: [] };
  assert.throws(() => applyStudioPackageAction(provisional, owner, provisional.version, { type: "approve", revisionId: provisional.headRevisionId, storyId: "US-01", confirmReviewed: true }, clock), status(409));
  const approved = applyStudioPackageAction(record, owner, record.version, { type: "approve", revisionId: record.headRevisionId, storyId: "US-01", confirmReviewed: true }, clock);
  assert.equal(projectStudioPackage(approved, owner).items[0].review.status, "approved");
  assert.equal(record.revisions[0].items[0].review.status, "pending");
});

test("sharing validates active server-resolved recipients, exact IDs, future expiry and bounded context", () => {
  const { record, clock } = fixture();
  const action = { type: "share" as const, revisionId: record.headRevisionId, recipientId: contractor.id, storyIds: ["US-01"] };
  for (const recipient of [undefined, { ...contractor, credentialStatus: "disabled" }, { ...contractor, id: "WRONG" }]) assert.throws(() => applyStudioPackageAction(record, owner, record.version, action, { ...clock, recipient }));
  for (const patch of [{ storyIds: [] }, { storyIds: ["US-01", "US-01"] }, { storyIds: ["NOT-A-STORY"] }, { expiresAt: "2020-01-01" }, { sharedContext: "x".repeat(4001) }]) assert.throws(() => applyStudioPackageAction(record, owner, record.version, { ...action, ...patch }, { ...clock, recipient: contractor }));
});

test("assignment requires actual access and never creates a grant", () => {
  const { record, share, clock } = fixture();
  assert.throws(() => applyStudioPackageAction(record, owner, record.version, { type: "assign", revisionId: record.headRevisionId, storyId: "US-01", assigneeId: contractor.id }, { ...clock, assignee: contractor }), status(403));
  const shared = share(record);
  const assigned = applyStudioPackageAction(shared, owner, shared.version, { type: "assign", revisionId: record.headRevisionId, storyId: "US-01", assigneeId: contractor.id }, { ...clock, assignee: contractor });
  assert.equal(assigned.revisions[0].items[0].assigneeId, contractor.id);
  assert.equal(assigned.grants.length, 1);
});

test("new revisions reset approvals/assignments, pin old sharing and titles, and preserve prior output history", () => {
  const { record, share, clock, input } = fixture();
  let before = share(record);
  before = applyStudioPackageAction(before, owner, before.version, { type: "assign", revisionId: before.headRevisionId, storyId: "US-01", assigneeId: contractor.id }, { ...clock, assignee: contractor });
  before = applyStudioPackageAction(before, owner, before.version, { type: "approve", revisionId: before.headRevisionId, storyId: "US-01", confirmReviewed: true }, clock);
  const old = JSON.stringify(before);
  const after = appendStudioRevisionRecord(before, owner, before.version, { ...input, title: "PRIVATE-NEW-REVISION-TITLE", parentRevisionId: before.headRevisionId }, { ...clock, now: "2026-10-21T12:00:00Z" });
  assert.equal(JSON.stringify(before), old);
  assert.ok(after.revisions[1].items.every(item => item.review.status === "pending" && item.assigneeId === undefined));
  assert.equal(after.revisions[1].synthesis.revision?.number, 2);
  assert.equal(after.revisions[0].items[0].review.status, "approved", "Historical signoff remains attached to its original revision only.");
  const shared = projectStudioPackage(after, contractor);
  assert.equal(shared.revision.id, before.headRevisionId);
  assert.equal(shared.title, "Private package R1");
  assert.throws(() => projectStudioPackage(after, contractor, after.headRevisionId), status(404));
  assert.throws(() => applyStudioPackageAction(after, owner, after.version, { type: "approve", revisionId: before.headRevisionId, storyId: "US-01", confirmReviewed: true }, clock), status(409));
  assert.equal(summarizeStudioPackage(after, contractor).updatedAt, record.revisions[0].createdAt);
});

test("concurrent/stale edits and regeneration parent mismatches fail without mutating existing state", () => {
  const { record, clock, input } = fixture();
  const snapshot = JSON.stringify(record);
  assert.throws(() => appendStudioRevisionRecord(record, owner, record.version - 1, { ...input, parentRevisionId: record.headRevisionId }, clock), status(409));
  assert.throws(() => appendStudioRevisionRecord(record, owner, record.version, { ...input, parentRevisionId: "OTHER-REVISION" }, clock), status(409));
  assert.throws(() => applyStudioPackageAction(record, owner, 999, { type: "comment", revisionId: record.headRevisionId, storyId: "US-01", body: "Stale", visibility: "shared" }, clock), status(409));
  assert.equal(JSON.stringify(record), snapshot);
});

test("grant expiration, revocation and disabled identities cut off reads and writes", () => {
  const { record, share, clock } = fixture();
  const shared = share(record);
  const revoked = applyStudioPackageAction(shared, owner, shared.version, { type: "revoke", grantId: shared.grants[0].id }, clock);
  assert.throws(() => projectStudioPackage(revoked, contractor), status(404));
  const expires = structuredClone(shared);
  expires.grants[0].expiresAt = clock.now;
  assert.throws(() => projectStudioPackage(expires, contractor, undefined, clock.now), status(404));
  assert.throws(() => applyStudioPackageAction(revoked, contractor, revoked.version, { type: "return", revisionId: record.headRevisionId, storyId: "US-01", reason: "No longer shared" }, clock), status(404));
  assert.throws(() => projectStudioPackage(shared, { ...contractor, credentialStatus: "disabled" }), status(403));
});

test("invalid or incomplete snapshots cannot be persisted as coherent packages", () => {
  const { input, clock } = fixture();
  for (const mutate of [
    (value: StudioRevisionInput) => { value.synthesis.stories[0].featureId = "MISSING"; },
    (value: StudioRevisionInput) => { value.synthesis.stories[0].testCases = []; },
    (value: StudioRevisionInput) => { value.synthesis.stories[0].sourceIds = ["UNKNOWN-SOURCE"]; },
    (value: StudioRevisionInput) => { value.synthesis.stories[0].readiness = ["ready"] as unknown as "ready"; },
    (value: StudioRevisionInput) => { value.sources[0].extractedText = "x".repeat(200_001); }
  ]) { const changed = structuredClone(input); mutate(changed); assert.throws(() => createStudioPackageRecord(owner, changed, clock), StudioCollaborationError); }
});
