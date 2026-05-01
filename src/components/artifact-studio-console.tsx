"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BrainCircuit, ChevronDown, Loader2, PencilLine, Sparkles } from "lucide-react";
import { useCurrentUserAssignments } from "@/hooks/use-current-user-assignments";
import { useProgramCatalog } from "@/hooks/use-program-catalog";
import { programsToSlicerOptions } from "@/lib/program-slicer";
import {
  buildCustomRoleArtifactDefinition,
  type RoleArtifactSuggestion
} from "@/lib/role-artifact-types";
import { normalizeTeamRoles } from "@/lib/team-roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgramSlicer } from "@/components/program-slicer";
import { RoleArtifactStudioCard, type RoleArtifactStudioRequest } from "@/components/role-artifact-studio-card";
import { SectionHeader } from "@/components/section-header";

const allRolesOption = "__all_roles__";

function formatRoleLabel(value: string) {
  return value === allRolesOption ? "All roles" : value;
}

function suggestionSourceText(suggestion: RoleArtifactSuggestion) {
  return suggestion.sourceSignals.slice(0, 3).join(" / ");
}

function EmptyArtifactState({ hasPrograms }: { hasPrograms: boolean }) {
  return (
    <Card className="bg-zinc-950/75">
      <CardContent className="grid min-h-72 place-items-center p-8 text-center">
        <div>
          <Sparkles className="mx-auto h-7 w-7 text-emerald-200" />
          <p className="mt-4 text-lg font-semibold text-zinc-50">
            {hasPrograms ? "Select a program to open Artifact Studio." : "Create a program before generating artifacts."}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
            Artifact Studio uses the selected program&apos;s uploads, guided plan, team updates, leadership feedback, Guide dialogue,
            risks, decisions, timeline, and roles to recommend useful work products.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ArtifactSuggestionCard({
  onUseSuggestion,
  suggestion
}: {
  onUseSuggestion: (suggestion: RoleArtifactSuggestion) => void;
  suggestion: RoleArtifactSuggestion;
}) {
  return (
    <Card className="flex min-h-full flex-col bg-zinc-950/75">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">{suggestion.role}</p>
            <CardTitle className="mt-2 text-base text-zinc-50">{suggestion.title}</CardTitle>
          </div>
          <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
            {suggestion.expectedOutput}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-sm leading-6 text-zinc-300">{suggestion.whyItMatters}</p>

        <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">Why now</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">{suggestionSourceText(suggestion)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Format</p>
            <p className="mt-1 text-xs leading-5 text-zinc-300">{suggestion.recommendedFormat}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Business value</p>
            <p className="mt-1 text-xs leading-5 text-zinc-300">{suggestion.businessValue}</p>
          </div>
        </div>

        <Button type="button" className="mt-auto justify-self-start" onClick={() => onUseSuggestion(suggestion)}>
          Use this brief
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function ArtifactStudioConsole() {
  const [status, setStatus] = useState<string | null>(null);
  const [selectedRoleFocus, setSelectedRoleFocus] = useState(allRolesOption);
  const [suggestions, setSuggestions] = useState<RoleArtifactSuggestion[]>([]);
  const [suggestionProvider, setSuggestionProvider] = useState<"local" | "openai" | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [launchRequest, setLaunchRequest] = useState<RoleArtifactStudioRequest | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customBrief, setCustomBrief] = useState("");
  const [customRole, setCustomRole] = useState(allRolesOption);
  const handleProgramLoadError = useCallback(() => setStatus("Could not refresh saved programs."), []);
  const { programs, selectedProgram, selectedProgramId, setSelectedProgramId } = useProgramCatalog({
    autoSelectFirstProgram: false,
    onError: handleProgramLoadError
  });
  const { getAssignmentForProgram, loaded: assignmentsLoaded } = useCurrentUserAssignments();
  const programOptions = useMemo(() => programsToSlicerOptions(programs, "signal"), [programs]);
  const teamRoles = useMemo(() => normalizeTeamRoles(selectedProgram?.intake.teamRoles), [selectedProgram?.intake.teamRoles]);
  const roleOptions = useMemo(() => [allRolesOption, ...teamRoles], [teamRoles]);

  useEffect(() => {
    if (!assignmentsLoaded || !selectedProgramId) {
      setSelectedRoleFocus(allRolesOption);
      setCustomRole(allRolesOption);
      return;
    }

    const assignedRole = getAssignmentForProgram(selectedProgramId)?.role;
    const nextRole = assignedRole && teamRoles.some((role) => role.toLowerCase() === assignedRole.toLowerCase()) ? assignedRole : allRolesOption;
    setSelectedRoleFocus(nextRole);
    setCustomRole(nextRole);
  }, [assignmentsLoaded, getAssignmentForProgram, selectedProgramId, teamRoles]);

  useEffect(() => {
    setLaunchRequest(null);
    setSuggestions([]);
    setSuggestionProvider(null);
  }, [selectedProgramId]);

  const loadSuggestions = useCallback(async () => {
    if (!selectedProgramId) return;

    setIsLoadingSuggestions(true);
    setStatus("Analyzing program context for high-value artifacts...");

    try {
      const params = new URLSearchParams({ role: selectedRoleFocus });
      const response = await fetch(`/api/programs/${selectedProgramId}/role-artifact-suggestions?${params.toString()}`, {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("suggestions");

      const payload = (await response.json()) as {
        provider: "local" | "openai";
        suggestions: RoleArtifactSuggestion[];
      };
      setSuggestions(payload.suggestions);
      setSuggestionProvider(payload.provider);
      setStatus(
        payload.provider === "openai"
          ? "OpenAI recommended artifacts from the latest grounded program context."
          : "Starter artifact recommendations are ready. OpenAI suggestions will appear when the provider is available."
      );
    } catch {
      setSuggestions([]);
      setSuggestionProvider(null);
      setStatus("Could not load artifact recommendations.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [selectedProgramId, selectedRoleFocus]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  function useSuggestion(suggestion: RoleArtifactSuggestion) {
    setLaunchRequest({
      artifactType: suggestion.artifactType,
      definition: suggestion.definition,
      generationBrief: suggestion.generationBrief,
      sourceLabel: `${suggestion.title} recommendation`
    });
    setStatus(`${suggestion.title} brief loaded. Review or edit the direction, then generate the artifact.`);
  }

  function requestCustomArtifact() {
    if (!customTitle.trim()) {
      setStatus("Name the custom artifact before loading it into the studio.");
      return;
    }

    const definition = buildCustomRoleArtifactDefinition({
      description: customBrief,
      role: customRole === allRolesOption ? (selectedRoleFocus === allRolesOption ? "All roles" : selectedRoleFocus) : customRole,
      title: customTitle
    });

    setLaunchRequest({
      artifactType: definition.type,
      definition,
      generationBrief:
        customBrief.trim() ||
        `Generate ${definition.title} for ${formatRoleLabel(definition.role)} using the latest grounded context for the selected program.`,
      sourceLabel: "Custom artifact request"
    });
    setStatus(`${definition.title} custom request loaded. Generate it when the brief is ready.`);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Artifacts"
        title="Artifact Studio"
        description="Generate, refine, version, and export role-specific work products from program context."
      />

      <section className="mt-10 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="grid content-start gap-4">
          <Card className="bg-zinc-950/75">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-zinc-50">Artifact context</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-4">
              <ProgramSlicer
                label="Program"
                selectedProgramId={selectedProgramId}
                options={programOptions}
                placeholder="Select a program..."
                emptyLabel="No saved programs yet"
                helperText="Recommendations and generated artifacts stay scoped to the selected program."
                onSelectProgram={setSelectedProgramId}
              />

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Role focus</span>
                <span className="relative block">
                  <select
                    value={selectedRoleFocus}
                    onChange={(event) => {
                      setSelectedRoleFocus(event.target.value);
                      setCustomRole(event.target.value);
                    }}
                    className="h-12 w-full appearance-none rounded-md border border-white/10 bg-zinc-950 px-3 pr-10 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {formatRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                </span>
              </label>

              <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
                  <BrainCircuit className="h-4 w-4" />
                  What Studio analyzes
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Uploads, guided plans, team updates, leadership feedback, Guide dialogue, meeting inputs, risks,
                  decisions, timeline, and role composition.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/75">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <PencilLine className="h-4 w-4 text-cyan-200" />
                Request custom artifact
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Artifact name</span>
                <input
                  value={customTitle}
                  onChange={(event) => setCustomTitle(event.target.value)}
                  placeholder="Example: Product launch checklist"
                  className="h-11 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Role</span>
                <select
                  value={customRole}
                  onChange={(event) => setCustomRole(event.target.value)}
                  className="h-11 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {formatRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Brief</span>
                <textarea
                  value={customBrief}
                  onChange={(event) => setCustomBrief(event.target.value)}
                  rows={4}
                  placeholder="Describe what this artifact should help the role create, decide, validate, or communicate."
                  className="min-h-28 resize-y rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
                />
              </label>
              <Button type="button" onClick={requestCustomArtifact} disabled={!selectedProgramId}>
                Load custom brief
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </aside>

        <section className="grid content-start gap-5">
          {!selectedProgramId ? (
            <EmptyArtifactState hasPrograms={programs.length > 0} />
          ) : (
            <>
              <Card className="bg-zinc-950/75">
                <CardHeader className="border-b border-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">AI Recommended Artifacts</p>
                      <CardTitle className="mt-2 text-zinc-50">What should we create to move the work forward?</CardTitle>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                        Recommendations are scoped to {selectedProgram?.intake.programName ?? "the selected program"} and focused on{" "}
                        {formatRoleLabel(selectedRoleFocus)}.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                        {suggestionProvider === "openai" ? "OpenAI suggested" : "Starter catalog"}
                      </span>
                      <Button type="button" variant="outline" size="sm" onClick={() => void loadSuggestions()} disabled={isLoadingSuggestions}>
                        {isLoadingSuggestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 p-4 sm:p-5">
                  {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
                  {isLoadingSuggestions ? (
                    <div className="grid min-h-48 place-items-center rounded-md border border-white/10 bg-white/[0.025] p-6 text-center">
                      <div>
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-200" />
                        <p className="mt-3 text-sm font-medium text-zinc-100">Analyzing program context...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {suggestions.map((suggestion) => (
                        <ArtifactSuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          onUseSuggestion={useSuggestion}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <RoleArtifactStudioCard
                key={selectedProgramId}
                programId={selectedProgramId}
                roleFocus={selectedRoleFocus}
                launchRequest={launchRequest}
              />
            </>
          )}
        </section>
      </section>
    </main>
  );
}
