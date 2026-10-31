"use client";

import { useEffect, useState } from "react";
import type { StudioManagedPackageView, StudioPackageView } from "@/lib/studio-collaboration-types";
import { compareStudioRevisions } from "@/lib/studio-revision-comparison";

export function StudioRevisionComparison({ view }: { view: StudioManagedPackageView }) {
  const candidates = view.revisions.filter(revision => revision.id !== view.revision.id);
  const [selection, setSelection] = useState("");
  const selectedId = candidates.some(revision => revision.id === selection) ? selection : candidates.filter(revision => revision.number < view.revision.number).at(-1)?.id ?? candidates[0]?.id ?? "";
  const [baseline, setBaseline] = useState<StudioManagedPackageView | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setBaseline(null); setError("");
    if (!selectedId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/studio/packages/${encodeURIComponent(view.id)}?revisionId=${encodeURIComponent(selectedId)}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as { package?: StudioPackageView; error?: string };
        if (!response.ok || !payload.package?.canManage || payload.package.id !== view.id || payload.package.revision.id !== selectedId) throw new Error(payload.error || "This revision is not available for internal comparison.");
        if (!controller.signal.aborted) setBaseline(payload.package);
      } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Comparison could not be loaded."); }
    })();
    return () => controller.abort();
  }, [view.id, view.version, selectedId]);
  const comparison = baseline?.id === view.id && baseline.revision.id === selectedId ? compareStudioRevisions(baseline.revision, view.revision) : null;
  return <section className="mt-6 grid min-w-0 gap-4 border-t border-white/10 pt-5" aria-label="Revision comparison"><h4 className="font-semibold text-zinc-100">Compare saved revisions</h4><p className="text-sm leading-6 text-zinc-400">Compare a saved baseline against the revision currently open. This is a deterministic comparison of full snapshots, not another AI analysis. No content is changed.</p>{candidates.length ? <><label className="grid gap-2 text-xs text-zinc-300">Baseline revision<select className="min-w-0 rounded-md border border-white/15 bg-zinc-950 p-3 text-sm" value={selectedId} onChange={event => setSelection(event.target.value)}>{candidates.map(revision => <option key={revision.id} value={revision.id}>Revision {revision.number}</option>)}</select></label>{error ? <p role="alert" className="text-sm text-rose-100">{error}</p> : !comparison ? <p role="status" className="text-sm text-zinc-400">Loading saved comparison…</p> : <><p role="status" className="text-sm text-cyan-100">Revision {comparison.before.number} → Revision {comparison.after.number}: {comparison.counts.added} added, {comparison.counts.removed} removed, {comparison.counts.changed} changed records.</p><p className="text-xs leading-5 text-zinc-400">Coverage: package analysis, roadmap, epics, features, stories, criteria, tests, discovery gaps, sources, managed decisions, and saved refinements. Reordered lists count as changes. Source text remains internal.</p><div className="rounded-md border border-amber-300/20 p-3 text-xs leading-5 text-amber-100">Approvals do not carry to another revision. Baseline approved items: {comparison.priorApprovedStoryIds.join(", ") || "none"}. Viewed revision awaiting approval: {comparison.pendingStoryIds.join(", ") || "none"}. Existing latest-revision approvals are not changed by opening this comparison.</div>{comparison.changes.map(change => <details key={`${change.section}:${change.id}`} className="min-w-0 rounded-md border border-white/10 p-4"><summary className="cursor-pointer break-words text-sm text-zinc-200">{change.section} · {change.id} · {change.kind}</summary><div className="mt-4 grid gap-4">{change.fields.map(item => <section key={item.field} className="min-w-0"><h5 className="text-xs font-medium text-cyan-100">{item.field}</h5><div className="mt-2 grid min-w-0 gap-3 lg:grid-cols-2"><div className="min-w-0"><p className="text-xs text-zinc-500">Baseline · R{comparison.before.number}</p><pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-white/[0.025] p-3 text-xs leading-6 text-zinc-300">{item.before}</pre></div><div className="min-w-0"><p className="text-xs text-zinc-500">Viewed · R{comparison.after.number}</p><pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-white/[0.025] p-3 text-xs leading-6 text-zinc-300">{item.after}</pre></div></div></section>)}</div></details>)}{!comparison.changes.length ? <p className="text-sm text-zinc-400">No content or workflow differences found.</p> : null}</>}</> : <p className="text-sm text-zinc-400">A second saved output revision is needed to compare. Saving gaps or feedback does not create or pay for a new output revision.</p>}</section>;
}
