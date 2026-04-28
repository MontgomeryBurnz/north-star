"use client";

import { FileCheck2, Plus, RefreshCw } from "lucide-react";
import type { StoredProgram } from "@/lib/program-intake-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GuidedPlansSidebarProps = {
  programs: StoredProgram[];
  selectedProgramId: string;
  selectedProgram: StoredProgram | undefined;
  teamRoles: string[];
  selectedRoleFocus: string;
  newRole: string;
  isSavingRole: boolean;
  lastSyncedAt: string | null;
  status: string | null;
  allRolesOption: string;
  formatDate: (value: string) => string;
  onProgramChange: (programId: string) => void;
  onRoleFocusChange: (role: string) => void;
  onNewRoleChange: (value: string) => void;
  onAddRole: () => void | Promise<void>;
};

export function GuidedPlansSidebar({
  programs,
  selectedProgramId,
  selectedProgram,
  teamRoles,
  selectedRoleFocus,
  newRole,
  isSavingRole,
  lastSyncedAt,
  status,
  allRolesOption,
  formatDate,
  onProgramChange,
  onRoleFocusChange,
  onNewRoleChange,
  onAddRole
}: GuidedPlansSidebarProps) {
  return (
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
              onChange={(event) => onProgramChange(event.target.value)}
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
          {selectedProgram ? (
            <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Team composition</p>
                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  Add the roles that actually exist on this team. The guided plan will regenerate to include them.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {teamRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.055] px-3 py-1 text-xs text-cyan-100"
                  >
                    {role}
                  </span>
                ))}
              </div>
              <label className="grid gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">My role focus</span>
                <select
                  value={selectedRoleFocus}
                  onChange={(event) => onRoleFocusChange(event.target.value)}
                  className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                >
                  <option value={allRolesOption}>All Roles</option>
                  {teamRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-5 text-zinc-400">
                  Choose your role to keep that action plan fully expanded while the others stay collapsed until opened.
                </p>
              </label>
              <div className="flex gap-2">
                <input
                  value={newRole}
                  onChange={(event) => onNewRoleChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void onAddRole();
                    }
                  }}
                  placeholder="Add a team role"
                  className="min-h-11 flex-1 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                />
                <Button type="button" onClick={() => void onAddRole()} disabled={isSavingRole} className="min-h-11 shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Add role
                </Button>
              </div>
            </div>
          ) : null}
          <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-cyan-100">
              <RefreshCw className="h-4 w-4" />
              Auto-sync enabled
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-300">
              New program uploads, active-program saves, and leadership reviews refresh the guided plan automatically.
            </p>
            {lastSyncedAt ? <p className="mt-2 text-xs text-zinc-500">Last synced {formatDate(lastSyncedAt)}</p> : null}
          </div>
          {status ? <p className="text-sm leading-6 text-zinc-400">{status}</p> : null}
        </CardContent>
      </Card>
    </aside>
  );
}
