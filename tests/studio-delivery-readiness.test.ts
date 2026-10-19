import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sampleDiscoverySources, sampleDiscoverySynthesis } from "../src/data/sample-program.ts";
import { assessStudioDelivery, buildStudioHandoffPreview, buildStudioPackageReview } from "../src/lib/studio-delivery-readiness.ts";
import { createStudioPackageRecord, applyStudioPackageAction, appendStudioRevisionRecord, projectStudioPackage } from "../src/lib/studio-collaboration.ts";
import type { StudioActor, StudioManagedPackageView, StudioRevisionInput } from "../src/lib/studio-collaboration-types.ts";

const actor: StudioActor = { id: "OWNER", name: "Fixture owner", userType: "admin", credentialStatus: "active" };
function fixture() {
  let id = 0;
  const clock = { now: "2026-10-20T12:00:00.000Z", idFactory: () => `FIXTURE-${++id}` };
  const input: StudioRevisionInput = { title: "Saved sample", synthesis: structuredClone(sampleDiscoverySynthesis), sources: structuredClone(sampleDiscoverySources), provenance: "prepared-example", resolutionNotes: "PRIVATE-RESOLUTION-CANARY" };
  input.sources[0].extractedText += " PRIVATE-RAW-TEXT-CANARY";
  let record = createStudioPackageRecord(actor, input, clock);
  const approve = () => { record = applyStudioPackageAction(record, actor, record.version, { type: "approve", storyId: "US-01", revisionId: record.headRevisionId, confirmReviewed: true }, clock); };
  const view = () => projectStudioPackage(record, actor, undefined, clock.now) as StudioManagedPackageView;
  return { clock, input, get record() { return record; }, approve, view };
}

test("saved sample review reports actual inventory and 3 candidates/2 refinement stories without altering outputs", () => {
  const before = JSON.stringify({ sampleDiscoverySynthesis, sampleDiscoverySources });
  const result = buildStudioPackageReview(sampleDiscoverySynthesis, sampleDiscoverySources, true);
  assert.deepEqual(result.counts, { horizons: 3, epics: 3, features: 5, stories: 5, criteria: 15, tests: 10, readyForReview: 3, refinement: 2, blockingGaps: 1 });
  assert.equal(result.coveredSources, 6);
  assert.equal(result.assessments.some(item => item.category === "approved-for-handoff"), false);
  assert.equal(JSON.stringify({ sampleDiscoverySynthesis, sampleDiscoverySources }), before);
});

test("gap source overlap is distinct from an explicit roadmap dependency and never silently promotes or blocks a story", () => {
  const input = structuredClone(sampleDiscoverySynthesis);
  input.roadmap.forEach(item => { item.dependencies = []; });
  const result = buildStudioPackageReview(input, sampleDiscoverySources, true);
  assert.ok(result.gaps[0].relatedStoryIds.length > 0);
  assert.deepEqual(result.gaps[0].linkedStoryIds, []);
  assert.deepEqual(result.gaps[0].roadmapTitles, []);
  assert.equal(result.counts.readyForReview, 3);
  input.roadmap[0].dependencies = ["GAP-01 resolved by an owner", "GAP-010 is different"];
  const linked = buildStudioPackageReview(input, sampleDiscoverySources, true).gaps.find(gap => gap.id === "GAP-01")!;
  assert.equal(linked.roadmapTitles.length, 1);
  input.roadmap[0].dependencies = ["GAP-010"];
  assert.equal(buildStudioPackageReview(input, sampleDiscoverySources, true).gaps[0].roadmapTitles.length, 0);
});

test("100 percent, no reported gaps, missing validation, provisional findings and local drafts never imply approval", () => {
  const input = structuredClone(sampleDiscoverySynthesis);
  input.readinessScore = 100; input.gaps = [];
  for (const provider of ["openai", "local"] as const) {
    input.provider = provider;
    const assessments = assessStudioDelivery(input, sampleDiscoverySources);
    assert.equal(assessments.every(item => item.category === "needs-refinement"), true);
  }
  input.quality = { status: "provisional", checks: [], warnings: ["Needs factual review"] };
  assert.equal(assessStudioDelivery(input, sampleDiscoverySources, [], { preparedExample: true }).every(item => item.category === "needs-refinement"), true);
});

test("a handoff selects only approved current-revision work and preserves full linked criteria/tests without private evidence or sibling scope", () => {
  const f = fixture();
  assert.throws(() => buildStudioHandoffPreview(f.view(), "jira", ["US-01"]), /only approved/);
  f.approve();
  const before = JSON.stringify(f.record);
  for (const target of ["jira", "ado"] as const) {
    const result = buildStudioHandoffPreview(f.view(), target, ["US-01"]);
    assert.equal(result.connected, false); assert.equal(result.executableImport, false);
    assert.equal(result.workItems.length, 1);
    assert.equal(result.workItems[0].proposedType, target === "jira" ? "Story" : "User Story");
    assert.deepEqual(result.workItems[0].acceptanceCriteria, sampleDiscoverySynthesis.stories[0].acceptanceCriteria);
    assert.deepEqual(result.workItems[0].testCoverage, sampleDiscoverySynthesis.stories[0].testCases);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE-RAW-TEXT-CANARY|PRIVATE-RESOLUTION-CANARY|US-02|US-03|comments|extractedText/);
  }
  for (const ids of [[], ["US-01", "US-01"], ["US-01", "US-03"], ["invented"]]) assert.throws(() => buildStudioHandoffPreview(f.view(), "jira", ids));
  assert.equal(JSON.stringify(f.record), before);
});

test("missing evidence, hierarchy or adequate tests holds even previously approved work out of a preview", () => {
  const f = fixture(); f.approve();
  for (const mutation of [
    (view: StudioManagedPackageView) => { view.revision.sources = []; },
    (view: StudioManagedPackageView) => { view.revision.synthesis.features = []; },
    (view: StudioManagedPackageView) => { view.revision.synthesis.stories[0].testCases = []; },
    (view: StudioManagedPackageView) => { view.revision.synthesis.quality = { status: "provisional", checks: [], warnings: [] }; },
    (view: StudioManagedPackageView) => { view.items[0].review = { status: "changes-requested", note: "Please clarify" }; }
  ]) { const changed = f.view(); mutation(changed); assert.throws(() => buildStudioHandoffPreview(changed, "jira", ["US-01"])); }
});

test("new revisions cannot inherit approval and historical approvals cannot be selected for a current handoff", () => {
  const f = fixture(); f.approve();
  const originalRevision = f.record.headRevisionId;
  const next = appendStudioRevisionRecord(f.record, actor, f.record.version, { ...f.input, parentRevisionId: originalRevision }, f.clock);
  const historical = projectStudioPackage(next, actor, originalRevision, f.clock.now);
  const latest = projectStudioPackage(next, actor, undefined, f.clock.now);
  assert.throws(() => buildStudioHandoffPreview(historical, "ado", ["US-01"]));
  assert.throws(() => buildStudioHandoffPreview(latest, "ado", ["US-01"]));
});

test("contractors retain an exact explicit scope and cannot construct a full handoff preview", () => {
  const f = fixture(); f.approve();
  const contractor = { ...actor, id: "CONTRACTOR", userType: "contractor" };
  const shared = applyStudioPackageAction(f.record, actor, f.record.version, { type: "share", revisionId: f.record.headRevisionId, recipientId: contractor.id, storyIds: ["US-01"] }, { ...f.clock, recipient: contractor });
  const view = projectStudioPackage(shared, contractor, undefined, f.clock.now);
  assert.deepEqual(view.items.map(item => item.id), ["US-01"]);
  assert.equal("synthesis" in view.revision, false);
  assert.throws(() => buildStudioHandoffPreview(view, "jira", ["US-01"]), /only to the package owner/);
  assert.doesNotMatch(JSON.stringify(view), /PRIVATE-RAW-TEXT-CANARY|PRIVATE-RESOLUTION-CANARY|US-02/);
});

test("the new views do not generate AI, transmit to delivery providers, or remove the complete package", () => {
  const preview = readFileSync(new URL("../src/components/studio-delivery-preview.tsx", import.meta.url), "utf8");
  const summary = readFileSync(new URL("../src/components/studio-package-review.tsx", import.meta.url), "utf8");
  const consoleSource = readFileSync(new URL("../src/components/discovery-studio-console.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(preview + summary, /fetch\(|discovery-synthesis|Authorization:|apiKey/);
  assert.match(preview, /Preview only · not connected/);
  assert.match(consoleSource, />Delivery handoff<\/Button>/);
  assert.match(consoleSource, /<StudioPackageReview/);
  assert.match(consoleSource, /Full output package/);
  assert.match(consoleSource, /\/api\/studio\/export/);
  assert.match(consoleSource, /const outputSources = activeRevision\?\.sources \?\? sources/);
  assert.match(consoleSource, /synthesis: result, sources: analysisSources/);
  assert.match(consoleSource, /<StudioPackageReview synthesis=\{synthesis\} sources=\{outputSources\}/);
});
