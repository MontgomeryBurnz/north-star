import { StudioCollaborationError } from "./studio-collaboration-types.ts";
import type { StudioActor, StudioPackageAction, StudioRevision, StudioWorkflow } from "./studio-collaboration-types.ts";

export function studioWorkflow(revision: StudioRevision): StudioWorkflow {
  const stored = revision.workflow;
  return {
    gaps: revision.synthesis.gaps.map(gap => stored?.gaps.find(state => state.gapId === gap.id) ?? {
      gapId: gap.id, status: "open", affectedStoryIds: [], evidenceSourceIds: [], resolution: ""
    }),
    refinements: stored?.refinements ?? [], events: stored?.events ?? []
  };
}
export function isStudioWorkflowAction(action: StudioPackageAction) {
  return ["manage-gap", "save-refinement", "refinement-status"].includes(action.type);
}
function fail(message: string): never { throw new StudioCollaborationError(message); }
function validText(value: unknown, maximum: number, required = true): value is string {
  return typeof value === "string" && value.length <= maximum && (!required || Boolean(value.trim()));
}
function references(value: unknown, allowed: Set<string>, maximum: number): value is string[] {
  return Array.isArray(value) && value.length <= maximum && new Set(value).size === value.length && value.every(id => typeof id === "string" && allowed.has(id));
}

// Called only after manager, current-revision and optimistic-version checks.
// Workflow metadata is deliberately separate from the immutable generated output.
export function applyStudioWorkflow(revision: StudioRevision, actor: StudioActor, action: StudioPackageAction,
  clock: { now: string; idFactory: () => string; gapOwner?: StudioActor }) {
  const workflow = structuredClone(studioWorkflow(revision));
  if (workflow.events.length >= 500) fail("This revision has reached its workflow history limit. Continue with a new revision.");
  const stories = new Set(revision.synthesis.stories.map(story => story.id));
  const sources = new Set(revision.sources.filter(source => source.extractedText?.trim()).map(source => source.id));
  let targetId: string, description: string;
  if (action.type === "manage-gap") {
    const gap = workflow.gaps.find(gap => gap.gapId === action.gapId);
    if (!gap || !["open", "in-progress", "resolved"].includes(action.status)
      || !validText(action.resolution, 8000, false) || !references(action.affectedStoryIds, stories, 500)
      || !references(action.evidenceSourceIds, sources, 16)) fail("Choose an existing gap, valid affected stories, readable evidence, and a valid status.");
    if (action.status === "resolved" && (!action.resolution.trim() || !action.evidenceSourceIds.length)) fail("A resolved gap requires a recorded decision and supporting readable evidence.");
    if (action.ownerId !== null) {
      const owner = clock.gapOwner;
      if (!owner || owner.id !== action.ownerId || owner.credentialStatus !== "active"
        || !["admin", "leadership", "delivery-lead", "team-member"].includes(owner.userType)) fail("Choose an active internal account as the gap owner. Assignment does not grant access.");
      gap.ownerId = owner.id; gap.ownerName = owner.name;
    } else { delete gap.ownerId; delete gap.ownerName; }
    gap.status = action.status; gap.resolution = action.resolution.trim();
    gap.affectedStoryIds = [...action.affectedStoryIds]; gap.evidenceSourceIds = [...action.evidenceSourceIds];
    gap.updatedAt = clock.now; gap.updatedBy = actor.id;
    // Changing a decision or impact scope requires human review again. Never
    // restore an approval merely by reopening/resolving the gap later.
    const previous = studioWorkflow(revision).gaps.find(state => state.gapId === gap.gapId);
    for (const item of revision.items) if ([...(previous?.affectedStoryIds ?? []), ...gap.affectedStoryIds].includes(item.storyId) && item.review.status === "approved") item.review = { status: "pending", note: "A linked gap decision or impact scope changed. Review this item again." };
    targetId = gap.gapId; description = `Gap ${gap.gapId} saved as ${gap.status}; owner: ${gap.ownerName || "unassigned"}; affected scope: ${gap.affectedStoryIds.join(", ") || "not yet confirmed"}; evidence: ${gap.evidenceSourceIds.join(", ") || "none"}. Decision: ${gap.resolution || "not recorded"}`;
  } else if (action.type === "save-refinement") {
    if (!stories.has(action.storyId) || !validText(action.body, 8000) || !references(action.evidenceSourceIds, sources, 16)
      || action.refinementId !== undefined && !validText(action.refinementId, 240)) fail("Provide a refinement for an existing story with valid evidence references.");
    let refinement = action.refinementId ? workflow.refinements.find(item => item.id === action.refinementId && item.storyId === action.storyId) : undefined;
    if (action.refinementId && !refinement) fail("This saved refinement was not found in this revision.");
    if (refinement && refinement.status !== "draft") fail("Only a draft refinement can be edited. Keep submitted decisions in history.");
    if (!refinement) {
      if (workflow.refinements.length >= 100) fail("This revision has reached its saved refinement limit.");
      refinement = { id: clock.idFactory(), storyId: action.storyId, body: "", evidenceSourceIds: [], status: "draft", decision: "", createdAt: clock.now, createdBy: actor.id, updatedAt: clock.now, updatedBy: actor.id };
      workflow.refinements.push(refinement);
    }
    refinement.body = action.body.trim(); refinement.evidenceSourceIds = [...action.evidenceSourceIds];
    refinement.updatedAt = clock.now; refinement.updatedBy = actor.id;
    targetId = refinement.id; description = `Refinement draft saved for ${action.storyId}: ${refinement.body}`;
  } else if (action.type === "refinement-status") {
    const refinement = workflow.refinements.find(item => item.id === action.refinementId);
    if (!refinement || !["draft", "submitted", "addressed"].includes(action.status) || !validText(action.decision, 8000, false)) fail("Choose a saved refinement and a valid status.");
    if (!(refinement.status === "draft" && action.status === "submitted" || refinement.status === "submitted" && action.status === "addressed")) fail("Submit a draft before responding. Submitted refinement history cannot be rewritten; create a new draft for further changes.");
    if (action.status === "addressed" && !action.decision.trim()) fail("Record how the refinement was addressed, including any remaining output change needed.");
    refinement.status = action.status; refinement.decision = action.decision.trim(); refinement.updatedAt = clock.now; refinement.updatedBy = actor.id;
    const item = revision.items.find(item => item.storyId === refinement.storyId)!;
    if (action.status === "submitted") item.review = { status: "changes-requested", reviewedBy: actor.id, reviewedAt: clock.now, note: "An internal refinement requires correction and a new output review." };
    targetId = refinement.id; description = `Refinement for ${refinement.storyId} marked ${action.status}. ${refinement.decision}`;
  } else fail("Invalid workflow action.");
  workflow.events.push({ id: clock.idFactory(), targetId, actorId: actor.id, at: clock.now, description });
  revision.workflow = workflow;
}

export function studioWorkflowBlockers(revision: Pick<StudioRevision, "workflow" | "synthesis">, storyId: string) {
  const reasons: string[] = [];
  for (const gap of revision.workflow?.gaps ?? []) {
    const source = revision.synthesis.gaps.find(item => item.id === gap.gapId);
    if (source?.severity === "blocking" && gap.status !== "resolved" && gap.affectedStoryIds.includes(storyId)) reasons.push(`${gap.gapId}: linked blocking gap is ${gap.status}.`);
  }
  if (revision.workflow?.refinements.some(item => item.storyId === storyId && item.status === "submitted")) reasons.push("A submitted refinement still needs an internal response.");
  return reasons;
}

export function studioRefinementContext(revision: StudioRevision) {
  const decisions = studioWorkflow(revision).gaps.filter(gap => gap.resolution.trim()).map(gap => {
    const original = revision.synthesis.gaps.find(item => item.id === gap.gapId)!;
    return `${gap.gapId} (${gap.status}) - ${original.question}\nRecorded answer: ${gap.resolution}\nSupporting source IDs: ${gap.evidenceSourceIds.join(", ") || "not attached"}\nConfirmed affected stories: ${gap.affectedStoryIds.join(", ") || "not yet confirmed"}`;
  });
  const context = [revision.resolutionNotes, ...(decisions.length ? ["Saved human gap decisions (verify against source evidence; not automatic proof of closure):", ...decisions] : [])].filter(Boolean).join("\n\n");
  if (context.length > 12_000) throw new StudioCollaborationError("Saved context exceeds 12,000 characters. Consolidate gap decisions or refine a smaller scope before preparing a paid revision.", 413);
  return context;
}
