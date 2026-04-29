"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquareText } from "lucide-react";
import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { AssistantConversationTurn } from "@/lib/assistant-conversation-types";
import type { GuidedPlan, GuidedPlanRolePlans, GuidedPlanSection } from "@/lib/guided-plan-types";
import type { DeliveryLeadershipSignal } from "@/lib/leadership-feedback-types";
import type { GuidanceFeedbackFlag, GuidanceFeedbackFlagTargetType, GuidanceJustificationRecord } from "@/lib/program-intelligence-types";
import { useForegroundRefresh } from "@/hooks/use-foreground-refresh";
import { useProgramCatalog } from "@/hooks/use-program-catalog";
import { useRequestSequence } from "@/hooks/use-request-sequence";
import { buildTeamActionPlanFlagSourceId } from "@/lib/guidance-feedback-flag-sources";
import { buildProgramGantt } from "@/lib/program-gantt";
import { Button } from "@/components/ui/button";
import { GuidedPlanEmptyStateCard } from "@/components/guided-plan-empty-state-card";
import { GuidedPlanFollowUpCard } from "@/components/guided-plan-follow-up-card";
import { GuidedPlanGanttSummary } from "@/components/guided-plan-gantt-summary";
import { GuidedPlanJustificationCard } from "@/components/guided-plan-justification-card";
import { GuidedPlanOverviewCard } from "@/components/guided-plan-overview-card";
import { GuidedPlansSidebar } from "@/components/guided-plans-sidebar";
import { PlanSectionCard, RolePlansCard } from "@/components/guided-plan-section-cards";
import { SectionHeader } from "@/components/section-header";

const defaultTeamRoles = [
  "Product Management",
  "Business Analysis",
  "User Experience",
  "Application Development",
  "Data Engineering",
  "Change Management"
];

const allRolesOption = "__all_roles__";

function normalizeRoleKey(role: string) {
  return role.trim().toLowerCase();
}

type FlagTarget = {
  justificationId: string;
  citationId?: string;
  targetType?: GuidanceFeedbackFlagTargetType;
  targetLabel?: string;
  targetRole?: string;
  scope: "partial" | "whole";
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function normalizePlanSection(section: GuidedPlanSection | undefined, fallbackTitle: string, fallbackItems: string[]): GuidedPlanSection {
  return {
    title: section?.title || fallbackTitle,
    items: section?.items?.length ? section.items : fallbackItems
  };
}

function normalizeRolePlans(rolePlans: GuidedPlanRolePlans | undefined): GuidedPlanRolePlans {
  return {
    title: rolePlans?.title || "Team Action Plans",
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

export function GuidedPlansConsole() {
  const bundleRequest = useRequestSequence();
  const [plan, setPlan] = useState<GuidedPlan | null>(null);
  const [updates, setUpdates] = useState<StoredProgramUpdate[]>([]);
  const [assistantConversations, setAssistantConversations] = useState<AssistantConversationTurn[]>([]);
  const [showAssistantHistory, setShowAssistantHistory] = useState(false);
  const [leadershipSignal, setLeadershipSignal] = useState<DeliveryLeadershipSignal | null>(null);
  const [justifications, setJustifications] = useState<GuidanceJustificationRecord[]>([]);
  const [guidanceFlags, setGuidanceFlags] = useState<GuidanceFeedbackFlag[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [selectedRoleFocus, setSelectedRoleFocus] = useState(allRolesOption);
  const [expandedRoleKeys, setExpandedRoleKeys] = useState<Set<string>>(new Set());
  const [flagTarget, setFlagTarget] = useState<FlagTarget | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagContext, setFlagContext] = useState("");
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  const previousRoleStateProgramId = useRef<string | null>(null);
  const requestedProgramId = useMemo(
    () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("program")),
    []
  );
  const handleProgramLoadError = useCallback(() => setStatus("Could not refresh saved programs."), []);
  const { programs, selectedProgram, selectedProgramId, setSelectedProgramId, refreshPrograms } = useProgramCatalog({
    requestedProgramId,
    onError: handleProgramLoadError
  });
  const latestUpdate = updates[0];
  const ganttPhases = useMemo(() => buildProgramGantt(selectedProgram, latestUpdate), [latestUpdate, selectedProgram]);
  const currentPhase = ganttPhases.find((phase) => phase.status === "current") ?? ganttPhases[ganttPhases.length - 1];
  const teamRoles = useMemo(
    () => (selectedProgram?.intake.teamRoles?.length ? selectedProgram.intake.teamRoles : defaultTeamRoles),
    [selectedProgram]
  );
  const teamRoleSignature = useMemo(() => teamRoles.map((role) => normalizeRoleKey(role)).join("|"), [teamRoles]);
  const roleFocusStorageKey = useMemo(
    () => (selectedProgramId ? `north-star:guided-plans:role-focus:${selectedProgramId}` : ""),
    [selectedProgramId]
  );

  const loadPlan = useCallback(
    async (options?: { silent?: boolean }) => {
      const requestId = bundleRequest.beginRequest();

      if (!selectedProgramId) {
        setPlan(null);
        setUpdates([]);
        setAssistantConversations([]);
        setShowAssistantHistory(false);
        setLeadershipSignal(null);
        setJustifications([]);
        setGuidanceFlags([]);
        setLastSyncedAt(null);
        return;
      }

      try {
        const response = await fetch(`/api/programs/${selectedProgramId}/bundle`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load guided plan.");
        }
        const payload = (await response.json()) as {
          plan: GuidedPlan | null;
          updates: StoredProgramUpdate[];
          assistantConversations: AssistantConversationTurn[];
          leadershipSignal: DeliveryLeadershipSignal;
          justifications: GuidanceJustificationRecord[];
          flags: GuidanceFeedbackFlag[];
          fetchedAt: string;
        };
        if (!bundleRequest.isLatestRequest(requestId)) return;

        setPlan(payload.plan);
        setUpdates(payload.updates);
        setAssistantConversations(payload.assistantConversations);
        setLeadershipSignal(payload.leadershipSignal);
        setJustifications(payload.justifications);
        setGuidanceFlags(payload.flags);
        setLastSyncedAt(payload.fetchedAt);
        setStatus(
          payload.plan
            ? "This view stays synced with the latest uploads, active-program updates, and leadership feedback."
            : "No guided plan generated yet. Save a new program or active-program update to create one automatically."
        );
      } catch {
        if (!options?.silent && bundleRequest.isLatestRequest(requestId)) {
          setStatus("Could not load the latest guided plan.");
        }
      }
    },
    [bundleRequest, selectedProgramId]
  );

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const refreshView = useCallback(() => {
    void refreshPrograms({ silent: true });
    void loadPlan({ silent: true });
  }, [loadPlan, refreshPrograms]);
  useForegroundRefresh(refreshView, { enabled: true, intervalMs: selectedProgramId ? 15000 : null });

  useEffect(() => {
    setNewRole("");
  }, [selectedProgramId]);

  useEffect(() => {
    if (!selectedProgramId) {
      previousRoleStateProgramId.current = null;
      setSelectedRoleFocus(allRolesOption);
      setExpandedRoleKeys(new Set());
      return;
    }

    const storedRoleFocus = window.localStorage.getItem(roleFocusStorageKey);
    const normalizedTeamRoles = new Set(teamRoleSignature ? teamRoleSignature.split("|") : []);
    const nextRoleFocus = storedRoleFocus && normalizedTeamRoles.has(normalizeRoleKey(storedRoleFocus)) ? storedRoleFocus : allRolesOption;
    const programChanged = previousRoleStateProgramId.current !== selectedProgramId;
    previousRoleStateProgramId.current = selectedProgramId;

    setSelectedRoleFocus(nextRoleFocus);
    setExpandedRoleKeys((current) => {
      const preserved = programChanged ? new Set<string>() : new Set([...current].filter((roleKey) => normalizedTeamRoles.has(roleKey)));

      if (nextRoleFocus !== allRolesOption) {
        preserved.add(normalizeRoleKey(nextRoleFocus));
      }

      return preserved;
    });
  }, [roleFocusStorageKey, selectedProgramId, teamRoleSignature]);

  useEffect(() => {
    if (!roleFocusStorageKey) return;

    if (selectedRoleFocus === allRolesOption) {
      window.localStorage.removeItem(roleFocusStorageKey);
      return;
    }

    window.localStorage.setItem(roleFocusStorageKey, selectedRoleFocus);
  }, [roleFocusStorageKey, selectedRoleFocus]);

  useEffect(() => {
    setFlagTarget(null);
    setFlagReason("");
    setFlagContext("");
  }, [selectedProgramId, plan?.id]);

  const handleRoleFocusChange = useCallback((nextRole: string) => {
    setSelectedRoleFocus(nextRole);
    setExpandedRoleKeys(nextRole === allRolesOption ? new Set() : new Set([normalizeRoleKey(nextRole)]));
  }, []);

  const toggleExpandedRole = useCallback(
    (role: string) => {
      if (selectedRoleFocus === allRolesOption || normalizeRoleKey(role) === normalizeRoleKey(selectedRoleFocus)) {
        return;
      }

      setExpandedRoleKeys((current) => {
        const next = new Set(current);
        const key = normalizeRoleKey(role);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [selectedRoleFocus]
  );

  const addTeamRole = useCallback(async () => {
    if (!selectedProgram) return;

    const role = newRole.trim();
    if (!role) {
      setStatus("Enter a role name before adding it to the team action plans.");
      return;
    }

    if (teamRoles.some((existingRole) => existingRole.toLowerCase() === role.toLowerCase())) {
      setStatus(`${role} is already part of this team's action plan coverage.`);
      return;
    }

    setIsSavingRole(true);
    setStatus(`Adding ${role} and regenerating the guided plan...`);

    try {
      const saveResponse = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedProgram.intake,
          teamRoles: [...teamRoles, role]
        })
      });

      if (!saveResponse.ok) {
        throw new Error("save");
      }

      const regenerateResponse = await fetch(`/api/programs/${selectedProgram.id}/guided-plan`, {
        method: "POST"
      });

      if (!regenerateResponse.ok) {
        throw new Error("regenerate");
      }

      setNewRole("");
      setSelectedRoleFocus(role);
      await refreshPrograms({ silent: true });
      await loadPlan({ silent: true });
      setStatus(`${role} was added and the guided plan was refreshed to include the updated team composition.`);
    } catch {
      setStatus("Could not add the new team role and refresh the guided plan.");
    } finally {
      setIsSavingRole(false);
    }
  }, [loadPlan, newRole, refreshPrograms, selectedProgram, teamRoles]);

  const latestJustification = useMemo(() => {
    if (!plan) return null;
    return justifications.find((record) => record.guidedPlanId === plan.id) ?? justifications[0] ?? null;
  }, [justifications, plan]);

  const pendingFlagCount = useMemo(
    () =>
      guidanceFlags.filter(
        (flag) => flag.status === "pending" && (!latestJustification || flag.guidanceJustificationId === latestJustification.id)
      ).length,
    [guidanceFlags, latestJustification]
  );

  const submitFlag = useCallback(async () => {
    if (!selectedProgramId || !flagTarget || !flagReason.trim() || !flagContext.trim()) {
      setStatus("Add both a reason and your context before flagging the rationale.");
      return;
    }

    setIsSubmittingFlag(true);
    setStatus("Submitting flagged guidance for governance review...");

    try {
      const response = await fetch(`/api/programs/${selectedProgramId}/guidance-feedback-flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guidanceJustificationId: flagTarget.justificationId,
          citationId: flagTarget.citationId,
          targetType: flagTarget.targetType,
          targetLabel: flagTarget.targetLabel,
          targetRole: flagTarget.targetRole,
          scope: flagTarget.scope,
          userReason: flagReason,
          userContext: flagContext
        })
      });

      if (!response.ok) {
        throw new Error("flag");
      }

      await loadPlan({ silent: true });
      setFlagTarget(null);
      setFlagReason("");
      setFlagContext("");
      setStatus("Guidance flag submitted. Governance can now review and decide what happens next.");
    } catch {
      setStatus("Could not submit the guidance flag.");
    } finally {
      setIsSubmittingFlag(false);
    }
  }, [flagContext, flagReason, flagTarget, loadPlan, selectedProgramId]);

  const planSections = plan
    ? [
        normalizePlanSection(
          plan.sourceInputs,
          "Fresh Inputs Driving This Plan",
          [
            "This plan should be regenerated whenever uploads, active-program updates, or leadership feedback change.",
            "No fresh source-input summary is available in this saved version."
          ]
        ),
        normalizePlanSection(
          plan.assistantDialogue,
          "Guide Dialogue Shaping This Plan",
          [
            "No guide dialogue is visible in this saved version.",
            "Use Guide to capture operator context that should influence the next guided-plan refresh."
          ]
        ),
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
            ? ["New leadership input is available. The plan will refresh automatically when that review is saved."]
            : ["No leadership-driven plan changes are visible in this saved version."]
        )
      ]
    : [];
  const rolePlans = plan ? normalizeRolePlans(plan.rolePlans) : null;
  const latestAssistantConversation = assistantConversations[0];
  const lastAssistantDialogueAt = latestAssistantConversation?.updatedAt || latestAssistantConversation?.createdAt;
  const assistantDialogueFooter = assistantConversations.length ? (
    <div className="mt-2 grid gap-3 rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-cyan-100">
          <MessageSquareText className="h-4 w-4" />
          Conversation history
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1 text-cyan-100 hover:text-cyan-50"
          onClick={() => setShowAssistantHistory((open) => !open)}
        >
          {showAssistantHistory ? "Hide history" : "View full history"}
        </Button>
      </div>
      {showAssistantHistory ? (
        <div className="grid gap-3">
          {assistantConversations.map((turn) => (
            <div key={turn.id} className="rounded-md border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">{formatDate(turn.updatedAt)}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-300">Prompt</p>
              <p className="mt-1 text-sm leading-6 text-zinc-200">{turn.prompt}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-zinc-300">Guide</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">{turn.response.answer}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-5 text-zinc-300">
          {assistantConversations.length} stored dialogue {assistantConversations.length === 1 ? "turn is" : "turns are"} from Guide shaping this plan.
        </p>
      )}
    </div>
  ) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Guided plans"
        title="Find True North"
        description="Select a saved program and review the latest path, outputs, risks, and leadership-driven changes. Guided plans refresh automatically as new program inputs are saved."
      />

      <section className="mt-10 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <GuidedPlansSidebar
          programs={programs}
          selectedProgramId={selectedProgramId}
          selectedProgram={selectedProgram ?? undefined}
          teamRoles={teamRoles}
          selectedRoleFocus={selectedRoleFocus}
          newRole={newRole}
          isSavingRole={isSavingRole}
          lastSyncedAt={lastSyncedAt}
          status={status}
          allRolesOption={allRolesOption}
          formatDate={formatDate}
          onProgramChange={setSelectedProgramId}
          onRoleFocusChange={handleRoleFocusChange}
          onNewRoleChange={setNewRole}
          onAddRole={addTeamRole}
        />

        <section className="grid gap-4">
          {plan ? (
            <>
              <GuidedPlanOverviewCard
                plan={plan}
                leadershipSignal={leadershipSignal}
                lastAssistantDialogueAt={lastAssistantDialogueAt}
                formatDate={formatDate}
              />

              <div className="grid gap-4 lg:grid-cols-2">
                {latestJustification ? (
                  <GuidedPlanJustificationCard
                    justification={latestJustification}
                    pendingFlagCount={pendingFlagCount}
                    flagTarget={flagTarget}
                    flagReason={flagReason}
                    flagContext={flagContext}
                    isSubmittingFlag={isSubmittingFlag}
                    onOpenCitationFlag={(citationId, citationLabel) => {
                      setFlagTarget({
                        justificationId: latestJustification.id,
                        citationId,
                        targetType: "source-citation",
                        targetLabel: citationLabel,
                        scope: "partial"
                      });
                      setFlagReason("");
                      setFlagContext("");
                    }}
                    onOpenWholeFlag={() => {
                      setFlagTarget({
                        justificationId: latestJustification.id,
                        targetType: "whole-rationale",
                        targetLabel: "Why This Changed rationale",
                        scope: "whole"
                      });
                      setFlagReason("");
                      setFlagContext("");
                    }}
                    onFlagReasonChange={setFlagReason}
                    onFlagContextChange={setFlagContext}
                    onSubmitFlag={submitFlag}
                    onCancelFlag={() => setFlagTarget(null)}
                  />
                ) : null}
                <GuidedPlanGanttSummary currentPhaseLabel={currentPhase.label} ganttPhases={ganttPhases} />
                {rolePlans ? (
                  <RolePlansCard
                    rolePlans={rolePlans}
                    selectedRoleFocus={selectedRoleFocus}
                    expandedRoleKeys={expandedRoleKeys}
                    canFlagGuidance={Boolean(latestJustification)}
                    flagTarget={flagTarget}
                    flagReason={flagReason}
                    flagContext={flagContext}
                    isSubmittingFlag={isSubmittingFlag}
                    onToggleRole={toggleExpandedRole}
                    onOpenRoleFlag={(role) => {
                      if (!latestJustification) {
                        setStatus("A saved guidance rationale is required before a Team Action Plan can be disputed.");
                        return;
                      }

                      setFlagTarget({
                        justificationId: latestJustification.id,
                        citationId: buildTeamActionPlanFlagSourceId(role),
                        targetType: "team-action-plan",
                        targetLabel: `${role} Team Action Plan`,
                        targetRole: role,
                        scope: "partial"
                      });
                      setFlagReason("");
                      setFlagContext("");
                    }}
                    onFlagReasonChange={setFlagReason}
                    onFlagContextChange={setFlagContext}
                    onSubmitFlag={submitFlag}
                    onCancelFlag={() => setFlagTarget(null)}
                  />
                ) : null}
                {planSections.map((section) => (
                  <PlanSectionCard
                    key={section.title}
                    section={section}
                    footer={section.title === "Guide Dialogue Shaping This Plan" ? assistantDialogueFooter : undefined}
                  />
                ))}
              </div>

              <GuidedPlanFollowUpCard questions={plan.followUpQuestions} />
            </>
          ) : (
            <GuidedPlanEmptyStateCard />
          )}
        </section>
      </section>
    </main>
  );
}
