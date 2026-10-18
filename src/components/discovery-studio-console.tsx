"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  Layers3,
  ListChecks,
  Loader2,
  Map,
  RotateCcw,
  Sparkles,
  Upload,
  X
} from "lucide-react";
import type { DiscoverySynthesis } from "@/lib/discovery-studio-types";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductPageHeader } from "@/components/product-page-header";

type StudioView = "understanding" | "gaps" | "build";

const acceptedFormats = ".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.md,.json,.csv";

function detectFileFormat(name: string): NonNullable<ProgramArtifact["fileFormat"]> {
  const extension = name.toLowerCase().split(".").pop();
  const supported = ["txt", "md", "json", "csv", "xls", "xlsx", "pdf", "doc", "docx", "ppt", "pptx"];
  return supported.includes(extension ?? "") ? (extension as NonNullable<ProgramArtifact["fileFormat"]>) : "unknown";
}

function inferArtifactType(name: string): NonNullable<ProgramArtifact["artifactType"]> {
  const normalized = name.toLowerCase();
  if (normalized.includes("requirement") || normalized.includes("story")) return "requirements";
  if (normalized.includes("risk") || normalized.includes("issue")) return "risk-log";
  if (normalized.includes("status")) return "status-report";
  if (normalized.includes("plan") || normalized.includes("roadmap")) return "project-plan";
  if (normalized.includes("meeting") || normalized.includes("note")) return "meeting-notes";
  if (normalized.includes("strategy") || normalized.includes("capability")) return "strategy-deck";
  if (normalized.includes("sow") || normalized.includes("scope")) return "sow";
  return "unknown";
}

function sourceQuality(format: ProgramArtifact["fileFormat"]): NonNullable<ProgramArtifact["sourceQuality"]> {
  if (["xlsx", "xls", "csv", "json"].includes(format ?? "")) return "structured";
  if (["pptx", "ppt"].includes(format ?? "")) return "presentation";
  if (["txt", "md"].includes(format ?? "")) return "raw-notes";
  return "narrative";
}

function packageMarkdown(programName: string, synthesis: DiscoverySynthesis) {
  const lines = [
    `# ${programName} — Discovery Build Package`,
    "",
    `Readiness: ${synthesis.readinessScore}/100`,
    "",
    synthesis.executiveSummary,
    "",
    "## Discovery gaps",
    ...synthesis.gaps.map((gap) => `- [${gap.severity.toUpperCase()}] ${gap.title}: ${gap.question}`),
    "",
    "## Roadmap",
    ...synthesis.roadmap.map((item) => `- ${item.horizon}: ${item.title} — ${item.outcome}`),
    "",
    "## Epics and features",
    ...synthesis.epics.flatMap((epic) => [
      `### ${epic.id}: ${epic.title}`,
      epic.objective,
      ...synthesis.features.filter((feature) => feature.epicId === epic.id).map((feature) => `- ${feature.id}: ${feature.title} (${feature.priority}) — ${feature.description}`)
    ]),
    "",
    "## User stories, acceptance criteria, and tests",
    ...synthesis.stories.flatMap((story) => [
      `### ${story.id}: ${story.title}`,
      story.story,
      "Acceptance criteria:",
      ...story.acceptanceCriteria.map((criterion) => `- ${criterion}`),
      "Test cases:",
      ...story.testCases.map((testCase) => `- ${testCase.id} [${testCase.type}]: ${testCase.title} — ${testCase.expectedResult}`),
      ""
    ])
  ];
  return lines.join("\n");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-50">{value}</p>
    </div>
  );
}

function InsightList({ empty, items, title }: { empty: string; items: string[]; title: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-950/65 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">{title}</p>
      {items.length ? (
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-zinc-500">{empty}</p>
      )}
    </section>
  );
}

export function DiscoveryStudioConsole() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sources, setSources] = useState<ProgramArtifact[]>([]);
  const [synthesis, setSynthesis] = useState<DiscoverySynthesis | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Discovery workspace");
  const [status, setStatus] = useState("Add discovery evidence to begin. This workspace is not connected to an active program.");
  const [view, setView] = useState<StudioView>("understanding");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const readableSourceCount = sources.filter((artifact) => artifact.extractedText?.trim()).length;
  const blockingGapCount = synthesis?.gaps.filter((gap) => gap.severity === "blocking").length ?? 0;

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setPendingFiles((current) => {
      const combined = [...current, ...files];
      return combined.filter((file, index) => combined.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified) === index);
    });
    if (files.length) setStatus(`${files.length} source${files.length === 1 ? "" : "s"} queued for extraction and analysis.`);
    event.target.value = "";
  }

  async function prepareFile(file: File): Promise<ProgramArtifact> {
    const fileFormat = detectFileFormat(file.name);
    const extractionData = new FormData();
    extractionData.append("file", file);
    extractionData.append("fileFormat", fileFormat);
    const extractionResult = await fetch("/api/artifacts/extract", { method: "POST", body: extractionData });
    const artifact: ProgramArtifact = {
      id: `${file.name}-${file.lastModified}-${file.size}`,
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
      lastModified: file.lastModified,
      fileFormat,
      artifactType: inferArtifactType(file.name),
      sourceQuality: sourceQuality(fileFormat),
      analysisPriority: "high"
    };

    if (extractionResult.ok) {
      const payload = (await extractionResult.json()) as { extraction: Partial<ProgramArtifact> };
      Object.assign(artifact, payload.extraction);
    } else {
      artifact.sourceKind = "metadata-only";
      artifact.extractionStatus = "error";
      artifact.extractionMethod = "server-parser";
      artifact.extractionSummary = "Studio could not extract this source. The file is still tracked in the package.";
    }
    return artifact;
  }

  function mergeSources(current: ProgramArtifact[], incoming: ProgramArtifact[]) {
    return [...current, ...incoming].filter(
      (artifact, index, all) => all.findIndex((candidate) => candidate.id === artifact.id) === index
    );
  }

  async function analyzePackage() {
    if (!pendingFiles.length && !readableSourceCount) {
      setStatus("Add at least one readable discovery source before analysis.");
      return;
    }
    setIsAnalyzing(true);
    setStatus(pendingFiles.length ? "Extracting and classifying the discovery package..." : "Synthesizing the latest discovery evidence...");
    try {
      let analysisSources = sources;
      if (pendingFiles.length) {
        const newArtifacts = await Promise.all(pendingFiles.map(prepareFile));
        if (!newArtifacts.some((artifact) => artifact.extractedText?.trim()) && !readableSourceCount) {
          throw new Error("No readable text could be extracted from the selected files.");
        }
        analysisSources = mergeSources(sources, newArtifacts);
        setSources(analysisSources);
        setPendingFiles([]);
      }
      setStatus("Building the product definition, traceability, gaps, stories, and tests...");
      const response = await fetch("/api/studio/discovery-synthesis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceName: workspaceName.trim() || "Discovery workspace",
          artifacts: analysisSources,
          resolutionNotes
        })
      });
      const payload = (await response.json()) as { error?: string; synthesis?: DiscoverySynthesis };
      if (!response.ok || !payload.synthesis) throw new Error(payload.error || "Studio analysis failed.");
      setSynthesis(payload.synthesis);
      setView(payload.synthesis.gaps.some((gap) => gap.severity === "blocking") ? "gaps" : "build");
      setStatus(`Build package generated from ${payload.synthesis.sourceCount} readable source${payload.synthesis.sourceCount === 1 ? "" : "s"}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Studio could not analyze the package.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function copyPackage() {
    if (!synthesis) return;
    await navigator.clipboard.writeText(packageMarkdown(workspaceName.trim() || "Discovery workspace", synthesis));
    setStatus("Build package copied as structured Markdown.");
  }

  function downloadPackage() {
    if (!synthesis) return;
    const title = workspaceName.trim() || "Discovery workspace";
    const blob = new Blob([packageMarkdown(title, synthesis)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "northstar"}-build-package.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Build package downloaded.");
  }

  function clearWorkspace() {
    setPendingFiles([]);
    setSources([]);
    setSynthesis(null);
    setResolutionNotes("");
    setView("understanding");
    setWorkspaceName("Discovery workspace");
    setStatus("Fresh workspace ready. Add discovery evidence to begin.");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8" data-discovery-studio data-studio-agnostic>
      <div className="grid gap-8">
        <ProductPageHeader
          eyebrow="Studio"
          title="Turn discovery into build-ready product definition."
          description="Bring the full discovery package. North Star synthesizes the evidence, exposes what is missing, and creates a traceable roadmap, backlog, acceptance criteria, and test foundation."
        />

        <Card className="overflow-hidden bg-zinc-950/80">
          <CardContent className="grid gap-5 p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <label className="grid gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Workspace title</span>
                <input
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  maxLength={120}
                  placeholder="Name this discovery package"
                  className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
                  data-studio-workspace-name
                />
                <span className="text-sm leading-6 text-zinc-400">Standalone by design. Nothing in this workspace depends on or updates an active program.</span>
              </label>
              <Button type="button" variant="outline" onClick={clearWorkspace} disabled={!sources.length && !pendingFiles.length && !synthesis} data-studio-clear>
                <RotateCcw className="h-4 w-4" />Start fresh
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Discovery sources" value={String(sources.length + pendingFiles.length)} />
              <Metric label="Readiness" value={synthesis ? `${synthesis.readinessScore}%` : "—"} />
              <Metric label="Blocking gaps" value={synthesis ? String(blockingGapCount) : "—"} />
              <Metric label="Build-ready stories" value={synthesis ? String(synthesis.stories.filter((story) => story.readiness === "ready").length) : "—"} />
            </div>
          </CardContent>
        </Card>

            <Card className="bg-zinc-950/75">
              <CardHeader className="border-b border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">1 · Source package</p>
                    <CardTitle className="mt-2 text-zinc-50">Add discovery evidence</CardTitle>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Upload Word, Excel, PowerPoint, PDF, CSV, Markdown, JSON, or text files together. Sources stay in this working session and are synthesized independently from active programs.</p>
                  </div>
                  <input ref={inputRef} type="file" multiple accept={acceptedFormats} onChange={handleFiles} className="hidden" data-studio-source-input />
                  <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4" />Add sources</Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 sm:p-5">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {sources.map((artifact) => (
                    <div key={artifact.id} className="flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.025] p-3">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-100">{artifact.name}</p><p className="mt-1 text-xs text-zinc-500">{artifact.fileFormat?.toUpperCase() ?? "FILE"} · {artifact.extractionStatus ?? "tracked"}</p></div>
                    </div>
                  ))}
                  {pendingFiles.map((file) => (
                    <div key={`${file.name}-${file.lastModified}`} className="flex items-start gap-3 rounded-md border border-emerald-300/20 bg-emerald-300/[0.04] p-3">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-zinc-100">{file.name}</p><p className="mt-1 text-xs text-emerald-100/70">Queued for analysis</p></div>
                      <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setPendingFiles((current) => current.filter((candidate) => candidate !== file))} className="text-zinc-500 hover:text-zinc-100"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {!sources.length && !pendingFiles.length ? <div className="rounded-md border border-dashed border-white/10 p-5 text-sm text-zinc-500">No discovery evidence has been added yet.</div> : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <p className="text-sm leading-6 text-zinc-400">{status}</p>
                  <Button type="button" onClick={() => void analyzePackage()} disabled={isAnalyzing || (!pendingFiles.length && !readableSourceCount)} data-studio-analyze>
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                    {synthesis ? "Re-analyze package" : "Analyze discovery package"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {synthesis ? (
              <section className="grid gap-5">
                <div className="flex flex-wrap gap-2" aria-label="Studio output views">
                  {([
                    ["understanding", "2 · Understanding", BrainCircuit],
                    ["gaps", `3 · Gaps${blockingGapCount ? ` (${blockingGapCount})` : ""}`, AlertTriangle],
                    ["build", "4 · Build package", Layers3]
                  ] as const).map(([id, label, Icon]) => (
                    <Button key={id} type="button" variant={view === id ? "default" : "outline"} onClick={() => setView(id)}><Icon className="h-4 w-4" />{label}</Button>
                  ))}
                </div>

                {view === "understanding" ? (
                  <div className="grid gap-5">
                    <Card className="bg-zinc-950/75"><CardContent className="grid gap-4 p-5"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Synthesized understanding</p><h2 className="mt-2 text-xl font-semibold text-zinc-50">What the evidence says</h2></div><p className="text-sm leading-7 text-zinc-200">{synthesis.executiveSummary}</p><p className="border-t border-white/10 pt-4 text-sm leading-6 text-zinc-400">{synthesis.evidenceSummary}</p></CardContent></Card>
                    <div className="grid gap-4 lg:grid-cols-2"><InsightList title="Capabilities" items={synthesis.capabilities} empty="No explicit capabilities were found." /><InsightList title="Pain points" items={synthesis.painPoints} empty="No explicit pain points were found." /><InsightList title="Business rules" items={synthesis.businessRules} empty="No explicit business rules were found." /><InsightList title="Assumptions" items={synthesis.assumptions} empty="No material assumptions were required." /></div>
                  </div>
                ) : null}

                {view === "gaps" ? (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <Card className="bg-zinc-950/75"><CardHeader className="border-b border-white/10"><p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">Readiness analysis</p><CardTitle className="mt-2 text-zinc-50">Close the gaps before engineering commitment.</CardTitle></CardHeader><CardContent className="grid gap-3 p-4 sm:p-5">{synthesis.gaps.length ? synthesis.gaps.map((gap) => <article key={gap.id} className="rounded-md border border-white/10 bg-white/[0.025] p-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${gap.severity === "blocking" ? "border-red-300/30 bg-red-300/10 text-red-100" : gap.severity === "important" ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"}`}>{gap.severity}</span><span className="text-xs text-zinc-500">{gap.id}</span></div><h3 className="mt-3 font-semibold text-zinc-100">{gap.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{gap.description}</p><p className="mt-3 rounded-md border border-white/10 bg-zinc-950 p-3 text-sm leading-6 text-zinc-200">{gap.question}</p></article>) : <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.05] p-5"><CheckCircle2 className="h-5 w-5 text-emerald-200" /><p className="mt-3 font-semibold text-zinc-50">No material discovery gaps remain.</p></div>}</CardContent></Card>
                    <Card className="h-fit bg-zinc-950/75"><CardHeader className="border-b border-white/10"><CardTitle className="text-zinc-50">Add missing context</CardTitle><p className="mt-2 text-sm leading-6 text-zinc-400">Answer the questions, document decisions, or summarize newly confirmed information. Studio will regenerate the affected package.</p></CardHeader><CardContent className="grid gap-3 p-4"><textarea value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} rows={10} placeholder="Example: The first release serves regional service managers. Offline access is out of scope. Approval must be completed by a compliance administrator..." className="resize-y rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15" /><Button type="button" onClick={() => void analyzePackage()} disabled={isAnalyzing || !resolutionNotes.trim()}>{isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Apply context and regenerate</Button></CardContent></Card>
                  </div>
                ) : null}

                {view === "build" ? (
                  <div className="grid gap-5">
                    <Card className="bg-zinc-950/75"><CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Build readiness · {synthesis.readinessScore}%</p><p className="mt-2 text-sm leading-6 text-zinc-300">{synthesis.readinessNarrative}</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={() => void copyPackage()}><ClipboardCopy className="h-4 w-4" />Copy</Button><Button type="button" variant="outline" onClick={downloadPackage}><Download className="h-4 w-4" />Download</Button></div></CardContent></Card>
                    <Card className="bg-zinc-950/75"><CardHeader className="border-b border-white/10"><div className="flex items-center gap-2"><Map className="h-4 w-4 text-cyan-200" /><CardTitle className="text-zinc-50">Product roadmap</CardTitle></div></CardHeader><CardContent className="grid gap-3 p-4 sm:p-5">{synthesis.roadmap.map((item, index) => <article key={`${item.horizon}-${index}`} className="grid gap-3 rounded-md border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[120px_1fr]"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">{item.horizon}</p></div><div><h3 className="font-semibold text-zinc-100">{item.title}</h3><p className="mt-1 text-sm leading-6 text-zinc-400">{item.outcome}</p>{item.dependencies.length ? <p className="mt-2 text-xs text-amber-100">Depends on: {item.dependencies.join(" · ")}</p> : null}</div></article>)}</CardContent></Card>
                    <Card className="bg-zinc-950/75"><CardHeader className="border-b border-white/10"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-cyan-200" /><CardTitle className="text-zinc-50">Epics and features</CardTitle></div></CardHeader><CardContent className="grid gap-4 p-4 sm:p-5">{synthesis.epics.map((epic) => <article key={epic.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">{epic.id}</p><h3 className="mt-2 text-lg font-semibold text-zinc-50">{epic.title}</h3><p className="mt-1 text-sm leading-6 text-zinc-400">{epic.objective}</p><div className="mt-4 grid gap-2 lg:grid-cols-2">{synthesis.features.filter((feature) => feature.epicId === epic.id).map((feature) => <div key={feature.id} className="rounded-md border border-white/10 bg-zinc-950/70 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-emerald-200">{feature.id}</span><span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{feature.priority}</span></div><p className="mt-2 text-sm font-semibold text-zinc-100">{feature.title}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{feature.description}</p></div>)}</div></article>)}</CardContent></Card>
                    <Card className="bg-zinc-950/75"><CardHeader className="border-b border-white/10"><div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-cyan-200" /><CardTitle className="text-zinc-50">Stories, acceptance criteria, and test cases</CardTitle></div></CardHeader><CardContent className="grid gap-4 p-4 sm:p-5">{synthesis.stories.map((story) => <details key={story.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4" open={synthesis.stories.length <= 4}><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">{story.id} · {story.featureId}</p><h3 className="mt-2 font-semibold text-zinc-50">{story.title}</h3><p className="mt-1 text-sm leading-6 text-zinc-400">{story.story}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${story.readiness === "ready" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}>{story.readiness}</span></div></summary><div className="mt-4 grid gap-4 border-t border-white/10 pt-4 lg:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Acceptance criteria</p><ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-300">{story.acceptanceCriteria.map((criterion, index) => <li key={index} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-200" /><span>{criterion}</span></li>)}</ul></div><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Test cases</p><div className="mt-2 grid gap-2">{story.testCases.map((testCase) => <div key={testCase.id} className="rounded-md border border-white/10 bg-zinc-950/70 p-3"><p className="text-xs font-medium text-cyan-100">{testCase.id} · {testCase.type}</p><p className="mt-1 text-sm font-semibold text-zinc-100">{testCase.title}</p><p className="mt-1 text-xs leading-5 text-zinc-400">Expected: {testCase.expectedResult}</p></div>)}</div></div></div></details>)}</CardContent></Card>
                  </div>
                ) : null}
              </section>
            ) : null}
      </div>
    </main>
  );
}
