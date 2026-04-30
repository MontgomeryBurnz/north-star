"use client";

import { useMemo, useState } from "react";
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

function ArtifactOutput({ artifact }: { artifact: RoleArtifactDraft }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{artifact.title}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">{artifact.summary}</p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.075] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-emerald-100">
          {artifact.provider === "openai" ? "OpenAI generated" : "Local draft"}
        </span>
      </div>

      <div className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.045] p-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">Source grounding</p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{artifact.sourceSummary}</p>
      </div>

      {artifact.tables.map((table) => (
        <div key={table.title} className="overflow-hidden rounded-md border border-white/10">
          <div className="border-b border-white/10 bg-white/[0.035] px-3 py-2">
            <p className="text-sm font-semibold text-zinc-100">{table.title}</p>
          </div>
          <div className="overflow-x-auto">
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
                      <td key={`${column}-${columnIndex}`} className="min-w-44 px-3 py-3 align-top text-zinc-300">
                        {row[columnIndex] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="grid gap-3 md:grid-cols-2">
        {artifact.sections.map((section) => (
          <div key={section.title} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{section.title}</p>
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
    </div>
  );
}

export function RoleArtifactStudioCard({ programId }: { programId: string }) {
  const [selectedType, setSelectedType] = useState<RoleArtifactType>("ba-requirements-matrix");
  const [feedback, setFeedback] = useState("");
  const [artifact, setArtifact] = useState<RoleArtifactDraft | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const selectedDefinition = useMemo(
    () => roleArtifactDefinitions.find((definition) => definition.type === selectedType) ?? roleArtifactDefinitions[0],
    [selectedType]
  );

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

      const payload = (await response.json()) as { artifact: RoleArtifactDraft };
      setArtifact(payload.artifact);
      setStatus(`${payload.artifact.title} generated ${formatDate(payload.artifact.generatedAt)}.`);
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

        <div className="grid gap-4 rounded-md border border-white/10 bg-black/20 p-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
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
