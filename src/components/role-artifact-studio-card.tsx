"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, FileText, GitBranch, Loader2, Map, Sparkles } from "lucide-react";
import {
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
  if (type === "product-roadmap") return <GitBranch className="h-4 w-4 text-emerald-200" />;
  return <Map className="h-4 w-4 text-amber-200" />;
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
      className={`flex min-h-12 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
        isSelected
          ? "border-emerald-300/35 bg-emerald-300/[0.075] text-zinc-50"
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

function ArtifactTableDigest({ table }: { table: RoleArtifactDraft["tables"][number] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {table.rows.map((row, rowIndex) => {
        const eyebrow = row[0] || `Item ${rowIndex + 1}`;
        const headline = row[1] || table.title;
        const details = table.columns.slice(2).map((column, columnIndex) => ({
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

  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-emerald-300/15 bg-emerald-300/[0.045] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold text-zinc-100">{artifact.title}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{artifact.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {artifact.version ? (
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                v{artifact.version}
              </span>
            ) : null}
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.075] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-emerald-100">
              {artifact.provider === "openai" ? "OpenAI generated" : "Local draft"}
            </span>
          </div>
        </div>
      </div>

      {primaryTable ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">At a glance</p>
              <p className="mt-1 text-sm text-zinc-300">{primaryTable.title}</p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              {primaryTable.rows.length} working items
            </span>
          </div>
          <ArtifactTableDigest table={primaryTable} />
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {artifact.sections.map((section) => (
          <details key={section.title} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">{section.title}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{summarizeCell(section.items[0], 120)}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  {section.items.length}
                </span>
              </div>
            </summary>
            <div className="mt-3 grid gap-2">
              {section.items.map((item) => (
                <p key={item} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-sm leading-6 text-zinc-300">
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>

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

      <div className="grid gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Detailed artifact table</p>
          <p className="mt-1 text-sm text-zinc-400">Collapsed by default so the studio stays readable after generation.</p>
        </div>
        {artifact.tables.map((table) => (
          <ArtifactDetailTable key={table.title} table={table} />
        ))}
      </div>
    </div>
  );
}

export function RoleArtifactStudioCard({ programId }: { programId: string }) {
  const [selectedType, setSelectedType] = useState<RoleArtifactType>("ba-requirements-matrix");
  const [feedback, setFeedback] = useState("");
  const [artifact, setArtifact] = useState<RoleArtifactDraft | null>(null);
  const [artifactHistory, setArtifactHistory] = useState<RoleArtifactDraft[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const selectedDefinition = useMemo(
    () => roleArtifactDefinitions.find((definition) => definition.type === selectedType) ?? roleArtifactDefinitions[0],
    [selectedType]
  );

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

  return (
    <Card className="bg-zinc-950/75">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Role-Based Artifacts</p>
            <CardTitle className="text-zinc-50">Artifact Studio</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Generate role-ready outputs from the same program context driving the guided plan.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-2 xl:grid-cols-3">
          {roleArtifactDefinitions.map((definition) => (
            <ArtifactDefinitionButton
              key={definition.type}
              definition={definition}
              isSelected={definition.type === selectedType}
              onSelect={selectArtifactType}
            />
          ))}
        </div>

        <div className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
          <p className="text-sm font-semibold text-zinc-100">{selectedDefinition.title}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{selectedDefinition.description}</p>
        </div>

        <div className="grid gap-4 rounded-md border border-white/10 bg-black/20 p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid content-start gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Iteration direction</span>
                <textarea
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  rows={4}
                  placeholder="Optional: tell North Star what to emphasize, correct, or make more detailed."
                  className="min-h-28 resize-y rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void generateArtifact()} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {artifact ? "Regenerate artifact" : "Generate artifact"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void copyArtifact()} disabled={!artifact}>
                  <FileText className="h-4 w-4" />
                  Copy output
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
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Version history</p>
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
                </div>
              ) : (
                <p className="text-sm leading-6 text-zinc-500">No saved outputs yet for this artifact.</p>
              )}
            </div>
          </div>

          <div className="min-h-64 rounded-md border border-white/10 bg-zinc-950/75 p-4">
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
