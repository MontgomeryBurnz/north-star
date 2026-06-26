"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ClipboardPaste, Plus, Save, Trash2, UsersRound } from "lucide-react";
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

function formatBulkFootprint(roles: ProgramTeamFootprintRole[]) {
  return roles
    .map((item) => [item.role, item.owner, item.responsibility].map((value) => value.trim()).join(" | "))
    .join("\n");
}

function parseBulkFootprint(value: string) {
  const seen = new Set<string>();

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const separator = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
      const [roleValue = "", ownerValue = "", responsibilityValue = ""] = line
        .split(separator)
        .map((part) => part.trim());
      const role = roleValue || `New role ${index + 1}`;
      const baseId = buildRoleId(role);
      let id = baseId;
      let suffix = 2;

      while (seen.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      seen.add(id);

      return {
        active: true,
        id,
        owner: ownerValue,
        responsibility: responsibilityValue,
        role
      };
    });
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
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkValue, setBulkValue] = useState("");
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

  function moveRole(id: string, direction: "up" | "down") {
    const index = roles.findIndex((item) => item.id === id);
    if (index < 0) return;

    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= roles.length) return;

    const nextRoles = [...roles];
    const currentRole = nextRoles[index];
    nextRoles[index] = nextRoles[nextIndex];
    nextRoles[nextIndex] = currentRole;
    onChange(nextRoles);
  }

  function openBulkEditor() {
    setBulkValue(formatBulkFootprint(roles));
    setBulkMode(true);
  }

  function applyBulkEditor() {
    const parsed = parseBulkFootprint(bulkValue);
    if (!parsed.length) return;
    onChange(parsed);
    setBulkMode(false);
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

      <div className="mt-5 flex flex-col gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-100">Bulk role setup</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Paste one role per line as Role | Owner | Responsibility. The order you enter here becomes the program role order.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={openBulkEditor} data-team-footprint-bulk-toggle>
          <ClipboardPaste className="h-4 w-4" />
          Bulk edit
        </Button>
      </div>

      {bulkMode ? (
        <div className="mt-3 grid gap-3 rounded-lg border border-white/10 bg-black/30 p-3">
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Role | Owner | Responsibility
            </span>
            <textarea
              data-team-footprint-bulk-input
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
              rows={Math.max(5, Math.min(12, roles.length + 2))}
              className="min-h-36 rounded-lg border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/45"
              placeholder={"Product Management | Alex Miller | Owns product direction and roadmap\nBusiness Analysis | Sam Lee | Owns requirements clarity"}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={applyBulkEditor} data-team-footprint-apply-bulk>
              Apply bulk edit
            </Button>
            <Button type="button" variant="outline" onClick={() => setBulkMode(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {roles.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 lg:grid-cols-[auto_0.9fr_0.9fr_1.5fr_auto]">
            <div className="flex gap-2 lg:flex-col lg:justify-end">
              <button
                type="button"
                aria-label={`Move ${item.role} up`}
                onClick={() => moveRole(item.id, "up")}
                disabled={index === 0}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-zinc-400 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${item.role} down`}
                onClick={() => moveRole(item.id, "down")}
                disabled={index === roles.length - 1}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-zinc-400 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
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
          <Button type="button" onClick={onSave} disabled={saveState === "saving"} data-team-footprint-save>
            <Save className="h-4 w-4" />
            {saveState === "saving" ? "Saving..." : "Save team footprint"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
