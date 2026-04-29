"use client";

import { useState } from "react";
import { ChevronDown, Save, Users2 } from "lucide-react";
import type { TeamRoleUpdate, TeamRoleUpdateStatus } from "@/lib/active-program-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const roleStatusOptions: Array<{ value: TeamRoleUpdateStatus; label: string }> = [
  { value: "on-track", label: "On track" },
  { value: "at-risk", label: "At risk" },
  { value: "blocked", label: "Blocked" }
];

function hasRoleSubmission(roleUpdate: TeamRoleUpdate) {
  return Boolean(
    roleUpdate.status !== "on-track" ||
      roleUpdate.needsLeadershipAttention ||
      roleUpdate.progressUpdate.trim() ||
      roleUpdate.changesObserved.trim() ||
      roleUpdate.activeRisks.trim() ||
      roleUpdate.blockers.trim() ||
      roleUpdate.decisionsNeeded.trim() ||
      roleUpdate.supportNeeded.trim()
  );
}

function roleStatusClassName(status: TeamRoleUpdateStatus) {
  if (status === "blocked") return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  if (status === "at-risk") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
}

function firstRoleSignal(roleUpdate: TeamRoleUpdate) {
  return (
    roleUpdate.progressUpdate.trim() ||
    roleUpdate.activeRisks.trim() ||
    roleUpdate.blockers.trim() ||
    roleUpdate.decisionsNeeded.trim() ||
    roleUpdate.supportNeeded.trim() ||
    roleUpdate.changesObserved.trim()
  );
}

type ActiveProgramTeamUpdatesCardProps = {
  teamRoleUpdates: TeamRoleUpdate[];
  ownerCoverage: {
    configured: number;
    total: number;
  };
  saveState: "idle" | "saving" | "saved" | "error";
  ownershipSaveState: "idle" | "dirty" | "saving" | "saved" | "error";
  ownershipSavedAt: string | null;
  formatTimestamp: (value: string) => string;
  onUpdateRoleField: (role: string, field: keyof Omit<TeamRoleUpdate, "role">, value: string | boolean) => void;
  onSaveOwnership: () => void | Promise<void>;
  onSaveRoleSignal: (role: string) => void | Promise<void>;
};

export function ActiveProgramTeamUpdatesCard({
  teamRoleUpdates,
  ownerCoverage,
  saveState,
  ownershipSaveState,
  ownershipSavedAt,
  formatTimestamp,
  onUpdateRoleField,
  onSaveOwnership,
  onSaveRoleSignal
}: ActiveProgramTeamUpdatesCardProps) {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const ownershipStatus =
    ownershipSaveState === "saving"
      ? "Saving..."
      : ownershipSaveState === "saved"
        ? ownershipSavedAt
          ? `Saved at ${ownershipSavedAt}`
          : "Saved"
        : ownershipSaveState === "error"
          ? "Save failed"
          : ownershipSaveState === "dirty"
            ? "Unsaved changes"
            : "Not saved yet";
  const ownershipStatusClassName =
    ownershipSaveState === "saved"
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
      : ownershipSaveState === "dirty"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : ownershipSaveState === "error"
          ? "border-rose-300/25 bg-rose-300/10 text-rose-100"
          : "border-white/10 bg-black/20 text-zinc-300";

  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <Users2 className="h-4 w-4 text-cyan-200" />
          Team signal
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 md:p-5">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">Team ownership</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Map the regular owner once. Save ownership here or save the full cycle synthesis below.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-300">
                {ownerCoverage.configured}/{ownerCoverage.total} mapped
              </span>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${ownershipStatusClassName}`}>
                {ownershipStatus}
              </span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {teamRoleUpdates.map((roleUpdate) => (
              <label key={roleUpdate.role} className="grid min-w-0 gap-2">
                <span className="truncate text-xs font-medium text-zinc-300">{roleUpdate.role}</span>
                <input
                  value={roleUpdate.updatedBy}
                  onChange={(event) => onUpdateRoleField(roleUpdate.role, "updatedBy", event.target.value)}
                  placeholder="Owner name"
                  className="min-h-10 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
            <p className="text-xs leading-5 text-zinc-500">
              Owner names are retained as the default updater for future team signals.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onSaveOwnership()}
              disabled={ownershipSaveState === "saving" || ownershipSaveState === "idle" || ownershipSaveState === "saved"}
            >
              <Save className="h-4 w-4" />
              {ownershipSaveState === "saving"
                ? "Saving..."
                : ownershipSaveState === "saved"
                  ? "Ownership saved"
                  : ownershipSaveState === "error"
                    ? "Try again"
                    : "Save ownership"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">Weekly role signal</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Open one role at a time to capture progress, risk, decisions, or support needs.
              </p>
            </div>
          </div>

          {teamRoleUpdates.map((roleUpdate) => {
            const hasSaveableSignal = hasRoleSubmission(roleUpdate);
            const isExpanded = expandedRole === roleUpdate.role;
            const statusLabel = roleStatusOptions.find((option) => option.value === roleUpdate.status)?.label ?? "On track";
            const summary = firstRoleSignal(roleUpdate);

            return (
              <div
                key={roleUpdate.role}
                className={`rounded-lg border bg-white/[0.03] transition-colors ${
                  isExpanded ? "border-cyan-300/25" : "border-white/10"
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedRole(isExpanded ? null : roleUpdate.role)}
                  className="grid w-full gap-3 p-4 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-100">{roleUpdate.role}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${roleStatusClassName(roleUpdate.status)}`}>
                        {statusLabel}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] ${
                          hasSaveableSignal
                            ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                            : "border-white/10 bg-black/20 text-zinc-500"
                        }`}
                      >
                        {hasSaveableSignal ? "Signal captured" : "Awaiting input"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                      {summary || roleUpdate.updatedBy || roleUpdate.lastUpdatedAt
                        ? `${summary || "No weekly signal yet."}${roleUpdate.updatedBy ? ` Owner: ${roleUpdate.updatedBy}.` : ""}${
                            roleUpdate.lastUpdatedAt ? ` Updated ${formatTimestamp(roleUpdate.lastUpdatedAt)}.` : ""
                          }`
                        : "No owner or weekly signal captured yet."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-xs font-medium text-cyan-200">{isExpanded ? "Close" : "Update"}</span>
                    <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isExpanded ? (
                  <div className="grid gap-4 border-t border-white/10 p-4 pt-3">
                    <div className="grid min-w-0 gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Status</span>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {roleStatusOptions.map((option) => {
                          const selected = roleUpdate.status === option.value;
                          const selectedClassName = roleStatusClassName(option.value);

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => onUpdateRoleField(roleUpdate.role, "status", option.value)}
                              className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                                selected
                                  ? selectedClassName
                                  : "border-white/10 bg-zinc-950 text-zinc-300 hover:border-cyan-300/30 hover:text-zinc-100"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <label className="grid min-w-0 gap-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Progress update</span>
                        <textarea
                          value={roleUpdate.progressUpdate}
                          onChange={(event) => onUpdateRoleField(roleUpdate.role, "progressUpdate", event.target.value)}
                          placeholder="What changed most since the last checkpoint?"
                          rows={3}
                          className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                        />
                      </label>

                      <label className="grid min-w-0 gap-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Changes observed</span>
                        <textarea
                          value={roleUpdate.changesObserved}
                          onChange={(event) => onUpdateRoleField(roleUpdate.role, "changesObserved", event.target.value)}
                          placeholder="Scope, sequencing, dependency, or stakeholder changes."
                          rows={3}
                          className="min-h-[104px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                        />
                      </label>

                      <label className="grid min-w-0 gap-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Risks and blockers</span>
                        <textarea
                          value={[roleUpdate.activeRisks, roleUpdate.blockers].filter(Boolean).join("\n")}
                          onChange={(event) => {
                            const [activeRisks, ...rest] = event.target.value.split("\n");
                            onUpdateRoleField(roleUpdate.role, "activeRisks", activeRisks ?? "");
                            onUpdateRoleField(roleUpdate.role, "blockers", rest.join("\n"));
                          }}
                          placeholder="Top risk on the first line, blockers beneath it."
                          rows={4}
                          className="min-h-[120px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                        />
                      </label>

                      <label className="grid min-w-0 gap-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Decisions and support</span>
                        <textarea
                          value={[roleUpdate.decisionsNeeded, roleUpdate.supportNeeded].filter(Boolean).join("\n")}
                          onChange={(event) => {
                            const [decisionsNeeded, ...rest] = event.target.value.split("\n");
                            onUpdateRoleField(roleUpdate.role, "decisionsNeeded", decisionsNeeded ?? "");
                            onUpdateRoleField(roleUpdate.role, "supportNeeded", rest.join("\n"));
                          }}
                          placeholder="Decision needed on the first line, support ask beneath it."
                          rows={4}
                          className="min-h-[120px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                      <p className="text-xs leading-5 text-zinc-500">
                        Saving role signal refreshes the program synthesis and can update guided plans.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void onSaveRoleSignal(roleUpdate.role)}
                        disabled={saveState === "saving" || !hasSaveableSignal}
                      >
                        <Save className="h-4 w-4" />
                        {hasSaveableSignal ? "Save signal" : "Add signal to save"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
