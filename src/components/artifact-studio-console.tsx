"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BrainCircuit, ChevronDown, Loader2, PencilLine, Sparkles } from "lucide-react";
import { useCurrentUserAssignments } from "@/hooks/use-current-user-assignments";
import { useProgramCatalog } from "@/hooks/use-program-catalog";
import { programsToSlicerOptions } from "@/lib/program-slicer";
import {
  buildCustomRoleArtifactDefinition,
  roleArtifactDefinitions,
  type RoleArtifactDefinition,
  type RoleArtifactSuggestion
} from "@/lib/role-artifact-types";
import { normalizeTeamRoles } from "@/lib/team-roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgramSlicer } from "@/components/program-slicer";
import { ProductPageHeader } from "@/components/product-page-header";
import { RoleArtifactStudioCard, type RoleArtifactStudioRequest } from "@/components/role-artifact-studio-card";

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

function definitionMatchesRole(definition: RoleArtifactDefinition, roleFocus: string) {
  return roleTextMatches(definition.role, roleFocus);
}

function buildStarterSuggestion(definition: RoleArtifactDefinition, programName: string | undefined): RoleArtifactSuggestion {
  const programSignal = programName ? `${programName} selected` : "selected program context";

  return {
    artifactType: definition.type,
    businessValue: `Gives ${definition.role} a reusable work product they can refine, export, and use to move execution forward.`,
    definition,
    expectedOutput: definition.outputLabel,
    generationBrief: `Generate ${definition.title} for ${definition.role}. Use the selected program context, guided plan, team updates, leadership signal, risks, decisions, timeline, and role composition.`,
    id: `starter-${definition.type}`,
    recommendedFormat: definition.primaryColumns.join(" / "),
    role: definition.role,
    sourceSignals: [programSignal, "guided plan context", "team updates", "leadership signal"].slice(0, 4),
    title: definition.title,
    whyItMatters: definition.description
  };
}

function EmptyArtifactState({ hasPrograms }: { hasPrograms: boolean }) {
  return (
    <Card className="bg-zinc-950/75">
      <CardContent className="grid min-h-80 place-items-center p-8 text-center">
        <div>
          <Sparkles className="mx-auto h-7 w-7 text-emerald-200" />
          <p className="mt-4 text-lg font-semibold text-zinc-50">
            {hasPrograms ? "Select a program to begin." : "Create a program before generating artifacts."}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">
            Studio uses the selected program&apos;s uploads, guided plan, team updates, leadership feedback, Guide dialogue,
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
    <article className="group flex min-h-full flex-col rounded-lg border border-white/10 bg-zinc-950/70 p-4 transition-colors hover:border-emerald-300/35 hover:bg-emerald-300/[0.045] sm:p-5">
      <span className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.13em] text-emerald-100">
          {suggestion.role}
        </span>
      </span>

      <span className="mt-4 block text-lg font-semibold leading-6 text-zinc-50">{suggestion.title}</span>
      <span className="mt-2 block text-sm leading-6 text-zinc-300 line-clamp-3">{suggestion.whyItMatters}</span>

      <details className="mt-4 rounded-md border border-cyan-300/15 bg-cyan-300/[0.035] px-3 py-2">
        <summary className="cursor-pointer list-none text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
          Brief details
        </summary>
        <div className="mt-2 grid gap-3 border-t border-white/10 pt-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Business value</p>
            <p className="mt-1 text-xs leading-5 text-zinc-300">{suggestion.businessValue}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Grounded by</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">{suggestionSourceText(suggestion)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Format</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{suggestion.recommendedFormat}</p>
          </div>
        </div>
      </details>

      <Button
        type="button"
        variant="ghost"
        className="mt-auto h-auto min-h-10 self-start whitespace-normal px-0 pt-4 text-left text-emerald-100 hover:bg-transparent hover:text-emerald-50"
        onClick={() => onUseSuggestion(suggestion)}
        data-studio-load-brief
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
  const [selectedRoleFocus, setSelectedRoleFocus] = useState("");
  const [suggestions, setSuggestions] = useState<RoleArtifactSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [launchRequest, setLaunchRequest] = useState<RoleArtifactStudioRequest | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customBrief, setCustomBrief] = useState("");
  const [customRole, setCustomRole] = useState("");
  const handleProgramLoadError = useCallback(() => setStatus("Could not refresh saved programs."), []);
  const { programs, selectedProgram, selectedProgramId, setSelectedProgramId } = useProgramCatalog({
    autoSelectFirstProgram: false,
    onError: handleProgramLoadError
  });
  const { getAssignmentForProgram, loaded: assignmentsLoaded } = useCurrentUserAssignments();
  const programOptions = useMemo(() => programsToSlicerOptions(programs, "signal"), [programs]);
  const teamRoles = useMemo(() => normalizeTeamRoles(selectedProgram?.intake.teamRoles), [selectedProgram?.intake.teamRoles]);
  const roleOptions = useMemo(() => (selectedProgramId ? teamRoles : []), [selectedProgramId, teamRoles]);
  const isRoleSelectionDisabled = !selectedProgramId || roleOptions.length === 0;
  const starterSuggestions = useMemo(() => {
    if (!selectedProgramId || !selectedRoleFocus) return [];

    return roleArtifactDefinitions
      .filter((definition) => definitionMatchesRole(definition, selectedRoleFocus))
      .map((definition) => buildStarterSuggestion(definition, selectedProgram?.intake.programName));
  }, [selectedProgram?.intake.programName, selectedProgramId, selectedRoleFocus]);

  useEffect(() => {
    if (!selectedProgramId) {
      setSelectedRoleFocus("");
      setCustomRole("");
      setLaunchRequest(null);
      return;
    }

    const assignedRole = getAssignmentForProgram(selectedProgramId)?.role;
    const assignedRoleMatch = assignedRole
      ? teamRoles.find((role) => role.toLowerCase() === assignedRole.toLowerCase())
      : undefined;

    setSelectedRoleFocus((current) => (teamRoles.includes(current) ? current : assignedRoleMatch ?? ""));
    setCustomRole((current) => (teamRoles.includes(current) ? current : assignedRoleMatch ?? ""));
    setLaunchRequest(null);
  }, [assignmentsLoaded, getAssignmentForProgram, selectedProgramId, teamRoles]);

  useEffect(() => {
    setLaunchRequest(null);
    setSuggestions([]);
  }, [selectedProgramId]);

  useEffect(() => {
    if (!selectedProgramId) {
      setSuggestions([]);
      return;
    }

    if (!selectedRoleFocus) {
      setSuggestions([]);
      setStatus("Select a role to open tailored artifact briefs for the selected program.");
      return;
    }

    setSuggestions(starterSuggestions);
    setStatus(`${formatRoleLabel(selectedRoleFocus)} starter briefs are ready. Refresh intelligence briefs when you want North Star to re-analyze the latest program signal.`);
  }, [selectedProgramId, selectedRoleFocus, starterSuggestions]);

  const loadSuggestions = useCallback(async () => {
    if (!selectedProgramId) return;
    if (!selectedRoleFocus) {
      setStatus("Select a role before refreshing intelligence briefs.");
      return;
    }

    setIsLoadingSuggestions(true);
    setStatus("Refreshing intelligence briefs from the latest program signal...");

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
    if (!selectedRoleFocus && !customRole) {
      setStatus("Select a role before loading a custom artifact request.");
      return;
    }

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
        `Generate ${definition.title} for ${formatRoleLabel(definition.role)} using the latest selected program context.`,
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
        <ProductPageHeader
          eyebrow="Studio"
          title="What should we create next?"
          description="Generate, refine, version, copy, and export role-specific work products from the selected program context."
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
                    data-studio-role-select
                    value={selectedRoleFocus}
                    disabled={isRoleSelectionDisabled}
                    onChange={(event) => {
                      const nextRole = event.target.value;
                      setSelectedRoleFocus(nextRole);
                      setCustomRole(nextRole);
                      setLaunchRequest(null);
                    }}
                    className="h-12 w-full appearance-none rounded-md border border-white/10 bg-zinc-950 px-3 pr-10 text-sm text-zinc-100 outline-none transition-colors disabled:cursor-not-allowed disabled:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
                  >
                    <option value="" disabled>
                      {!selectedProgramId ? "Select a program first..." : roleOptions.length ? "Select a role..." : "No roles configured"}
                    </option>
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
              <StudioMetric label="Role lens" value={selectedRoleFocus ? formatRoleLabel(selectedRoleFocus) : "Select role"} />
              <StudioMetric label="Briefs ready" value={selectedProgramId && selectedRoleFocus ? String(visibleSuggestions.length) : "Select role"} />
            </div>

            <details className="group rounded-md border border-cyan-300/20 bg-cyan-300/[0.035] p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-cyan-100">
                  <BrainCircuit className="h-4 w-4" />
                  Inputs used
                </span>
                <span className="rounded-full border border-cyan-200/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-cyan-100">
                  View
                </span>
              </summary>
              <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-zinc-300">
                Studio uses uploads, guided plans, team updates, leadership feedback, Guide dialogue, meeting inputs,
                risks, decisions, timeline, and role composition to shape each artifact.
              </p>
            </details>
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
                      Start from the role catalog, then refresh intelligence briefs when the latest program signal should reshape the recommendations.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadSuggestions()}
                    disabled={isLoadingSuggestions || !selectedRoleFocus}
                    data-studio-refresh-intelligence
                  >
                    {isLoadingSuggestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Refresh intelligence
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 sm:p-5">
                {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
                {!selectedRoleFocus ? (
                  <div className="grid min-h-44 place-items-center rounded-md border border-dashed border-white/10 bg-white/[0.025] p-6 text-center">
                    <div>
                      <Sparkles className="mx-auto h-6 w-6 text-emerald-200" />
                      <p className="mt-3 text-sm font-semibold text-zinc-100">Select a role to continue.</p>
                      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                        Studio recommendations are role-specific. Choose the role that should own or refine the work product.
                      </p>
                    </div>
                  </div>
                ) : isLoadingSuggestions ? (
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

            {selectedRoleFocus ? (
              <>
                <section ref={workbenchRef} className="scroll-mt-24">
                  <RoleArtifactStudioCard
                    key={`${selectedProgramId}-${selectedRoleFocus}`}
                    programId={selectedProgramId}
                    roleFocus={selectedRoleFocus}
                    launchRequest={launchRequest}
                  />
                </section>

                <CustomArtifactPanel
                  customBrief={customBrief}
                  customRole={customRole || selectedRoleFocus}
                  customTitle={customTitle}
                  disabled={!selectedProgramId}
                  onBriefChange={setCustomBrief}
                  onRequest={requestCustomArtifact}
                  onRoleChange={setCustomRole}
                  onTitleChange={setCustomTitle}
                  roleOptions={roleOptions}
                />
              </>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
