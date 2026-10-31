import assert from "node:assert/strict";
import test from "node:test";
import { sampleDiscoverySources, sampleDiscoverySynthesis } from "../src/data/sample-program.ts";
import { applyStudioPackageAction, appendStudioRevisionRecord, createStudioPackageRecord, projectStudioPackage } from "../src/lib/studio-collaboration.ts";
import { StudioCollaborationError } from "../src/lib/studio-collaboration-types.ts";
import type { StudioActor, StudioPackageAction, StudioPackageRecord } from "../src/lib/studio-collaboration-types.ts";
import { studioRefinementContext, studioWorkflow } from "../src/lib/studio-workflow.ts";
import { assessStudioDelivery, buildStudioHandoffPreview } from "../src/lib/studio-delivery-readiness.ts";
import { compareStudioRevisions } from "../src/lib/studio-revision-comparison.ts";

const owner: StudioActor = { id: "owner", name: "Internal owner", userType: "team-member", credentialStatus: "active" };
const reviewer: StudioActor = { id: "contractor", name: "Shared reviewer", userType: "contractor", credentialStatus: "active" };
function setup() {
  let id = 0;
  const clock = { now: "2026-10-31T12:00:00.000Z", idFactory: () => `fixture-${++id}` };
  const input = { title: "Saved fictional discovery package", synthesis: structuredClone(sampleDiscoverySynthesis), sources: structuredClone(sampleDiscoverySources), provenance: "prepared-example" as const };
  const record = createStudioPackageRecord(owner, input, clock);
  const gap = (record: StudioPackageRecord, extra = {}) => ({ type: "manage-gap" as const, revisionId: record.headRevisionId, gapId: "GAP-01", status: "open" as const, ownerId: null, affectedStoryIds: ["US-01"], evidenceSourceIds: [], resolution: "", ...extra });
  const save = (record: StudioPackageRecord, action: StudioPackageAction, actor = owner) => applyStudioPackageAction(record, actor, record.version, action, { ...clock, gapOwner: owner, recipient: reviewer });
  return { clock, input, record, gap, save };
}
const status = (code: number) => (error: unknown) => error instanceof StudioCollaborationError && error.status === code;

test("old packages acquire managed gap defaults without mutating their saved outputs", () => {
  const f = setup(), original = JSON.stringify(f.record);
  assert.equal(f.record.revisions[0].workflow, undefined);
  assert.equal(studioWorkflow(f.record.revisions[0]).gaps.length, sampleDiscoverySynthesis.gaps.length);
  assert.ok(studioWorkflow(f.record.revisions[0]).gaps.every(gap => gap.status === "open" && !gap.affectedStoryIds.length));
  assert.equal(JSON.stringify(f.record), original);
});

test("gap owner, exact affected scope, evidence and history survive serialization; complete synthesis stays unchanged", () => {
  const f = setup();
  const before = JSON.stringify(f.record.revisions[0].synthesis);
  const saved = f.save(f.record, f.gap(f.record, { ownerId: owner.id, status: "resolved", resolution: "PRIVATE-GAP-DECISION confirmed in the supplied policy.", evidenceSourceIds: [sampleDiscoverySources[0].id] }));
  const loaded = JSON.parse(JSON.stringify(saved)) as StudioPackageRecord;
  const gap = studioWorkflow(loaded.revisions[0]).gaps[0];
  assert.equal(gap.ownerName, owner.name); assert.equal(gap.status, "resolved"); assert.deepEqual(gap.affectedStoryIds, ["US-01"]);
  assert.match(studioWorkflow(loaded.revisions[0]).events[0].description, /PRIVATE-GAP-DECISION/);
  assert.equal(JSON.stringify(loaded.revisions[0].synthesis), before);
  assert.equal(f.record.revisions[0].workflow, undefined);
});

test("gap validation rejects ungrounded closure, forged links, duplicate IDs, oversized notes and invalid owners", () => {
  const f = setup();
  for (const override of [
    { status: "resolved" }, { status: "resolved", resolution: "Confirmed" },
    { status: "resolved", evidenceSourceIds: [sampleDiscoverySources[0].id] },
    { affectedStoryIds: ["NOT-A-STORY"] }, { affectedStoryIds: ["US-01", "US-01"] },
    { evidenceSourceIds: ["UNREADABLE"] }, { resolution: "x".repeat(8001) },
    { ownerId: "forged-user" }, { status: "approved" }, { gapId: "UNKNOWN" }
  ]) assert.throws(() => f.save(f.record, f.gap(f.record, override)), status(400));
  assert.throws(() => applyStudioPackageAction(f.record, owner, f.record.version, f.gap(f.record, { ownerId: reviewer.id }), { ...f.clock, gapOwner: reviewer }), status(400));
  assert.throws(() => applyStudioPackageAction(f.record, owner, f.record.version, f.gap(f.record, { ownerId: owner.id }), { ...f.clock, gapOwner: { ...owner, credentialStatus: "disabled" } }), status(400));
});

test("explicit blocking links hold stories, invalidate prior approval and cannot be bypassed by export", () => {
  const f = setup();
  let saved = f.save(f.record, { type: "approve", revisionId: f.record.headRevisionId, storyId: "US-01", confirmReviewed: true });
  saved = f.save(saved, f.gap(saved));
  let view = projectStudioPackage(saved, owner); assert.ok(view.canManage);
  assert.equal(view.items[0].review.status, "pending"); assert.equal(view.items[0].lane, "refinement");
  const assessments = assessStudioDelivery(view.revision.synthesis, view.revision.sources, view.items, { preparedExample: true, currentRevision: true, workflow: view.revision.workflow });
  assert.equal(assessments.find(item => item.storyId === "US-01")?.category, "needs-refinement");
  assert.throws(() => f.save(saved, { type: "approve", revisionId: saved.headRevisionId, storyId: "US-01", confirmReviewed: true }), status(409));
  assert.throws(() => buildStudioHandoffPreview(view, "jira", ["US-01"]));
  saved = f.save(saved, f.gap(saved, { status: "resolved", resolution: "Policy owner confirmed.", evidenceSourceIds: [sampleDiscoverySources[0].id] }));
  view = projectStudioPackage(saved, owner);assert.equal(view.items[0].review.status, "pending");
  // A resolved decision still does not rewrite a model's needs-input story.
  assert.equal(view.items.find(item => item.id === "US-03")?.readiness, "needs-input");
});

test("saved refinement draft can be reopened and edited without a lane change; submission records a durable hold", () => {
  const f = setup(), snapshot = JSON.stringify(f.record.revisions[0].synthesis);
  let saved = f.save(f.record, { type: "save-refinement", revisionId: f.record.headRevisionId, storyId: "US-01", body: "PRIVATE-REFINEMENT verify policy wording", evidenceSourceIds: [sampleDiscoverySources[0].id] });
  let loaded = JSON.parse(JSON.stringify(saved)) as StudioPackageRecord;
  const draft = studioWorkflow(loaded.revisions[0]).refinements[0];
  assert.equal(projectStudioPackage(loaded, owner).items[0].lane, "development-review");
  saved = f.save(loaded, { type: "save-refinement", revisionId: saved.headRevisionId, storyId: "US-01", refinementId: draft.id, body: "PRIVATE-REFINEMENT revised question", evidenceSourceIds: [] });
  assert.equal(studioWorkflow(saved.revisions[0]).refinements.length, 1);
  saved = f.save(saved, { type: "refinement-status", revisionId: saved.headRevisionId, refinementId: draft.id, status: "submitted", decision: "" });
  assert.equal(projectStudioPackage(saved, owner).items[0].review.status, "changes-requested");
  assert.throws(() => f.save(saved, { type: "save-refinement", revisionId: saved.headRevisionId, storyId: "US-01", refinementId: draft.id, body: "Overwrite submitted history", evidenceSourceIds: [] }), status(400));
  assert.throws(() => f.save(saved, { type: "refinement-status", revisionId: saved.headRevisionId, refinementId: draft.id, status: "addressed", decision: "" }), status(400));
  saved = f.save(saved, { type: "refinement-status", revisionId: saved.headRevisionId, refinementId: draft.id, status: "addressed", decision: "Confirmed the rule; a corrected output revision is still needed." });
  loaded = JSON.parse(JSON.stringify(saved));
  assert.equal(studioWorkflow(loaded.revisions[0]).refinements[0].status, "addressed");
  assert.equal(projectStudioPackage(loaded, owner).items[0].review.status, "changes-requested");
  assert.equal(JSON.stringify(loaded.revisions[0].synthesis), snapshot);
});

test("workflow actions reject outsiders, scoped reviewers, explorers, stale versions and historical revisions", () => {
  const f = setup();
  const shared = f.save(f.record, { type: "share", revisionId: f.record.headRevisionId, recipientId: reviewer.id, storyIds: ["US-01"] });
  for (const action of [f.gap(shared), { type: "save-refinement" as const, revisionId: shared.headRevisionId, storyId: "US-01", body: "Attempt", evidenceSourceIds: [] }, { type: "refinement-status" as const, revisionId: shared.headRevisionId, refinementId: "unknown", status: "submitted" as const, decision: "" }]) {
    assert.throws(() => f.save(shared, action, reviewer), status(403));
    assert.throws(() => f.save(shared, action, { ...owner, id: "outsider" }), status(404));
    assert.throws(() => f.save(shared, action, { ...owner, userType: "explorer" }), status(404));
  }
  assert.throws(() => applyStudioPackageAction(shared, owner, 1, f.gap(shared), f.clock), status(409));
  const next = appendStudioRevisionRecord(shared, owner, shared.version, { ...f.input, parentRevisionId: shared.headRevisionId }, f.clock);
  assert.throws(() => f.save(next, { ...f.gap(next), revisionId: shared.headRevisionId }), status(409));
});

test("private gaps, draft bodies, workflow history and revision comparisons never enter the external DTO", () => {
  const f = setup();
  let saved = f.save(f.record, f.gap(f.record, { resolution: "PRIVATE-GAP-DECISION" }));
  saved = f.save(saved, { type: "save-refinement", revisionId: saved.headRevisionId, storyId: "US-01", body: "PRIVATE-REFINEMENT", evidenceSourceIds: [] });
  saved = f.save(saved, { type: "refinement-status", revisionId: saved.headRevisionId, refinementId: studioWorkflow(saved.revisions[0]).refinements[0].id, status: "submitted", decision: "" });
  saved = f.save(saved, { type: "share", revisionId: saved.headRevisionId, recipientId: reviewer.id, storyIds: ["US-01"] });
  const shared = projectStudioPackage(saved, reviewer);
  assert.doesNotMatch(JSON.stringify(shared), /PRIVATE-GAP|PRIVATE-REFINEMENT|workflow|refinements|"gaps"|"events"/);
  assert.equal(shared.items.length, 1);
});

test("preparing a later authorized revision includes saved gap decisions without treating them as proof or silently truncating", () => {
  const f = setup();
  const saved = f.save(f.record, f.gap(f.record, { status: "resolved", resolution: "Confirmed against readable policy.", evidenceSourceIds: [sampleDiscoverySources[0].id] }));
  const snapshot = JSON.stringify(saved);
  const context = studioRefinementContext(saved.revisions[0]);
  assert.match(context, /Confirmed against readable policy/);assert.match(context, /verify against source evidence/);assert.match(context, /Confirmed affected stories: US-01/);
  assert.ok(context.includes(sampleDiscoverySources[0].id));assert.equal(JSON.stringify(saved), snapshot);
  saved.revisions[0].resolutionNotes = "x".repeat(12_000);
  assert.throws(() => studioRefinementContext(saved.revisions[0]), status(413));
});

test("new output revisions preserve old workflow decisions, reset closure and approval, and retain the full package", () => {
  const f = setup();
  const old = f.save(f.record, f.gap(f.record, { ownerId: owner.id, status: "resolved", resolution: "Confirmed.", evidenceSourceIds: [sampleDiscoverySources[0].id] }));
  const snapshot = JSON.stringify(old);
  const next = appendStudioRevisionRecord(old, owner, old.version, { ...f.input, parentRevisionId: old.headRevisionId }, f.clock);
  assert.equal(JSON.stringify(old), snapshot);
  const gap = studioWorkflow(next.revisions[1]).gaps[0];assert.equal(gap.ownerId, owner.id);assert.equal(gap.status, "open");assert.equal(gap.resolution, "");
  for (const key of ["stories", "epics", "features", "roadmap", "gaps"] as const) assert.equal(next.revisions[1].synthesis[key].length, f.input.synthesis[key].length);
  assert.equal(studioWorkflow(next.revisions[0]).gaps[0].status, "resolved");
});

test("comparison detects exact changes across every output section, sources and workflow without changing either snapshot", () => {
  const f = setup();
  const before = f.record.revisions[0], after = structuredClone(before);after.id = "saved-r2";after.number = 2;
  after.synthesis.executiveSummary += " Changed.";
  after.synthesis.roadmap[0].outcome += " Changed.";
  after.synthesis.epics[0].objective += " Changed.";
  after.synthesis.features[0].description += " Changed.";
  after.synthesis.stories[0].acceptanceCriteria.push("The confirmation is visible to the requester.");
  after.synthesis.stories[0].testCases[0].expectedResult += " Changed.";
  after.synthesis.gaps[0].question += " Clarify.";
  after.sources[0].extractedText += " Changed evidence.";
  after.workflow = studioWorkflow(after);after.workflow.gaps[0].status = "in-progress";
  const snapshot = JSON.stringify([before, after]), result = compareStudioRevisions(before, after);
  for (const section of ["Package and analysis", "Roadmap", "Epics", "Features", "Stories, criteria and tests", "Discovery gaps", "Source evidence", "Managed gap decisions"]) assert.ok(result.changes.some(change => change.section === section), section);
  const story = result.changes.find(change => change.section === "Stories, criteria and tests")!;
  assert.ok(story.fields.some(item => item.field === "acceptanceCriteria"));assert.ok(story.fields.some(item => item.field === "testCases"));
  after.synthesis.features.splice(0,1);after.synthesis.gaps.push({ ...after.synthesis.gaps[0], id: "GAP-NEW" });
  const altered = compareStudioRevisions(before, after);assert.ok(altered.counts.added);assert.ok(altered.counts.removed);
  after.synthesis.features = structuredClone(before.synthesis.features);after.synthesis.features[0].description += " Changed.";after.synthesis.gaps.pop();
  assert.equal(JSON.stringify([before, after]), snapshot);
  assert.equal(compareStudioRevisions(before, before).changes.length, 0);
});
