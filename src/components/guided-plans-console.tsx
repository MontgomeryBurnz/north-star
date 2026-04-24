"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, FileCheck2, RefreshCw, Sparkles } from "lucide-react";
import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { GuidedPlan, GuidedPlanRolePlans, GuidedPlanSection } from "@/lib/guided-plan-types";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { StoredProgram } from "@/lib/program-intake-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function PlanSectionCard({ section }: { section: GuidedPlanSection }) {
  return (
    <Card className="bg-zinc-950/75">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-zinc-50">{section.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 p-5">
        {section.items.map((item) => (
          <p key={item} className="flex gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-6 text-zinc-300">
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
            {item}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function RolePlansCard({ rolePlans }: { rolePlans: GuidedPlanRolePlans }) {
  return (
    <Card className="bg-zinc-950/75 lg:col-span-2">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-zinc-50">{rolePlans.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 xl:grid-cols-2">
        {rolePlans.roles.map((rolePlan) => (
          <div key={rolePlan.role} className="rounded-md border border-white/10 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-100">{rolePlan.role}</p>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Action Plan</p>
                {rolePlan.actionPlan.map((item) => (
                  <p key={item} className="flex gap-2 text-sm leading-6 text-zinc-300">
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-200" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="grid gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">Key Focus Areas</p>
                {rolePlan.keyFocusAreas.map((item) => (
                  <p key={item} className="flex gap-2 text-sm leading-6 text-zinc-300">
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="grid gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-200">Key Outcomes</p>
                {rolePlan.keyOutcomes.map((item) => (
                  <p key={item} className="flex gap-2 text-sm leading-6 text-zinc-300">
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-amber-200" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="grid gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-rose-200">Risk / Mitigation</p>
                {rolePlan.risksAndMitigations.map((item) => (
                  <p key={item} className="flex gap-2 text-sm leading-6 text-zinc-300">
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-rose-200" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function normalizePlanSection(section: GuidedPlanSection | undefined, fallbackTitle: string, fallbackItems: string[]): GuidedPlanSection {
  return {
    title: section?.title || fallbackTitle,
    items: section?.items?.length ? section.items : fallbackItems
  };
}

function normalizeRolePlans(rolePlans: GuidedPlanRolePlans | undefined): GuidedPlanRolePlans {
  return {
    title: rolePlans?.title || "Role Action Plans",
    roles:
      rolePlans?.roles?.length
        ? rolePlans.roles
        : [
            {
              role: "Product Management",
              actionPlan: ["Turn the current program context into the next product path and decision sequence."],
              keyFocusAreas: ["Outcome clarity, scope posture, and decision ownership."],
              keyOutcomes: ["A clearer product path and decision-ready priorities."],
              risksAndMitigations: ["Mitigate ambiguity by tightening checkpoints and scope boundaries."]
            },
            {
              role: "Business Analysis",
              actionPlan: ["Translate ambiguity into structured requirements and traceability."],
              keyFocusAreas: ["Requirements, assumptions, and acceptance detail."],
              keyOutcomes: ["Decision-ready requirements and cleaner handoffs."],
              risksAndMitigations: ["Reduce interpretation risk through explicit traceability."]
            },
            {
              role: "User Experience",
              actionPlan: ["Clarify the workflow and validation path before execution scales."],
              keyFocusAreas: ["Workflow friction, experience risk, and learning loops."],
              keyOutcomes: ["A more usable service path and clearer validation plan."],
              risksAndMitigations: ["Prevent hidden experience debt by defining validation checkpoints."]
            },
            {
              role: "Application Development",
              actionPlan: ["Frame technical sequencing, dependencies, and build gates."],
              keyFocusAreas: ["Implementation path, dependency removal, and execution risk."],
              keyOutcomes: ["A clearer execution plan with less avoidable rework."],
              risksAndMitigations: ["Reduce technical stalls by naming owners and decision gates early."]
            },
            {
              role: "Data Engineering",
              actionPlan: ["Make data dependencies and readiness visible before downstream build expands."],
              keyFocusAreas: ["Data quality, sourcing, transformation, and integration dependencies."],
              keyOutcomes: ["A clearer data readiness path and fewer downstream surprises."],
              risksAndMitigations: ["Reduce data risk by surfacing ownership and readiness checkpoints early."]
            },
            {
              role: "Change Management",
              actionPlan: ["Shape stakeholder communications, readiness, and adoption checkpoints."],
              keyFocusAreas: ["Readiness, messaging, audience-specific updates, and adoption risk."],
              keyOutcomes: ["Stronger alignment and smoother adoption of the guided path."],
              risksAndMitigations: ["Reduce change resistance through targeted updates and readiness signals."]
            }
          ]
  };
}

type GanttPhase = {
  id: string;
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
};

function phaseIndexFromLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("discovery")) return 0;
  if (normalized.includes("design") || normalized.includes("planning")) return 1;
  if (normalized.includes("build") || normalized.includes("execution")) return 2;
  if (normalized.includes("recovery") || normalized.includes("stabil")) return 3;
  if (normalized.includes("launch") || normalized.includes("rollout") || normalized.includes("scale")) return 4;
  return 2;
}

function buildProgramGantt(program: StoredProgram | undefined, latestUpdate: StoredProgramUpdate | undefined): GanttPhase[] {
  const currentPhaseLabel = latestUpdate?.review.currentPhase || program?.intake.currentStatus || "Execution";
  const currentIndex = phaseIndexFromLabel(currentPhaseLabel);

  return [
    {
      id: "discover",
      label: "Discover",
      description: "Problem shape, north star, and constraints were framed.",
      status: currentIndex > 0 ? "completed" : currentIndex === 0 ? "current" : "upcoming"
    },
    {
      id: "design",
      label: "Design",
      description: "Decision rights, checkpoints, and work path were structured.",
      status: currentIndex > 1 ? "completed" : currentIndex === 1 ? "current" : "upcoming"
    },
    {
      id: "execute",
      label: "Execute",
      description: "Delivery work is moving and evidence is being produced.",
      status: currentIndex > 2 ? "completed" : currentIndex === 2 ? "current" : "upcoming"
    },
    {
      id: "stabilize",
      label: "Stabilize",
      description: "Risk is being reduced and the path is being tightened.",
      status: currentIndex > 3 ? "completed" : currentIndex === 3 ? "current" : "upcoming"
    },
    {
      id: "scale",
      label: "Scale",
      description: "The operating path is repeatable and ready to widen.",
      status: currentIndex > 4 ? "completed" : currentIndex === 4 ? "current" : "upcoming"
    }
  ];
}

export function GuidedPlansConsole() {
  const [programs, setPrograms] = useState<StoredProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [plan, setPlan] = useState<GuidedPlan | null>(null);
  const [updates, setUpdates] = useState<StoredProgramUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingPrograms, setIsRefreshingPrograms] = useState(false);
  const [leadershipSignal, setLeadershipSignal] = useState<DeliveryLeadershipSignal | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId),
    [programs, selectedProgramId]
  );
  const latestUpdate = updates[0];
  const ganttPhases = useMemo(() => buildProgramGantt(selectedProgram, latestUpdate), [latestUpdate, selectedProgram]);
  const currentPhase = ganttPhases.find((phase) => phase.status === "current") ?? ganttPhases[ganttPhases.length - 1];

  const loadPrograms = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setIsRefreshingPrograms(true);

      try {
        const response = await fetch("/api/programs", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load programs.");

        const payload = (await response.json()) as { programs: StoredProgram[] };
        const requestedProgramId = new URLSearchParams(window.location.search).get("program");

        setPrograms(payload.programs);
        setSelectedProgramId((current) => {
          if (requestedProgramId && payload.programs.some((program) => program.id === requestedProgramId)) {
            return requestedProgramId;
          }

          if (current && payload.programs.some((program) => program.id === current)) {
            return current;
          }

          return payload.programs[0]?.id ?? "";
        });
      } catch {
        setStatus("Could not refresh saved programs.");
      } finally {
        if (!options?.silent) setIsRefreshingPrograms(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadPrograms({ silent: true });
      }
    }

    function refreshOnFocus() {
      void loadPrograms({ silent: true });
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadPrograms]);

  useEffect(() => {
    async function loadPlan() {
      if (!selectedProgramId) {
        setPlan(null);
        setUpdates([]);
        setLeadershipSignal(null);
        return;
      }

      const [planResponse, updatesResponse, leadershipSignalResponse] = await Promise.all([
        fetch(`/api/programs/${selectedProgramId}/guided-plan`),
        fetch(`/api/programs/${selectedProgramId}/updates`),
        fetch(`/api/programs/${selectedProgramId}/leadership-signal`, { cache: "no-store" })
      ]);
      const planPayload = (await planResponse.json()) as { plan: GuidedPlan | null };
      const updatesPayload = (await updatesResponse.json()) as { updates: StoredProgramUpdate[] };
      const leadershipSignalPayload = leadershipSignalResponse.ok
        ? ((await leadershipSignalResponse.json()) as { signal: DeliveryLeadershipSignal })
        : { signal: null };
      setPlan(planPayload.plan);
      setUpdates(updatesPayload.updates);
      setLeadershipSignal(leadershipSignalPayload.signal);
      setStatus(planPayload.plan ? "Loaded latest guided plan." : "No guided plan generated yet.");
    }

    void loadPlan();
  }, [selectedProgramId]);

  async function generatePlan() {
    if (!selectedProgramId) return;

    setIsLoading(true);
    setStatus("Generating guided plan...");

    try {
      const response = await fetch(`/api/programs/${selectedProgramId}/guided-plan`, {
        method: "POST"
      });
      const payload = (await response.json()) as { plan: GuidedPlan };
      setPlan(payload.plan);
      const updatesResponse = await fetch(`/api/programs/${selectedProgramId}/updates`);
      const updatesPayload = (await updatesResponse.json()) as { updates: StoredProgramUpdate[] };
      const leadershipSignalResponse = await fetch(`/api/programs/${selectedProgramId}/leadership-signal`, { cache: "no-store" });
      const leadershipSignalPayload = leadershipSignalResponse.ok
        ? ((await leadershipSignalResponse.json()) as { signal: DeliveryLeadershipSignal })
        : { signal: null };
      setUpdates(updatesPayload.updates);
      setLeadershipSignal(leadershipSignalPayload.signal);
      setStatus("Generated from saved program context and latest updates.");
    } catch {
      setStatus("Could not generate guided plan.");
    } finally {
      setIsLoading(false);
    }
  }

  const planSections = plan
    ? [
        normalizePlanSection(plan.signalFromNoise, "Signal From Noise", ["No current signal summary is available."]),
        normalizePlanSection(plan.workPath, "Recommended Work Path", ["Generate a guided plan to create the next work path."]),
        normalizePlanSection(plan.planningApproach, "Planning Approach", ["No planning approach has been captured yet."]),
        normalizePlanSection(plan.keyOutcomes, "Key Outcomes", ["No key outcomes are available yet."]),
        normalizePlanSection(plan.criticalRequirements, "Critical Requirements", ["No critical requirements are available yet."]),
        normalizePlanSection(plan.keyOutputs, "Key Outputs", ["No key outputs are available yet."]),
        normalizePlanSection(plan.risksAndDecisions, "Risks And Decisions", ["No current risk and decision summary is available yet."]),
        normalizePlanSection(
          plan.leadershipChanges,
          "What Changed From Leadership Signal",
          leadershipSignal?.status === "new"
            ? ["New leadership input is available. Regenerate the guided plan to incorporate it."]
            : ["No leadership-driven plan changes are visible in this saved version."]
        )
      ]
    : [];
  const rolePlans = plan ? normalizeRolePlans(plan.rolePlans) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Guided plans"
        title="Finding Our True North"
        description="Select a saved program, generate the current guidance set, and review the path, outputs, risks, and leadership-driven changes before the next move."
      />

      <section className="mt-10 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="grid gap-4 self-start lg:sticky lg:top-24">
          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <FileCheck2 className="h-4 w-4 text-emerald-200" />
                Program source
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-5">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Saved program</span>
                <select
                  value={selectedProgramId}
                  onChange={(event) => setSelectedProgramId(event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                >
                  {programs.length ? null : <option value="">No saved programs yet</option>}
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.intake.programName}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="button" variant="outline" onClick={() => void loadPrograms()} disabled={isRefreshingPrograms}>
                <RefreshCw className={`h-4 w-4 ${isRefreshingPrograms ? "animate-spin" : ""}`} />
                {isRefreshingPrograms ? "Refreshing sources..." : "Refresh sources"}
              </Button>
              {selectedProgram ? (
                <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-sm font-medium text-zinc-100">{selectedProgram.intake.programName}</p>
                  <p className="line-clamp-3 text-xs leading-5 text-zinc-400">
                    {selectedProgram.intake.vision || selectedProgram.intake.outcomes || "No north star captured yet."}
                  </p>
                  <p className="text-xs text-zinc-500">Updated {formatDate(selectedProgram.updatedAt)}</p>
                </div>
              ) : (
                <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3 text-sm leading-6 text-amber-100">
                  Save a New Program first, then return here to generate a guided plan.
                </div>
              )}
              <Button type="button" onClick={() => void generatePlan()} disabled={!selectedProgramId || isLoading}>
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isLoading ? "Generating..." : "Generate guided plan"}
              </Button>
              {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
            </CardContent>
          </Card>
        </aside>

        <section className="grid gap-4">
          {plan ? (
            <>
              <Card className="bg-zinc-950/85">
                <CardHeader className="border-b border-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
                        Current guided plan
                      </p>
                      <CardTitle className="text-2xl text-zinc-50">{plan.programName}</CardTitle>
                    </div>
                    <span className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-1 text-xs text-zinc-400">
                      {formatDate(plan.createdAt)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 p-5">
                  <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">North star</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-200">{plan.northStar}</p>
                  </div>
                  <p className="text-sm leading-6 text-zinc-400">{plan.summary}</p>
                  {leadershipSignal && leadershipSignal.status !== "none" ? (
                    <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-100">Leadership signal</p>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${
                            leadershipSignal.status === "new"
                              ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                              : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                          }`}
                        >
                          {leadershipSignal.status === "new" ? "New signal available" : "Incorporated into plan"}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-zinc-200">{leadershipSignal.summary}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="bg-zinc-950/80 lg:col-span-2">
                  <CardHeader className="border-b border-white/10">
                    <CardTitle className="text-zinc-50">Gantt Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-zinc-300">
                        Current phase: <span className="font-medium text-zinc-100">{currentPhase.label}</span>
                      </p>
                      <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-100">
                        Today
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-5">
                      {ganttPhases.map((phase) => (
                        <div key={phase.id} className="grid gap-2">
                          <div
                            className={`min-h-24 rounded-md border p-3 ${
                              phase.status === "completed"
                                ? "border-emerald-300/25 bg-emerald-300/10"
                                : phase.status === "current"
                                  ? "border-cyan-300/35 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.15)]"
                                  : "border-white/10 bg-black/20"
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p
                                className={`text-xs font-medium uppercase tracking-[0.14em] ${
                                  phase.status === "completed"
                                    ? "text-emerald-100"
                                    : phase.status === "current"
                                      ? "text-cyan-100"
                                      : "text-zinc-500"
                                }`}
                              >
                                {phase.label}
                              </p>
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  phase.status === "completed"
                                    ? "bg-emerald-300"
                                    : phase.status === "current"
                                      ? "bg-cyan-300"
                                      : "bg-zinc-700"
                                }`}
                              />
                            </div>
                            <p className="text-xs leading-5 text-zinc-300">{phase.description}</p>
                          </div>
                          <div className="h-1 rounded-full bg-zinc-900">
                            <div
                              className={`h-full rounded-full ${
                                phase.status === "completed"
                                  ? "w-full bg-emerald-300"
                                  : phase.status === "current"
                                    ? "w-2/3 bg-cyan-300"
                                    : "w-1/5 bg-zinc-700"
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                {rolePlans ? <RolePlansCard rolePlans={rolePlans} /> : null}
                {planSections.map((section) => (
                  <PlanSectionCard key={section.title} section={section} />
                ))}
              </div>

              <Card className="bg-zinc-950/80">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-zinc-50">Follow-up questions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 p-5">
                  {plan.followUpQuestions.map((question) => (
                    <p key={question} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-zinc-300">
                      {question}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-zinc-950/80">
              <CardContent className="p-8">
                <p className="text-lg font-medium text-zinc-100">No guided plan selected yet.</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Select a saved program and generate a guided plan. The first version uses deterministic local logic;
                  OpenAI can later replace this generator behind the same API route.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </section>
    </main>
  );
}
