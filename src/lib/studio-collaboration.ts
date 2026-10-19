import { reviewDiscoveryIntegrity } from "./discovery-quality.ts";
import { StudioCollaborationError } from "./studio-collaboration-types.ts";
import type { StudioActor, StudioCollaborationItem, StudioPackageAction, StudioPackageRecord, StudioPackageSummary, StudioPackageView, StudioRevision, StudioRevisionInput, StudioShareGrant } from "./studio-collaboration-types.ts";
import type { DiscoverySynthesis } from "./discovery-studio-types.ts";

type Clock = { now: string; idFactory: () => string };
const internalRoles = new Set(["admin", "leadership", "delivery-lead", "team-member"]);
const outputs = new Set(["roadmap", "backlog", "stories", "tests", "gaps", "analysis"]);
function fail(message: string, status = 400): never { throw new StudioCollaborationError(message, status); }
function text(value: unknown, maximum = 12_000): value is string { return typeof value === "string" && Boolean(value.trim()) && value.length <= maximum; }
function texts(value: unknown, maximum = 200): value is string[] { return Array.isArray(value) && value.length <= maximum && value.every(item => text(item)); }
function entries(value: unknown, maximum = 500): value is Record<string, unknown>[] { return Array.isArray(value) && value.length <= maximum && value.every(item => item && typeof item === "object" && !Array.isArray(item)); }
function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function size(value: unknown, maximum = 20_000_000) {
  try { if (new TextEncoder().encode(JSON.stringify(value)).byteLength <= maximum) return; } catch { /* Return a fixed, content-free error. */ }
  fail("This Studio package is too large or invalid. Use a smaller package.", 413);
}
export function assertStudioActor(actor: StudioActor | null | undefined): asserts actor is StudioActor {
  if (!actor || !text(actor.id, 240) || !text(actor.name, 240) || actor.credentialStatus !== "active") fail("Sign in with an active named account to use shared Studio packages.", 403);
}
export function isStudioInternalActor(actor: StudioActor) { return internalRoles.has(actor.userType); }
export function canManageStudioPackage(record: StudioPackageRecord, actor: StudioActor) {
  return actor.credentialStatus === "active" && isStudioInternalActor(actor) && (record.ownerId === actor.id || actor.userType === "admin");
}
export function assertStudioPackageManager(record: StudioPackageRecord, actor: StudioActor) {
  assertStudioActor(actor);
  if (!canManageStudioPackage(record, actor)) fail("This Studio package is not available.", 404);
}
function revision(record: StudioPackageRecord, id: string) {
  const found = record.revisions.find(item => item.id === id);
  if (!found) fail("This Studio revision is not available.", 404);
  return found;
}
function activeGrants(record: StudioPackageRecord, actor: StudioActor, now: string, revisionId?: string) {
  return record.grants.filter(grant => grant.recipientId === actor.id && !grant.revokedAt && (!grant.expiresAt || Date.parse(grant.expiresAt) > Date.parse(now)) && (!revisionId || grant.revisionId === revisionId));
}
function requireVersion(record: StudioPackageRecord, expectedVersion: number) {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion !== record.version) fail("This package changed. Refresh it before applying your update.", 409);
}
function validSynthesis(value: DiscoverySynthesis, sourceIds: string[]) {
  if (!value || typeof value !== "object" || ![value.executiveSummary, value.evidenceSummary, value.readinessNarrative, value.generatedAt].every(v => text(v, 100_000))
    || ![value.capabilities, value.painPoints, value.businessRules, value.assumptions].every(v => texts(v, 500))
    || !Number.isFinite(value.readinessScore) || value.readinessScore < 0 || value.readinessScore > 100 || !Number.isSafeInteger(value.sourceCount) || value.sourceCount < 0 || !["openai", "local"].includes(value.provider)
    || !entries(value.stories) || !value.stories.length || !entries(value.epics) || !value.epics.length || !entries(value.features) || !value.features.length || !entries(value.roadmap) || !value.roadmap.length || !entries(value.gaps)) fail("Provide a complete valid product package.");
  if (value.quality && (!["reviewed", "provisional"].includes(value.quality.status) || !texts(value.quality.checks) || !texts(value.quality.warnings))) fail("The package contains invalid quality metadata.");
  for (const item of value.epics) if (![item.id, item.title, item.objective].every(v => text(v)) || !texts(item.featureIds) || !texts(item.sourceIds)) fail("The package contains an invalid epic.");
  for (const item of value.features) if (![item.id, item.epicId, item.title, item.description, item.outcome].every(v => text(v)) || !texts(item.sourceIds) || !["must", "should", "could"].includes(item.priority)) fail("The package contains an invalid feature.");
  for (const item of value.roadmap) if (![item.horizon, item.title, item.outcome].every(v => text(v)) || !texts(item.featureIds) || !texts(item.dependencies)) fail("The package contains an invalid roadmap.");
  for (const item of value.gaps) if (![item.id, item.title, item.description, item.question].every(v => text(v)) || !texts(item.sourceIds) || !["blocking", "important", "optional"].includes(item.severity)) fail("The package contains an invalid gap.");
  for (const story of value.stories) {
    if (![story.id, story.epicId, story.featureId, story.title, story.story].every(v => text(v)) || !texts(story.sourceIds) || !texts(story.acceptanceCriteria) || !["ready", "needs-input"].includes(story.readiness)
      || !entries(story.testCases, 100) || story.testCases.some(test => ![test.id, test.title, test.expectedResult].every(v => text(v)) || !texts(test.steps) || !test.steps.length || !["happy-path", "negative", "edge"].includes(test.type))) fail("The package contains an invalid story or test.");
  }
  if (reviewDiscoveryIntegrity(value, sourceIds).errors.length) fail("The package contains unresolved references or missing acceptance criteria/tests.");
}
function newRevision(actor: StudioActor, input: StudioRevisionInput, number: number, clock: Clock, parentRevisionId?: string): StudioRevision {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Provide a valid product package.");
  size(input, 6_000_000);
  if (!text(input.title, 160) || !["server-generated", "prepared-example", "imported"].includes(input.provenance)
    || !entries(input.sources, 16) || !input.sources.length || input.sources.some(source => !text(source.id, 240) || !text(source.name, 240) || (source.extractedText !== undefined && (typeof source.extractedText !== "string" || source.extractedText.length > 200_000)))
    || new Set(input.sources.map(source => source.id)).size !== input.sources.length
    || input.resolutionNotes !== undefined && (typeof input.resolutionNotes !== "string" || input.resolutionNotes.length > 12_000)
    || input.selectedOutputs !== undefined && (!Array.isArray(input.selectedOutputs) || input.selectedOutputs.some(output => !outputs.has(output)))
    || input.externalResearch !== undefined && typeof input.externalResearch !== "boolean"
    || input.researchTopic !== undefined && (typeof input.researchTopic !== "string" || input.researchTopic.length > 500)) fail("Provide valid package sources and generation settings.");
  validSynthesis(input.synthesis, input.sources.map(source => source.id));
  const synthesis = copy(input.synthesis);
  synthesis.revision = { ...(synthesis.revision ?? { summary: "Saved product package for human review." }), number };
  return {
    id: clock.idFactory(), title: input.title.trim(), number, createdAt: clock.now, createdBy: actor.id, provenance: input.provenance,
    ...(parentRevisionId ? { parentRevisionId } : {}), synthesis, sources: copy(input.sources),
    resolutionNotes: input.resolutionNotes ?? "", selectedOutputs: [...(input.selectedOutputs ?? ["roadmap", "backlog", "stories", "tests", "gaps", "analysis"])],
    externalResearch: input.externalResearch === true, researchTopic: input.researchTopic ?? "",
    items: input.synthesis.stories.map(story => ({ storyId: story.id, review: { status: "pending" } }))
  };
}
export function createStudioPackageRecord(actor: StudioActor, input: StudioRevisionInput, clock: Clock): StudioPackageRecord {
  assertStudioActor(actor);
  if (!isStudioInternalActor(actor)) fail("Only internal users can create Studio packages.", 403);
  const first = newRevision(actor, input, 1, clock);
  return { schemaVersion: 1, id: clock.idFactory(), ownerId: actor.id, title: input.title.trim(), version: 1, createdAt: clock.now, updatedAt: clock.now, headRevisionId: first.id, revisions: [first], grants: [], comments: [] };
}
export function appendStudioRevisionRecord(record: StudioPackageRecord, actor: StudioActor, expectedVersion: number, input: StudioRevisionInput & { parentRevisionId: string }, clock: Clock) {
  assertStudioPackageManager(record, actor); requireVersion(record, expectedVersion);
  if (input.parentRevisionId !== record.headRevisionId) fail("The source revision changed. Refresh before generating another revision.", 409);
  if (record.revisions.length >= 30) fail("This package has reached its revision limit. Create a new package.", 413);
  const next = copy(record);
  const added = newRevision(actor, input, Math.max(...record.revisions.map(item => item.number)) + 1, clock, input.parentRevisionId);
  next.revisions.push(added); next.headRevisionId = added.id; next.title = input.title.trim(); next.version++; next.updatedAt = clock.now;
  // Prior grants, comments and approvals remain historical, never inherited by the new revision.
  size(next); return next;
}
function grantAllows(record: StudioPackageRecord, actor: StudioActor, revisionId: string, storyId: string, now: string) {
  return activeGrants(record, actor, now, revisionId).some(grant => grant.storyIds.includes(storyId));
}
export function applyStudioPackageAction(record: StudioPackageRecord, actor: StudioActor, expectedVersion: number, action: StudioPackageAction, clock: Clock & { recipient?: StudioActor; assignee?: StudioActor }) {
  assertStudioActor(actor);
  const manage = canManageStudioPackage(record, actor);
  if (!manage && !activeGrants(record, actor, clock.now).length) fail("This Studio package is not available.", 404);
  requireVersion(record, expectedVersion);
  if (!action || typeof action !== "object" || !["comment", "return", "approve", "assign", "share", "revoke"].includes(action.type)) fail("Invalid Studio action.");
  const next = copy(record);
  if (action.type === "revoke") {
    if (!manage) fail("Only the package owner or an administrator can change sharing.", 403);
    const grant = next.grants.find(item => item.id === action.grantId);
    if (!grant) fail("This share is not available.", 404);
    grant.revokedAt = clock.now;
  } else {
    const rev = revision(next, action.revisionId);
    if (action.type === "share") {
      if (!manage) fail("Only the package owner or an administrator can change sharing.", 403);
      assertStudioActor(clock.recipient);
      if (clock.recipient.id !== action.recipientId || !Array.isArray(action.storyIds) || !action.storyIds.length || action.storyIds.length > rev.items.length
        || new Set(action.storyIds).size !== action.storyIds.length || action.storyIds.some(id => !rev.items.some(item => item.storyId === id))
        || action.sharedContext !== undefined && (typeof action.sharedContext !== "string" || action.sharedContext.length > 4000)
        || action.expiresAt !== undefined && (!text(action.expiresAt, 40) || !Number.isFinite(Date.parse(action.expiresAt)) || Date.parse(action.expiresAt) <= Date.parse(clock.now))) fail("Select valid work items, a registered active recipient and a future expiry.");
      if (next.grants.length >= 200) fail("This package has reached its sharing limit.", 413);
      next.grants.push({ id: clock.idFactory(), revisionId: rev.id, recipientId: action.recipientId, recipientLabel: clock.recipient.name, storyIds: [...action.storyIds], sharedContext: action.sharedContext?.trim() ?? "", createdAt: clock.now, createdBy: actor.id, ...(action.expiresAt ? { expiresAt: action.expiresAt } : {}) });
    } else {
      const item = rev.items.find(item => item.storyId === action.storyId);
      const story = rev.synthesis.stories.find(story => story.id === action.storyId);
      if (!item || !story || !manage && !grantAllows(next, actor, rev.id, story.id, clock.now)) fail("This work item is not available.", 404);
      const addComment = (body: string, visibility: "shared" | "internal") => {
        if (!text(body, 8000) || !["shared", "internal"].includes(visibility)) fail("Enter a comment of up to 8,000 characters.");
        if (!manage && visibility !== "shared") fail("Reviewers cannot create internal notes.", 403);
        if (next.comments.length >= 1000) fail("This package has reached its comment limit.", 413);
        next.comments.push({ id: clock.idFactory(), revisionId: rev.id, storyId: story.id, authorId: actor.id, authorName: actor.name, body: body.trim(), visibility, createdAt: clock.now });
      };
      if (action.type === "comment") addComment(action.body, action.visibility);
      else if (action.type === "return") {
        addComment(action.reason, "shared");
        item.review = { status: "changes-requested", reviewedBy: actor.id, reviewedAt: clock.now, note: action.reason.trim() };
      } else {
        if (!manage) fail("Only the package owner or an administrator can assign or approve work.", 403);
        if (rev.id !== next.headRevisionId) fail("Only the current revision can be assigned or approved.", 409);
        if (action.type === "approve") {
          if (action.confirmReviewed !== true || story.readiness !== "ready" || rev.synthesis.quality?.status === "provisional" || story.acceptanceCriteria.length < 2 || story.testCases.length < 2 || item.review.status === "changes-requested") fail("Review blockers and dependencies, and generate a new ready revision after requested changes before approval.", 409);
          item.review = { status: "approved", reviewedBy: actor.id, reviewedAt: clock.now };
        } else if (action.type === "assign") {
          if (action.assigneeId === null) { delete item.assigneeId; delete item.assigneeName; }
          else {
            assertStudioActor(clock.assignee);
            if (clock.assignee.id !== action.assigneeId || !canManageStudioPackage(next, clock.assignee) && !grantAllows(next, clock.assignee, rev.id, story.id, clock.now)) fail("The assignee needs active access to this exact revision and work item.", 403);
            item.assigneeId = action.assigneeId;
            item.assigneeName = clock.assignee.name;
          }
        }
      }
    }
  }
  next.version++; next.updatedAt = clock.now; size(next); return next;
}
function itemView(rev: StudioRevision, id: string, internal: boolean): StudioCollaborationItem {
  const story = rev.synthesis.stories.find(story => story.id === id)!;
  const state = rev.items.find(item => item.storyId === id)!;
  return { id: story.id, title: story.title, story: story.story, acceptanceCriteria: [...story.acceptanceCriteria],
    testCases: story.testCases.map(test => ({ id: test.id, title: test.title, type: test.type, steps: [...test.steps], expectedResult: test.expectedResult })), readiness: story.readiness,
    lane: story.readiness === "ready" && state.review.status !== "changes-requested" ? "development-review" : "refinement", review: copy(state.review),
    ...(state.assigneeId ? { assigneeId: state.assigneeId, assigneeName: state.assigneeName } : {}), ...(internal ? { sourceIds: [...story.sourceIds] } : {}) };
}
export function projectStudioPackage(record: StudioPackageRecord, actor: StudioActor, revisionId?: string, now = new Date().toISOString()): StudioPackageView {
  assertStudioActor(actor);
  const manage = canManageStudioPackage(record, actor);
  const grants = manage ? [] : activeGrants(record, actor, now, revisionId);
  if (!manage && !grants.length) fail("This Studio package is not available.", 404);
  const selected = revisionId ?? (manage ? record.headRevisionId : [...record.revisions].filter(rev => grants.some(grant => grant.revisionId === rev.id)).sort((a, b) => b.number - a.number)[0]?.id);
  if (!selected) fail("This Studio revision is not available.", 404);
  const rev = revision(record, selected);
  if (manage) return { access: "manage", canManage: true, id: record.id, title: record.title, version: record.version, ownerId: record.ownerId, headRevisionId: record.headRevisionId,
    revision: copy(rev), revisions: record.revisions.map(({ id, number, createdAt, provenance }) => ({ id, number, createdAt, provenance })),
    items: rev.items.map(item => itemView(rev, item.storyId, true)), comments: copy(record.comments.filter(comment => comment.revisionId === rev.id)), grants: copy(record.grants) };
  const pinned = grants.filter(grant => grant.revisionId === rev.id);
  const sharedIds = new Set(pinned.flatMap(grant => grant.storyIds));
  // Construct, never spread, the external DTO. Its revision has no private inputs,
  // complete synthesis, sibling counts, head, history, grants, or source references.
  return { access: "shared", canManage: false, id: record.id, title: rev.title, version: record.version,
    revision: { id: rev.id, number: rev.number, createdAt: rev.createdAt, provenance: rev.provenance },
    items: rev.items.filter(item => sharedIds.has(item.storyId)).map(item => itemView(rev, item.storyId, false)),
    comments: copy(record.comments.filter(comment => comment.revisionId === rev.id && sharedIds.has(comment.storyId) && comment.visibility === "shared")),
    sharedContext: [...new Set(pinned.map(grant => grant.sharedContext).filter(Boolean))] };
}
export function summarizeStudioPackage(record: StudioPackageRecord, actor: StudioActor, now = new Date().toISOString()): StudioPackageSummary {
  const view = projectStudioPackage(record, actor, undefined, now);
  return { id: view.id, title: view.title, access: view.access, version: view.version, revisionId: view.revision.id, revisionNumber: view.revision.number,
    updatedAt: view.access === "manage" ? record.updatedAt : view.revision.createdAt };
}
