"use client";

import { Save, Users2 } from "lucide-react";
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

type ActiveProgramTeamUpdatesCardProps = {
  teamRoleUpdates: TeamRoleUpdate[];
  ownerCoverage: {
    configured: number;
    total: number;
  };
  saveState: "idle" | "saving" | "saved" | "error";
  formatTimestamp: (value: string) => string;
  onUpdateRoleField: (role: string, field: keyof Omit<TeamRoleUpdate, "role">, value: string | boolean) => void;
  onSaveRoleSignal: (role: string) => void | Promise<void>;
};

export function ActiveProgramTeamUpdatesCard({
  teamRoleUpdates,
  ownerCoverage,
  saveState,
  formatTimestamp,
  onUpdateRoleField,
  onSaveRoleSignal
}: ActiveProgramTeamUpdatesCardProps) {
  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <Users2 className="h-4 w-4 text-cyan-200" />
          Team updates this cycle
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 md:p-5">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-zinc-100">Role ownership stays stable across cycles</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Set role owners, then save the cycle synthesis once. Role signal saves are reserved for progress,
                risk, decision, support, or at-risk/blocked status changes.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-300">
              {ownerCoverage.configured}/{ownerCoverage.total} mapped
            </span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {teamRoleUpdates.map((roleUpdate) => {
            const hasSaveableSignal = hasRoleSubmission(roleUpdate);

            return (
              <div key={roleUpdate.role} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100">{roleUpdate.role}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {roleUpdate.lastUpdatedAt ? `Last role update ${formatTimestamp(roleUpdate.lastUpdatedAt)}` : "No role submission yet this cycle"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${
                        hasSaveableSignal
                          ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                          : "border-white/10 bg-black/20 text-zinc-400"
                      }`}
                    >
                      {hasSaveableSignal ? "signal captured" : "awaiting input"}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${
                        roleUpdate.status === "on-track"
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                          : roleUpdate.status === "at-risk"
                            ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                            : "border-rose-300/20 bg-rose-300/10 text-rose-100"
                      }`}
                    >
                      {roleStatusOptions.find((option) => option.value === roleUpdate.status)?.label ?? "On track"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <label className="grid min-w-0 gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Role owner</span>
                      <input
                        value={roleUpdate.updatedBy}
                        onChange={(event) => onUpdateRoleField(roleUpdate.role, "updatedBy", event.target.value)}
                        placeholder={`${roleUpdate.role} lead or owner`}
                        className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                      />
                      <span className="text-xs leading-5 text-zinc-500">This persists as the default owner for future cycles.</span>
                    </label>

                    <div className="grid min-w-0 gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Status</span>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {roleStatusOptions.map((option) => {
                          const selected = roleUpdate.status === option.value;
                          const selectedClassName =
                            option.value === "on-track"
                              ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-100"
                              : option.value === "at-risk"
                                ? "border-amber-300/30 bg-amber-300/12 text-amber-100"
                                : "border-rose-300/30 bg-rose-300/12 text-rose-100";

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
                  </div>

                  <label className="grid min-w-0 gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Progress update</span>
                    <textarea
                      value={roleUpdate.progressUpdate}
                      onChange={(event) => onUpdateRoleField(roleUpdate.role, "progressUpdate", event.target.value)}
                      placeholder="What changed most for this role since the last checkpoint?"
                      rows={2}
                      className="min-h-[88px] resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
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

                <div className="grid gap-3 lg:grid-cols-2">
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

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-2">
                  <p className="text-xs leading-5 text-zinc-500">
                    Save the role signal as soon as it changes. The program synthesis and guided plan will absorb it.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void onSaveRoleSignal(roleUpdate.role)}
                    disabled={saveState === "saving" || !hasSaveableSignal}
                  >
                    <Save className="h-4 w-4" />
                    {hasSaveableSignal ? `Save ${roleUpdate.role} signal` : "Add signal to save"}
                  </Button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
