"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  Copy,
  Download,
  FileText,
  GitBranch,
  History,
  Loader2,
  Map,
  Sparkles,
  WandSparkles
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

function ArtifactDefinitionButton({
  definition,
  isSelected,
  onSelect
}: {
  definition: RoleArtifactDefinition;
  isSelected: boolean;
  onSelect: (type: RoleArtifactType) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(definition.type)}
      className={`flex min-h-20 w-full min-w-[230px] items-start justify-between gap-3 rounded-md border px-3 py-3 text-left transition-colors sm:w-auto ${
        isSelected
          ? "border-emerald-300/40 bg-emerald-300/[0.08] text-zinc-50 shadow-[0_0_24px_rgba(52,211,153,0.08)]"
          : "border-white/10 bg-white/[0.035] text-zinc-300 hover:border-white/20 hover:bg-white/[0.055]"
      }`}
    >
      <span>
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <ArtifactIcon type={definition.type} />
          {definition.shortTitle}
        </span>
        <span className="mt-1 block text-xs text-zinc-500">{definition.role}</span>
      </span>
      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
        {definition.outputLabel}
      </span>
    </button>
  );
}

function summarizeCell(value: string | undefined, maxLength = 150) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const wordBreak = normalized.lastIndexOf(" ", maxLength);
  return `${normalized.slice(0, wordBreak > 80 ? wordBreak : maxLength).trim()}...`;
}

function columnSafeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function artifactVersionLabel(artifact: RoleArtifactDraft) {
  return `Version ${artifact.version ?? "draft"} / ${formatDate(artifact.generatedAt)}`;
}

function ArtifactTableDigest({ table }: { table: RoleArtifactDraft["tables"][number] }) {
  const visibleRows = table.rows.slice(0, 6);

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {visibleRows.map((row, rowIndex) => {
        const eyebrow = row[0] || `Item ${rowIndex + 1}`;
        const headline = row[1] || table.title;
        const details = table.columns.slice(2, 5).map((column, columnIndex) => ({
          label: column,
          value: row[columnIndex + 2] ?? ""
        }));

        return (
          <div key={`${table.title}-digest-${rowIndex}`} className="flex min-h-full flex-col rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-200">{summarizeCell(eyebrow, 48)}</p>
            <p className="mt-2 text-sm font-semibold leading-5 text-zinc-100">{summarizeCell(headline, 105)}</p>
            <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
              {details.map((detail, detailIndex) => (
                <div key={`${columnSafeKey(detail.label)}-${detailIndex}`} className="grid gap-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-zinc-500">{detail.label}</p>
                  <p className="text-xs leading-5 text-zinc-300">{summarizeCell(detail.value, 130)}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {table.rows.length > visibleRows.length ? (
        <div className="grid min-h-36 place-items-center rounded-md border border-dashed border-white/10 bg-white/[0.025] p-4 text-center">
          <div>
            <p className="text-sm font-semibold text-zinc-100">+{table.rows.length - visibleRows.length} more rows</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Open the detailed table below for the complete artifact.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
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
  const primaryTable = artifact.tables[0];
  const totalRows = artifact.tables.reduce((total, table) => total + table.rows.length, 0);
  const supportingItemCount = artifact.sections.reduce((total, section) => total + section.items.length, 0);

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
              artifact.provider === "openai" ? "OpenAI" : "Local"
            ].map((label) => (
              <span key={label} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-zinc-300">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {primaryTable ? (
        <section className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Artifact preview</p>
              <p className="mt-1 text-sm text-zinc-300">{primaryTable.title}</p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              {primaryTable.rows.length} working items
            </span>
          </div>
          <ArtifactTableDigest table={primaryTable} />
        </section>
      ) : null}

      {artifact.sections.length ? (
        <details className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
            <span>
              <span className="block text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Supporting guidance</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                {supportingItemCount} notes across {artifact.sections.length} sections. Open only when the team needs generation rationale or refinement prompts.
              </span>
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              View notes
            </span>
          </summary>
          <div className="mt-3 grid gap-3 border-t border-white/10 pt-3 md:grid-cols-2">
            {artifact.sections.map((section) => (
              <div key={section.title} className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">{section.title}</p>
                <div className="mt-3 grid gap-2">
                  {section.items.map((item) => (
                    <p key={item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-sm leading-6 text-zinc-300">
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />
                      <span>{item}</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <details className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
          <span>
            <span className="block text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">Source grounding</span>
            <span className="mt-1 block text-xs leading-5 text-zinc-500">{summarizeCell(artifact.sourceSummary, 130)}</span>
          </span>
          <span className="rounded-full border border-cyan-200/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-cyan-100">
            View
          </span>
        </summary>
        <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-zinc-300">{artifact.sourceSummary}</p>
      </details>

      <section className="grid gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Full export table</p>
          <p className="mt-1 text-sm text-zinc-400">Collapsed by default so the studio stays readable after generation.</p>
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
  if (!role || role === "__all_roles__") return true;
  const definitionRole = normalizeRole(definition.role);

  return definitionRole === role || definitionRole.includes(role) || role.includes(definitionRole);
}

function getDefaultDefinition(roleFocus: string | undefined) {
  return roleArtifactDefinitions.find((definition) => matchesRoleFocus(definition, roleFocus)) ?? roleArtifactDefinitions[0];
}

export function RoleArtifactStudioCard({
  launchRequest,
  programId,
  roleFocus = "__all_roles__"
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

  function downloadArtifact() {
    if (!artifact) return;

    const filename = `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "north-star-artifact"}-v${
      artifact.version ?? "draft"
    }.txt`;
    const blob = new Blob([serializeArtifact(artifact)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Artifact export downloaded.");
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
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(availableDefinitions.length ? availableDefinitions : roleArtifactDefinitions).map((definition) => (
            <ArtifactDefinitionButton
              key={definition.type}
              definition={definition}
              isSelected={definition.type === selectedType}
              onSelect={selectArtifactType}
            />
          ))}
        </div>

        <div className="grid gap-4 rounded-lg border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="grid content-start gap-4">
              <div className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <WandSparkles className="h-4 w-4 text-cyan-100" />
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
                <Button type="button" onClick={() => void generateArtifact()} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {artifact ? "Regenerate artifact" : "Generate artifact"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void copyArtifact()} disabled={!artifact}>
                  <Copy className="h-4 w-4" />
                  Copy output
                </Button>
                <Button type="button" variant="outline" onClick={downloadArtifact} disabled={!artifact}>
                  <Download className="h-4 w-4" />
                  Export
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
                          {savedArtifact.provider === "openai" ? "OpenAI" : "Local"}
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

          <div className="min-h-72 rounded-lg border border-white/10 bg-zinc-950/75 p-4 sm:p-5">
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
