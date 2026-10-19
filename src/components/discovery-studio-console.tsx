"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, BrainCircuit, ClipboardCopy, Download, FileText, History, Layers3, Loader2, MessageSquare, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import type { DiscoverySynthesis } from "@/lib/discovery-studio-types";
import { readDiscoveryStudioResponse } from "@/lib/discovery-studio-transport";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import { STUDIO_EXPORT_FORMATS, STUDIO_OUTPUT_OPTIONS, type StudioExportFormat, type StudioOutputId } from "@/lib/studio-export-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductPageHeader } from "@/components/product-page-header";
import { DiscoveryStudioPreferences } from "@/components/discovery-studio-preferences";
import { StudioBuildOutputs, StudioGapList, StudioQualityReview, StudioUnderstanding } from "@/components/discovery-studio-results";
import { sampleDiscoverySources, sampleDiscoverySynthesis, sampleProgram } from "@/data/sample-program";

type StudioView = "understanding" | "gaps" | "build";
type StudioRevision = { id: number; synthesis: DiscoverySynthesis; summary: string; createdAt: string };
type FeedbackKind = "issue" | "discrepancy" | "change";

const acceptedFormats = ".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.md,.json,.csv";
const allOutputIds = STUDIO_OUTPUT_OPTIONS.map((option) => option.id);
const inputStyle = "w-full min-w-0 rounded-md border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15";

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

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-white/10 bg-white/[0.035] px-4 py-3"><p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p><p className="mt-1 text-xl font-semibold text-zinc-50">{value}</p></div>;
}

function initialRevision(): StudioRevision {
  return { id: 1, synthesis: sampleDiscoverySynthesis, summary: "Prepared fictional discovery example", createdAt: sampleDiscoverySynthesis.generatedAt };
}

export function DiscoveryStudioConsole({ initialSample = false }: { initialSample?: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sources, setSources] = useState<ProgramArtifact[]>(initialSample ? sampleDiscoverySources : []);
  const [synthesis, setSynthesis] = useState<DiscoverySynthesis | null>(initialSample ? sampleDiscoverySynthesis : null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [workspaceName, setWorkspaceName] = useState(initialSample ? sampleProgram.name : "Discovery workspace");
  const [status, setStatus] = useState(initialSample ? "Fictional discovery package loaded. Explore the outputs or analyze the sources to create a new revision." : "Add discovery evidence and choose the outputs you need.");
  const [view, setView] = useState<StudioView>(initialSample ? "build" : "understanding");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [exportAction, setExportAction] = useState<"download" | "copy" | null>(null);
  const [isSampleWorkspace, setIsSampleWorkspace] = useState(initialSample);
  const [selectedOutputs, setSelectedOutputs] = useState<StudioOutputId[]>(allOutputIds);
  const [exportFormat, setExportFormat] = useState<StudioExportFormat>("docx");
  const [externalResearch, setExternalResearch] = useState(false);
  const [researchTopic, setResearchTopic] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>("change");
  const [feedbackTarget, setFeedbackTarget] = useState("package");
  const [revisions, setRevisions] = useState<StudioRevision[]>(initialSample ? [initialRevision()] : []);
  const [activeRevisionId, setActiveRevisionId] = useState(initialSample ? 1 : 0);
  const [selectedRevisionId, setSelectedRevisionId] = useState(initialSample ? 1 : 0);
  const readableSourceCount = sources.filter((artifact) => artifact.extractedText?.trim()).length;
  const blockingGapCount = synthesis?.gaps.filter((gap) => gap.severity === "blocking").length ?? 0;
  const activeRevision = revisions.find((revision) => revision.id === activeRevisionId);
  const selectedFormat = STUDIO_EXPORT_FORMATS.find((format) => format.id === exportFormat) ?? STUDIO_EXPORT_FORMATS[0];
  const busy = isAnalyzing || exportAction !== null;
  const canAnalyze = !busy && (pendingFiles.length > 0 || readableSourceCount > 0) && selectedOutputs.length > 0 && (!externalResearch || researchTopic.trim().length > 0);
  const feedbackTargets = synthesis ? [
    ...synthesis.epics.map((item) => ({ id: item.id, label: `${item.id} · ${item.title}` })),
    ...synthesis.features.map((item) => ({ id: item.id, label: `${item.id} · ${item.title}` })),
    ...synthesis.stories.map((item) => ({ id: item.id, label: `${item.id} · ${item.title}` })),
    ...synthesis.gaps.map((item) => ({ id: item.id, label: `${item.id} · ${item.title}` }))
  ] : [];

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
    const artifact: ProgramArtifact = { id: `${file.name}-${file.lastModified}-${file.size}`, name: file.name, size: file.size, type: file.type || "unknown", lastModified: file.lastModified, fileFormat, artifactType: inferArtifactType(file.name), sourceQuality: sourceQuality(fileFormat), analysisPriority: "high" };
    if (extractionResult.ok) {
      const payload = (await extractionResult.json()) as { extraction: Partial<ProgramArtifact> };
      Object.assign(artifact, payload.extraction);
    } else {
      artifact.sourceKind = "metadata-only";
      artifact.extractionStatus = "error";
      artifact.extractionMethod = "server-parser";
      artifact.extractionSummary = "Studio could not extract this source. Re-upload a readable version so its content can be reviewed.";
    }
    return artifact;
  }

  async function analyzePackage(refine = false) {
    if (!selectedOutputs.length) { setStatus("Select at least one desired output before analysis."); return; }
    if (externalResearch && !researchTopic.trim()) { setStatus("Enter a generic public research topic to include web research."); return; }
    if (!pendingFiles.length && !readableSourceCount) { setStatus("Add at least one readable discovery source before analysis."); return; }
    if (sources.length + pendingFiles.length > 16) { setStatus("Use up to 16 discovery sources per analysis. Remove sources or split this package before continuing."); return; }
    if (refine && (!synthesis || !feedback.trim())) { setStatus("Describe the issue, discrepancy, or change to create a revision."); return; }
    setIsAnalyzing(true);
    setStatus(pendingFiles.length ? "Extracting and classifying the discovery package…" : refine ? "Reviewing your feedback against the evidence and previous output…" : "Reviewing the discovery evidence…");
    const revisionFeedback = refine ? `${feedbackKind.toUpperCase()} · ${feedbackTarget === "package" ? "Whole package" : feedbackTarget}: ${feedback.trim()}` : "";
    try {
      let analysisSources = sources;
      if (pendingFiles.length) {
        const newArtifacts = await Promise.all(pendingFiles.map(prepareFile));
        analysisSources = [...sources, ...newArtifacts].filter((artifact, index, all) => all.findIndex((candidate) => candidate.id === artifact.id) === index);
        setSources(analysisSources);
        setPendingFiles([]);
        if (!analysisSources.some((artifact) => artifact.extractedText?.trim())) throw new Error("No readable text could be extracted. Review the source warnings and upload readable versions.");
      }
      setStatus(refine ? "Revising the package while checking traceability, acceptance criteria, and tests…" : "Synthesizing the evidence, gaps, roadmap, stories, and tests…");
      const response = await fetch("/api/studio/discovery-synthesis", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ workspaceName: workspaceName.trim() || "Discovery workspace", artifacts: analysisSources, resolutionNotes, selectedOutputs, externalResearch, researchTopic: externalResearch ? researchTopic.trim() : "", ...(synthesis ? { previousSynthesis: synthesis } : {}), ...(refine ? { feedback: revisionFeedback } : {}) })
      });
      const result = await readDiscoveryStudioResponse(response, () => setStatus("Studio is still working on the discovery package. The completed, checked outputs will appear here when ready…"));
      const revisionId = (revisions.at(-1)?.id ?? 0) + 1;
      result.revision = { number: revisionId, summary: result.revision?.summary || "Discovery synthesis generated", ...(refine ? { feedback: revisionFeedback } : {}) };
      const summary = result.revision?.summary || (refine ? revisionFeedback : resolutionNotes.trim() ? "Reanalyzed with additional context" : "Discovery synthesis generated");
      setSynthesis(result);
      setRevisions((current) => [...current, { id: revisionId, synthesis: result, summary, createdAt: result.generatedAt }]);
      setActiveRevisionId(revisionId);
      setSelectedRevisionId(revisionId);
      setFeedback("");
      setFeedbackTarget("package");
      setView(result.gaps.some((gap) => gap.severity === "blocking") ? "gaps" : "build");
      setStatus(`Revision ${revisionId} generated from ${result.sourceCount} readable source${result.sourceCount === 1 ? "" : "s"}. ${result.provider === "openai" ? "OpenAI evidence review completed." : "Local draft requires review."}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Studio could not analyze the package.";
      setStatus(`${message}${synthesis && !/\bpreserved\b/i.test(message) ? " Your current revision is preserved." : ""}`);
    } finally { setIsAnalyzing(false); }
  }

  async function exportPackage(action: "download" | "copy") {
    if (!synthesis || !selectedOutputs.length) return;
    setExportAction(action);
    setStatus(action === "copy" ? "Preparing the selected outputs for copying…" : `Preparing your ${selectedFormat.label.toLowerCase()}…`);
    try {
      const format = action === "copy" ? "md" : exportFormat;
      const response = await fetch("/api/studio/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceName: workspaceName.trim() || "Discovery workspace", synthesis, format, outputs: selectedOutputs }) });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || "The selected outputs could not be exported.");
      }
      if (action === "copy") {
        await navigator.clipboard.writeText(await response.text());
        setStatus("Selected outputs copied as structured Markdown.");
      } else {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        const disposition = response.headers.get("content-disposition");
        const filename = disposition?.match(/filename="([^"]+)"/)?.[1];
        anchor.download = filename || `northstar-build-package.${format}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setStatus(`${selectedFormat.label} downloaded with ${selectedOutputs.length} selected deliverable${selectedOutputs.length === 1 ? "" : "s"}.`);
      }
    } catch (error) { setStatus(error instanceof Error ? error.message : "Studio could not export the package."); }
    finally { setExportAction(null); }
  }

  function clearWorkspace() {
    setPendingFiles([]); setSources([]); setSynthesis(null); setResolutionNotes(""); setView("understanding"); setWorkspaceName("Discovery workspace"); setIsSampleWorkspace(false); setFeedback(""); setFeedbackTarget("package"); setRevisions([]); setActiveRevisionId(0); setSelectedRevisionId(0); setExternalResearch(false); setResearchTopic("");
    setStatus("Fresh workspace ready. Add discovery evidence and choose the outputs you need.");
    if (inputRef.current) inputRef.current.value = "";
  }

  function loadSampleWorkspace() {
    setPendingFiles([]); setSources(sampleDiscoverySources); setSynthesis(sampleDiscoverySynthesis); setResolutionNotes(""); setView("build"); setWorkspaceName(sampleProgram.name); setIsSampleWorkspace(true); setFeedback(""); setFeedbackTarget("package"); setRevisions([initialRevision()]); setActiveRevisionId(1); setSelectedRevisionId(1); setExternalResearch(false); setResearchTopic("");
    setStatus("Fictional discovery package loaded. Explore the outputs or analyze the sources to create a new revision.");
    if (inputRef.current) inputRef.current.value = "";
  }

  function restoreRevision() {
    const revision = revisions.find((item) => item.id === selectedRevisionId);
    if (!revision) return;
    setSynthesis(revision.synthesis); setActiveRevisionId(revision.id); setFeedbackTarget("package");
    setStatus(`Revision ${revision.id} restored. Later revisions remain available in this session.`);
  }

  function removeSource(sourceId: string) {
    setSources((current) => current.filter((source) => source.id !== sourceId));
    setStatus("Source removed from the next analysis. Re-analyze to update the outputs; existing revisions remain available.");
  }

  return (
    <main className="northstar-shell py-8 sm:py-10" data-discovery-studio data-studio-agnostic>
      <div className="grid min-w-0 grid-cols-1 gap-6">
        <ProductPageHeader eyebrow="Studio" title="Turn discovery into the product outputs you need." description="Choose your deliverables, review the evidence, and refine with feedback. Export editable Word, Excel, or PowerPoint files." />
        {isSampleWorkspace ? <div className="flex flex-col gap-3 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.055] p-4 sm:flex-row sm:items-center sm:justify-between" data-studio-sample><div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" /><div><p className="text-sm font-medium text-cyan-100">Regional Service Request Modernization · Fictional discovery evidence</p><p className="mt-1 text-xs leading-5 text-zinc-400">Explore the same program evidence used throughout North Star. Studio changes and revisions stay in this browser session.</p></div></div><Button type="button" variant="outline" size="sm" onClick={clearWorkspace} disabled={busy} className="border-cyan-300/20 text-cyan-100">Use my own sources</Button></div> : null}

        <Card className="overflow-hidden bg-zinc-950/80"><CardContent className="grid gap-5 p-4 sm:p-5"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"><label className="grid gap-2"><span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Workspace title</span><input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} maxLength={120} disabled={busy} placeholder="Name this discovery package" className={inputStyle} data-studio-workspace-name /><span className="text-sm leading-6 text-zinc-400">Use Studio with or without an active program. Sources, results, and revisions stay in this session.</span></label><div className="flex flex-wrap gap-2">{!sources.length && !pendingFiles.length && !synthesis ? <Button type="button" variant="outline" onClick={loadSampleWorkspace} disabled={busy} data-studio-load-sample><Sparkles className="h-4 w-4" />Try example evidence</Button> : null}<Button type="button" variant="outline" onClick={clearWorkspace} disabled={busy || (!sources.length && !pendingFiles.length && !synthesis)} data-studio-clear><RotateCcw className="h-4 w-4" />Start fresh</Button></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Discovery sources" value={String(sources.length + pendingFiles.length)} /><Metric label="Readiness" value={synthesis ? `${synthesis.readinessScore}%` : "—"} /><Metric label="Blocking gaps" value={synthesis ? String(blockingGapCount) : "—"} /><Metric label="Stories ready for review" value={synthesis ? String(synthesis.stories.filter((story) => story.readiness === "ready").length) : "—"} /></div></CardContent></Card>

        <Card className="bg-zinc-950/75">
          <CardHeader className="border-b border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">1 · Source package</p>
                <CardTitle className="mt-2 text-zinc-50">Add discovery evidence</CardTitle>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Upload up to 16 Word, Excel, PowerPoint, PDF, CSV, Markdown, JSON, or text files together. Include capability analyses, pain points, rules, decisions, and interview notes.</p>
              </div>
              <input ref={inputRef} type="file" multiple accept={acceptedFormats} onChange={handleFiles} disabled={busy} className="hidden" aria-label="Discovery source files" data-studio-source-input />
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}><Upload className="h-4 w-4" />Add sources</Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 sm:p-5">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {sources.map((artifact) => (
                <div key={artifact.id} className="flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.025] p-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-zinc-100">{artifact.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{artifact.fileFormat?.toUpperCase() ?? "FILE"} · {artifact.extractionStatus ?? "tracked"}</p>
                    {!artifact.extractedText?.trim() ? <p className="mt-2 text-xs leading-5 text-amber-100">{artifact.extractionSummary || "No readable content. Upload a readable version to include this source in synthesis."}</p> : null}
                  </div>
                  <button type="button" aria-label={`Remove ${artifact.name}`} onClick={() => removeSource(artifact.id)} disabled={busy} className="text-zinc-500 hover:text-zinc-100"><X className="h-4 w-4" /></button>
                </div>
              ))}
              {pendingFiles.map((file) => (
                <div key={`${file.name}-${file.lastModified}-${file.size}`} className="flex items-start gap-3 rounded-md border border-emerald-300/20 bg-emerald-300/[0.04] p-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                  <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium text-zinc-100">{file.name}</p><p className="mt-1 text-xs text-emerald-100/70">Queued for analysis</p></div>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setPendingFiles((current) => current.filter((candidate) => candidate !== file))} disabled={busy} className="text-zinc-500 hover:text-zinc-100"><X className="h-4 w-4" /></button>
                </div>
              ))}
              {!sources.length && !pendingFiles.length ? <div className="rounded-md border border-dashed border-white/10 p-5 text-sm text-zinc-500">No discovery evidence has been added yet.</div> : null}
            </div>
          </CardContent>
        </Card>

        <DiscoveryStudioPreferences selectedOutputs={selectedOutputs} onSelectedOutputsChange={setSelectedOutputs} exportFormat={exportFormat} onExportFormatChange={setExportFormat} externalResearch={externalResearch} onExternalResearchChange={setExternalResearch} researchTopic={researchTopic} onResearchTopicChange={setResearchTopic} disabled={busy} />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/80 p-4"><p className="max-w-4xl text-sm leading-6 text-zinc-300" role="status" aria-live="polite" data-studio-status>{status}</p><Button type="button" onClick={() => void analyzePackage()} disabled={!canAnalyze} data-studio-analyze>{isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}{synthesis ? "Re-analyze package" : "Analyze discovery package"}</Button></div>

        {synthesis ? <section className="grid min-w-0 grid-cols-1 gap-5" aria-label="Studio results">
          <StudioQualityReview synthesis={synthesis} isExample={synthesis === sampleDiscoverySynthesis} />
          <Card className="bg-zinc-950/75"><CardContent className="grid gap-4 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100"><History className="h-4 w-4" />Revision {activeRevisionId}</p><p className="mt-2 text-sm leading-6 text-zinc-300" data-studio-revision-summary>{activeRevision?.summary}</p></div><div className="flex flex-wrap items-end gap-2"><label className="grid gap-1"><span className="text-xs text-zinc-400">Revision history</span><select value={selectedRevisionId} onChange={(event) => setSelectedRevisionId(Number(event.target.value))} disabled={busy} className={`${inputStyle} max-w-[280px]`} data-studio-revision-history>{revisions.map((revision) => <option key={revision.id} value={revision.id}>Revision {revision.id}{revision.id === activeRevisionId ? " · Current" : ""} · {revision.summary.slice(0, 60)}</option>)}</select></label><Button type="button" variant="outline" onClick={restoreRevision} disabled={busy || selectedRevisionId === activeRevisionId} data-studio-restore-revision><RotateCcw className="h-4 w-4" />Restore</Button></div></div><p className="text-xs leading-5 text-zinc-500">Every generated revision is retained until you start fresh or leave this session. Review previous outputs and restore them before making further changes.</p></CardContent></Card>
          <div className="flex flex-wrap gap-2" aria-label="Studio output views">{([["understanding", "3 · Understanding", BrainCircuit], ["gaps", `4 · Gaps${blockingGapCount ? ` (${blockingGapCount})` : ""}`, AlertTriangle], ["build", "5 · Build package", Layers3]] as const).map(([id, label, Icon]) => <Button key={id} type="button" variant={view === id ? "default" : "outline"} onClick={() => setView(id)} aria-pressed={view === id}><Icon className="h-4 w-4" />{label}</Button>)}</div>
          {view === "understanding" ? <StudioUnderstanding synthesis={synthesis} /> : null}
          {view === "gaps" ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]"><StudioGapList synthesis={synthesis} sources={sources} /><Card className="h-fit bg-zinc-950/75"><CardHeader className="border-b border-white/10"><CardTitle className="text-zinc-50">Add missing context</CardTitle><p className="mt-2 text-sm leading-6 text-zinc-400">Answer the open questions, document decisions, or summarize newly confirmed information. Studio will review the updated evidence in a new revision.</p></CardHeader><CardContent className="grid gap-3 p-4"><label className="grid gap-2"><span className="sr-only">Missing discovery context</span><textarea value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} disabled={busy} rows={8} maxLength={24000} placeholder="Example: The first release serves regional service managers. Offline access is out of scope. Approval must be completed by a compliance administrator…" className={`${inputStyle} resize-y leading-6`} /></label><Button type="button" onClick={() => void analyzePackage()} disabled={!canAnalyze || !resolutionNotes.trim()}>{isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Apply context and regenerate</Button></CardContent></Card></div> : null}
          {view === "build" ? <div className="grid gap-5"><Card className="bg-zinc-950/75"><CardContent className="grid gap-3 p-5"><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Build readiness · {synthesis.readinessScore}%</p><p className="text-sm leading-6 text-zinc-300">{synthesis.readinessNarrative}</p></CardContent></Card><StudioBuildOutputs synthesis={synthesis} sources={sources} selectedOutputs={selectedOutputs} /></div> : null}

          <Card className="bg-zinc-950/75" data-studio-feedback><CardHeader className="border-b border-white/10"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-cyan-200" /><CardTitle className="text-zinc-50">Review and refine the outputs</CardTitle></div><p className="mt-2 text-sm leading-6 text-zinc-400">Flag an issue, explain a discrepancy, or request an update. Include the source or rule that supports your correction. Studio reviews your feedback with the existing package and creates a new revision.</p></CardHeader><CardContent className="grid gap-4 p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]"><label className="grid gap-2"><span className="text-xs font-medium text-zinc-200">Feedback type</span><select value={feedbackKind} onChange={(event) => setFeedbackKind(event.target.value as FeedbackKind)} disabled={busy} className={inputStyle}><option value="change">Change or update</option><option value="issue">Issue or error</option><option value="discrepancy">Evidence discrepancy</option></select></label><label className="grid gap-2"><span className="text-xs font-medium text-zinc-200">Output to review</span><select value={feedbackTarget} onChange={(event) => setFeedbackTarget(event.target.value)} disabled={busy} className={inputStyle} data-studio-feedback-target><option value="package">Whole package</option>{feedbackTargets.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label></div><label className="grid gap-2"><span className="text-xs font-medium text-zinc-200">What needs to change?</span><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} maxLength={12000} disabled={busy} placeholder="Example: US-02 assigns approval to the requester. The business rules specify a service manager must approve. Update the story, criteria, and related tests to match." className={`${inputStyle} resize-y leading-6`} data-studio-feedback-input /></label><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-zinc-500">Current revision remains available in the history after refinement.</p><Button type="button" onClick={() => void analyzePackage(true)} disabled={!canAnalyze || !feedback.trim()} data-studio-refine>{isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Apply feedback and create revision</Button></div></CardContent></Card>

          <Card className="bg-zinc-950/75"><CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Download your selected outputs</p><p className="mt-2 text-sm leading-6 text-zinc-300">{selectedOutputs.length} deliverable{selectedOutputs.length === 1 ? "" : "s"} · {selectedFormat.label} ({selectedFormat.extension}) · Revision {activeRevisionId}</p><p className="mt-1 text-xs leading-5 text-zinc-500">Adjust the deliverables and format in Desired outputs above.</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={() => void exportPackage("copy")} disabled={busy || !selectedOutputs.length}>{exportAction === "copy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCopy className="h-4 w-4" />}Copy Markdown</Button><Button type="button" onClick={() => void exportPackage("download")} disabled={busy || !selectedOutputs.length} data-studio-download>{exportAction === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download {selectedFormat.extension}</Button></div></CardContent></Card>
        </section> : null}
      </div>
    </main>
  );
}
