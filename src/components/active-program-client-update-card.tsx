"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, SendHorizonal, ShieldCheck } from "lucide-react";
import type { ActiveProgramReview, TeamRoleUpdate } from "@/lib/active-program-types";
import type { ClientPortalDomainUpdate, ClientPortalUpdateInput, ClientPortalUpdateRecord } from "@/lib/client-portal-update-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PublishState = "idle" | "publishing" | "published" | "error";

type ClientUpdateDraft = Omit<ClientPortalUpdateInput, "domainUpdates"> & {
  domainUpdates: ClientPortalDomainUpdate[];
};

type ActiveProgramClientUpdateCardProps = {
  review: ActiveProgramReview;
  selectedProgramId: string;
  teamRoleUpdates: TeamRoleUpdate[];
};

const clientPhaseOptions = ["", "Intake", "Plan", "Execute", "Stabilize", "Value"] as const;

function roleStatusLabel(status: TeamRoleUpdate["status"]) {
  if (status === "blocked") return "Blocked";
  if (status === "at-risk") return "At risk";
  return "On track";
}

function roleStatusFromLabel(value: string): TeamRoleUpdate["status"] {
  if (value === "blocked") return "blocked";
  if (value === "at-risk") return "at-risk";
  return "on-track";
}

function mergeDomainUpdatesFromLatest(
  teamRoleUpdates: TeamRoleUpdate[],
  latestUpdate: ClientPortalUpdateRecord | null | undefined
): ClientPortalDomainUpdate[] {
  const latestByRole = new Map((latestUpdate?.domainUpdates ?? []).map((domain) => [domain.role.toLowerCase(), domain]));
  const merged = teamRoleUpdates.map((roleUpdate) => {
    const latest = latestByRole.get(roleUpdate.role.toLowerCase());
    latestByRole.delete(roleUpdate.role.toLowerCase());

    return {
      attachments: latest?.attachments ?? roleUpdate.attachments?.length ?? 0,
      decisionsOrOutcomes: latest?.decisionsOrOutcomes ?? "",
      owner: latest?.owner ?? roleUpdate.updatedBy,
      pursuit: latest?.pursuit ?? "",
      risksOrBlockers: latest?.risksOrBlockers ?? "",
      role: roleUpdate.role,
      status: latest?.status ?? "on-track"
    };
  });

  return [...merged, ...latestByRole.values()];
}

export function buildInitialClientUpdateDraft(
  review: ActiveProgramReview,
  teamRoleUpdates: TeamRoleUpdate[],
  latestUpdate?: ClientPortalUpdateRecord | null
): ClientUpdateDraft {
  return {
    activeRisks: latestUpdate?.activeRisks ?? "",
    clientStatusNote: latestUpdate?.clientStatusNote ?? review.clientStatusNote ?? "",
    clientRoadmapItems: latestUpdate?.clientRoadmapItems?.map((item) => ({ ...item })) ?? [],
    completionDelta: latestUpdate?.completionDelta ?? "",
    currentPhase: latestUpdate?.currentPhase ?? "",
    decisionsPending: latestUpdate?.decisionsPending ?? "",
    deliveryBoardItems: latestUpdate?.deliveryBoardItems?.map((item) => ({ ...item })) ?? [],
    deliveryHealth: latestUpdate?.deliveryHealth ?? "",
    domainUpdates: mergeDomainUpdatesFromLatest(teamRoleUpdates, latestUpdate),
    executiveOverview: latestUpdate?.executiveOverview ?? "",
    executiveSponsor: latestUpdate?.executiveSponsor ?? review.executiveSponsor ?? "",
    nextMilestoneDate: latestUpdate?.nextMilestoneDate ?? "",
    nextMilestoneName: latestUpdate?.nextMilestoneName ?? "",
    nextMilestonePriority: latestUpdate?.nextMilestonePriority ?? "",
    originalNorthStar: latestUpdate?.originalNorthStar ?? review.originalNorthStar ?? "",
    pmo: latestUpdate?.pmo ?? review.pmo ?? "",
    programCompletionPercent: latestUpdate?.programCompletionPercent ?? review.programCompletionPercent ?? "",
    programLead: latestUpdate?.programLead ?? review.programLead ?? "",
    programMilestones: latestUpdate?.programMilestones?.map((item) => ({ ...item })) ?? [],
    programStartDate: latestUpdate?.programStartDate ?? review.programStartDate ?? "",
    programTargetFinishDate: latestUpdate?.programTargetFinishDate ?? review.programTargetFinishDate ?? "",
    progressSinceLastReview: latestUpdate?.progressSinceLastReview ?? "",
    publicationNote: latestUpdate?.publicationNote ?? "",
    supportNeeded: latestUpdate?.supportNeeded ?? "",
    timelineMonth: latestUpdate?.timelineMonth ?? review.timelineMonth ?? "",
    timelineScale: latestUpdate?.timelineScale ?? review.timelineScale ?? "year",
    timelineWeek: latestUpdate?.timelineWeek ?? review.timelineWeek ?? "",
    timelineYear: latestUpdate?.timelineYear ?? review.timelineYear ?? "",
    upcomingWork: latestUpdate?.upcomingWork ?? ""
  };
}

function hasClientReadyContent(draft: ClientUpdateDraft) {
  return Boolean(
    draft.clientStatusNote.trim() ||
      draft.executiveOverview.trim() ||
      draft.progressSinceLastReview.trim() ||
      draft.upcomingWork.trim() ||
      draft.activeRisks.trim() ||
      draft.decisionsPending.trim() ||
      draft.domainUpdates.some(
        (domain) =>
          domain.owner.trim() ||
          domain.pursuit.trim() ||
          domain.risksOrBlockers.trim() ||
          domain.decisionsOrOutcomes.trim()
      )
  );
}

export function ActiveProgramClientUpdateCard({
  review,
  selectedProgramId,
  teamRoleUpdates
}: ActiveProgramClientUpdateCardProps) {
  const [draft, setDraft] = useState<ClientUpdateDraft>(() => buildInitialClientUpdateDraft(review, teamRoleUpdates));
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [confirmation, setConfirmation] = useState("");
  const canPublish = selectedProgramId && hasClientReadyContent(draft) && publishState !== "publishing";
  const rolesWithUpdates = useMemo(
    () => draft.domainUpdates.filter((domain) => domain.role.trim()).slice(0, 8),
    [draft.domainUpdates]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadLatestClientUpdate() {
      if (!selectedProgramId) {
        setDraft(buildInitialClientUpdateDraft(review, teamRoleUpdates));
        setPublishState("idle");
        setConfirmation("");
        return;
      }

      setPublishState("idle");
      setConfirmation("Loading latest published client update...");

      try {
        const response = await fetch(`/api/programs/${encodeURIComponent(selectedProgramId)}/client-updates`, {
          cache: "no-store"
        });
        if (!response.ok) throw new Error("latest-load");

        const payload = (await response.json()) as { updates?: ClientPortalUpdateRecord[] };
        if (cancelled) return;

        const latestUpdate = payload.updates?.[0] ?? null;
        setDraft(buildInitialClientUpdateDraft(review, teamRoleUpdates, latestUpdate));
        setConfirmation(
          latestUpdate
            ? `Loaded latest published client update from ${new Date(latestUpdate.updatedAt ?? latestUpdate.createdAt).toLocaleString()}.`
            : ""
        );
      } catch {
        if (cancelled) return;
        setDraft(buildInitialClientUpdateDraft(review, teamRoleUpdates));
        setConfirmation("Could not load the latest published client update. You can still draft a new snapshot.");
      }
    }

    void loadLatestClientUpdate();
    setPublishState("idle");

    return () => {
      cancelled = true;
    };
  }, [review.programName, selectedProgramId, teamRoleUpdates]);

  function updateField(field: keyof Omit<ClientUpdateDraft, "domainUpdates" | "deliveryBoardItems" | "programMilestones">, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value
    }));
    setPublishState("idle");
  }

  function updateDomain(index: number, field: keyof ClientPortalDomainUpdate, value: string) {
    setDraft((current) => ({
      ...current,
      domainUpdates: current.domainUpdates.map((domain, currentIndex) =>
        currentIndex === index
          ? {
              ...domain,
              [field]: field === "status" ? roleStatusFromLabel(value) : value
            }
          : domain
      )
    }));
    setPublishState("idle");
  }

  async function publishClientUpdate() {
    if (!selectedProgramId || !hasClientReadyContent(draft)) {
      setPublishState("error");
      setConfirmation("Add client-facing content before publishing.");
      return;
    }

    setPublishState("publishing");
    setConfirmation("Publishing client-facing update...");

    try {
      const response = await fetch(`/api/programs/${encodeURIComponent(selectedProgramId)}/client-updates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          deliveryBoardItems: draft.deliveryBoardItems ?? [],
          domainUpdates: draft.domainUpdates.filter(
            (domain) =>
              domain.role.trim() &&
              (domain.owner.trim() || domain.pursuit.trim() || domain.risksOrBlockers.trim() || domain.decisionsOrOutcomes.trim())
          ),
          programMilestones: draft.programMilestones ?? []
        } satisfies ClientPortalUpdateInput)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          issues?: Array<{ field?: string; message?: string }>;
        };
        const firstIssue = payload.issues?.[0];
        const issueDetail = firstIssue?.field && firstIssue?.message ? ` ${firstIssue.field}: ${firstIssue.message}` : "";
        throw new Error(`${payload.error ?? "Client update could not be published."}${issueDetail}`);
      }

      const payload = (await response.json()) as { update?: ClientPortalUpdateRecord };
      if (payload.update) {
        setDraft(buildInitialClientUpdateDraft(review, teamRoleUpdates, payload.update));
      }
      setPublishState("published");
      setConfirmation("Client update published. This latest snapshot stays loaded for iteration.");
    } catch (error) {
      setPublishState("error");
      setConfirmation(error instanceof Error ? error.message : "Client update could not be published. Review the content and try again.");
    }
  }

  return (
    <Card data-active-client-update-builder className="border-emerald-300/15 bg-emerald-300/[0.035]">
      <CardHeader className="border-b border-emerald-300/10">
        <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-zinc-50">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
            Client-facing update
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Publishes to Client Portal
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 md:p-5">
        <div className="rounded-lg border border-emerald-300/15 bg-zinc-950/60 p-4">
          <p className="text-sm font-semibold text-zinc-100">Governed client publication layer</p>
          <p className="mt-2 max-w-4xl text-xs leading-5 text-zinc-400">
            Internal role updates, blockers, and working notes remain private. Publish only reviewed, client-ready language here
            when the executive portal should change.
          </p>
          <p className="mt-2 max-w-4xl text-xs leading-5 text-emerald-100/80">
            Client-safe copy rules block internal-only, relationship-sensitive, and commercial working language from being published.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-100">Client phase</span>
            <select
              data-active-client-update-current-phase
              value={draft.currentPhase}
              onChange={(event) => updateField("currentPhase", event.target.value)}
              className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
            >
              {clientPhaseOptions.map((phase) => (
                <option key={phase || "none"} value={phase}>
                  {phase || "Select the client-facing phase..."}
                </option>
              ))}
            </select>
            <span className="text-xs leading-5 text-zinc-500">
              This phase is client-facing and does not inherit internal program status text.
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-100">Executive overview</span>
            <textarea
              data-active-client-update-overview
              value={draft.clientStatusNote}
              onChange={(event) => updateField("clientStatusNote", event.target.value)}
              placeholder="Concise client-ready summary of current posture, progress, and what matters now."
              rows={4}
              className="min-h-[132px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-100">Program narrative</span>
            <textarea
              data-active-client-update-narrative
              value={draft.executiveOverview}
              onChange={(event) => updateField("executiveOverview", event.target.value)}
              placeholder="Expanded client-facing context. Keep it factual, diplomatic, and outcome-focused."
              rows={4}
              className="min-h-[132px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Recent accomplishments</span>
            <textarea
              data-active-client-update-accomplishments
              value={draft.progressSinceLastReview}
              onChange={(event) => updateField("progressSinceLastReview", event.target.value)}
              placeholder="One accomplishment per line."
              rows={4}
              className="min-h-[124px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Upcoming work</span>
            <textarea
              data-active-client-update-upcoming
              value={draft.upcomingWork}
              onChange={(event) => updateField("upcomingWork", event.target.value)}
              placeholder="One next-step or near-term activity per line."
              rows={4}
              className="min-h-[124px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Client-visible risks</span>
            <textarea
              data-active-client-update-risks
              value={draft.activeRisks}
              onChange={(event) => updateField("activeRisks", event.target.value)}
              placeholder="One client-visible risk, issue, or dependency per line."
              rows={3}
              className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Client decisions needed</span>
            <textarea
              data-active-client-update-decisions
              value={draft.decisionsPending}
              onChange={(event) => updateField("decisionsPending", event.target.value)}
              placeholder="One decision, owner ask, or pending alignment item per line."
              rows={3}
              className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-lg border border-white/10 bg-zinc-950/55 p-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-100">Domain pursuit summary</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Summarize what each domain is pursuing in language that is appropriate for client leadership.
            </p>
          </div>
          <div className="grid gap-3">
            {rolesWithUpdates.map((domain, index) => (
              <div key={domain.role} data-active-client-update-domain-row className="grid gap-3 rounded-md border border-white/10 bg-zinc-950 p-3 xl:grid-cols-[14rem_minmax(0,1fr)]">
                <div className="grid gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{domain.role}</p>
                    <p className="mt-1 text-xs text-zinc-500">Shown as a workstream in the Client Portal.</p>
                  </div>
                  <input
                    value={domain.owner}
                    onChange={(event) => updateDomain(index, "owner", event.target.value)}
                    placeholder={`${domain.role} owner`}
                    className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                  />
                  <select
                    value={domain.status}
                    onChange={(event) => updateDomain(index, "status", event.target.value)}
                    className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50"
                  >
                    <option value="on-track">{roleStatusLabel("on-track")}</option>
                    <option value="at-risk">{roleStatusLabel("at-risk")}</option>
                    <option value="blocked">{roleStatusLabel("blocked")}</option>
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <textarea
                    value={domain.pursuit}
                    onChange={(event) => updateDomain(index, "pursuit", event.target.value)}
                    placeholder="What this domain is pursuing."
                    rows={3}
                    className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                  />
                  <textarea
                    value={domain.risksOrBlockers}
                    onChange={(event) => updateDomain(index, "risksOrBlockers", event.target.value)}
                    placeholder="Client-visible risk or blocker."
                    rows={3}
                    className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                  />
                  <textarea
                    value={domain.decisionsOrOutcomes}
                    onChange={(event) => updateDomain(index, "decisionsOrOutcomes", event.target.value)}
                    placeholder="Decision, outcome, or next proof point."
                    rows={3}
                    className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-300/10 pt-4">
          <p className="max-w-3xl text-xs leading-5 text-zinc-500">
            Publishing creates an audited client-facing snapshot. It does not expose raw role updates, internal blockers, or
            tactical working notes.
          </p>
          <button
            type="button"
            data-active-client-update-publish
            onClick={publishClientUpdate}
            disabled={!canPublish}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendHorizonal className="h-4 w-4" />
            {publishState === "publishing" ? "Publishing..." : "Publish client update"}
          </button>
          {confirmation ? (
            <p
              data-active-client-update-confirmation
              className={cn(
                "w-full rounded-md border px-3 py-2 text-xs leading-5",
                publishState === "error"
                  ? "border-rose-300/25 bg-rose-300/[0.06] text-rose-100"
                  : "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100"
              )}
            >
              {confirmation}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
