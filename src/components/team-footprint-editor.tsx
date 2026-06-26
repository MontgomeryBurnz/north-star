"use client";

import { Plus, Save, Trash2, UsersRound } from "lucide-react";
import type { ProgramTeamFootprintRole } from "@/lib/program-intake-types";
import { normalizeTeamFootprint } from "@/lib/team-roles";
import { Button } from "@/components/ui/button";

type TeamFootprintEditorProps = {
  description?: string;
  fallbackRoles?: string[];
  footprint?: ProgramTeamFootprintRole[];
  onChange: (nextFootprint: ProgramTeamFootprintRole[]) => void;
  onSave?: () => void | Promise<void>;
  saveState?: "idle" | "dirty" | "saving" | "saved" | "error";
  savedAt?: string | null;
  title?: string;
};

function buildRoleId(role: string) {
  return (
    role
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `role-${Date.now()}`
  );
}

function normalizeEditorFootprint(footprint: ProgramTeamFootprintRole[] | undefined, fallbackRoles?: string[]) {
  return normalizeTeamFootprint(footprint, fallbackRoles).map((item) => ({
    ...item,
    active: item.active !== false
  }));
}

export function TeamFootprintEditor({
  description = "Define the roles involved in this program, the regular owner, and what each role is accountable for.",
  fallbackRoles,
  footprint,
  onChange,
  onSave,
  saveState = "idle",
  savedAt,
  title = "Team Footprint"
}: TeamFootprintEditorProps) {
  const roles = normalizeEditorFootprint(footprint, fallbackRoles);
  const mappedOwners = roles.filter((item) => item.active !== false && item.owner.trim()).length;
  const activeRoles = roles.filter((item) => item.active !== false).length;
  const canSave = Boolean(onSave);

  function updateRole(id: string, patch: Partial<ProgramTeamFootprintRole>) {
    onChange(
      roles.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch
            }
          : item
      )
    );
  }

  function addRole() {
    const nextIndex = roles.length + 1;
    const role = `New role ${nextIndex}`;
    onChange([
      ...roles,
      {
        active: true,
        id: buildRoleId(role),
        owner: "",
        responsibility: "",
        role
      }
    ]);
  }

  function removeRole(id: string) {
    onChange(roles.filter((item) => item.id !== id));
  }

  return (
    <section className="rounded-xl border border-white/10 bg-zinc-950/80 p-4 sm:p-5" data-team-footprint-editor>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-cyan-200" />
            <h3 className="text-lg font-semibold text-zinc-50">{title}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
          {savedAt ? <p className="mt-2 text-sm text-cyan-200">Saved at {savedAt}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
            {mappedOwners}/{activeRoles} mapped
          </span>
          {canSave ? (
            <span
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                saveState === "error"
                  ? "border-amber-300/35 bg-amber-300/10 text-amber-100"
                  : saveState === "saved"
                    ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                    : "border-white/10 bg-black/25 text-zinc-300"
              }`}
            >
              {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : saveState === "error" ? "Needs retry" : "Ready"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {roles.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 lg:grid-cols-[0.9fr_0.9fr_1.5fr_auto]">
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Role</span>
              <input
                value={item.role}
                onChange={(event) => updateRole(item.id, { role: event.target.value })}
                className="min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-300/45"
                placeholder="Product Management"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Owner</span>
              <input
                value={item.owner}
                onChange={(event) => updateRole(item.id, { owner: event.target.value })}
                className="min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-300/45"
                placeholder="Owner name"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Responsibility</span>
              <input
                value={item.responsibility}
                onChange={(event) => updateRole(item.id, { responsibility: event.target.value })}
                className="min-h-11 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-300/45"
                placeholder="What this role owns for this program"
              />
            </label>
            <div className="flex items-end gap-2">
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                <input
                  type="checkbox"
                  checked={item.active !== false}
                  onChange={(event) => updateRole(item.id, { active: event.target.checked })}
                  className="h-4 w-4 accent-emerald-300"
                />
                Active
              </label>
              <button
                type="button"
                aria-label={`Remove ${item.role}`}
                onClick={() => removeRole(item.id)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-zinc-400 transition hover:border-rose-300/40 hover:text-rose-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={addRole}>
          <Plus className="h-4 w-4" />
          Add role
        </Button>
        {canSave ? (
          <Button type="button" onClick={onSave} disabled={saveState === "saving"}>
            <Save className="h-4 w-4" />
            {saveState === "saving" ? "Saving..." : "Save team footprint"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
