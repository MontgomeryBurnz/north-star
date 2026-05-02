"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
  FileText,
  GitBranch,
  History,
  Loader2,
  Map,
  Sparkles
} from "lucide-react";
import {
  getRoleArtifactDefinition,
  roleArtifactDefinitions,
  type RoleArtifactDefinition,
  type RoleArtifactDraft,
  type RoleArtifactType
} from "@/lib/role-artifact-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function ArtifactIcon({ type }: { type: RoleArtifactType }) {
  if (type === "ba-requirements-matrix") return <ClipboardList className="h-4 w-4 text-cyan-200" />;
  if (type.startsWith("product-")) return <GitBranch className="h-4 w-4 text-emerald-200" />;
  if (type.startsWith("ux-")) return <Map className="h-4 w-4 text-amber-200" />;
  return <FileText className="h-4 w-4 text-cyan-200" />;
}

function serializeArtifact(artifact: RoleArtifactDraft) {
  const tableText = artifact.tables
    .map((table) => {
      const rows = table.rows.map((row) => row.join(" | ")).join("\n");
      return `${table.title}\n${table.columns.join(" | ")}\n${rows}`;
    })
    .join("\n\n");
  const sectionText = artifact.sections
    .map((section) => `${section.title}\n${section.items.map((item) => `- ${item}`).join("\n")}`)
    .join("\n\n");

  return `${artifact.title}\n${artifact.summary}\n\n${tableText}\n\n${sectionText}`.trim();
}

function artifactFilenameBase(artifact: RoleArtifactDraft) {
  return `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "north-star-artifact"}-v${
    artifact.version ?? "draft"
  }`;
}

function csvCell(value: string | undefined) {
  const normalized = (value ?? "").replace(/\r?\n/g, " ").trim();
  return /[",\n]/.test(normalized) ? `"${normalized.replace(/"/g, "\"\"")}"` : normalized;
}

function serializeArtifactCsv(artifact: RoleArtifactDraft) {
  const metadata = [
    ["Artifact", artifact.title],
    ["Role", artifact.role],
    ["Version", artifact.version ? `v${artifact.version}` : "Draft"],
    ["Generated", formatDate(artifact.generatedAt)]
  ];
  const tableText = artifact.tables
    .map((table) => [
      [table.title],
      table.columns,
      ...table.rows.map((row) => table.columns.map((_, index) => row[index] ?? ""))
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\n"))
    .join("\n\n");

  return [metadata.map((row) => row.map(csvCell).join(",")).join("\n"), "", tableText].join("\n");
}

function escapeXml(value: string | undefined) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function docParagraph(value: string, variant: "title" | "heading" | "body" = "body") {
  const properties =
    variant === "title"
      ? "<w:rPr><w:b/><w:sz w:val=\"36\"/></w:rPr>"
      : variant === "heading"
        ? "<w:rPr><w:b/><w:sz w:val=\"26\"/></w:rPr>"
        : "";

  return `<w:p><w:r>${properties}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`;
}

function docTable(table: RoleArtifactDraft["tables"][number]) {
  const rows = [table.columns, ...table.rows]
    .map((row) => `<w:tr>${table.columns
      .map((_, index) => `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${docParagraph(row[index] ?? "")}</w:tc>`)
      .join("")}</w:tr>`)
    .join("");

  return `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="4ade80"/><w:left w:val="single" w:sz="4" w:color="4ade80"/><w:bottom w:val="single" w:sz="4" w:color="4ade80"/><w:right w:val="single" w:sz="4" w:color="4ade80"/><w:insideH w:val="single" w:sz="4" w:color="4ade80"/><w:insideV w:val="single" w:sz="4" w:color="4ade80"/></w:tblBorders></w:tblPr>${rows}</w:tbl>`;
}

async function buildDocxBlob(artifact: RoleArtifactDraft) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const sections = artifact.sections
    .map((section) => [
      docParagraph(section.title, "heading"),
      ...section.items.map((item) => docParagraph(`- ${item}`))
    ].join(""))
    .join("");
  const tables = artifact.tables
    .map((table) => `${docParagraph(table.title, "heading")}${docTable(table)}`)
    .join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${docParagraph(artifact.title, "title")}${docParagraph(artifact.summary)}${docParagraph(`Role: ${artifact.role}`)}${docParagraph(`Generated: ${formatDate(artifact.generatedAt)}`)}${tables}${docParagraph("Supporting guidance", "heading")}${sections}${docParagraph("Source grounding", "heading")}${docParagraph(artifact.sourceSummary)}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels")?.file(".rels", relationships);
  zip.folder("word")?.file("document.xml", documentXml);

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function ArtifactCatalogSelect({
  definitions,
  onSelect,
  selectedType
}: {
  definitions: RoleArtifactDefinition[];
  onSelect: (type: RoleArtifactType) => void;
  selectedType: RoleArtifactType;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Artifact type</span>
      <span className="relative block">
        <select
          data-studio-artifact-type-select
          value={selectedType}
          onChange={(event) => onSelect(event.target.value)}
          className="h-12 w-full appearance-none rounded-md border border-white/10 bg-zinc-950 px-3 pr-10 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
        >
          {definitions.map((definition) => (
            <option key={definition.type} value={definition.type}>
              {definition.shortTitle} - {definition.outputLabel}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </span>
    </label>
  );
}

function summarizeCell(value: string | undefined, maxLength = 150) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const wordBreak = normalized.lastIndexOf(" ", maxLength);
  return `${normalized.slice(0, wordBreak > 80 ? wordBreak : maxLength).trim()}...`;
}

function artifactVersionLabel(artifact: RoleArtifactDraft) {
  return `Version ${artifact.version ?? "draft"} / ${formatDate(artifact.generatedAt)}`;
}

function ArtifactDetailTable({ table }: { table: RoleArtifactDraft["tables"][number] }) {
  return (
    <details className="rounded-md border border-white/10 bg-black/20">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-3 py-3">
        <span>
          <span className="block text-sm font-semibold text-zinc-100">{table.title}</span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">Full structured detail for export, review, and iteration.</span>
        </span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
          {table.rows.length} rows
        </span>
      </summary>
      <div className="overflow-x-auto border-t border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-black/25">
            <tr>
              {table.columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.title}-${rowIndex}`}>
                {table.columns.map((column, columnIndex) => (
                  <td key={`${column}-${columnIndex}`} className="min-w-48 px-3 py-3 align-top text-zinc-300">
                    {row[columnIndex] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ArtifactOutput({ artifact }: { artifact: RoleArtifactDraft }) {
  const totalRows = artifact.tables.reduce((total, table) => total + table.rows.length, 0);

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.045] p-4 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">Generated work product</p>
            <p className="mt-2 text-base font-semibold text-zinc-100">{artifact.title}</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-300">{artifact.summary}</p>
          </div>
          <div className="flex flex-wrap content-start gap-2 xl:justify-end">
            {[
              artifact.version ? `v${artifact.version}` : "Draft",
              `${totalRows} items`,
              artifact.provider === "openai" ? "Generated" : "Starter"
            ].map((label) => (
              <span key={label} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-zinc-300">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
          <span>
            <span className="block text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">Inputs behind this artifact</span>
            <span className="mt-1 block text-xs leading-5 text-zinc-500">
              Open to see which program signals grounded this output.
            </span>
          </span>
          <span className="rounded-full border border-cyan-200/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-cyan-100">
            View
          </span>
        </summary>
        <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-zinc-300">{artifact.sourceSummary}</p>
      </details>

      <section className="grid gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Generated artifact detail</p>
          <p className="mt-1 text-sm text-zinc-400">Open the structured table only when you need to review or export the full detail.</p>
        </div>
        {artifact.tables.map((table) => (
          <ArtifactDetailTable key={table.title} table={table} />
        ))}
      </section>
    </div>
  );
}

export type RoleArtifactStudioRequest = {
  artifactType: RoleArtifactType;
  definition: RoleArtifactDefinition;
  feedback?: string;
  generationBrief?: string;
  sourceLabel?: string;
};

function normalizeRole(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function matchesRoleFocus(definition: RoleArtifactDefinition, roleFocus: string | undefined) {
  const role = normalizeRole(roleFocus);
  if (!role) return true;
  const definitionRole = normalizeRole(definition.role);

  return definitionRole === role || definitionRole.includes(role) || role.includes(definitionRole);
}

function getDefaultDefinition(roleFocus: string | undefined) {
  return roleArtifactDefinitions.find((definition) => matchesRoleFocus(definition, roleFocus)) ?? roleArtifactDefinitions[0];
}

export function RoleArtifactStudioCard({
  launchRequest,
  programId,
  roleFocus
}: {
  launchRequest?: RoleArtifactStudioRequest | null;
  programId: string;
  roleFocus?: string;
}) {
  const defaultDefinition = useMemo(() => getDefaultDefinition(roleFocus), [roleFocus]);
  const [selectedType, setSelectedType] = useState<RoleArtifactType>(defaultDefinition.type);
  const [customDefinition, setCustomDefinition] = useState<RoleArtifactDefinition | null>(null);
  const [feedback, setFeedback] = useState("");
  const [artifact, setArtifact] = useState<RoleArtifactDraft | null>(null);
  const [artifactHistory, setArtifactHistory] = useState<RoleArtifactDraft[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const availableDefinitions = useMemo(
    () => roleArtifactDefinitions.filter((definition) => matchesRoleFocus(definition, roleFocus)),
    [roleFocus]
  );
  const selectedDefinition = useMemo(
    () => getRoleArtifactDefinition(selectedType, customDefinition ?? defaultDefinition),
    [customDefinition, defaultDefinition, selectedType]
  );

  useEffect(() => {
    setSelectedType(defaultDefinition.type);
    setCustomDefinition(null);
    setArtifact(null);
    setArtifactHistory([]);
    setStatus(null);
  }, [defaultDefinition.type, roleFocus]);

  useEffect(() => {
    if (launchRequest) {
      setSelectedType(launchRequest.artifactType);
      setCustomDefinition(launchRequest.definition);
      setFeedback(launchRequest.feedback ?? launchRequest.generationBrief ?? "");
      setStatus(launchRequest.sourceLabel ? `${launchRequest.sourceLabel} loaded into Artifact Studio.` : "Artifact brief loaded into the studio.");
      return;
    }

    if (!customDefinition && !availableDefinitions.some((definition) => definition.type === selectedType)) {
      setSelectedType(defaultDefinition.type);
    }
  }, [availableDefinitions, customDefinition, defaultDefinition.type, launchRequest, selectedType]);

  useEffect(() => {
    let isCancelled = false;

    async function loadArtifactHistory() {
      setIsLoadingHistory(true);
      setStatus(null);

      try {
        const response = await fetch(`/api/programs/${programId}/role-artifacts?artifactType=${selectedType}`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error("history");
        }

        const payload = (await response.json()) as { artifacts: RoleArtifactDraft[] };
        if (isCancelled) return;

        setArtifactHistory(payload.artifacts);
        setArtifact(payload.artifacts[0] ?? null);
      } catch {
        if (!isCancelled) {
          setArtifactHistory([]);
          setArtifact(null);
          setStatus("Could not load saved artifact history.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadArtifactHistory();

    return () => {
      isCancelled = true;
    };
  }, [programId, selectedType]);

  function selectArtifactType(type: RoleArtifactType) {
    setSelectedType(type);
    setCustomDefinition(null);
    setArtifact(null);
    setStatus(null);
  }

  async function generateArtifact() {
    setIsGenerating(true);
    setStatus(`Generating ${selectedDefinition.shortTitle.toLowerCase()} for ${selectedDefinition.role}...`);

    try {
      const response = await fetch(`/api/programs/${programId}/role-artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactDefinition: selectedDefinition,
          artifactType: selectedType,
          feedback
        })
      });

      if (!response.ok) {
        throw new Error("generate");
      }

      const payload = (await response.json()) as { artifact: RoleArtifactDraft; history?: RoleArtifactDraft[] };
      setArtifact(payload.artifact);
      setArtifactHistory(payload.history ?? [payload.artifact, ...artifactHistory]);
      setStatus(`${payload.artifact.title} saved as version ${payload.artifact.version ?? artifactHistory.length + 1}.`);
    } catch {
      setStatus("Could not generate this role artifact.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyArtifact() {
    if (!artifact) return;

    try {
      await navigator.clipboard.writeText(serializeArtifact(artifact));
      setStatus("Artifact copied to clipboard.");
    } catch {
      setStatus("Could not copy the artifact from this browser.");
    }
  }

  async function downloadDocxArtifact() {
    if (!artifact) return;

    try {
      const blob = await buildDocxBlob(artifact);
      downloadBlob(blob, `${artifactFilenameBase(artifact)}.docx`);
      setStatus("DOCX export downloaded.");
    } catch {
      setStatus("Could not create the DOCX export in this browser.");
    }
  }

  function downloadCsvArtifact() {
    if (!artifact) return;

    const blob = new Blob([serializeArtifactCsv(artifact)], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `${artifactFilenameBase(artifact)}.csv`);
    setStatus("CSV export downloaded.");
  }

  return (
    <Card className="bg-zinc-950/75">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Workbench</p>
            <CardTitle className="text-zinc-50">{selectedDefinition.shortTitle}</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Generate, refine, compare, and export a role-ready artifact without leaving the selected program context.
            </p>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-emerald-100">
            {selectedDefinition.role}
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 sm:p-5">
        <div className="grid gap-4 rounded-lg border border-white/10 bg-white/[0.025] p-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <ArtifactCatalogSelect
            definitions={availableDefinitions.length ? availableDefinitions : roleArtifactDefinitions}
            selectedType={selectedType}
            onSelect={selectArtifactType}
          />
          <div className="rounded-md border border-emerald-300/15 bg-emerald-300/[0.045] p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-200">Role catalog</p>
            <p className="mt-1 text-sm leading-6 text-zinc-300">
              {(availableDefinitions.length ? availableDefinitions : roleArtifactDefinitions).length} reusable artifact types for this role lens.
            </p>
          </div>
        </div>

        <div className="grid gap-4 rounded-lg border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid content-start gap-4">
              <div className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <ArtifactIcon type={selectedDefinition.type} />
                  {selectedDefinition.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-400">{selectedDefinition.description}</p>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Artifact brief</span>
                <textarea
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  rows={5}
                  placeholder="Optional: tell North Star what to emphasize, correct, simplify, or make more detailed."
                  className="min-h-36 resize-y rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void generateArtifact()} disabled={isGenerating} data-studio-generate-artifact>
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {artifact ? "Regenerate artifact" : "Generate artifact"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void copyArtifact()} disabled={!artifact} data-studio-copy-output>
                  <Copy className="h-4 w-4" />
                  Copy output
                </Button>
                <Button type="button" variant="outline" onClick={() => void downloadDocxArtifact()} disabled={!artifact} data-studio-export-docx>
                  <Download className="h-4 w-4" />
                  Export DOCX
                </Button>
                <Button type="button" variant="outline" onClick={downloadCsvArtifact} disabled={!artifact} data-studio-export-csv>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
              {artifact?.iterationPrompts.length ? (
                <div className="grid gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Useful next iterations</p>
                  <div className="flex flex-wrap gap-2">
                    {artifact.iterationPrompts.map((prompt) => (
                      <button
                        type="button"
                        key={prompt}
                        onClick={() => setFeedback(prompt)}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-emerald-300/30 hover:text-emerald-100"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
            </div>

            <div className="grid content-start gap-2 rounded-md border border-white/10 bg-zinc-950/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                  <History className="h-4 w-4 text-cyan-100" />
                  Versions
                </p>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  {artifactHistory.length}
                </span>
              </div>
              {isLoadingHistory ? (
                <p className="text-sm leading-6 text-zinc-500">Loading saved outputs...</p>
              ) : artifactHistory.length ? (
                <div className="grid gap-2">
                  {artifactHistory.slice(0, 5).map((savedArtifact) => (
                    <button
                      key={savedArtifact.id}
                      type="button"
                      onClick={() => setArtifact(savedArtifact)}
                      className={`rounded-md border px-3 py-2 text-left transition-colors ${
                        artifact?.id === savedArtifact.id
                          ? "border-emerald-300/30 bg-emerald-300/[0.07]"
                          : "border-white/10 bg-white/[0.025] hover:border-white/20"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-zinc-100">Version {savedArtifact.version ?? "draft"}</span>
                        <span className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                          {savedArtifact.provider === "openai" ? "Generated" : "Starter"}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">{formatDate(savedArtifact.generatedAt)}</span>
                    </button>
                  ))}
                  {artifactHistory.length > 1 ? (
                    <details className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
                      <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-[0.14em] text-cyan-100">
                        Compare latest versions
                      </summary>
                      <div className="mt-3 grid gap-3 border-t border-white/10 pt-3">
                        {artifactHistory.slice(0, 2).map((savedArtifact) => (
                          <div key={`${savedArtifact.id}-compare`} className="grid gap-1">
                            <p className="text-xs font-semibold text-zinc-100">{artifactVersionLabel(savedArtifact)}</p>
                            <p className="text-xs leading-5 text-zinc-400">{summarizeCell(savedArtifact.summary, 180)}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-6 text-zinc-500">No saved outputs yet for this artifact.</p>
              )}
            </div>
          </div>

          <div className="min-h-72 rounded-lg border border-white/10 bg-zinc-950/75 p-4 sm:p-5" data-studio-artifact-output>
            {artifact ? (
              <ArtifactOutput artifact={artifact} />
            ) : (
              <div className="grid h-full place-items-center rounded-md border border-dashed border-white/10 p-6 text-center">
                <div>
                  <Sparkles className="mx-auto h-6 w-6 text-emerald-200" />
                  <p className="mt-3 text-sm font-semibold text-zinc-100">Generate a role-ready output</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                    Choose an artifact, add optional direction, and create a working draft your team can refine.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
