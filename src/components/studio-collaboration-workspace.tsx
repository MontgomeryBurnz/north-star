"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, ChevronRight, Download, FileText, History, Loader2, LockKeyhole, MessageSquare, RefreshCw, Share2, ShieldCheck, UsersRound } from "lucide-react";
import type { StudioCollaborationItem, StudioPackageAction, StudioPackageSummary, StudioPackageView } from "@/lib/studio-collaboration-types";
import { StudioCollaborationStoryContent } from "@/components/studio-collaboration-story-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DiscoverySynthesis } from "@/lib/discovery-studio-types";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import { assessStudioDelivery } from "@/lib/studio-delivery-readiness";
import { StudioDeliveryPreview } from "@/components/studio-delivery-preview";

export type StudioCollaborationWorkspaceProps = {
  packageId?: string | null;
  initialRevisionId?: string | null;
  refreshKey?: number;
  external?: boolean;
  disabled?: boolean;
  onSaveCurrent?: () => void;
  onOpenRevision?: (view: StudioPackageView) => void;
  onRefine?: (view: StudioPackageView, storyId: string, feedback: string) => void;
  sessionPreview?: { synthesis: DiscoverySynthesis; sources: ProgramArtifact[]; title: string; preparedExample: boolean };
};

type ClientAction = Exclude<StudioPackageAction, { type: "share" | "assign" }>
  | { type: "share"; revisionId: string; recipientEmail: string; storyIds: string[]; sharedContext?: string; expiresAt?: string }
  | { type: "assign"; revisionId: string; storyId: string; assigneeEmail: string | null };
type WorkspaceView = "collaboration" | "review" | "history" | "sharing";
type ActionHandler = (action: ClientAction, successMessage: string) => Promise<boolean>;

const fieldStyle = "w-full min-w-0 rounded-md border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15 disabled:opacity-50";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function provenanceLabel(value: string) {
  return value === "server-generated" ? "Generated from discovery evidence" : value === "prepared-example" ? "Prepared example" : "Imported package";
}

function ReviewBadge({ item }: { item: StudioCollaborationItem }) {
  return item.review.status === "approved" ? <Badge>Human approved</Badge> : item.lane === "refinement" ? <Badge variant="amber">Needs refinement</Badge> : <Badge variant="cyan">Awaiting review</Badge>;
}

function StoryQueue({ title, description, items, selectedId, onSelect, refinement }: {
  title: string; description: string; items: StudioCollaborationItem[]; selectedId?: string;
  onSelect: (id: string) => void; refinement?: boolean;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-white/[0.025] p-3 sm:p-4" aria-label={title}>
      <div className="flex items-center gap-2"><span className={cn("h-2 w-2 shrink-0 rounded-full", refinement ? "bg-amber-300" : "bg-emerald-300")} aria-hidden="true" /><h3 className="text-sm font-semibold text-zinc-100">{title}</h3><span className="ml-auto text-xs text-zinc-500">{items.length}</span></div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>
      <div className="mt-4 grid max-h-[36rem] gap-2 overflow-y-auto p-0.5">
        {items.length ? items.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)} aria-pressed={selectedId === item.id} data-studio-collaboration-story={item.id} className={cn("min-w-0 rounded-md border bg-zinc-950/80 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/50", selectedId === item.id ? "border-emerald-300/50 bg-emerald-300/[0.045]" : "border-white/10 hover:border-white/25")}><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-medium text-zinc-500">{item.id}</span>{item.review.status === "approved" ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-200"><CheckCircle2 className="h-3 w-3" aria-hidden="true" />Approved</span> : null}</span><span className="mt-2 block break-words text-sm font-medium leading-6 text-zinc-100">{item.title}</span><span className="mt-2 block text-xs leading-5 text-zinc-500">{item.review.status === "changes-requested" ? "Changes requested" : item.readiness === "ready" ? "Evidence candidate · human review required" : "Missing information or decisions"}</span><span className="mt-2 block text-[11px] leading-5 text-zinc-400">{item.acceptanceCriteria.length} criteria · {item.testCases.length} tests{item.assigneeId ? " · Assigned" : " · Unassigned"}</span></button>) : <p className="rounded-md border border-dashed border-white/10 p-4 text-xs leading-5 text-zinc-500">No work items in this queue.</p>}
      </div>
    </section>
  );
}

function StoryReviewPanel({ view, item, disabled, onAction, onRefine }: {
  view: StudioPackageView; item: StudioCollaborationItem; disabled: boolean;
  onAction: ActionHandler; onRefine?: StudioCollaborationWorkspaceProps["onRefine"];
}) {
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState<"shared" | "internal">("internal");
  const [changeRequest, setChangeRequest] = useState("");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const canManage = view.canManage;
  const isCurrentRevision = canManage && view.revision.id === view.headRevisionId;
  const comments = view.comments.filter((entry) => entry.revisionId === view.revision.id && entry.storyId === item.id);
  const sourceMap = canManage ? new Map([...view.revision.sources.map((source) => [source.id, source.name] as const), ...(view.revision.synthesis.sources ?? []).map((source) => [source.id, source.name] as const)]) : new Map<string, string>();
  const sourceNames = (item.sourceIds ?? []).map((id) => sourceMap.get(id) ?? `Unresolved reference (${id})`);
  const relatedGaps = canManage ? view.revision.synthesis.gaps.filter((gap) => gap.sourceIds.some((id) => item.sourceIds?.includes(id))) : [];
  const approvalEligible = isCurrentRevision && assessStudioDelivery(view.revision.synthesis, view.revision.sources, view.items, { preparedExample: view.revision.provenance === "prepared-example", currentRevision: true }).some(assessment => assessment.storyId === item.id && assessment.category !== "needs-refinement");

  async function submitComment() {
    const saved = await onAction({ type: "comment", revisionId: view.revision.id, storyId: item.id, body: comment.trim(), visibility: canManage ? visibility : "shared" }, "Comment saved to this work item and revision.");
    if (saved) setComment("");
  }

  return (
    <aside className="min-w-0 rounded-lg border border-white/10 bg-zinc-950/80 p-4 sm:p-5" aria-label="Selected work item" data-studio-collaboration-detail>
      <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-zinc-500">{item.id} · Revision {view.revision.number}</span><ReviewBadge item={item} /></div>
      <h3 className="mt-3 break-words text-balance text-lg font-semibold leading-7 text-zinc-50">{item.title}</h3>
      {canManage ? <p className="mt-2 text-xs leading-5 text-zinc-500">{item.assigneeId ? `${item.assigneeName || "A registered account"} is assigned to coordinate this review.` : "No review coordinator assigned."}</p> : null}
      {item.review.status === "approved" ? <p className="mt-3 rounded-md border border-emerald-300/20 bg-emerald-300/[0.045] p-3 text-xs leading-5 text-emerald-100">Approved by an internal reviewer{item.review.reviewedAt ? ` on ${formatDate(item.review.reviewedAt)}` : ""}. Approval applies only to this revision; it does not start development.</p> : <p className="mt-3 text-xs leading-5 text-zinc-500">{canManage ? "Generated readiness is not approval. Review the evidence, criteria, and tests before handoff." : "You can comment or request changes. Internal approval remains with the package owner."}</p>}
      {item.review.note ? <p className="mt-3 whitespace-pre-wrap break-words rounded-md border border-amber-300/20 bg-amber-300/[0.04] p-3 text-xs leading-5 text-amber-100">Latest review note: {item.review.note}</p> : null}

      <div className="mt-5"><StudioCollaborationStoryContent story={item} sourceNames={sourceNames} relatedGaps={relatedGaps} showInternalEvidence={canManage} sharedContext={view.access === "shared" ? view.sharedContext.join("\n\n") : undefined} /></div>

      {canManage ? (
        <section className="mt-5 border-t border-white/10 pt-4" aria-label="Review assignment">
          <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Review coordinator</h4>
          <form className="mt-3" onSubmit={(event) => { event.preventDefault(); void onAction({ type: "assign", revisionId: view.revision.id, storyId: item.id, assigneeEmail: assigneeEmail.trim() }, "Review coordinator assigned. Assignment does not change access.").then((saved) => { if (saved) setAssigneeEmail(""); }); }}>
            <fieldset disabled={disabled || !isCurrentRevision} className="grid min-w-0 gap-2">
              <legend className="sr-only">Assign a registered account to coordinate this review</legend>
              <label className="grid min-w-0 gap-2"><span className="text-xs text-zinc-300">Registered account email</span><input type="email" required maxLength={320} value={assigneeEmail} onChange={(event) => setAssigneeEmail(event.target.value)} placeholder="name@company.com" className={fieldStyle} data-studio-assignee-email /></label>
              <div className="flex flex-wrap gap-2"><Button type="submit" variant="outline" size="sm" disabled={!assigneeEmail.trim()}>Assign coordinator</Button>{item.assigneeId ? <Button type="button" variant="ghost" size="sm" onClick={() => void onAction({ type: "assign", revisionId: view.revision.id, storyId: item.id, assigneeEmail: null }, "Review assignment removed.")}>Remove assignment</Button> : null}</div>
            </fieldset>
          </form>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">{isCurrentRevision ? "Assignment tracks responsibility only. The account needs access already; use Sharing first to authorize an external reviewer." : "Assignments can only change on the latest revision. Select it from Revision history to update responsibility."}</p>
        </section>
      ) : null}

      <section className="mt-5 border-t border-white/10 pt-4" aria-label="Revision-linked discussion">
        <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400"><MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />Discussion · Revision {view.revision.number}</h4>
        {comments.length ? <ol className="mt-3 grid gap-3">{comments.map((entry) => <li key={entry.id} className="border-l-2 border-white/15 pl-3"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-5"><span className="font-medium text-zinc-200">{entry.authorName}</span><span className="text-zinc-500">{formatDate(entry.createdAt)}</span><span className={entry.visibility === "internal" ? "text-amber-100" : "text-cyan-100"}>{entry.visibility === "internal" ? "Internal only" : "Shared discussion"}</span></div><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{entry.body}</p></li>)}</ol> : <p className="mt-3 text-xs leading-5 text-zinc-500">No comments on this work item at this revision.</p>}
        <form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); void submitComment(); }}><label className="grid min-w-0 gap-2"><span className="text-xs text-zinc-300">Add a comment</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={8000} rows={3} required disabled={disabled} placeholder="Share evidence, review findings, or a question…" className={`${fieldStyle} resize-y leading-6`} data-studio-collaboration-comment /></label>{canManage ? <label className="grid min-w-0 gap-2"><span className="text-xs text-zinc-300">Comment visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as "shared" | "internal")} disabled={disabled} className={fieldStyle}><option value="internal">Internal only</option><option value="shared">Shared with authorized reviewers</option></select></label> : null}<p className="text-[11px] leading-5 text-zinc-500">{canManage && visibility === "internal" ? "This note is not included in the external reviewer view." : "Only reviewers explicitly granted this story at this revision can read shared discussion."}</p><Button type="submit" variant="outline" disabled={disabled || !comment.trim()} className="justify-self-start">Post comment</Button></form>
      </section>

      <section className="mt-5 border-t border-white/10 pt-4" aria-label="Request refinement"><h4 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Request a change</h4><label className="mt-3 grid min-w-0 gap-2"><span className="text-xs text-zinc-300">What needs to change, and why?</span><textarea value={changeRequest} onChange={(event) => setChangeRequest(event.target.value)} rows={3} maxLength={8000} disabled={disabled} placeholder="Cite the source, rule, decision, or test boundary that needs attention…" className={`${fieldStyle} resize-y leading-6`} data-studio-collaboration-change /></label><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={disabled || !changeRequest.trim()} onClick={() => void onAction({ type: "return", revisionId: view.revision.id, storyId: item.id, reason: changeRequest.trim() }, "Change request recorded. This item is in refinement.")}>Request changes</Button>{canManage && onRefine ? <Button type="button" disabled={disabled || !changeRequest.trim()} onClick={() => onRefine(view, item.id, changeRequest.trim())} data-studio-stage-refinement>Stage Studio refinement<ChevronRight className="h-4 w-4" aria-hidden="true" /></Button> : null}</div><p className="mt-2 text-[11px] leading-5 text-zinc-500">{canManage ? "Staging loads this revision and your targeted feedback into the full package. Generate and review a new revision to update the outputs." : "The package owner reviews your request. This does not automatically modify the story or create a new revision."} Change requests are visible to authorized reviewers of this work item.</p></section>

      {canManage ? <section className="mt-5 border-t border-white/10 pt-4" aria-label="Internal approval"><h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-emerald-100"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Internal approval</h4>{item.review.status === "approved" ? <p className="mt-3 text-xs leading-5 text-zinc-400">This work item is approved for this exact revision. Any new revision starts a new review.</p> : <><label className="mt-3 flex items-start gap-2 text-xs leading-5 text-zinc-300"><input type="checkbox" checked={confirmReviewed} onChange={(event) => setConfirmReviewed(event.target.checked)} disabled={disabled || !approvalEligible} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-300" /><span>I reviewed the evidence, acceptance criteria, tests, dependencies, and engineering feasibility for this revision.</span></label><Button type="button" className="mt-3" disabled={disabled || !approvalEligible || !confirmReviewed} onClick={() => void onAction({ type: "approve", revisionId: view.revision.id, storyId: item.id, confirmReviewed: true }, "Human approval recorded for this work item at this revision.")} data-studio-approve><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Approve for handoff</Button>{!approvalEligible ? <p className="mt-2 text-[11px] leading-5 text-amber-100">Resolve missing input and regenerate a reviewable story before approval. A changes-requested item must be rechecked in a new revision.</p> : null}</>}<p className="mt-2 text-[11px] leading-5 text-zinc-500">Approval does not grant access or start development. Other work items are not automatically approved.</p></section> : null}
    </aside>
  );
}

function RevisionHistory({ view, disabled, onSelectRevision }: { view: StudioPackageView; disabled: boolean; onSelectRevision: (id: string) => void }) {
  if (!view.canManage) return <Card className="bg-zinc-950/75"><CardContent className="p-5"><p className="text-sm font-medium text-zinc-100">Revision {view.revision.number} is shared with you.</p><p className="mt-2 text-sm leading-6 text-zinc-400">Other revisions and internal package history are not included in this review access.</p></CardContent></Card>;
  return <Card className="bg-zinc-950/75"><CardContent className="p-4 sm:p-5"><h3 className="text-lg font-semibold text-zinc-100">A traceable package history</h3><p className="mt-2 text-sm leading-6 text-zinc-400">Each revision retains its own review state and discussion. New revisions require fresh approval and an explicit sharing decision.</p><ol className="mt-5 grid gap-3">{view.revisions.slice().reverse().map((revision) => <li key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.025] p-4"><div className="min-w-0"><p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-100">Revision {revision.number}{revision.id === view.headRevisionId ? <Badge variant="cyan">Latest</Badge> : null}{revision.id === view.revision.id ? <span className="text-xs font-normal text-zinc-500">Currently viewing</span> : null}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{formatDate(revision.createdAt)} · {provenanceLabel(revision.provenance)}</p></div><Button type="button" size="sm" variant="outline" disabled={disabled || revision.id === view.revision.id} onClick={() => onSelectRevision(revision.id)}>Review revision</Button></li>)}</ol></CardContent></Card>;
}

function SharingPanel({ view, disabled, onAction }: { view: StudioPackageView; disabled: boolean; onAction: ActionHandler }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [storyIds, setStoryIds] = useState<string[]>([]);
  const [sharedContext, setSharedContext] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  if (!view.canManage) return (
    <Card className="bg-zinc-950/75">
      <CardContent className="grid gap-3 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-100"><LockKeyhole className="h-4 w-4 text-cyan-200" aria-hidden="true" />Your review access</h3>
        <p className="text-sm leading-6 text-zinc-300">You can review {view.items.length} explicitly shared work item{view.items.length === 1 ? "" : "s"} at Revision {view.revision.number}, add comments, and request changes.</p>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-400"><li>Unshared work, raw discovery sources, and private internal notes are not included.</li><li>Internal approval and sharing permissions remain with the package owner.</li><li>New revisions are not automatically shared with you.</li></ul>
        <Button asChild variant="outline" className="h-auto min-h-10 justify-self-start whitespace-normal py-2 text-left"><a href={`/api/studio/packages/${encodeURIComponent(view.id)}/shared-export?revisionId=${encodeURIComponent(view.revision.id)}`}><Download className="h-4 w-4 shrink-0" aria-hidden="true" />Download shared requirements (.md)</a></Button>
      </CardContent>
    </Card>
  );
  const grants = view.grants.filter((grant) => grant.revisionId === view.revision.id);
  const activeGrants = grants.filter((grant) => !grant.revokedAt && (!grant.expiresAt || new Date(grant.expiresAt).getTime() > Date.now()));

  async function shareRevision() {
    let expiry: string | undefined;
    if (expiresAt) { const date = new Date(expiresAt); if (!Number.isNaN(date.getTime())) expiry = date.toISOString(); }
    const saved = await onAction({ type: "share", revisionId: view.revision.id, recipientEmail: recipientEmail.trim(), storyIds, ...(sharedContext.trim() ? { sharedContext: sharedContext.trim() } : {}), ...(expiry ? { expiresAt: expiry } : {}) }, "Selected work items shared with the registered reviewer. No invitation email was sent.");
    if (saved) { setRecipientEmail(""); setStoryIds([]); setSharedContext(""); setExpiresAt(""); }
  }

  async function copyReviewLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/studio/shared?packageId=${encodeURIComponent(view.id)}&revisionId=${encodeURIComponent(view.revision.id)}`);
      setCopyStatus("Review link copied. Only the registered account with an active grant can open it.");
    } catch { setCopyStatus("The review link could not be copied. Try again from a supported browser."); }
  }

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      <Card className="bg-zinc-950/75"><CardContent className="p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-zinc-100">Share a precise review scope</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Grant an existing active account selected stories at Revision {view.revision.number}. Access does not carry forward to later revisions.</p>
        <form className="mt-5 grid min-w-0 gap-4" onSubmit={(event) => { event.preventDefault(); void shareRevision(); }}>
          <label className="grid min-w-0 gap-2"><span className="text-xs font-medium text-zinc-300">Registered reviewer email</span><input type="email" required maxLength={320} value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} placeholder="reviewer@partner.com" disabled={disabled} className={fieldStyle} data-studio-share-email /></label>
          <fieldset className="min-w-0"><legend className="text-xs font-medium text-zinc-300">Work items to share · {storyIds.length} selected</legend><div className="mt-3 grid max-h-72 gap-2 overflow-y-auto p-0.5">{view.items.map((item) => <label key={item.id} className="flex min-w-0 items-start gap-2 rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-zinc-300"><input type="checkbox" checked={storyIds.includes(item.id)} onChange={(event) => setStoryIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} disabled={disabled} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-300" /><span className="min-w-0 break-words"><span className="font-medium text-cyan-100">{item.id}</span> · {item.title}</span></label>)}</div></fieldset>
          <label className="grid min-w-0 gap-2"><span className="text-xs font-medium text-zinc-300">Explicitly shared context <span className="font-normal text-zinc-500">(optional, up to 4,000 characters)</span></span><textarea value={sharedContext} onChange={(event) => setSharedContext(event.target.value)} maxLength={4000} rows={4} disabled={disabled} placeholder="Only include context this reviewer is permitted to see. Raw files and internal notes remain private." className={`${fieldStyle} resize-y leading-6`} data-studio-share-context /></label>
          <label className="grid min-w-0 gap-2"><span className="text-xs font-medium text-zinc-300">Access expires <span className="font-normal text-zinc-500">(optional, your local time)</span></span><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={disabled} className={fieldStyle} /></label>
          <p className="text-xs leading-5 text-zinc-500">The reviewer receives story text, criteria, tests, shared discussion, and the context you enter here. No full-package access or invitation email is sent.</p>
          <Button type="submit" disabled={disabled || !recipientEmail.trim() || !storyIds.length} className="justify-self-start" data-studio-share-submit><Share2 className="h-4 w-4" aria-hidden="true" />Share selected work items</Button>
        </form>
      </CardContent></Card>
      <Card className="h-fit bg-zinc-950/75"><CardContent className="p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-zinc-100">Review access · Revision {view.revision.number}</h3>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{activeGrants.length} active grant{activeGrants.length === 1 ? "" : "s"}. Revoking access prevents further authenticated reads; it cannot recall content a reviewer has already seen.</p>
        <p role="status" aria-live="polite" className={cn("mt-2 text-xs leading-5 text-zinc-400", !copyStatus && "sr-only")}>{copyStatus}</p>
        <div className="mt-5 grid gap-3">{grants.length ? grants.map((grant) => {
          const expired = Boolean(grant.expiresAt && new Date(grant.expiresAt).getTime() <= Date.now());
          return <article key={grant.id} className="min-w-0 rounded-md border border-white/10 bg-white/[0.025] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 break-words text-sm font-medium text-zinc-200">{grant.recipientLabel || "Registered reviewer"}</p><Badge variant={grant.revokedAt || expired ? "zinc" : "cyan"}>{grant.revokedAt ? "Revoked" : expired ? "Expired" : "Active"}</Badge></div>
            <p className="mt-2 break-words text-xs leading-5 text-zinc-400">{grant.storyIds.join(" · ")}</p>
            <p className="mt-2 text-[11px] leading-5 text-zinc-500">Shared {formatDate(grant.createdAt)}{grant.expiresAt ? ` · Expires ${formatDate(grant.expiresAt)}` : ""}</p>
            {grant.sharedContext ? <details className="mt-2 text-xs leading-5 text-zinc-400"><summary className="cursor-pointer">Shared context</summary><p className="mt-2 whitespace-pre-wrap break-words">{grant.sharedContext}</p></details> : null}
            {!grant.revokedAt && !expired ? <div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void copyReviewLink()}>Copy review link</Button><Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => void onAction({ type: "revoke", grantId: grant.id }, "Review access revoked.")}>Revoke access</Button></div> : null}
          </article>;
        }) : <p className="rounded-md border border-dashed border-white/10 p-4 text-sm leading-6 text-zinc-500">Nothing from this revision has been shared.</p>}</div>
      </CardContent></Card>
    </div>
  );
}

export function StudioCollaborationWorkspace({ packageId, initialRevisionId, refreshKey = 0, external = false, disabled = false, onSaveCurrent, onOpenRevision, onRefine, sessionPreview }: StudioCollaborationWorkspaceProps) {
  const [packages, setPackages] = useState<StudioPackageSummary[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState(packageId || (!external && sessionPreview ? "session-preview" : ""));
  const [revisionId, setRevisionId] = useState(initialRevisionId ?? "");
  const [packageView, setPackageView] = useState<StudioPackageView | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("collaboration");
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const mutationRef = useRef(false);
  const requestCounter = useRef(0);

  useEffect(() => { if (packageId) { setSelectedPackageId(packageId); setRevisionId(initialRevisionId ?? ""); } }, [packageId, initialRevisionId, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    setListLoading(true);
    async function loadPackages() {
      try {
        const response = await fetch("/api/studio/packages", { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { packages?: StudioPackageSummary[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Saved Studio packages could not be loaded.");
        if (controller.signal.aborted) return;
        const saved = payload.packages ?? [];
        setPackages(saved);
        setSelectedPackageId((current) => current || packageId || saved[0]?.id || "");
      } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Saved packages could not be loaded."); }
      finally { if (!controller.signal.aborted) setListLoading(false); }
    }
    void loadPackages();
    return () => controller.abort();
  }, [packageId, refreshKey, reloadKey]);

  const loadDetail = useCallback(async (id: string, requestedRevisionId: string, signal?: AbortSignal) => {
    const response = await fetch(`/api/studio/packages/${encodeURIComponent(id)}${requestedRevisionId ? `?revisionId=${encodeURIComponent(requestedRevisionId)}` : ""}`, { cache: "no-store", signal });
    const payload = await response.json() as { package?: StudioPackageView; error?: string };
    if (!response.ok || !payload.package) throw new Error(payload.error || "This Studio package could not be loaded.");
    return payload.package;
  }, []);

  useEffect(() => {
    if (!selectedPackageId || selectedPackageId === "session-preview") { setPackageView(null); setDetailLoading(false); return; }
    const controller = new AbortController();
    const requestId = ++requestCounter.current;
    setDetailLoading(true); setError(null);
    void loadDetail(selectedPackageId, revisionId, controller.signal).then((view) => { if (!controller.signal.aborted && requestCounter.current === requestId) setPackageView(view); }).catch((caught: unknown) => { if (!controller.signal.aborted) { setPackageView(null); setError(caught instanceof Error ? caught.message : "This package could not be loaded."); } }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedPackageId, revisionId, refreshKey, reloadKey, loadDetail]);

  const busy = disabled || listLoading || detailLoading || mutating;
  const currentView = packageView?.id === selectedPackageId && (!revisionId || packageView.revision.id === revisionId) ? packageView : null;
  const showingSession = !external && selectedPackageId === "session-preview" && Boolean(sessionPreview);
  const selectedItem = currentView?.items.find((item) => item.id === selectedStoryId) ?? currentView?.items[0];
  const heldStoryIds = new Set(currentView?.canManage ? assessStudioDelivery(currentView.revision.synthesis, currentView.revision.sources, currentView.items, { preparedExample: currentView.revision.provenance === "prepared-example", currentRevision: currentView.revision.id === currentView.headRevisionId }).filter(item => item.category === "needs-refinement").map(item => item.storyId) : currentView?.items.filter(item => item.lane === "refinement").map(item => item.id));
  const reviewItems = currentView?.items.filter(item => !heldStoryIds.has(item.id)) ?? [];
  const refinementItems = currentView?.items.filter(item => heldStoryIds.has(item.id)) ?? [];

  async function mutate(action: ClientAction, successMessage: string) {
    if (!currentView || busy || mutationRef.current) return false;
    mutationRef.current = true; setMutating(true); setError(null); setStatus("Saving your update…");
    try {
      const response = await fetch(`/api/studio/packages/${encodeURIComponent(currentView.id)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: currentView.version, action }) });
      const payload = await response.json() as { package?: StudioPackageView; error?: string };
      if (response.status === 409) {
        const refreshed = await loadDetail(currentView.id, currentView.revision.id);
        setPackageView(refreshed); setStatus(`${payload.error || "This package changed while you were reviewing it."} Saved state has been refreshed; review it before trying again.`);
        return false;
      }
      if (!response.ok || !payload.package) throw new Error(payload.error || "Your update could not be saved.");
      setPackageView(payload.package); setStatus(successMessage);
      setPackages((current) => current.map((entry) => entry.id === payload.package!.id ? { ...entry, version: payload.package!.version } : entry));
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Your update could not be saved."); setStatus("Your update was not saved. Existing package content is preserved."); return false; }
    finally { mutationRef.current = false; setMutating(false); }
  }

  return (
    <section className="grid min-w-0 gap-5" aria-label={external ? "Shared Studio review" : "Studio delivery handoff workspace"} data-studio-collaboration>
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300"><UsersRound className="h-4 w-4 shrink-0" aria-hidden="true" />{external ? "Shared review" : "Delivery handoff"}</p><h2 className="mt-2 text-balance text-xl font-semibold leading-7 text-zinc-100">{external ? "Review the work shared with you." : "Prepare the right work for development."}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{external ? "Review only the permitted stories, criteria, tests, and discussion for this revision." : "Preview a Jira or Azure DevOps handoff, review candidates, and keep incomplete work in refinement. Your full product package stays intact."}</p></div><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { setError(null); setReloadKey((current) => current + 1); }}><RefreshCw className={cn("h-3.5 w-3.5", detailLoading && "animate-spin")} aria-hidden="true" />Refresh</Button></div>

      {packages.length || currentView || sessionPreview ? <Card className="bg-zinc-950/75"><CardContent className="grid min-w-0 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"><label className="grid min-w-0 gap-2"><span className="text-xs font-medium text-zinc-400">Package to preview</span><select value={selectedPackageId} onChange={(event) => { setSelectedPackageId(event.target.value); setRevisionId(""); setSelectedStoryId(""); setWorkspaceView("collaboration"); setStatus(""); }} disabled={busy} className={fieldStyle} data-studio-saved-package>{sessionPreview && !external ? <option value="session-preview">{sessionPreview.title} · Unsaved session preview</option> : null}{!packages.some((entry) => entry.id === selectedPackageId) && currentView ? <option value={currentView.id}>{currentView.title}</option> : null}{packages.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · Revision {entry.revisionNumber}{entry.access === "shared" ? " · Shared review" : ""}</option>)}</select></label><div className="flex flex-wrap items-center gap-3">{currentView ? <span className="text-xs text-zinc-500">Revision {currentView.revision.number} · {provenanceLabel(currentView.revision.provenance)}</span> : null}{currentView?.canManage && onOpenRevision ? <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenRevision(currentView)}><FileText className="h-4 w-4" aria-hidden="true" />Open full package<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Button> : null}</div></CardContent></Card> : null}

      {listLoading || detailLoading ? <p className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading saved review context…</p> : null}
      {error ? <div role="alert" className="rounded-md border border-rose-300/25 bg-rose-300/[0.045] p-4 text-sm leading-6 text-rose-100">{error}<Button type="button" variant="ghost" size="sm" className="ml-2 text-rose-100" disabled={busy} onClick={() => { setError(null); setReloadKey((current) => current + 1); }}>Try again</Button></div> : null}
      <p role="status" aria-live="polite" className={cn("text-xs leading-5 text-zinc-400", !status && "sr-only")}>{status || "Studio review workspace ready."}</p>
      {showingSession && sessionPreview ? <StudioDeliveryPreview key={`session:${sessionPreview.synthesis.generatedAt}`} synthesis={sessionPreview.synthesis} sources={sessionPreview.sources} preparedExample={sessionPreview.preparedExample} disabled={disabled} /> : null}

      {!listLoading && !detailLoading && !error && !currentView && !showingSession ? <Card className="border-dashed bg-zinc-950/75"><CardContent className="grid justify-items-start gap-3 p-5"><LockKeyhole className="h-5 w-5 text-cyan-200" aria-hidden="true" /><h3 className="text-base font-semibold text-zinc-100">{external ? "No review packages have been shared with you." : "Open a package to preview delivery handoff."}</h3><p className="max-w-3xl text-sm leading-6 text-zinc-400">{external ? "Ask the package owner to grant your registered account selected work items at a specific revision." : "Use the prepared example without generating, or open a saved discovery package. Review and sharing stay separate from the immutable full output."}</p>{!external && onSaveCurrent ? <Button type="button" onClick={onSaveCurrent} disabled={disabled}>Save current package</Button> : null}</CardContent></Card> : null}

      {currentView ? <>
        <nav aria-label="Saved package workspace views" className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
          <Button type="button" variant={workspaceView === "collaboration" ? "default" : "ghost"} size="sm" aria-pressed={workspaceView === "collaboration"} onClick={() => setWorkspaceView("collaboration")}>{currentView.canManage ? "Handoff preview" : "Shared work items"}</Button>
          {currentView.canManage ? <Button type="button" variant={workspaceView === "review" ? "default" : "ghost"} size="sm" aria-pressed={workspaceView === "review"} onClick={() => setWorkspaceView("review")}>Item review</Button> : null}
          <Button type="button" variant={workspaceView === "history" ? "default" : "ghost"} size="sm" aria-pressed={workspaceView === "history"} onClick={() => setWorkspaceView("history")}><History className="h-3.5 w-3.5" />Revision history</Button>
          <Button type="button" variant={workspaceView === "sharing" ? "default" : "ghost"} size="sm" aria-pressed={workspaceView === "sharing"} onClick={() => setWorkspaceView("sharing")}><LockKeyhole className="h-3.5 w-3.5" />{currentView.canManage ? "Sharing" : "Review access"}</Button>
        </nav>
        {workspaceView === "collaboration" && currentView.canManage ? <StudioDeliveryPreview key={`${currentView.id}:${currentView.revision.id}`} synthesis={currentView.revision.synthesis} sources={currentView.revision.sources} view={currentView} preparedExample={currentView.revision.provenance === "prepared-example"} disabled={busy} onReview={(id) => { setSelectedStoryId(id); setWorkspaceView("review"); }} /> : null}
        {workspaceView === "collaboration" && !currentView.canManage ? <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,1fr)]"><div className="grid min-w-0 gap-3 sm:grid-cols-2"><StoryQueue title="Development review" description="Only the work explicitly shared with your account is shown." items={reviewItems} selectedId={selectedItem?.id} onSelect={setSelectedStoryId} /><StoryQueue title="Refinement" description="Clarify decisions or request changes on shared work." items={refinementItems} selectedId={selectedItem?.id} onSelect={setSelectedStoryId} refinement /></div>{selectedItem ? <StoryReviewPanel key={`${currentView.id}:${currentView.revision.id}:${selectedItem.id}`} view={currentView} item={selectedItem} disabled={busy} onAction={mutate} /> : null}</div> : null}
        {workspaceView === "review" && currentView.canManage ? <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><div className="grid min-w-0 gap-3"><StoryQueue title="Review candidates" description="Select a story to inspect evidence, give feedback, or approve this revision." items={reviewItems} selectedId={selectedItem?.id} onSelect={setSelectedStoryId} /><StoryQueue title="Needs refinement" description="Resolve missing evidence and decisions before handoff." items={refinementItems} selectedId={selectedItem?.id} onSelect={setSelectedStoryId} refinement /></div>{selectedItem ? <StoryReviewPanel key={`${currentView.id}:${currentView.revision.id}:${selectedItem.id}`} view={currentView} item={selectedItem} disabled={busy} onAction={mutate} onRefine={onRefine} /> : null}</div> : null}
        {workspaceView === "history" ? <RevisionHistory view={currentView} disabled={busy} onSelectRevision={(id) => { setRevisionId(id); setSelectedStoryId(""); setWorkspaceView("collaboration"); setStatus(""); }} /> : null}
        {workspaceView === "sharing" ? <SharingPanel key={`${currentView.id}:${currentView.revision.id}`} view={currentView} disabled={busy} onAction={mutate} /> : null}
        <p className="flex items-start gap-2 text-xs leading-5 text-zinc-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{currentView.canManage ? "External reviewers see only explicitly shared work at an exact revision. Raw discovery sources and private internal notes remain internal. Jira and Azure DevOps integrations are not connected." : "Your review access is checked for every request. You cannot approve internal decisions, share the package, or access unshared material."}</p>
      </> : null}
    </section>
  );
}
