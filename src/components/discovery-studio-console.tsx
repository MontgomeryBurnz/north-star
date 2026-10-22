"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, BrainCircuit, ClipboardCopy, Download, FileText, History, Layers3, Loader2, MessageSquare, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import type { DiscoverySynthesis } from "@/lib/discovery-studio-types";
import { readDiscoveryEvidenceResponse, readDiscoveryStudioResponse } from "@/lib/discovery-studio-transport";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import { STUDIO_EXPORT_FORMATS, STUDIO_OUTPUT_OPTIONS, type StudioExportFormat, type StudioOutputId } from "@/lib/studio-export-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductPageHeader } from "@/components/product-page-header";
import { DiscoveryStudioPreferences } from "@/components/discovery-studio-preferences";
import { StudioBuildOutputs, StudioGapList, StudioQualityReview, StudioUnderstanding } from "@/components/discovery-studio-results";
import { sampleDiscoverySources, sampleDiscoverySynthesis, sampleProgram } from "@/data/sample-program";
import { StudioCollaborationWorkspace } from "@/components/studio-collaboration-workspace";
import type { StudioPackageView } from "@/lib/studio-collaboration-types";
import { createStudioGenerationConsent, hasStudioGenerationConsent, type StudioGenerationConsent } from "@/lib/studio-generation-consent";
import { StudioGenerationConfirmation } from "@/components/studio-generation-confirmation";
import { StudioPackageReview } from "@/components/studio-package-review";
import { StudioDeliveryPreview } from "@/components/studio-delivery-preview";
import { assessStudioDelivery } from "@/lib/studio-delivery-readiness";
import { useExplorerMode } from "@/components/explorer-mode";

type StudioView = "understanding" | "gaps" | "build";
type StudioRevision = { id: number; synthesis: DiscoverySynthesis; sources: ProgramArtifact[]; summary: string; createdAt: string };
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
  return { id: 1, synthesis: sampleDiscoverySynthesis, sources: sampleDiscoverySources, summary: "Prepared fictional discovery example", createdAt: sampleDiscoverySynthesis.generatedAt };
}

async function generateStudioPackage(requestSnapshot: string, onStatus: (message: string) => void): Promise<DiscoverySynthesis> {
  // Parse one serialized snapshot, never re-read editable state between phases.
  const requestPayload = JSON.parse(requestSnapshot) as Record<string, unknown>;
  if (!hasStudioGenerationConsent(requestPayload)) throw new Error("Confirm paid generation before starting an analysis.");
  const headers = { "content-type": "application/json", accept: "text/event-stream" };
  onStatus("Phase 1 of 2: Reviewing the discovery evidence and any requested public research…");
  const evidenceResponse = await fetch("/api/studio/discovery-synthesis", {
    method: "POST", headers,
    body: JSON.stringify({ ...requestPayload, phase: "evidence" })
  });
  // The opaque checkpoint exists only inside this operation. It is not a package
  // revision and must never be displayed, exported, persisted, or retried here.
  const checkpoint = await readDiscoveryEvidenceResponse(evidenceResponse, () => onStatus("Phase 1 of 2: Studio is still reviewing the evidence and research. Your current package is preserved…"));
  if (typeof checkpoint !== "string" || !checkpoint.trim() || checkpoint.length > 1_500_000) {
    throw new Error("Studio did not return a complete evidence checkpoint. Your current package is preserved.");
  }
  onStatus("Phase 2 of 2: Generating and checking the product outputs, acceptance criteria, and tests…");
  const response = await fetch("/api/studio/discovery-synthesis", {
    method: "POST", headers,
    body: JSON.stringify({ ...requestPayload, phase: "product", checkpoint })
  });
  return await readDiscoveryStudioResponse(response, () => onStatus("Phase 2 of 2: Studio is still checking the product outputs. Only a completed, checked package will create a revision…"));
}

export function DiscoveryStudioConsole({ initialSample = false, demoMode = false }: { initialSample?: boolean; demoMode?: boolean }) {
  const explorerMode = useExplorerMode();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const outputViewsRef = useRef<HTMLDivElement | null>(null);
  const feedbackPanelRef = useRef<HTMLDivElement | null>(null);
  const feedbackInputRef = useRef<HTMLTextAreaElement | null>(null);
  const analysisInFlightRef = useRef(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sources, setSources] = useState<ProgramArtifact[]>(initialSample ? sampleDiscoverySources : []);
  const [synthesis, setSynthesis] = useState<DiscoverySynthesis | null>(initialSample ? sampleDiscoverySynthesis : null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [refinementPrepared, setRefinementPrepared] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(initialSample ? sampleProgram.name : "Discovery workspace");
  const [status, setStatus] = useState(explorerMode ? "Prepared fictional outputs loaded. Explore the summary, evidence gaps, Delivery handoff, and sample downloads. Changes and paid generation are disabled." : initialSample ? "Fictional discovery package loaded. Explore the outputs or analyze the sources to create a new revision." : "Add discovery evidence and choose the outputs you need.");
  const [view, setView] = useState<StudioView>(initialSample ? "build" : "understanding");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [exportAction, setExportAction] = useState<"download" | "copy" | null>(null);
  const [isSampleWorkspace, setIsSampleWorkspace] = useState(initialSample);
  const [selectedOutputs, setSelectedOutputs] = useState<StudioOutputId[]>(allOutputIds);
  const [exportFormat, setExportFormat] = useState<StudioExportFormat>("docx");
  const [externalResearch, setExternalResearch] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<{ refine: boolean } | null>(null);
  const [researchTopic, setResearchTopic] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>("change");
  const [feedbackTarget, setFeedbackTarget] = useState("package");
  const [revisions, setRevisions] = useState<StudioRevision[]>(initialSample ? [initialRevision()] : []);
  const [activeRevisionId, setActiveRevisionId] = useState(initialSample ? 1 : 0);
  const [selectedRevisionId, setSelectedRevisionId] = useState(initialSample ? 1 : 0);
  const [workspaceView, setWorkspaceView] = useState<"package" | "collaboration">("package");
  const [isPreparedExample, setIsPreparedExample] = useState(initialSample);
  const [savingExample, setSavingExample] = useState(false);
  const [collaborationRefresh, setCollaborationRefresh] = useState(0);
  const readableSourceCount = sources.filter((artifact) => artifact.extractedText?.trim()).length;
  const blockingGapCount = synthesis?.gaps.filter((gap) => gap.severity === "blocking").length ?? 0;
  const activeRevision = revisions.find((revision) => revision.id === activeRevisionId);
  const outputSources = activeRevision?.sources ?? sources;
  const reviewCandidateCount = synthesis ? assessStudioDelivery(synthesis, outputSources, [], { preparedExample: isPreparedExample }).filter(item => item.category === "ready-for-review").length : 0;
  const selectedFormat = STUDIO_EXPORT_FORMATS.find((format) => format.id === exportFormat) ?? STUDIO_EXPORT_FORMATS[0];
  const busy = isAnalyzing || exportAction !== null || savingExample;
  const canAnalyze = !explorerMode && !busy && (pendingFiles.length > 0 || readableSourceCount > 0) && selectedOutputs.length > 0 && (!externalResearch || researchTopic.trim().length > 0);
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

  function requestAnalysis(refine = false) {
    if (explorerMode) return;
    if (busy || pendingAnalysis || !validateAnalysis(refine)) return;
    setPendingAnalysis({ refine });
  }

  function validateAnalysis(refine: boolean) {
    if (!selectedOutputs.length) { setStatus("Select at least one desired output before analysis."); return false; }
    if (externalResearch && !researchTopic.trim()) { setStatus("Enter a generic public reference topic to include external research."); return false; }
    if (!pendingFiles.length && !readableSourceCount) { setStatus("Add at least one readable discovery source before analysis."); return false; }
    if (sources.length + pendingFiles.length > 16) { setStatus("Use up to 16 discovery sources per analysis. Remove sources or split this package before continuing."); return false; }
    if (refine && (!synthesis || !feedback.trim())) { setStatus("Describe the issue, discrepancy, or change to create a revision."); return false; }
    return true;
  }

  async function analyzePackage(refine = false, paidGenerationConsent?: StudioGenerationConsent) {
    if (explorerMode) return;
    if (analysisInFlightRef.current || exportAction !== null) return;
    if (!hasStudioGenerationConsent({ paidGenerationConsent, externalResearch }) || !validateAnalysis(refine)) return;
    analysisInFlightRef.current = true;
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
      const requestSnapshot = JSON.stringify({ paidGenerationConsent, workspaceName: workspaceName.trim() || "Discovery workspace", artifacts: analysisSources, resolutionNotes, selectedOutputs, externalResearch, researchTopic: externalResearch ? researchTopic.trim() : "", ...(synthesis ? { previousSynthesis: synthesis } : {}), ...(synthesis?.collaboration ? { studioPackageId: synthesis.collaboration.packageId, studioParentRevisionId: synthesis.collaboration.revisionId } : {}), ...(refine ? { feedback: revisionFeedback } : {}) });
      const result = await generateStudioPackage(requestSnapshot, setStatus);
      const revisionId = result.collaboration ? (result.revision?.number ?? 1) : (revisions.at(-1)?.id ?? 0) + 1;
      if (!result.collaboration) result.revision = { number: revisionId, summary: result.revision?.summary || "Discovery synthesis generated", ...(refine ? { feedback: revisionFeedback } : {}) };
      const summary = result.revision?.summary || (refine ? revisionFeedback : resolutionNotes.trim() ? "Reanalyzed with additional context" : "Discovery synthesis generated");
      setRefinementPrepared(false);
      setSynthesis(result);
      setRevisions((current) => [...(result.collaboration && result.collaboration.packageId !== synthesis?.collaboration?.packageId ? [] : current.filter(item => item.id !== revisionId)), { id: revisionId, synthesis: result, sources: analysisSources, summary, createdAt: result.generatedAt }]);
      setActiveRevisionId(revisionId);
      setSelectedRevisionId(revisionId);
      setFeedback("");
      setFeedbackTarget("package");
      setIsPreparedExample(false);
      setCollaborationRefresh(current => current + 1);
      setView(result.gaps.some((gap) => gap.severity === "blocking") ? "gaps" : "build");
      setStatus(`Revision ${revisionId} generated from ${result.sourceCount} readable source${result.sourceCount === 1 ? "" : "s"}. ${result.provider === "openai" ? "OpenAI evidence review completed." : "Local draft requires review."} ${result.collaboration ? (result.collaboration.auditWarning ? "Full package saved; secondary audit reporting needs follow-up. Do not regenerate to recover it." : "Full package saved for review and delivery handoff; sharing and approval are separate.") : "This package is session-only. A named account is required for saved review and delivery handoff."}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Studio could not analyze the package.";
      setStatus(`${message}${synthesis && !/\bpreserved\b/i.test(message) ? " Your current revision is preserved." : ""}`);
    } finally { analysisInFlightRef.current = false; setIsAnalyzing(false); }
  }

  async function exportPackage(action: "download" | "copy") {
    if (analysisInFlightRef.current || exportAction !== null || !synthesis || !selectedOutputs.length) return;
    setExportAction(action);
    setStatus(action === "copy" ? "Preparing the selected outputs for copying…" : `Preparing your ${selectedFormat.label.toLowerCase()}…`);
    try {
      const format = action === "copy" ? "md" : exportFormat;
      const response = await fetch("/api/studio/export", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceName: workspaceName.trim() || "Discovery workspace", synthesis, format, outputs: selectedOutputs, ...(synthesis.collaboration ? { packageId: synthesis.collaboration.packageId, revisionId: synthesis.collaboration.revisionId } : {}) }) });
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
    setRefinementPrepared(false);
    setPendingFiles([]); setSources([]); setSynthesis(null); setResolutionNotes(""); setView("understanding"); setWorkspaceName("Discovery workspace"); setIsSampleWorkspace(false); setFeedback(""); setFeedbackTarget("package"); setRevisions([]); setActiveRevisionId(0); setSelectedRevisionId(0); setExternalResearch(false); setResearchTopic("");
    setStatus("Fresh workspace ready. Saved packages have not been deleted; find them in Delivery handoff.");
    setIsPreparedExample(false); setWorkspaceView("package");
    if (inputRef.current) inputRef.current.value = "";
  }

  function loadSampleWorkspace() {
    setRefinementPrepared(false);
    setPendingFiles([]); setSources(sampleDiscoverySources); setSynthesis(sampleDiscoverySynthesis); setResolutionNotes(""); setView("build"); setWorkspaceName(sampleProgram.name); setIsSampleWorkspace(true); setFeedback(""); setFeedbackTarget("package"); setRevisions([initialRevision()]); setActiveRevisionId(1); setSelectedRevisionId(1); setExternalResearch(false); setResearchTopic("");
    setStatus("Fictional discovery package loaded. Explore the outputs or analyze the sources to create a new revision.");
    setIsPreparedExample(true); setWorkspaceView("package");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function restoreRevision() {
    const revision = revisions.find((item) => item.id === selectedRevisionId);
    if (!revision) return;
    setRefinementPrepared(false);
    if (revision.synthesis.collaboration) {
      setSavingExample(true);
      try {
        const locator = revision.synthesis.collaboration;
        const response = await fetch(`/api/studio/packages/${encodeURIComponent(locator.packageId)}?revisionId=${encodeURIComponent(locator.revisionId)}`, { cache: "no-store" });
        const payload = await response.json() as { package?: StudioPackageView; error?: string };
        if (!response.ok || !payload.package) throw new Error(payload.error || "The saved revision is unavailable.");
        openSavedRevision(payload.package);
      } catch (error) { setStatus(error instanceof Error ? error.message : "The saved revision could not be opened."); }
      finally { setSavingExample(false); }
      return;
    }
    setSynthesis(revision.synthesis); setActiveRevisionId(revision.id); setFeedbackTarget("package");
    setSources(revision.sources); setPendingFiles([]);
    setExternalResearch(false);
    setIsPreparedExample(revision.synthesis === sampleDiscoverySynthesis);
    setStatus(`Revision ${revision.id} opened. Saved history remains available in Delivery handoff. Open the latest saved revision before regenerating.`);
  }

  function openSavedRevision(saved: StudioPackageView) {
    if (!saved.canManage) return;
    setRefinementPrepared(false);
    const revision = saved.revision;
    const result = { ...revision.synthesis, collaboration: { packageId: saved.id, revisionId: revision.id, version: saved.version } };
    setSynthesis(result); setSources(revision.sources); setPendingFiles([]); setResolutionNotes(revision.resolutionNotes);
    setWorkspaceName(revision.title); setSelectedOutputs(revision.selectedOutputs); setExternalResearch(false); setResearchTopic(revision.researchTopic);
    setRevisions([{ id: revision.number, synthesis: result, sources: revision.sources, summary: result.revision?.summary || "Saved package revision", createdAt: revision.createdAt }]);
    setActiveRevisionId(revision.number); setSelectedRevisionId(revision.number); setFeedback(""); setFeedbackTarget("package");
    setIsPreparedExample(revision.provenance === "prepared-example"); setIsSampleWorkspace(revision.sources.some(source => source.id.startsWith("sample-")));
    setWorkspaceView("package"); setView("build");
    setStatus(`Saved Revision ${revision.number} opened with its original evidence and outputs. External references are off for the next analysis; prior research remains in the saved output. Original Office binaries are not stored by Studio.`);
  }

  function stageCollaborationRefinement(saved: StudioPackageView, storyId: string, notes: string) {
    if (!saved.canManage || saved.revision.id !== saved.headRevisionId || !notes.trim()) return;
    openSavedRevision(saved);
    setFeedbackTarget(storyId); setFeedbackKind("change"); setFeedback(notes);
    setRefinementPrepared(true);
    setStatus(`Refinement prepared for ${storyId}. No AI call or saved changes yet. Confirm the evidence before separately authorizing a paid revision.`);
    requestAnimationFrame(() => {
      feedbackPanelRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
      feedbackInputRef.current?.focus({ preventScroll: true });
    });
  }

  function returnToDeliveryHandoff() {
    setWorkspaceView("collaboration");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
  }

  async function savePreparedExample() {
    if (busy) return;
    setSavingExample(true);
    try {
      const response = await fetch("/api/studio/packages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create-example" }) });
      const payload = await response.json() as { package?: StudioPackageView; error?: string };
      if (!response.ok || !payload.package) throw new Error(payload.error || "The prepared example could not be saved.");
      openSavedRevision(payload.package); setCollaborationRefresh(current => current + 1); setWorkspaceView("collaboration");
      setStatus("Prepared fictional example saved. This is not a new AI generation; comments, assignments and sharing are now persisted.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "The prepared example could not be saved."); }
    finally { setSavingExample(false); }
  }

  function removeSource(sourceId: string) {
    setSources((current) => current.filter((source) => source.id !== sourceId));
    setStatus("Source removed from the next analysis. Re-analyze to update the outputs; existing revisions remain available.");
  }

  return (
    <main className="northstar-shell py-8 sm:py-10" data-discovery-studio data-studio-agnostic>
      {pendingAnalysis ? <StudioGenerationConfirmation externalResearch={externalResearch} refining={pendingAnalysis.refine} sourceCount={sources.length + pendingFiles.length} outputCount={selectedOutputs.length} onCancel={() => setPendingAnalysis(null)} onConfirm={() => { const refine = pendingAnalysis.refine; setPendingAnalysis(null); void analyzePackage(refine, createStudioGenerationConsent(externalResearch)); }} /> : null}
      <div className="grid min-w-0 grid-cols-1 gap-6">
        <ProductPageHeader eyebrow="Studio" title="Turn discovery into the product outputs you need." description="Choose your deliverables, review the evidence, and refine with feedback. Export editable Word, Excel, or PowerPoint files." />
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4" aria-label="Studio workspace views">
          <Button type="button" variant={workspaceView === "package" ? "default" : "outline"} onClick={() => setWorkspaceView("package")} disabled={busy} aria-pressed={workspaceView === "package"}>Full output package</Button>
          <Button type="button" variant={workspaceView === "collaboration" ? "default" : "outline"} onClick={() => setWorkspaceView("collaboration")} disabled={busy} aria-pressed={workspaceView === "collaboration"}>Delivery handoff</Button>
          {synthesis?.collaboration ? <span className="text-xs text-emerald-200">Saved revision · private until explicitly shared</span> : <span className="text-xs text-zinc-500">No active program required</span>}
        </div>
        {workspaceView === "collaboration" ? <>
          <p className="text-sm leading-6 text-zinc-400" role="status">{status}</p>
          {demoMode ? <><p className="text-sm leading-6 text-cyan-100">Sample preview only. Saved reviews and explicit sharing require your normal signed-in workspace; this does not generate or send anything.</p>{synthesis ? <StudioDeliveryPreview synthesis={synthesis} sources={outputSources} preparedExample={isPreparedExample} disabled={busy} /> : null}</> : <>
            {isPreparedExample && !synthesis?.collaboration ? <Button type="button" variant="outline" className="w-fit" onClick={() => void savePreparedExample()} disabled={busy}>{savingExample ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Save prepared example for review</Button> : null}
            <StudioCollaborationWorkspace packageId={synthesis?.collaboration?.packageId} refreshKey={collaborationRefresh} disabled={busy} onOpenRevision={openSavedRevision} onRefine={stageCollaborationRefinement} sessionPreview={synthesis && !synthesis.collaboration ? { synthesis, sources: outputSources, title: workspaceName, preparedExample: isPreparedExample } : undefined} />
          </>}
        </> : <>
        {isSampleWorkspace ? <div className="flex flex-col gap-3 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.055] p-4 sm:flex-row sm:items-center sm:justify-between" data-studio-sample><div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" /><div><p className="text-sm font-medium text-cyan-100">Regional Service Request Modernization · Fictional discovery evidence</p><p className="mt-1 text-xs leading-5 text-zinc-400">{explorerMode ? "Explore this prepared fictional package, including summary, gaps, delivery previews, and editable sample downloads. Uploads, changes, and paid generation are disabled." : "Explore the same program evidence used throughout North Star. Use the prepared outputs without generating, or save the example to track review and approval."}</p></div></div><Button type="button" variant="outline" size="sm" onClick={clearWorkspace} disabled={busy} className="border-cyan-300/20 text-cyan-100">Use my own sources</Button></div> : null}

        <Card className="overflow-hidden bg-zinc-950/80"><CardContent className="grid gap-5 p-4 sm:p-5"><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"><label className="grid gap-2"><span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Workspace title</span><input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} maxLength={120} disabled={busy} placeholder="Name this discovery package" className={inputStyle} data-studio-workspace-name /><span className="text-sm leading-6 text-zinc-400">Use Studio with or without an active program. Signed-in generation saves complete package revisions. Extracted evidence stays internal; raw files are not retained.</span></label><div className="flex flex-wrap gap-2">{!sources.length && !pendingFiles.length && !synthesis ? <Button type="button" variant="outline" onClick={loadSampleWorkspace} disabled={busy} data-studio-load-sample><Sparkles className="h-4 w-4" />Try example evidence</Button> : null}<Button type="button" variant="outline" onClick={clearWorkspace} disabled={busy || (!sources.length && !pendingFiles.length && !synthesis)} data-studio-clear><RotateCcw className="h-4 w-4" />Start fresh</Button></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Discovery sources" value={String(sources.length + pendingFiles.length)} /><Metric label="Completeness estimate" value={synthesis ? `${synthesis.readinessScore}%` : "—"} /><Metric label="Blocking gaps" value={synthesis ? String(blockingGapCount) : "—"} /><Metric label="Generated review candidates" value={synthesis ? String(reviewCandidateCount) : "—"} /></div></CardContent></Card>

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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/80 p-4"><p className="max-w-4xl text-sm leading-6 text-zinc-300" role="status" aria-live="polite" data-studio-status>{status}</p><Button type="button" onClick={() => requestAnalysis()} disabled={!canAnalyze} data-studio-analyze>{isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}{synthesis ? "Re-analyze package" : "Analyze discovery package"}</Button></div>

        {synthesis ? <section className="grid min-w-0 grid-cols-1 gap-5" aria-label="Studio results">
          {pendingFiles.length || sources !== outputSources ? <p className="rounded-md border border-amber-300/20 p-3 text-xs leading-5 text-amber-100">Source edits are staged for the next analysis. The review below describes the unchanged output revision and its original evidence.</p> : null}
          <StudioPackageReview synthesis={synthesis} sources={outputSources} isExample={isPreparedExample} onGaps={() => { setView("gaps"); requestAnimationFrame(() => outputViewsRef.current?.scrollIntoView({ block: "start" })); }} onHandoff={() => { setWorkspaceView("collaboration"); requestAnimationFrame(() => window.scrollTo({ top: 0 })); }} />
          <StudioQualityReview synthesis={synthesis} isExample={isPreparedExample} />
          <Card className="bg-zinc-950/75"><CardContent className="grid gap-4 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100"><History className="h-4 w-4" />Revision {activeRevisionId}</p><p className="mt-2 text-sm leading-6 text-zinc-300" data-studio-revision-summary>{activeRevision?.summary}</p></div><div className="flex flex-wrap items-end gap-2"><label className="grid gap-1"><span className="text-xs text-zinc-400">Revision history</span><select value={selectedRevisionId} onChange={(event) => setSelectedRevisionId(Number(event.target.value))} disabled={busy} className={`${inputStyle} max-w-[280px]`} data-studio-revision-history>{revisions.map((revision) => <option key={revision.id} value={revision.id}>Revision {revision.id}{revision.id === activeRevisionId ? " · Current" : ""} · {revision.summary.slice(0, 60)}</option>)}</select></label><Button type="button" variant="outline" onClick={restoreRevision} disabled={busy || selectedRevisionId === activeRevisionId} data-studio-restore-revision><RotateCcw className="h-4 w-4" />Restore</Button></div></div><p className="text-xs leading-5 text-zinc-500">Session revisions appear here. Saved revision history remains in Delivery handoff, even after Start fresh.</p></CardContent></Card>
          <div className="flex flex-wrap gap-2" ref={outputViewsRef} aria-label="Studio output views">{([["understanding", "3 · Understanding", BrainCircuit], ["gaps", `4 · Gaps${blockingGapCount ? ` (${blockingGapCount})` : ""}`, AlertTriangle], ["build", "5 · Build package", Layers3]] as const).map(([id, label, Icon]) => <Button key={id} type="button" variant={view === id ? "default" : "outline"} onClick={() => setView(id)} aria-pressed={view === id}><Icon className="h-4 w-4" />{label}</Button>)}</div>
          {view === "understanding" ? <StudioUnderstanding synthesis={synthesis} /> : null}
          {view === "gaps" ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]"><StudioGapList synthesis={synthesis} sources={sources} /><Card className="h-fit bg-zinc-950/75"><CardHeader className="border-b border-white/10"><CardTitle className="text-zinc-50">Add missing context</CardTitle><p className="mt-2 text-sm leading-6 text-zinc-400">Answer the open questions, document decisions, or summarize newly confirmed information. Studio will review the updated evidence in a new revision.</p></CardHeader><CardContent className="grid gap-3 p-4"><label className="grid gap-2"><span className="sr-only">Missing discovery context</span><textarea value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} disabled={busy} rows={8} maxLength={24000} placeholder="Example: The first release serves regional service managers. Offline access is out of scope. Approval must be completed by a compliance administrator…" className={`${inputStyle} resize-y leading-6`} /></label><Button type="button" onClick={() => requestAnalysis()} disabled={!canAnalyze || !resolutionNotes.trim()}>{isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Apply context and regenerate</Button></CardContent></Card></div> : null}
          {view === "build" ? <div className="grid gap-5"><Card className="bg-zinc-950/75"><CardContent className="grid gap-3 p-5"><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Model completeness estimate · {synthesis.readinessScore}%</p><p className="text-sm leading-6 text-zinc-300">{synthesis.readinessNarrative}</p></CardContent></Card><StudioBuildOutputs synthesis={synthesis} sources={sources} selectedOutputs={selectedOutputs} /></div> : null}

          <Card ref={feedbackPanelRef} className="scroll-mt-24 bg-zinc-950/75" data-studio-feedback><CardHeader className="border-b border-white/10"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-cyan-200" /><CardTitle className="text-zinc-50">Review and refine the outputs</CardTitle></div><p className="mt-2 text-sm leading-6 text-zinc-400">Flag an issue, explain a discrepancy, or request an update. Include the source or rule that supports your correction. Studio reviews your feedback with the existing package and creates a new revision.</p>{refinementPrepared ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-300/20 bg-emerald-300/[0.04] p-3" data-studio-refinement-prepared><p role="status" className="text-xs leading-6 text-emerald-100">Refinement prepared for {feedbackTarget}. No AI call or saved changes yet. The original package and approval state are unchanged. Applying feedback is a separate paid action that requires confirmation.</p><Button type="button" variant="outline" size="sm" onClick={returnToDeliveryHandoff}>Back to Delivery handoff</Button></div> : null}</CardHeader><CardContent className="grid gap-4 p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]"><label className="grid gap-2"><span className="text-xs font-medium text-zinc-200">Feedback type</span><select value={feedbackKind} onChange={(event) => setFeedbackKind(event.target.value as FeedbackKind)} disabled={busy} className={inputStyle}><option value="change">Change or update</option><option value="issue">Issue or error</option><option value="discrepancy">Evidence discrepancy</option></select></label><label className="grid gap-2"><span className="text-xs font-medium text-zinc-200">Output to review</span><select value={feedbackTarget} onChange={(event) => setFeedbackTarget(event.target.value)} disabled={busy} className={inputStyle} data-studio-feedback-target><option value="package">Whole package</option>{feedbackTargets.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label></div><label className="grid gap-2"><span className="text-xs font-medium text-zinc-200">What needs to change?</span><textarea ref={feedbackInputRef} value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} maxLength={12000} disabled={busy} placeholder="Example: US-02 assigns approval to the requester. The business rules specify a service manager must approve. Update the story, criteria, and related tests to match." className={`${inputStyle} resize-y leading-6`} data-studio-feedback-input /></label><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-zinc-500">Current revision remains available in the history after refinement.</p><Button type="button" onClick={() => requestAnalysis(true)} disabled={!canAnalyze || !feedback.trim()} data-studio-refine>{isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Apply feedback and create revision</Button></div></CardContent></Card>

          <Card className="bg-zinc-950/75"><CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Download your selected outputs</p><p className="mt-2 text-sm leading-6 text-zinc-300">{selectedOutputs.length} deliverable{selectedOutputs.length === 1 ? "" : "s"} · {selectedFormat.label} ({selectedFormat.extension}) · Revision {activeRevisionId}</p><p className="mt-1 text-xs leading-5 text-zinc-500">Adjust the deliverables and format in Desired outputs above.</p></div><div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" onClick={() => void exportPackage("copy")} disabled={busy || !selectedOutputs.length}>{exportAction === "copy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCopy className="h-4 w-4" />}Copy Markdown</Button><Button type="button" onClick={() => void exportPackage("download")} disabled={busy || !selectedOutputs.length} data-studio-download>{exportAction === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download {selectedFormat.extension}</Button></div></CardContent></Card>
        </section> : null}
        </>}
      </div>
    </main>
  );
}
