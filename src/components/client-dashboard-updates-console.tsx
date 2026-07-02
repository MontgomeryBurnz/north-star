"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, Plus, SendHorizonal, ShieldCheck, Trash2 } from "lucide-react";
import { ProgramSlicer } from "@/components/program-slicer";
import { Button } from "@/components/ui/button";
import type {
  ClientPortalDomainUpdate,
  ClientPortalRoadmapItem,
  ClientPortalUpdateInput
} from "@/lib/client-portal-update-types";
import type { StoredProgram } from "@/lib/program-intake-types";
import { programsToSlicerOptions } from "@/lib/program-slicer";
import { getProgramTeamFootprint } from "@/lib/team-roles";
import { cn } from "@/lib/utils";

type PublishState = "idle" | "publishing" | "published" | "error";
type ClientDashboardDraft = Omit<ClientPortalUpdateInput, "domainUpdates"> & {
  domainUpdates: ClientPortalDomainUpdate[];
};

type ClientDashboardUpdatesConsoleProps = {
  currentUserName: string;
  programs: StoredProgram[];
  restrictedMode?: boolean;
};

const statusOptions = [
  { label: "On track", value: "on-track" },
  { label: "At risk", value: "at-risk" },
  { label: "Blocked", value: "blocked" }
] as const;

const roadmapStatusOptions = [
  { label: "Planned", value: "planned" },
  { label: "In progress", value: "in-progress" },
  { label: "At risk", value: "at-risk" },
  { label: "Blocked", value: "blocked" },
  { label: "Complete", value: "complete" }
] as const;

const clientPhaseOptions = ["", "Intake", "Plan", "Execute", "Stabilize", "Value"] as const;

const roadmapMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric"
});

function monthKeyFromDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseRoadmapMonth(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return null;

  return new Date(Date.UTC(year, monthIndex, 1));
}

function addMonths(date: Date, monthOffset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1));
}

function formatRoadmapMonth(value: string) {
  const date = parseRoadmapMonth(value);
  return date ? roadmapMonthFormatter.format(date) : value;
}

function buildRoadmapMonthOptions(program: StoredProgram | undefined, items: ClientPortalRoadmapItem[]) {
  const existingMonths = items
    .flatMap((item) => [parseRoadmapMonth(item.startMonth), parseRoadmapMonth(item.endMonth)])
    .filter((date): date is Date => Boolean(date));
  const programAnchor = new Date(program?.createdAt ?? program?.updatedAt ?? Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const anchor = existingMonths.length
    ? new Date(Math.min(...existingMonths.map((date) => date.getTime()), programAnchor.getTime()))
    : programAnchor;
  const firstMonth = addMonths(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1)), -2);
  const optionValues = new Set<string>();

  for (let offset = 0; offset < 30; offset += 1) {
    optionValues.add(monthKeyFromDate(addMonths(firstMonth, offset)));
  }

  for (const date of existingMonths) {
    optionValues.add(monthKeyFromDate(date));
  }

  return [...optionValues].sort().map((value) => ({
    label: formatRoadmapMonth(value),
    value
  }));
}

function createRoadmapItem(): ClientPortalRoadmapItem {
  return {
    category: "",
    endMonth: "",
    id: globalThis.crypto?.randomUUID?.() ?? `roadmap-${Date.now()}`,
    note: "",
    owner: "",
    startMonth: "",
    status: "planned",
    title: ""
  };
}

function buildDraft(program: StoredProgram | undefined): ClientDashboardDraft {
  const intake = program?.intake;
  const footprint = program ? getProgramTeamFootprint(intake).filter((item) => item.active !== false) : [];

  return {
    activeRisks: "",
    clientStatusNote: "",
    clientRoadmapItems: [],
    completionDelta: "",
    currentPhase: "",
    decisionsPending: "",
    deliveryBoardItems: [],
    deliveryHealth: "",
    domainUpdates: footprint.map((item) => ({
      attachments: 0,
      decisionsOrOutcomes: "",
      owner: item.owner,
      pursuit: item.responsibility,
      risksOrBlockers: "",
      role: item.role,
      status: "on-track"
    })),
    executiveOverview: "",
    executiveSponsor: "",
    nextMilestoneDate: "",
    nextMilestoneName: "",
    nextMilestonePriority: "",
    originalNorthStar: "",
    pmo: "",
    programCompletionPercent: "",
    programLead: "",
    programMilestones: [],
    programStartDate: "",
    programTargetFinishDate: "",
    progressSinceLastReview: "",
    publicationNote: "",
    supportNeeded: "",
    timelineMonth: "",
    timelineScale: "year",
    timelineWeek: "",
    timelineYear: "",
    upcomingWork: ""
  };
}

function hasPublishableContent(draft: ClientDashboardDraft) {
  return Boolean(
    draft.clientStatusNote.trim() ||
      draft.executiveOverview.trim() ||
      draft.progressSinceLastReview.trim() ||
      draft.upcomingWork.trim() ||
      draft.activeRisks.trim() ||
      draft.decisionsPending.trim() ||
      (draft.clientRoadmapItems ?? []).some(
        (item) => item.category.trim() && item.title.trim() && item.startMonth.trim() && item.endMonth.trim()
      ) ||
      draft.domainUpdates.some((domain) =>
        [domain.owner, domain.pursuit, domain.risksOrBlockers, domain.decisionsOrOutcomes].some((value) => value.trim())
      )
  );
}

function toPayload(draft: ClientDashboardDraft): ClientPortalUpdateInput {
  return {
    ...draft,
    clientRoadmapItems: (draft.clientRoadmapItems ?? []).filter((item) =>
      item.category.trim() && item.title.trim() && item.startMonth.trim() && item.endMonth.trim()
    ),
    domainUpdates: draft.domainUpdates.filter((domain) =>
      domain.role.trim() &&
      [domain.owner, domain.pursuit, domain.risksOrBlockers, domain.decisionsOrOutcomes].some((value) => value.trim())
    ),
    programMilestones: draft.programMilestones ?? []
  };
}

export function ClientDashboardUpdatesConsole({
  currentUserName,
  programs,
  restrictedMode = false
}: ClientDashboardUpdatesConsoleProps) {
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === selectedProgramId),
    [programs, selectedProgramId]
  );
  const programOptions = useMemo(() => programsToSlicerOptions(programs, "signal"), [programs]);
  const [draft, setDraft] = useState<ClientDashboardDraft>(() => buildDraft(undefined));
  const roadmapMonthOptions = useMemo(
    () => buildRoadmapMonthOptions(selectedProgram, draft.clientRoadmapItems ?? []),
    [draft.clientRoadmapItems, selectedProgram]
  );
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [status, setStatus] = useState("");
  const canPublish = Boolean(selectedProgramId && hasPublishableContent(draft) && publishState !== "publishing");

  useEffect(() => {
    setDraft(buildDraft(selectedProgram));
    setPublishState("idle");
    setStatus("");
  }, [selectedProgram]);

  function updateField(
    field: keyof Omit<ClientDashboardDraft, "clientRoadmapItems" | "deliveryBoardItems" | "domainUpdates" | "programMilestones">,
    value: string
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setPublishState("idle");
  }

  function updateDomain(index: number, field: keyof ClientPortalDomainUpdate, value: string) {
    setDraft((current) => ({
      ...current,
      domainUpdates: current.domainUpdates.map((domain, currentIndex) =>
        currentIndex === index
          ? {
              ...domain,
              [field]: field === "status" ? (value as ClientPortalDomainUpdate["status"]) : value
            }
          : domain
      )
    }));
    setPublishState("idle");
  }

  function addRoadmapItem() {
    setDraft((current) => ({
      ...current,
      clientRoadmapItems: [...(current.clientRoadmapItems ?? []), createRoadmapItem()]
    }));
    setPublishState("idle");
  }

  function removeRoadmapItem(index: number) {
    setDraft((current) => ({
      ...current,
      clientRoadmapItems: (current.clientRoadmapItems ?? []).filter((_, currentIndex) => currentIndex !== index)
    }));
    setPublishState("idle");
  }

  function updateRoadmapItem(index: number, field: keyof ClientPortalRoadmapItem, value: string) {
    setDraft((current) => ({
      ...current,
      clientRoadmapItems: (current.clientRoadmapItems ?? []).map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              [field]: field === "status" ? (value as ClientPortalRoadmapItem["status"]) : value
            }
          : item
      )
    }));
    setPublishState("idle");
  }

  async function publishUpdate() {
    if (!selectedProgramId || !hasPublishableContent(draft)) {
      setPublishState("error");
      setStatus("Select a program and add client-facing content before publishing.");
      return;
    }

    setPublishState("publishing");
    setStatus("Publishing client dashboard update...");

    try {
      const response = await fetch(`/api/programs/${encodeURIComponent(selectedProgramId)}/client-updates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...toPayload(draft),
          createdBy: currentUserName || undefined,
          publicationNote: draft.publicationNote || "Published from Client Updates."
        } satisfies ClientPortalUpdateInput)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          issues?: Array<{ field?: string; message?: string }>;
        };
        const issue = payload.issues?.[0];
        const issueText = issue?.field && issue?.message ? ` ${issue.field}: ${issue.message}` : "";
        throw new Error(`${payload.error ?? "Client dashboard update could not be published."}${issueText}`);
      }

      setPublishState("published");
      setStatus("Client dashboard update published. The Client Portal now reflects this reviewed snapshot.");
    } catch (error) {
      setPublishState("error");
      setStatus(error instanceof Error ? error.message : "Client dashboard update could not be published.");
    }
  }

  return (
    <section className="northstar-shell py-8" data-client-dashboard-updates-console>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <aside className="grid content-start gap-4">
          <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.045] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-emerald-300/25 bg-emerald-300/[0.08]">
                <ShieldCheck className="h-4 w-4 text-emerald-100" />
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-100">Governed client publication lane</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  This surface is only for reviewed client-dashboard content. Internal blockers, tactical notes, and relationship-sensitive working context stay out of the Client Portal.
                </p>
                {restrictedMode ? (
                  <p className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] px-3 py-2 text-xs leading-5 text-cyan-100">
                    Your access is scoped to Client Dashboard updates for assigned programs.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
            <ProgramSlicer
              label="Program"
              onSelectProgram={setSelectedProgramId}
              options={programOptions}
              placeholder="Select a program to publish..."
              selectedProgramId={selectedProgramId}
              helperText="Only assigned programs are available to scoped Client Dashboard contributors."
            />
          </div>

          {selectedProgram ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Selected program</p>
              <h2 className="mt-3 text-2xl font-semibold text-zinc-50">{selectedProgram.intake.programName}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Client: {selectedProgram.intake.clientName?.trim() || "Client not set"} · Lead:{" "}
                {selectedProgram.intake.programOwner?.trim() || "Program lead not set"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="outline" className="border-white/10 bg-white/[0.035]">
                  <Link href="/client">
                    Preview Client Portal
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-medium text-zinc-100">Select a program to begin.</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                The form will load the program's role footprint so domain owners can publish a clean client-facing update.
              </p>
            </div>
          )}
        </aside>

        <div className="grid gap-4">
          <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">Executive snapshot</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-50">What should the client see this cycle?</h2>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100">
                Client-safe input
              </span>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <label className="grid gap-2 lg:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Client phase</span>
                <select
                  data-client-dashboard-current-phase
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
                  This is published to the Client Portal. It intentionally does not inherit internal program status text.
                </span>
              </label>

              <label className="grid gap-2 lg:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Executive overview</span>
                <textarea
                  data-client-dashboard-overview
                  value={draft.clientStatusNote}
                  onChange={(event) => updateField("clientStatusNote", event.target.value)}
                  placeholder="A concise, client-ready summary of current posture, progress, and what matters now."
                  rows={4}
                  className="min-h-[126px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Recent accomplishments</span>
                <textarea
                  data-client-dashboard-progress
                  value={draft.progressSinceLastReview}
                  onChange={(event) => updateField("progressSinceLastReview", event.target.value)}
                  placeholder="One accomplishment per line."
                  rows={3}
                  className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Upcoming work</span>
                <textarea
                  data-client-dashboard-upcoming
                  value={draft.upcomingWork}
                  onChange={(event) => updateField("upcomingWork", event.target.value)}
                  placeholder="One near-term activity or next step per line."
                  rows={3}
                  className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Client-visible risks</span>
                <textarea
                  data-client-dashboard-risks
                  value={draft.activeRisks}
                  onChange={(event) => updateField("activeRisks", event.target.value)}
                  placeholder="One client-visible risk, issue, or dependency per line."
                  rows={3}
                  className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-300">Client decisions needed</span>
                <textarea
                  data-client-dashboard-decisions
                  value={draft.decisionsPending}
                  onChange={(event) => updateField("decisionsPending", event.target.value)}
                  placeholder="One decision, owner ask, or alignment item per line."
                  rows={3}
                  className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-emerald-300/50"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-200">Client roadmap</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-50">What active work should the client track?</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                  Add client-visible work items by category and month range. These rows power the roadmap view in the Client Portal.
                </p>
              </div>
              <button
                type="button"
                data-client-dashboard-roadmap-add
                onClick={addRoadmapItem}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-sky-300/25 bg-sky-300/[0.08] px-3 text-sm font-semibold text-sky-100 transition-colors hover:border-sky-300/45 hover:bg-sky-300/[0.12]"
              >
                <Plus className="h-4 w-4" />
                Add roadmap row
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {(draft.clientRoadmapItems ?? []).length ? (
                (draft.clientRoadmapItems ?? []).map((item, index) => (
                  <div
                    key={item.id ?? `roadmap-${index}`}
                    data-client-dashboard-roadmap-row
                    className="rounded-md border border-white/10 bg-white/[0.025] p-3"
                  >
                    <div className="grid gap-3 xl:grid-cols-[minmax(10rem,0.75fr)_minmax(14rem,1.25fr)_repeat(2,minmax(8rem,0.75fr))_minmax(9rem,0.8fr)_auto]">
                      <label className="grid gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">Category</span>
                        <input
                          data-client-dashboard-roadmap-category
                          value={item.category}
                          onChange={(event) => updateRoadmapItem(index, "category", event.target.value)}
                          placeholder="Components"
                          className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/50"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">Work item</span>
                        <input
                          data-client-dashboard-roadmap-title
                          value={item.title}
                          onChange={(event) => updateRoadmapItem(index, "title", event.target.value)}
                          placeholder="Product Requests"
                          className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/50"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">Start</span>
                        <select
                          data-client-dashboard-roadmap-start
                          value={item.startMonth}
                          onChange={(event) => updateRoadmapItem(index, "startMonth", event.target.value)}
                          className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-sky-300/50"
                        >
                          <option value="">Select month...</option>
                          {roadmapMonthOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">End</span>
                        <select
                          data-client-dashboard-roadmap-end
                          value={item.endMonth}
                          onChange={(event) => updateRoadmapItem(index, "endMonth", event.target.value)}
                          className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-sky-300/50"
                        >
                          <option value="">Select month...</option>
                          {roadmapMonthOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">Status</span>
                        <select
                          data-client-dashboard-roadmap-status
                          value={item.status}
                          onChange={(event) => updateRoadmapItem(index, "status", event.target.value)}
                          className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-sky-300/50"
                        >
                          {roadmapStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        aria-label="Remove roadmap row"
                        onClick={() => removeRoadmapItem(index)}
                        className="self-end inline-flex min-h-10 items-center justify-center rounded-md border border-white/10 bg-zinc-950 px-3 text-zinc-400 transition-colors hover:border-rose-300/35 hover:text-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(10rem,0.4fr)_minmax(0,1fr)]">
                      <label className="grid gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">Owner</span>
                        <input
                          data-client-dashboard-roadmap-owner
                          value={item.owner}
                          onChange={(event) => updateRoadmapItem(index, "owner", event.target.value)}
                          placeholder="Product lead"
                          className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/50"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">Client-facing note</span>
                        <input
                          data-client-dashboard-roadmap-note
                          value={item.note}
                          onChange={(event) => updateRoadmapItem(index, "note", event.target.value)}
                          placeholder="What progress or dependency should the client understand?"
                          className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/50"
                        />
                      </label>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-sky-300/25 bg-sky-300/[0.04] p-4 text-sm leading-6 text-zinc-400">
                  No roadmap rows yet. Add the client-visible components, workstreams, or initiatives your customer should track over time.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-950/80 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Domain updates</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-50">What is each function pursuing?</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                {draft.domainUpdates.length} roles
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {draft.domainUpdates.length ? (
                draft.domainUpdates.map((domain, index) => (
                  <div
                    key={`${domain.role}-${index}`}
                    data-client-dashboard-domain-row
                    className="grid gap-3 rounded-md border border-white/10 bg-white/[0.025] p-3 xl:grid-cols-[14rem_minmax(0,1fr)]"
                  >
                    <div className="grid gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{domain.role}</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">Client Portal workstream lane</p>
                      </div>
                      <input
                        value={domain.owner}
                        onChange={(event) => updateDomain(index, "owner", event.target.value)}
                        placeholder={`${domain.role} owner`}
                        className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                      />
                      <select
                        value={domain.status}
                        onChange={(event) => updateDomain(index, "status", event.target.value)}
                        className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <textarea
                        value={domain.pursuit}
                        onChange={(event) => updateDomain(index, "pursuit", event.target.value)}
                        placeholder="What this domain is pursuing."
                        rows={3}
                        className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                      />
                      <textarea
                        value={domain.risksOrBlockers}
                        onChange={(event) => updateDomain(index, "risksOrBlockers", event.target.value)}
                        placeholder="Client-visible risk or dependency."
                        rows={3}
                        className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                      />
                      <textarea
                        value={domain.decisionsOrOutcomes}
                        onChange={(event) => updateDomain(index, "decisionsOrOutcomes", event.target.value)}
                        placeholder="Decision, outcome, or next proof point."
                        rows={3}
                        className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-500">
                  Select a program with a Team Footprint to load client-facing domain lanes.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/80 p-4">
            <p className="max-w-3xl text-xs leading-5 text-zinc-500">
              Publishing creates an audited client-facing snapshot. It does not publish raw role updates, internal blockers, or tactical working notes.
            </p>
            <button
              type="button"
              data-client-dashboard-publish
              onClick={publishUpdate}
              disabled={!canPublish}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SendHorizonal className="h-4 w-4" />
              {publishState === "publishing" ? "Publishing..." : "Publish to Client Portal"}
            </button>
            {status ? (
              <p
                data-client-dashboard-confirmation
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-xs leading-5",
                  publishState === "error"
                    ? "border-rose-300/25 bg-rose-300/[0.06] text-rose-100"
                    : "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100"
                )}
              >
                {publishState === "published" ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}
                {status}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
