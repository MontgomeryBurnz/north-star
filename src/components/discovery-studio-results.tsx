import { AlertTriangle, CheckCircle2, Globe2, Layers3, ListChecks, Map as MapIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiscoverySynthesis } from "@/lib/discovery-studio-types";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import type { StudioOutputId } from "@/lib/studio-export-types";

type EvidenceProps = { sources: ProgramArtifact[]; synthesis: DiscoverySynthesis };

function SourceReferences({ sourceIds, sourceNames }: { sourceIds: string[]; sourceNames: Map<string, string> }) {
  return <p className="mt-3 border-t border-white/10 pt-2 text-xs leading-5 text-zinc-500">Evidence: {sourceIds.length ? sourceIds.map((id) => sourceNames.get(id) ?? `Unresolved source (${id})`).join(" · ") : "No direct source reference; validate before use."}</p>;
}

function sourceNameMap({ sources, synthesis }: EvidenceProps) {
  return new Map([...sources.map((source) => [source.id, source.name] as const), ...(synthesis.sources ?? []).map((source) => [source.id, source.name] as const)]);
}

function ResearchSummary({ summary, sources }: { summary: string; sources: Array<{ title: string; url: string }> }) {
  return <p className="whitespace-pre-line text-xs leading-5 text-zinc-400">{summary.split(/(\[\d+\])/g).map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/);
    const source = match ? sources[Number(match[1]) - 1] : undefined;
    return source ? <a key={index} href={source.url} target="_blank" rel="noopener noreferrer" title={source.title} className="text-cyan-200 underline underline-offset-2">{part}</a> : <span key={index}>{part}</span>;
  })}</p>;
}

function InsightList({ empty, items, title }: { empty: string; items: string[]; title: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/65 p-4">
      <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">{title}</h3>
      {items.length ? <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-300">{items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" /><span>{item}</span></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-zinc-500">{empty}</p>}
    </section>
  );
}

export function StudioQualityReview({ synthesis, isExample }: { synthesis: DiscoverySynthesis; isExample: boolean }) {
  const researchSources = synthesis.research?.sources.filter((source) => /^https?:\/\//i.test(source.url)) ?? [];
  return (
    <Card className="bg-zinc-950/75" data-studio-quality-review>
      <CardContent className="grid gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-100">{isExample ? "Illustrative sample output" : synthesis.provider === "openai" ? "OpenAI evidence review and synthesis" : "Local draft synthesis"}</p>
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${synthesis.quality?.status === "reviewed" && !isExample ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}>{isExample ? "Fictional demonstration" : synthesis.quality?.status === "reviewed" ? "Evidence review completed" : "Needs review"}</span>
        </div>
        {isExample ? <p className="text-xs leading-5 text-zinc-400">This prepared example illustrates the workflow. Analyze the sources to generate a fresh result with the configured synthesis provider.</p> : synthesis.provider === "local" ? <p className="text-sm leading-6 text-amber-100">OpenAI synthesis is not configured. This provisional draft needs human validation before engineering use.</p> : <p className="text-xs leading-5 text-zinc-400">Review the cited evidence, assumptions, and open questions before approving this package for delivery.</p>}
        {synthesis.quality?.checks.length ? <ul className="grid gap-1 text-xs leading-5 text-zinc-400">{synthesis.quality.checks.map((check, index) => <li key={index} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200" /><span>{check}</span></li>)}</ul> : null}
        {synthesis.quality?.warnings.length ? <ul className="grid gap-1 text-xs leading-5 text-amber-100">{synthesis.quality.warnings.map((warning, index) => <li key={index} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{warning}</span></li>)}</ul> : null}
        {synthesis.sources?.some((source) => source.coverage === "excerpt") ? <p className="text-xs leading-5 text-amber-100">Some sources were reviewed as excerpts. Confirm that important details outside those excerpts are accounted for.</p> : null}
        {synthesis.research ? <div className="grid gap-2 border-t border-white/10 pt-3"><p className="flex items-center gap-2 text-xs font-medium text-cyan-100"><Globe2 className="h-3.5 w-3.5" />Public research · {synthesis.research.status.replaceAll("-", " ")}</p><ResearchSummary summary={synthesis.research.summary} sources={researchSources} />{researchSources.length ? <ul className="grid gap-1 text-xs leading-5">{researchSources.map((source, index) => <li key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline decoration-cyan-300/30 underline-offset-2 hover:text-cyan-100">[{index + 1}] {source.title}</a></li>)}</ul> : null}</div> : null}
      </CardContent>
    </Card>
  );
}

export function StudioUnderstanding({ synthesis }: { synthesis: DiscoverySynthesis }) {
  return <div className="grid gap-5"><Card className="bg-zinc-950/75"><CardContent className="grid gap-4 p-5"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Synthesized understanding</p><h2 className="mt-2 text-xl font-semibold text-zinc-50">What the evidence says</h2></div><p className="text-sm leading-7 text-zinc-200">{synthesis.executiveSummary}</p><p className="border-t border-white/10 pt-4 text-sm leading-6 text-zinc-400">{synthesis.evidenceSummary}</p></CardContent></Card><div className="grid gap-4 lg:grid-cols-2"><InsightList title="Capabilities" items={synthesis.capabilities} empty="No explicit capabilities were found." /><InsightList title="Pain points" items={synthesis.painPoints} empty="No explicit pain points were found." /><InsightList title="Business rules" items={synthesis.businessRules} empty="No explicit business rules were found." /><InsightList title="Assumptions" items={synthesis.assumptions} empty="No material assumptions were required." /></div></div>;
}

export function StudioGapList({ synthesis, sources }: EvidenceProps) {
  const sourceNames = sourceNameMap({ synthesis, sources });
  return <Card className="bg-zinc-950/75"><CardHeader className="border-b border-white/10"><p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">Readiness analysis</p><CardTitle className="mt-2 text-zinc-50">Resolve the questions that affect delivery</CardTitle></CardHeader><CardContent className="grid gap-3 p-4 sm:p-5">{synthesis.gaps.length ? synthesis.gaps.map((gap) => <article key={gap.id} className="rounded-md border border-white/10 bg-white/[0.025] p-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${gap.severity === "blocking" ? "border-red-300/30 bg-red-300/10 text-red-100" : gap.severity === "important" ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"}`}>{gap.severity}</span><span className="text-xs text-zinc-500">{gap.id}</span></div><h3 className="mt-3 font-semibold text-zinc-100">{gap.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{gap.description}</p><p className="mt-3 rounded-md border border-white/10 bg-zinc-950 p-3 text-sm leading-6 text-zinc-200">{gap.question}</p><SourceReferences sourceIds={gap.sourceIds} sourceNames={sourceNames} /></article>) : <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.05] p-5"><CheckCircle2 className="h-5 w-5 text-emerald-200" /><p className="mt-3 font-semibold text-zinc-50">No material discovery gaps were identified.</p><p className="mt-2 text-sm leading-6 text-zinc-400">Confirm the assumptions and evidence before engineering commitment.</p></div>}</CardContent></Card>;
}

export function StudioBuildOutputs({ synthesis, sources, selectedOutputs }: EvidenceProps & { selectedOutputs: StudioOutputId[] }) {
  const sourceNames = sourceNameMap({ synthesis, sources });
  const showStories = selectedOutputs.includes("stories");
  const showTests = selectedOutputs.includes("tests");
  return (
    <div className="grid gap-5">
      {selectedOutputs.includes("roadmap") ? <Card className="bg-zinc-950/75"><CardHeader className="border-b border-white/10"><div className="flex items-center gap-2"><MapIcon className="h-4 w-4 text-cyan-200" /><CardTitle className="text-zinc-50">Product roadmap</CardTitle></div></CardHeader><CardContent className="grid gap-3 p-4 sm:p-5">{synthesis.roadmap.map((item, index) => <article key={`${item.horizon}-${index}`} className="grid gap-3 rounded-md border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[120px_1fr]"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">{item.horizon}</p><div><h3 className="font-semibold text-zinc-100">{item.title}</h3><p className="mt-1 text-sm leading-6 text-zinc-400">{item.outcome}</p>{item.featureIds.length ? <p className="mt-2 text-xs text-cyan-100">Features: {item.featureIds.join(" · ")}</p> : null}{item.dependencies.length ? <p className="mt-2 text-xs text-amber-100">Depends on: {item.dependencies.join(" · ")}</p> : null}</div></article>)}</CardContent></Card> : null}
      {selectedOutputs.includes("backlog") ? <Card className="bg-zinc-950/75"><CardHeader className="border-b border-white/10"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-cyan-200" /><CardTitle className="text-zinc-50">Epics and features</CardTitle></div></CardHeader><CardContent className="grid gap-4 p-4 sm:p-5">{synthesis.epics.map((epic) => <article key={epic.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">{epic.id}</p><h3 className="mt-2 text-lg font-semibold text-zinc-50">{epic.title}</h3><p className="mt-1 text-sm leading-6 text-zinc-400">{epic.objective}</p><SourceReferences sourceIds={epic.sourceIds} sourceNames={sourceNames} /><div className="mt-4 grid gap-2 lg:grid-cols-2">{synthesis.features.filter((feature) => feature.epicId === epic.id).map((feature) => <div key={feature.id} className="rounded-md border border-white/10 bg-zinc-950/70 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-emerald-200">{feature.id}</span><span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{feature.priority}</span></div><p className="mt-2 text-sm font-semibold text-zinc-100">{feature.title}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{feature.description}</p><p className="mt-2 text-xs leading-5 text-zinc-300">Outcome: {feature.outcome}</p><SourceReferences sourceIds={feature.sourceIds} sourceNames={sourceNames} /></div>)}</div></article>)}</CardContent></Card> : null}
      {showStories || showTests ? <Card className="bg-zinc-950/75"><CardHeader className="border-b border-white/10"><div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-cyan-200" /><CardTitle className="text-zinc-50">{showStories && showTests ? "Stories, acceptance criteria, and test cases" : showStories ? "User stories and acceptance criteria" : "Test cases by user story"}</CardTitle></div></CardHeader><CardContent className="grid gap-4 p-4 sm:p-5">{synthesis.stories.map((story) => <details key={story.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4" open={synthesis.stories.length <= 4}><summary className="cursor-pointer"><span className="ml-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">{story.id} · {story.featureId}</span><span className="mt-2 block font-semibold text-zinc-50">{story.title}</span><span className={`mt-2 inline-block rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${story.readiness === "ready" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}>{story.readiness === "ready" ? "Ready for review" : "Needs input"}</span></summary>{showStories ? <p className="mt-3 text-sm leading-6 text-zinc-300">{story.story}</p> : null}<SourceReferences sourceIds={story.sourceIds} sourceNames={sourceNames} /><div className={`mt-4 grid gap-4 border-t border-white/10 pt-4 ${showStories && showTests ? "lg:grid-cols-2" : ""}`}>{showStories ? <div><h4 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Acceptance criteria</h4><ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-300">{story.acceptanceCriteria.map((criterion, index) => <li key={index} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-200" /><span>{criterion}</span></li>)}</ul></div> : null}{showTests ? <div><h4 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Test cases</h4><div className="mt-2 grid gap-3">{story.testCases.map((testCase) => <div key={testCase.id} className="rounded-md border border-white/10 bg-zinc-950/70 p-3"><p className="text-xs font-medium text-cyan-100">{testCase.id} · {testCase.type}</p><p className="mt-1 text-sm font-semibold text-zinc-100">{testCase.title}</p><ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-5 text-zinc-300">{testCase.steps.map((step, index) => <li key={index}>{step}</li>)}</ol><p className="mt-3 border-t border-white/10 pt-2 text-xs leading-5 text-zinc-300"><span className="font-medium text-zinc-100">Expected result:</span> {testCase.expectedResult}</p></div>)}</div></div> : null}</div></details>)}</CardContent></Card> : null}
      {!selectedOutputs.some((output) => ["roadmap", "backlog", "stories", "tests"].includes(output)) ? <p className="rounded-md border border-white/10 p-5 text-sm leading-6 text-zinc-400">Your selected analysis and gap deliverables are available in the views above and in your download.</p> : null}
    </div>
  );
}
