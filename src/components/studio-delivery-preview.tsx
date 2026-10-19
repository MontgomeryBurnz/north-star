"use client";

import { useState } from "react";
import type { DiscoverySynthesis } from "@/lib/discovery-studio-types";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import type { StudioManagedPackageView } from "@/lib/studio-collaboration-types";
import { assessStudioDelivery, buildStudioHandoffPreview, type DeliveryCategory, type DeliveryTarget } from "@/lib/studio-delivery-readiness";
import { Button } from "@/components/ui/button";

const categories: Array<{ id: DeliveryCategory; title: string; description: string }> = [
  { id: "ready-for-review", title: "Ready for review", description: "Implementation candidates awaiting human confirmation." },
  { id: "approved-for-handoff", title: "Approved for handoff", description: "Reviewed work at the latest revision; eligible for selection." },
  { id: "needs-refinement", title: "Needs refinement", description: "Excluded from handoff until missing information or requested changes are addressed." }
];

export function StudioDeliveryPreview({ synthesis, sources, view, preparedExample = false, onReview, disabled = false }: {
  synthesis: DiscoverySynthesis; sources: ProgramArtifact[]; view?: StudioManagedPackageView; preparedExample?: boolean;
  onReview?: (id: string) => void; disabled?: boolean;
}) {
  const [target, setTarget] = useState<DeliveryTarget>("jira");
  const [selectedStoryId, setSelectedStoryId] = useState(synthesis.stories[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const currentRevision = Boolean(view && view.headRevisionId === view.revision.id);
  const assessments = assessStudioDelivery(synthesis, sources, view?.items, { preparedExample, currentRevision });
  const eligibleIds = new Set(assessments.filter(item => item.category === "approved-for-handoff").map(item => item.storyId));
  // Revalidate selections on every render, including after review state changes.
  const effectiveIds = selectedIds.filter(id => eligibleIds.has(id));
  const selected = synthesis.stories.find(story => story.id === selectedStoryId) ?? synthesis.stories[0];
  const assessment = assessments.find(item => item.storyId === selected?.id);
  const feature = synthesis.features.find(item => item.id === selected?.featureId);
  const epic = synthesis.epics.find(item => item.id === selected?.epicId);
  const names = new Map(sources.map(source => [source.id, source.name]));

  function downloadPreview() {
    if (!view || disabled) return;
    try {
      const preview = buildStudioHandoffPreview(view, target, effectiveIds);
      const url = URL.createObjectURL(new Blob([JSON.stringify(preview, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `northstar-${target}-handoff-preview-r${view.revision.number}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setStatus("Planning preview downloaded locally. Nothing was sent to Jira or Azure DevOps. This is not an import/API payload.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "The handoff preview could not be prepared."); }
  }

  return <section className="grid min-w-0 gap-5" aria-label="Delivery handoff preview" data-studio-delivery-preview>
    <div className="grid min-w-0 gap-4 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.035] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Preview only · not connected</p><h3 className="mt-2 text-lg font-semibold text-zinc-100">See what development teams would receive</h3><p className="mt-2 text-sm leading-6 text-zinc-300">The full output package stays intact. Only selected, human-approved stories from the latest revision belong in a handoff. Previewing, reviewing, and downloading this plan do not invoke OpenAI.</p>{preparedExample ? <p className="mt-2 text-xs leading-5 text-amber-100">Prepared fictional example—not a fresh AI result. Any review state here demonstrates the workflow, not production implementation readiness.</p> : null}{!view ? <p className="mt-2 text-xs leading-5 text-zinc-400">Session preview only. Open a saved package to track human approval and select handoff work.</p> : !currentRevision ? <p className="mt-2 text-xs leading-5 text-amber-100">Historical revision: handoff selection is disabled. Open the latest revision to review current work.</p> : null}</div><label className="grid content-start gap-2 text-xs text-zinc-300">Preview destination<select value={target} onChange={(event) => { setTarget(event.target.value as DeliveryTarget); setStatus(""); }} disabled={disabled} className="min-w-0 rounded-md border border-white/15 bg-zinc-950 p-3 text-sm text-zinc-100"><option value="jira">Jira</option><option value="ado">Azure DevOps · Agile</option></select></label></div>
    <div className="grid min-w-0 gap-3 lg:grid-cols-3">{categories.map(category => {
      const group = assessments.filter(item => item.category === category.id);
      return <section key={category.id} aria-label={category.title} className="min-w-0 rounded-lg border border-white/10 bg-zinc-950/70 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-zinc-100">{category.title}</h3><span className="text-sm text-cyan-100">{group.length}</span></div><p className="mt-2 text-xs leading-5 text-zinc-400">{category.description}</p><div className="mt-4 grid max-h-[26rem] gap-2 overflow-y-auto p-0.5">{group.map(item => {
        const story = synthesis.stories.find(story => story.id === item.storyId)!;
        return <article key={story.id} className={`min-w-0 rounded-md border p-3 ${selected?.id === story.id ? "border-cyan-300/50 bg-cyan-300/[0.04]" : "border-white/10"}`}><button type="button" onClick={() => setSelectedStoryId(story.id)} aria-pressed={selected?.id === story.id} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"><span className="text-xs text-cyan-100">{story.id}</span><span className="mt-1 block break-words text-sm font-medium leading-6 text-zinc-100">{story.title}</span><span className="mt-2 block text-xs leading-5 text-zinc-400">{story.acceptanceCriteria.length} criteria · {story.testCases.length} tests</span></button>{category.id === "approved-for-handoff" ? <label className="mt-3 flex items-start gap-2 border-t border-white/10 pt-3 text-xs leading-5 text-emerald-100"><input type="checkbox" checked={effectiveIds.includes(story.id)} disabled={disabled} onChange={(event) => setSelectedIds(ids => event.target.checked ? [...new Set([...ids, story.id])] : ids.filter(id => id !== story.id))} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-300" />Include {story.id} in handoff preview</label> : null}</article>;
      })}{!group.length ? <p className="rounded-md border border-dashed border-white/10 p-3 text-xs leading-5 text-zinc-500">{category.id === "approved-for-handoff" ? "Nothing approved for handoff yet. Review candidates below; generated readiness never grants approval." : "No stories in this category."}</p> : null}</div></section>;
    })}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-4"><div><p className="text-sm font-medium text-zinc-200">{effectiveIds.length} approved stories selected · {target === "jira" ? "Jira" : "Azure DevOps"}</p><p className="mt-1 text-xs leading-5 text-zinc-400">No connection, transmission, or automatic backlog creation. This download is a planning preview, not an executable import.</p></div><Button type="button" variant="outline" disabled={disabled || !effectiveIds.length || !view} onClick={downloadPreview}>Download handoff preview (.json)</Button></div>
    <p role="status" aria-live="polite" className={status ? "text-xs leading-5 text-cyan-100" : "sr-only"}>{status}</p>
    {selected ? <article className="grid min-w-0 gap-4 rounded-lg border border-white/10 bg-zinc-950/80 p-4 sm:p-5" aria-label="Development work item preview"><div><p className="text-xs font-medium text-cyan-100">{selected.id} · Proposed {target === "jira" ? "Story" : "User Story"} · {categories.find(category => category.id === assessment?.category)?.title}</p><h3 className="mt-2 text-lg font-semibold text-zinc-100">{selected.title}</h3></div><p className="text-sm leading-6 text-zinc-300">{target === "jira" ? "Proposed Jira mapping: Epic → Story. Feature is retained as context unless a custom hierarchy is configured." : "Proposed Azure DevOps Agile mapping: Epic → Feature → User Story. Other processes need a different mapping."}</p><p className="text-xs leading-6 text-zinc-400">Parent context: {epic?.id} · {epic?.title} / {feature?.id} · {feature?.title}. Parent context does not approve or include sibling work.</p><p className="text-sm leading-7 text-zinc-200">{selected.story}</p>{assessment?.reasons.length ? <ul className="list-disc space-y-2 rounded-md border border-amber-300/20 p-4 pl-8 text-xs leading-5 text-amber-100">{assessment.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : <p className="text-xs leading-5 text-zinc-400">Confirm evidence, acceptance boundaries, dependencies, and engineering feasibility before approval.</p>}<div className="grid min-w-0 gap-4 lg:grid-cols-2"><section><h4 className="text-sm font-medium text-zinc-100">Acceptance criteria</h4><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-300">{selected.acceptanceCriteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ul></section><section><h4 className="text-sm font-medium text-zinc-100">Test coverage</h4><div className="mt-2 grid gap-2">{selected.testCases.map(test => <details key={test.id} className="rounded-md border border-white/10 p-3 text-xs leading-5 text-zinc-300"><summary className="cursor-pointer text-cyan-100">{test.id} · {test.title} · {test.type}</summary><ol className="mt-3 list-decimal space-y-1 pl-4">{test.steps.map((step, index) => <li key={index}>{step}</li>)}</ol><p className="mt-3">Expected: {test.expectedResult}</p></details>)}</div></section></div><p className="text-xs leading-6 text-zinc-400">Dependencies to review: {[...new Set(synthesis.roadmap.filter(item => item.featureIds.includes(selected.featureId)).flatMap(item => item.dependencies))].join(" · ") || "No roadmap dependency recorded; confirm with engineering."}</p><p className="text-xs leading-6 text-zinc-400">Evidence references: {selected.sourceIds.map(id => names.get(id) ?? `Unresolved reference (${id})`).join(" · ") || "None recorded"}. Raw discovery text and private discussion are not part of a handoff preview.</p><p className="text-xs leading-5 text-zinc-500">Destination fields, permissions, and test-management tooling still need configuration. Tests are preserved as coverage—not promised as native test objects.</p>{onReview ? <Button type="button" className="justify-self-start" variant="outline" onClick={() => onReview(selected.id)} disabled={disabled}>Review, feedback and approval · {selected.id}</Button> : null}</article> : <p className="text-sm text-zinc-400">No user stories are available. The complete analysis and other deliverables remain in the full package.</p>}
  </section>;
}
