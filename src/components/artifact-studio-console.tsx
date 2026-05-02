"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const defaultStudioRole = "Product Management";

function formatRoleLabel(value: string) {
  return value;
}

function suggestionSourceText(suggestion: RoleArtifactSuggestion) {
  return suggestion.sourceSignals.slice(0, 3).join(" / ");
}

function normalizeRole(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function roleTextMatches(value: string | undefined, roleFocus: string) {
  const role = normalizeRole(roleFocus);
  if (!role) return true;

  const candidate = normalizeRole(value);
  if (!candidate || candidate === "all roles") return false;

  return candidate === role || candidate.includes(role) || role.includes(candidate);
}

function suggestionMatchesRole(suggestion: RoleArtifactSuggestion, roleFocus: string) {
  return roleTextMatches(suggestion.role, roleFocus) || roleTextMatches(suggestion.definition.role, roleFocus);
}

function EmptyArtifactState({ hasPrograms }: { hasPrograms: boolean }) {
  return (
    <Card className="bg-zinc-950/75">
      <CardContent className="grid min-h-80 place-items-center p-8 text-center">
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
    <article className="flex min-h-full flex-col rounded-lg border border-white/10 bg-zinc-950/70 p-5 transition-colors hover:border-emerald-300/35 hover:bg-emerald-300/[0.045]">
      <span className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.13em] text-emerald-100">
          {suggestion.role}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] uppercase tracking-[0.13em] text-zinc-400">
          {suggestion.recommendedFormat}
        </span>
      </span>

      <span className="mt-4 block text-lg font-semibold leading-6 text-zinc-50">{suggestion.title}</span>
      <span className="mt-2 block text-sm leading-6 text-zinc-300">{suggestion.whyItMatters}</span>

      <span className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
        <span className="grid gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Output</span>
          <span className="text-xs leading-5 text-zinc-300">{suggestion.expectedOutput}</span>
        </span>
        <span className="grid gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Value</span>
          <span className="text-xs leading-5 text-zinc-300">{suggestion.businessValue}</span>
        </span>
      </span>

      <span className="mt-3 rounded-md border border-cyan-300/15 bg-cyan-300/[0.035] px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">Grounded by</span>
        <span className="mt-1 block text-xs leading-5 text-zinc-400">{suggestionSourceText(suggestion)}</span>
      </span>

      <Button
        type="button"
        variant="ghost"
        className="mt-auto h-auto min-h-10 self-start whitespace-normal px-0 text-left text-emerald-100 hover:bg-transparent hover:text-emerald-50"
        onClick={() => onUseSuggestion(suggestion)}
      >
        Load {suggestion.title}
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Button>
    </article>
  );
}

function StudioMetric({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function CustomArtifactPanel({
  customBrief,
  customRole,
  customTitle,
  disabled,
  onBriefChange,
  onRequest,
  onRoleChange,
  onTitleChange,
  roleOptions
}: {
  customBrief: string;
  customRole: string;
  customTitle: string;
  disabled: boolean;
  onBriefChange: (value: string) => void;
  onRequest: () => void;
  onRoleChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  roleOptions: string[];
}) {
  return (
    <Card className="bg-zinc-950/75">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-md border border-cyan-300/20 bg-cyan-300/[0.06] p-2 text-cyan-100">
            <PencilLine className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-zinc-50">Request something else</CardTitle>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Use this when the recommendation list is close, but the team needs a different output.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Artifact name</span>
            <input
              value={customTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Example: Product launch checklist"
              className="h-11 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Role</span>
            <span className="relative block">
              <select
                value={customRole}
                onChange={(event) => onRoleChange(event.target.value)}
                className="h-11 w-full appearance-none rounded-md border border-white/10 bg-zinc-950 px-3 pr-10 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
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
        </div>
        <label className="grid gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Brief</span>
          <textarea
            value={customBrief}
            onChange={(event) => onBriefChange(event.target.value)}
            rows={3}
            placeholder="Describe what this artifact should help the role create, decide, validate, or communicate."
            className="min-h-24 resize-y rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
          />
        </label>
        <Button type="button" onClick={onRequest} disabled={disabled} className="w-full sm:w-fit">
          Load custom brief
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function ArtifactStudioConsole() {
  const workbenchRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedRoleFocus, setSelectedRoleFocus] = useState(defaultStudioRole);
  const [suggestions, setSuggestions] = useState<RoleArtifactSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [launchRequest, setLaunchRequest] = useState<RoleArtifactStudioRequest | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customBrief, setCustomBrief] = useState("");
  const [customRole, setCustomRole] = useState(defaultStudioRole);
  const handleProgramLoadError = useCallback(() => setStatus("Could not refresh saved programs."), []);
  const { programs, selectedProgram, selectedProgramId, setSelectedProgramId } = useProgramCatalog({
    autoSelectFirstProgram: false,
    onError: handleProgramLoadError
  });
  const { getAssignmentForProgram, loaded: assignmentsLoaded } = useCurrentUserAssignments();
  const programOptions = useMemo(() => programsToSlicerOptions(programs, "signal"), [programs]);
  const teamRoles = useMemo(() => normalizeTeamRoles(selectedProgram?.intake.teamRoles), [selectedProgram?.intake.teamRoles]);
  const roleOptions = useMemo(() => (teamRoles.length ? teamRoles : [defaultStudioRole]), [teamRoles]);

  useEffect(() => {
    const fallbackRole = teamRoles[0] ?? defaultStudioRole;

    if (!assignmentsLoaded || !selectedProgramId) {
      setSelectedRoleFocus((current) => (teamRoles.includes(current) ? current : fallbackRole));
      setCustomRole((current) => (teamRoles.includes(current) ? current : fallbackRole));
      setLaunchRequest(null);
      return;
    }

    const assignedRole = getAssignmentForProgram(selectedProgramId)?.role;
    const nextRole = assignedRole && teamRoles.some((role) => role.toLowerCase() === assignedRole.toLowerCase()) ? assignedRole : fallbackRole;
    setSelectedRoleFocus(nextRole);
    setCustomRole(nextRole);
    setLaunchRequest(null);
  }, [assignmentsLoaded, getAssignmentForProgram, selectedProgramId, teamRoles]);

  useEffect(() => {
    setLaunchRequest(null);
    setSuggestions([]);
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
      setStatus(
        payload.provider === "openai"
          ? "Role-specific artifact briefs are ready from the latest grounded program context."
          : "Starter artifact recommendations are ready. Richer recommendations will appear when the intelligence platform is available."
      );
    } catch {
      setSuggestions([]);
      setStatus("Could not load artifact recommendations.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [selectedProgramId, selectedRoleFocus]);

  const visibleSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestionMatchesRole(suggestion, selectedRoleFocus)),
    [selectedRoleFocus, suggestions]
  );

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
    window.requestAnimationFrame(() => {
      workbenchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function requestCustomArtifact() {
    if (!customTitle.trim()) {
      setStatus("Name the custom artifact before loading it into the studio.");
      return;
    }

    const definition = buildCustomRoleArtifactDefinition({
      description: customBrief,
      role: customRole || selectedRoleFocus,
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
    window.requestAnimationFrame(() => {
      workbenchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid gap-8">
        <SectionHeader
          eyebrow="Studio"
          title="Artifact Studio"
          description="Create reusable work products from program intelligence, then refine and version them as the work evolves."
        />

        <Card className="bg-zinc-950/80">
          <CardContent className="grid gap-5 p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_260px]">
              <ProgramSlicer
                label="Program"
                selectedProgramId={selectedProgramId}
                options={programOptions}
                placeholder="Select a program..."
                emptyLabel="No saved programs yet"
                helperText="Every recommendation, generation, and version stays scoped to this program."
                onSelectProgram={setSelectedProgramId}
              />

              <label className="grid content-start gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Role focus</span>
                <span className="relative block">
                  <select
                    value={selectedRoleFocus}
                    onChange={(event) => {
                      const nextRole = event.target.value;
                      setSelectedRoleFocus(nextRole);
                      setCustomRole(nextRole);
                      setLaunchRequest(null);
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
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StudioMetric label="Current program" value={selectedProgram?.intake.programName ?? "Not selected"} />
              <StudioMetric label="Role lens" value={formatRoleLabel(selectedRoleFocus)} />
              <StudioMetric label="Briefs ready" value={selectedProgramId ? String(visibleSuggestions.length) : "0"} />
            </div>

            <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.045] p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
                <BrainCircuit className="h-4 w-4" />
                Studio context
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                North Star uses uploads, guided plans, team updates, leadership feedback, Guide dialogue, meeting inputs,
                risks, decisions, timeline, and role composition to shape each artifact.
              </p>
            </div>
          </CardContent>
        </Card>

        {!selectedProgramId ? (
          <EmptyArtifactState hasPrograms={programs.length > 0} />
        ) : (
          <section className="grid gap-6">
            <Card className="bg-zinc-950/75">
              <CardHeader className="border-b border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">Recommended briefs</p>
                    <CardTitle className="mt-2 text-zinc-50">Choose the next work product.</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      Recommendations are focused on {formatRoleLabel(selectedRoleFocus)} and spread across the page so role,
                      format, value, and grounding are easy to scan.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadSuggestions()} disabled={isLoadingSuggestions}>
                    {isLoadingSuggestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 sm:p-5">
                {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
                {isLoadingSuggestions ? (
                  <div className="grid min-h-44 place-items-center rounded-md border border-white/10 bg-white/[0.025] p-6 text-center">
                    <div>
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-200" />
                      <p className="mt-3 text-sm font-medium text-zinc-100">Analyzing program context...</p>
                    </div>
                  </div>
                ) : visibleSuggestions.length ? (
                  <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3" data-studio-suggestions="true">
                    {visibleSuggestions.map((suggestion) => (
                      <ArtifactSuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onUseSuggestion={useSuggestion}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-white/10 bg-white/[0.025] p-5 text-sm leading-6 text-zinc-400">
                    No recommendations are available for this role yet. Refresh the brief browser or request a custom artifact below.
                  </div>
                )}
              </CardContent>
            </Card>

            <CustomArtifactPanel
              customBrief={customBrief}
              customRole={customRole}
              customTitle={customTitle}
              disabled={!selectedProgramId}
              onBriefChange={setCustomBrief}
              onRequest={requestCustomArtifact}
              onRoleChange={setCustomRole}
              onTitleChange={setCustomTitle}
              roleOptions={roleOptions}
            />

            <section ref={workbenchRef} className="scroll-mt-24">
              <RoleArtifactStudioCard
                key={selectedProgramId}
                programId={selectedProgramId}
                roleFocus={selectedRoleFocus}
                launchRequest={launchRequest}
              />
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
