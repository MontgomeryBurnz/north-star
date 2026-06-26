"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Activity, ArrowUpRight, CalendarClock, ChevronDown, Compass, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import type { ActiveProgramReview, ActiveProgramSaveConfirmation, ProgramTimelineMilestone } from "@/lib/active-program-types";
import { ProgramSlicer } from "@/components/program-slicer";
import type { ProgramSlicerOption } from "@/lib/program-slicer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ActiveProgramScalarField = keyof Omit<ActiveProgramReview, "artifacts" | "deliveryBoardItems" | "programMilestones" | "teamRoleUpdates">;
type SaveConfirmation = ActiveProgramSaveConfirmation;

type ActiveProgramStateCardProps = {
  selectedProgramId: string;
  clientPortfolioDraft: string;
  clientPortfolioSaveState: "idle" | "saving" | "saved" | "error";
  programOptions: ProgramSlicerOption[];
  review: ActiveProgramReview;
  onClientPortfolioChange: (value: string) => void;
  onSelectProgram: (programId: string) => void;
  onFieldChange: (field: ActiveProgramScalarField, value: string) => void;
  onAddTimelineMilestone: () => void;
  onRemoveTimelineMilestone: (milestoneId: string) => void;
  onSaveProfile: () => void;
  onSaveTimeline: () => void;
  onReorderTimelineMilestone: (draggedMilestoneId: string, targetMilestoneId: string) => void;
  onSaveClientPortfolio: () => void;
  onTimelineMilestoneChange: (milestoneId: string, field: keyof Omit<ProgramTimelineMilestone, "id">, value: string) => void;
  saveConfirmation: SaveConfirmation;
  saveState: "idle" | "saving" | "saved" | "error";
};

function timelineWindowLabel(review: ActiveProgramReview) {
  if (review.timelineScale === "week") return review.timelineWeek ? `Week of ${review.timelineWeek}` : "Week view";
  if (review.timelineScale === "month") return review.timelineMonth || "Month view";
  return review.timelineYear || "Year view";
}

export function ActiveProgramStateCard({
  selectedProgramId,
  clientPortfolioDraft,
  clientPortfolioSaveState,
  programOptions,
  review,
  onClientPortfolioChange,
  onSelectProgram,
  onFieldChange,
  onAddTimelineMilestone,
  onRemoveTimelineMilestone,
  onSaveProfile,
  onSaveClientPortfolio,
  onSaveTimeline,
  onReorderTimelineMilestone,
  onTimelineMilestoneChange,
  saveConfirmation,
  saveState
}: ActiveProgramStateCardProps) {
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [draggingMilestoneId, setDraggingMilestoneId] = useState<string | null>(null);
  const [dragOverMilestoneId, setDragOverMilestoneId] = useState<string | null>(null);
  const slicerOptions = useMemo(() => programOptions, [programOptions]);
  const selectedClientName = useMemo(
    () => slicerOptions.find((program) => program.id === selectedProgramId)?.clientName ?? "Unassigned client",
    [selectedProgramId, slicerOptions]
  );
  const hasSelectedProgram = Boolean(selectedProgramId);
  const timelineScale = review.timelineScale ?? "year";
  const programMilestones = review.programMilestones ?? [];
  const clientPortfolioConfirmationVisible = saveConfirmation?.scope === "Client portfolio";
  const profileConfirmationVisible = saveConfirmation?.scope === "Program profile";
  const timelineConfirmationVisible = saveConfirmation?.scope === "Program timeline";

  function handleMilestoneDragStart(event: DragEvent<HTMLElement>, milestoneId: string) {
    setDraggingMilestoneId(milestoneId);
    setDragOverMilestoneId(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", milestoneId);
  }

  function handleMilestoneDragOver(event: DragEvent<HTMLDivElement>, milestoneId: string) {
    event.preventDefault();
    if (!draggingMilestoneId || draggingMilestoneId === milestoneId) return;
    event.dataTransfer.dropEffect = "move";
    setDragOverMilestoneId(milestoneId);
  }

  function handleMilestoneDrop(event: DragEvent<HTMLDivElement>, targetMilestoneId: string) {
    event.preventDefault();
    const draggedMilestoneId = draggingMilestoneId ?? event.dataTransfer.getData("text/plain");
    if (draggedMilestoneId && draggedMilestoneId !== targetMilestoneId) {
      onReorderTimelineMilestone(draggedMilestoneId, targetMilestoneId);
    }
    setDraggingMilestoneId(null);
    setDragOverMilestoneId(null);
  }

  function handleMilestoneDragEnd() {
    setDraggingMilestoneId(null);
    setDragOverMilestoneId(null);
  }

  useEffect(() => {
    setIsSetupOpen(false);
    setDraggingMilestoneId(null);
    setDragOverMilestoneId(null);
  }, [selectedProgramId]);

  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-zinc-50">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-200" />
            Program profile
          </span>
          {hasSelectedProgram ? (
            <button
              type="button"
              onClick={() => setIsSetupOpen((current) => !current)}
              data-active-program-profile-toggle
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-cyan-300/30 hover:text-cyan-100"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {isSetupOpen ? "Close profile" : "Edit profile"}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isSetupOpen ? "rotate-180" : ""}`} />
            </button>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 md:p-5">
        <ProgramSlicer
          label="Select existing program"
          options={slicerOptions}
          selectedProgramId={selectedProgramId}
          onSelectProgram={onSelectProgram}
          placeholder="Choose a program to review..."
          emptyLabel="No saved programs yet"
          helperText="Selecting a program prefills the review with its north star, current risks, decisions, and delivery context."
          tone="cyan"
        />

        {!hasSelectedProgram ? (
          <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-100">
              <Compass className="h-4 w-4 text-cyan-200" />
              Select a program to manage the live operating view.
            </p>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
              Program setup is captured when the program is created. This page is optimized for weekly execution: role updates,
              progress board movement, and attached evidence.
            </p>
          </div>
        ) : null}

        {hasSelectedProgram ? (
          <div className="grid gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-4 md:grid-cols-4 xl:grid-cols-7">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-100">Client</p>
              <p className="mt-2 truncate text-sm font-semibold text-zinc-50">{selectedClientName}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Program</p>
              <p className="mt-2 truncate text-sm text-zinc-300">{review.programName || "Selected program"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Phase</p>
              <p className="mt-2 truncate text-sm text-zinc-300">{review.currentPhase || "Not set"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Cadence</p>
              <p className="mt-2 truncate text-sm text-zinc-300">
                {(review.updateCadence ?? "weekly") === "biweekly" ? "Bi-weekly cycle" : "Weekly cycle"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Schedule</p>
              <p className="mt-2 truncate text-sm text-zinc-300">
                {review.programStartDate && review.programTargetFinishDate
                  ? `${review.programStartDate} -> ${review.programTargetFinishDate}`
                  : review.programCompletionPercent
                    ? `${review.programCompletionPercent.replace(/%$/, "")}% manual`
                    : "Not set"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Milestone</p>
              <p className="mt-2 truncate text-sm text-zinc-300">{review.nextMilestoneName || "Not set"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Timeline</p>
              <p className="mt-2 truncate text-sm text-zinc-300">{timelineWindowLabel(review)}</p>
            </div>
          </div>
        ) : null}

        {isSetupOpen && hasSelectedProgram ? (
          <div className="grid gap-4 border-t border-white/10 pt-4">
            <div className="rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3">
              <p className="text-xs leading-5 text-amber-100">
                Profile fields should change only when the program baseline changes. Weekly movement belongs in Role update,
                Progress board, or Artifacts.
              </p>
            </div>
            <div data-active-program-client-assignment className="grid gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">Client portfolio</p>
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
                    Assign this active program to the client portfolio that should own it in slicers and the Client Portal.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Groups Client Portal
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <label className="grid gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Client / account name</span>
                  <input
                    data-active-client-portfolio-field
                    value={clientPortfolioDraft}
                    onChange={(event) => onClientPortfolioChange(event.target.value)}
                    placeholder="Client, account, or portfolio name"
                    className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                  />
                </label>
                <button
                  type="button"
                  data-active-client-portfolio-save
                  onClick={onSaveClientPortfolio}
                  disabled={clientPortfolioSaveState === "saving"}
                  className="self-end rounded-md border border-cyan-300/25 bg-cyan-300/[0.08] px-4 py-3 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-200/45 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {clientPortfolioSaveState === "saving" ? "Saving..." : "Save client"}
                </button>
              </div>
              {clientPortfolioConfirmationVisible || clientPortfolioSaveState === "saved" || clientPortfolioSaveState === "error" ? (
                <p
                  data-active-client-portfolio-save-confirmation
                  className={cn(
                    "rounded-md border px-3 py-2 text-xs leading-5",
                    clientPortfolioSaveState === "error" || saveConfirmation?.status === "error"
                      ? "border-rose-300/25 bg-rose-300/[0.06] text-rose-100"
                      : "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100"
                  )}
                >
                  {clientPortfolioSaveState === "error" || (clientPortfolioConfirmationVisible && saveConfirmation?.status === "error")
                    ? (clientPortfolioConfirmationVisible ? saveConfirmation?.detail : undefined) ?? "Client portfolio could not be saved."
                    : (clientPortfolioConfirmationVisible ? saveConfirmation?.detail : undefined) ??
                      `Client portfolio saved${clientPortfolioConfirmationVisible && saveConfirmation?.savedAt ? ` at ${saveConfirmation.savedAt}` : ""}.`}
                </p>
              ) : null}
            </div>
            <label className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program name</span>
              <input
                value={review.programName}
                onChange={(event) => onFieldChange("programName", event.target.value)}
                placeholder="Active program, client, initiative, or workstream name"
                className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Update cadence</span>
                <select
                  value={review.updateCadence ?? "weekly"}
                  onChange={(event) => onFieldChange("updateCadence", event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                >
                  <option value="weekly">Weekly cycle</option>
                  <option value="biweekly">Bi-weekly cycle</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Current phase</span>
                <input
                  value={review.currentPhase}
                  onChange={(event) => onFieldChange("currentPhase", event.target.value)}
                  placeholder="Discovery, build, launch, stabilization, or recovery"
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                />
              </label>

              <div data-active-program-client-portal-fields className="grid gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-3 md:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">Client / executive update fields</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      These fields help draft the client-facing update. The Client Portal changes only after a reviewed update is published.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Client update input
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Executive sponsor</span>
                    <input
                      data-active-executive-sponsor
                      value={review.executiveSponsor ?? ""}
                      onChange={(event) => onFieldChange("executiveSponsor", event.target.value)}
                      placeholder="Sponsor name"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program lead</span>
                    <input
                      data-active-program-lead
                      value={review.programLead ?? ""}
                      onChange={(event) => onFieldChange("programLead", event.target.value)}
                      placeholder="Delivery or program lead"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">PMO</span>
                    <input
                      data-active-pmo
                      value={review.pmo ?? ""}
                      onChange={(event) => onFieldChange("pmo", event.target.value)}
                      placeholder="PMO or operating owner"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program start</span>
                    <input
                      data-active-program-start-date
                      type="date"
                      value={review.programStartDate ?? ""}
                      onChange={(event) => onFieldChange("programStartDate", event.target.value)}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Expected finish</span>
                    <input
                      data-active-program-target-finish-date
                      type="date"
                      value={review.programTargetFinishDate ?? ""}
                      onChange={(event) => onFieldChange("programTargetFinishDate", event.target.value)}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Manual % override</span>
                    <input
                      data-active-program-completion
                      type="number"
                      min="0"
                      max="100"
                      value={review.programCompletionPercent ?? ""}
                      onChange={(event) => onFieldChange("programCompletionPercent", event.target.value)}
                      placeholder="Optional"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                    <span className="text-xs leading-5 text-zinc-500">Used only when program dates are not set.</span>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Completion delta</span>
                    <input
                      data-active-completion-delta
                      value={review.completionDelta ?? ""}
                      onChange={(event) => onFieldChange("completionDelta", event.target.value)}
                      placeholder="+6%"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Next milestone priority</span>
                    <select
                      data-active-next-milestone-priority
                      value={review.nextMilestonePriority ?? ""}
                      onChange={(event) => onFieldChange("nextMilestonePriority", event.target.value)}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    >
                      <option value="">Auto</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </label>

                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Next milestone</span>
                    <input
                      data-active-next-milestone
                      value={review.nextMilestoneName ?? ""}
                      onChange={(event) => onFieldChange("nextMilestoneName", event.target.value)}
                      placeholder="Scope baseline, pilot readiness, go-live, or next steering checkpoint"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Milestone date</span>
                    <input
                      data-active-next-milestone-date
                      type="date"
                      value={review.nextMilestoneDate ?? ""}
                      onChange={(event) => onFieldChange("nextMilestoneDate", event.target.value)}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2 md:col-span-3">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Client status note</span>
                    <textarea
                      data-active-client-status-note
                      value={review.clientStatusNote ?? ""}
                      onChange={(event) => onFieldChange("clientStatusNote", event.target.value)}
                      placeholder="Draft a concise executive-facing status note for the client update."
                      rows={3}
                      className="min-h-[96px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                    />
                  </label>
                </div>
              </div>

              <div data-active-program-timeline-fields className="grid gap-4 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.035] p-3 md:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-100">
                      <CalendarClock className="h-4 w-4 text-emerald-200" />
                      Timeline planning
                    </p>
                    <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
                      Set the planning window and key checkpoints that can be published into the Client Portal roadmap and milestone timeline.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Client update input
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Timeline view</span>
                    <select
                      data-active-timeline-scale
                      value={timelineScale}
                      onChange={(event) => onFieldChange("timelineScale", event.target.value)}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    >
                      <option value="year">Year</option>
                      <option value="month">Month</option>
                      <option value="week">Week</option>
                    </select>
                  </label>

                  {timelineScale === "year" ? (
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program year</span>
                      <input
                        data-active-timeline-year
                        value={review.timelineYear ?? ""}
                        onChange={(event) => onFieldChange("timelineYear", event.target.value)}
                        placeholder="FY25, 2026, or client planning year"
                        className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                      />
                    </label>
                  ) : null}

                  {timelineScale === "month" ? (
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program month</span>
                      <input
                        data-active-timeline-month
                        type="month"
                        value={review.timelineMonth ?? ""}
                        onChange={(event) => onFieldChange("timelineMonth", event.target.value)}
                        className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                      />
                    </label>
                  ) : null}

                  {timelineScale === "week" ? (
                    <label className="grid gap-2 md:col-span-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Week starting</span>
                      <input
                        data-active-timeline-week
                        type="date"
                        value={review.timelineWeek ?? ""}
                        onChange={(event) => onFieldChange("timelineWeek", event.target.value)}
                        className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                      />
                    </label>
                  ) : null}
                </div>

                <div data-active-program-milestones className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Key milestones</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">Create the checkpoints the team and client should track.</p>
                    </div>
                    <button
                      type="button"
                      data-active-program-add-milestone
                      onClick={onAddTimelineMilestone}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-300/25 bg-emerald-300/[0.08] px-3 text-sm font-semibold text-emerald-100 transition-colors hover:border-emerald-200/45"
                    >
                      <Plus className="h-4 w-4" />
                      Add milestone
                    </button>
                  </div>

                  {programMilestones.length ? (
                    <div className="grid gap-3">
                      {programMilestones.map((milestone, index) => (
                        <div
                          key={milestone.id}
                          data-active-program-milestone-row
                          onDragOver={(event) => handleMilestoneDragOver(event, milestone.id)}
                          onDrop={(event) => handleMilestoneDrop(event, milestone.id)}
                          className={cn(
                            "grid gap-3 rounded-md border bg-zinc-950/70 p-3 transition-colors",
                            dragOverMilestoneId === milestone.id ? "border-emerald-300/45 bg-emerald-300/[0.06]" : "border-white/10",
                            draggingMilestoneId === milestone.id ? "opacity-60" : ""
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Milestone {index + 1}</p>
                              <p className="mt-1 text-xs text-zinc-500">Drag the handle to reorder the client timeline.</p>
                            </div>
                            <button
                              type="button"
                              draggable={programMilestones.length > 1}
                              data-active-program-milestone-drag-handle
                              onDragStart={(event) => handleMilestoneDragStart(event, milestone.id)}
                              onDragEnd={handleMilestoneDragEnd}
                              className={cn(
                                "inline-flex min-h-9 cursor-grab items-center rounded-md border border-white/10 bg-white/[0.035] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400 transition-colors active:cursor-grabbing",
                                programMilestones.length > 1 ? "hover:border-emerald-300/30 hover:text-emerald-100" : "cursor-not-allowed opacity-50"
                              )}
                              aria-label={`Drag ${milestone.name || "milestone"} to reorder`}
                            >
                              Reorder
                            </button>
                          </div>
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_10rem_10rem_9rem_auto]">
                            <label className="grid gap-2">
                              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Milestone</span>
                              <input
                                data-active-program-milestone-name
                                value={milestone.name}
                                onChange={(event) => onTimelineMilestoneChange(milestone.id, "name", event.target.value)}
                                placeholder="Scope baseline, pilot readiness, go-live..."
                                className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-400 focus:border-cyan-300/50"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Date</span>
                              <input
                                data-active-program-milestone-date
                                type="date"
                                value={milestone.date}
                                onChange={(event) => onTimelineMilestoneChange(milestone.id, "date", event.target.value)}
                                className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Status</span>
                              <select
                                data-active-program-milestone-status
                                value={milestone.status}
                                onChange={(event) => onTimelineMilestoneChange(milestone.id, "status", event.target.value)}
                                className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                              >
                                <option value="complete">Complete</option>
                                <option value="current">Current</option>
                                <option value="next">Next</option>
                              </select>
                            </label>
                            <label className="grid gap-2">
                              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Priority</span>
                              <select
                                data-active-program-milestone-priority
                                value={milestone.priority ?? ""}
                                onChange={(event) => onTimelineMilestoneChange(milestone.id, "priority", event.target.value)}
                                className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                              >
                                <option value="">Auto</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </label>
                            <button
                              type="button"
                              data-active-program-remove-milestone
                              onClick={() => onRemoveTimelineMilestone(milestone.id)}
                              className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:border-rose-300/40 hover:text-rose-200"
                              aria-label={`Remove ${milestone.name || "milestone"}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <label className="grid gap-2">
                            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Milestone note</span>
                            <textarea
                              data-active-program-milestone-note
                              value={milestone.note}
                              onChange={(event) => onTimelineMilestoneChange(milestone.id, "note", event.target.value)}
                              placeholder="What this checkpoint proves, unlocks, or requires."
                              rows={2}
                              className="min-h-[76px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-400 focus:border-cyan-300/50"
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-white/10 bg-zinc-950/50 p-4 text-sm leading-6 text-zinc-500">
                      No custom milestones yet. Add checkpoints that can be published into the Client Portal timeline.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-300/10 pt-3">
                  <p className="max-w-2xl text-xs leading-5 text-zinc-500">
                    Save timeline after changing the planning window, milestone details, or milestone order.
                  </p>
                  <button
                    type="button"
                    data-active-program-timeline-save
                    onClick={onSaveTimeline}
                    disabled={saveState === "saving"}
                    className="inline-flex min-h-10 items-center justify-center rounded-md bg-emerald-300 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saveState === "saving" && timelineConfirmationVisible ? "Saving timeline..." : "Save timeline"}
                  </button>
                  {timelineConfirmationVisible ? (
                    <p data-active-program-timeline-save-confirmation className="w-full text-sm font-medium text-emerald-100">
                      {saveConfirmation?.status === "saved"
                        ? "Timeline saved. Publish a client update when the portal should change."
                        : saveConfirmation?.status === "warning"
                          ? `Timeline saved. ${saveConfirmation.detail ?? "Guidance refresh needs attention."}`
                        : saveConfirmation?.status === "error"
                          ? "Timeline save failed. Try again."
                          : "Saving program timeline..."}
                    </p>
                  ) : null}
                </div>
              </div>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Original north star</span>
                <textarea
                  value={review.originalNorthStar}
                  onChange={(event) => onFieldChange("originalNorthStar", event.target.value)}
                  placeholder="What outcome is the team still trying to protect as conditions change?"
                  rows={3}
                  className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Stakeholder temperature</span>
                <textarea
                  value={review.stakeholderTemperature}
                  onChange={(event) => onFieldChange("stakeholderTemperature", event.target.value)}
                  placeholder="Where are stakeholders aligned, uncertain, frustrated, or split?"
                  rows={3}
                  className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Delivery health</span>
                <textarea
                  value={review.deliveryHealth}
                  onChange={(event) => onFieldChange("deliveryHealth", event.target.value)}
                  placeholder="Where does the program feel healthy, overloaded, noisy, or fragile?"
                  rows={3}
                  className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                />
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Program synthesis note</span>
                <textarea
                  value={review.programSynthesisNote ?? ""}
                  onChange={(event) => onFieldChange("programSynthesisNote", event.target.value)}
                  placeholder="Capture the delivery-lead synthesis of how the team inputs change the weekly picture."
                  rows={3}
                  className="min-h-[112px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-300 focus:border-cyan-300/50"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="max-w-2xl text-xs leading-5 text-zinc-500">
                Saving the profile refreshes the active program record and guided plan inputs. Publish a client update when the Client Portal should change.
              </p>
              <button
                type="button"
                data-active-program-profile-save
                onClick={onSaveProfile}
                disabled={saveState === "saving"}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-300 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveState === "saving" && profileConfirmationVisible ? "Saving profile..." : "Save profile"}
              </button>
              {profileConfirmationVisible ? (
                <p data-active-program-profile-save-confirmation className="w-full text-sm font-medium text-emerald-100">
                  {saveConfirmation?.status === "saved"
                    ? "Program profile saved and guidance refresh started."
                    : saveConfirmation?.status === "warning"
                      ? `Program profile saved. ${saveConfirmation.detail ?? "Guidance refresh needs attention."}`
                    : saveConfirmation?.status === "error"
                      ? "Profile save failed. Try again."
                      : "Saving program profile..."}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
