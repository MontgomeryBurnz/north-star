import { AlertTriangle, CheckCircle2, FileText, FlaskConical } from "lucide-react";
import type { DiscoveryGap, DiscoveryUserStory } from "@/lib/discovery-studio-types";

type StoryContent = Pick<DiscoveryUserStory, "id" | "title" | "story" | "acceptanceCriteria" | "testCases">;

export function StudioCollaborationStoryContent({
  story,
  sourceNames = [],
  relatedGaps = [],
  sharedContext,
  showInternalEvidence = false
}: {
  story: StoryContent;
  sourceNames?: string[];
  relatedGaps?: DiscoveryGap[];
  sharedContext?: string;
  showInternalEvidence?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <p className="break-words text-sm leading-6 text-zinc-300">{story.story}</p>

      {showInternalEvidence ? (
        <section className="border-t border-white/10 pt-4" aria-label="Story evidence">
          <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-cyan-100"><FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Source evidence</h4>
          {sourceNames.length ? <ul className="mt-3 grid gap-2 text-xs leading-5 text-zinc-400">{sourceNames.map((name, index) => <li key={`${name}-${index}`} className="break-words rounded-md border border-white/10 bg-black/20 px-3 py-2">{name}</li>)}</ul> : <p className="mt-2 text-xs leading-5 text-amber-100">No direct source reference. Validate this work item before approval.</p>}
        </section>
      ) : null}

      {sharedContext ? (
        <section className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.045] p-3" aria-label="Explicitly shared context">
          <h4 className="text-xs font-medium text-cyan-100">Context shared for this review</h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{sharedContext}</p>
        </section>
      ) : null}

      <section className="border-t border-white/10 pt-4" aria-label="Acceptance criteria">
        <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Acceptance criteria · {story.acceptanceCriteria.length}</h4>
        {story.acceptanceCriteria.length ? <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-300">{story.acceptanceCriteria.map((criterion, index) => <li key={index} className="flex min-w-0 gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-200" aria-hidden="true" /><span className="min-w-0 break-words">{criterion}</span></li>)}</ul> : <p className="mt-2 text-xs leading-5 text-amber-100">Acceptance criteria still need to be defined.</p>}
      </section>

      <section className="border-t border-white/10 pt-4" aria-label="Test coverage">
        <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400"><FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Linked tests · {story.testCases.length}</h4>
        {story.testCases.length ? <div className="mt-3 grid gap-2">{story.testCases.map((testCase) => <details key={testCase.id} className="min-w-0 rounded-md border border-white/10 bg-black/20 p-3"><summary className="cursor-pointer break-words text-xs font-medium leading-5 text-zinc-200"><span className="text-cyan-100">{testCase.id}</span> · {testCase.title}<span className="mt-1 block text-[11px] font-normal text-zinc-500">{testCase.type.replaceAll("-", " ")}</span></summary><ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-5 text-zinc-400">{testCase.steps.map((step, index) => <li key={index} className="break-words">{step}</li>)}</ol><p className="mt-3 break-words border-t border-white/10 pt-2 text-xs leading-5 text-zinc-300"><span className="font-medium text-zinc-100">Expected:</span> {testCase.expectedResult}</p></details>)}</div> : <p className="mt-2 text-xs leading-5 text-amber-100">Test coverage still needs to be defined.</p>}
      </section>

      {showInternalEvidence && relatedGaps.length ? (
        <section className="border-t border-white/10 pt-4" aria-label="Related discovery gaps">
          <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-amber-100"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Related discovery gaps</h4>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">These gaps cite some of the same sources. Confirm the actual dependency before committing this work.</p>
          <div className="mt-3 grid gap-2">{relatedGaps.map((gap) => <div key={gap.id} className="rounded-md border border-amber-300/15 bg-amber-300/[0.035] p-3"><p className="text-[11px] font-medium text-amber-100">{gap.id} · {gap.severity}</p><p className="mt-1 break-words text-sm font-medium text-zinc-200">{gap.title}</p><p className="mt-2 break-words text-xs leading-5 text-zinc-400">{gap.question}</p></div>)}</div>
        </section>
      ) : null}
    </div>
  );
}
