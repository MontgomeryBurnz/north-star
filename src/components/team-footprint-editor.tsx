"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardPaste,
  GripVertical,
  Plus,
  Save,
  Trash2,
  UsersRound
} from "lucide-react";
import type { ProgramTeamFootprintRole } from "@/lib/program-intake-types";
import { normalizeTeamFootprint } from "@/lib/team-roles";
import { Button } from "@/components/ui/button";

type TeamFootprintEditorProps = {
  description?: string;
  fallbackRoles?: string[];
  footprint?: ProgramTeamFootprintRole[];
  includeFallbackRoles?: boolean;
  onChange: (nextFootprint: ProgramTeamFootprintRole[]) => void;
  onSave?: () => void | Promise<void>;
  saveState?: "idle" | "dirty" | "saving" | "saved" | "error";
  savedAt?: string | null;
  title?: string;
};

const ROLE_LIBRARY = [
  "Delivery Lead",
  "Product Management",
  "Business Analysis",
  "User Experience",
  "Application Development",
  "Data Engineering",
  "Change Management",
  "Scrum Master",
  "Technical Lead"
];

function buildRoleId(role: string) {
  return (
    role
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `role-${Date.now()}`
  );
}

function buildUniqueRoleId(role: string, existingIds: Set<string>) {
  const baseId = buildRoleId(role);
  let id = baseId;
  let suffix = 2;

  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return id;
}

function normalizeEditorFootprint(
  footprint: ProgramTeamFootprintRole[] | undefined,
  fallbackRoles: string[] | undefined,
  includeFallbackRoles: boolean
) {
  if (!includeFallbackRoles && !footprint?.length) {
    return [];
  }

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
  const parsed: ProgramTeamFootprintRole[] = [];

  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separator = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
      const [roleValue = "", ownerValue = "", responsibilityValue = ""] = line
        .split(separator)
        .map((part) => part.trim());
      const role = roleValue.trim().replace(/\s+/g, " ");
      if (!role) return;

      const baseId = buildRoleId(role);
      let id = baseId;
      let suffix = 2;

      while (seen.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      seen.add(id);

      parsed.push({
        active: true,
        id,
        owner: ownerValue,
        responsibility: responsibilityValue,
        role
      });
    });

  return parsed;
}

export function TeamFootprintEditor({
  description = "Define the roles involved in this program, the regular owner, and what each role is accountable for.",
  fallbackRoles,
  footprint,
  includeFallbackRoles = true,
  onChange,
  onSave,
  saveState = "idle",
  savedAt,
  title = "Team Footprint"
}: TeamFootprintEditorProps) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkValue, setBulkValue] = useState("");
  const [customOwner, setCustomOwner] = useState("");
  const [customResponsibility, setCustomResponsibility] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [draggingRoleId, setDraggingRoleId] = useState<string | null>(null);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const roles = normalizeEditorFootprint(footprint, fallbackRoles, includeFallbackRoles);
  const mappedOwners = roles.filter((item) => item.active !== false && item.owner.trim()).length;
  const activeRoles = roles.filter((item) => item.active !== false).length;
  const canSave = Boolean(onSave);
  const activeRoleKeys = new Set(roles.filter((item) => item.active !== false).map((item) => item.role.trim().toLowerCase()));
  const roleKeys = new Set(roles.map((item) => item.role.trim().toLowerCase()));
  const roleIds = new Set(roles.map((item) => item.id));

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

  function addRole(roleValue: string, owner = "", responsibility = "") {
    const role = roleValue.trim().replace(/\s+/g, " ");
    if (!role) {
      setRoleMessage("Enter a role before adding it to the program.");
      return false;
    }

    const existingRole = roles.find((item) => item.role.trim().toLowerCase() === role.toLowerCase());
    if (existingRole) {
      if (existingRole.active === false) {
        updateRole(existingRole.id, { active: true });
        setRoleMessage(`${existingRole.role} is back in the active footprint.`);
        return true;
      }

      setRoleMessage(`${existingRole.role} is already in the team footprint.`);
      return false;
    }

    onChange([
      ...roles,
      {
        active: true,
        id: buildUniqueRoleId(role, roleIds),
        owner: owner.trim(),
        responsibility: responsibility.trim(),
        role
      }
    ]);
    setRoleMessage(`${role} added to the team footprint.`);
    return true;
  }

  function addCustomRole() {
    const added = addRole(customRole, customOwner, customResponsibility);
    if (added) {
      setCustomOwner("");
      setCustomResponsibility("");
      setCustomRole("");
    }
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

  function reorderRole(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    const sourceIndex = roles.findIndex((item) => item.id === sourceId);
    const targetIndex = roles.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextRoles = [...roles];
    const [sourceRole] = nextRoles.splice(sourceIndex, 1);
    nextRoles.splice(targetIndex, 0, sourceRole);
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
            {activeRoles ? `${mappedOwners}/${activeRoles} mapped` : "Roster empty"}
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

      <div className="mt-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-100">Add roles</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Choose only the roles participating in this program, or add a custom role.
            </p>
          </div>
          {roleMessage ? (
            <p
              className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-medium text-zinc-300"
              data-team-footprint-role-message
            >
              {roleMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2" data-team-footprint-role-library>
          {ROLE_LIBRARY.map((role) => {
            const roleKey = role.toLowerCase();
            const isActive = activeRoleKeys.has(roleKey);
            const exists = roleKeys.has(roleKey);

            return (
              <button
                key={role}
                type="button"
                onClick={() => addRole(role)}
                disabled={isActive}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition ${
                  isActive
                    ? "cursor-default border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                    : exists
                      ? "border-amber-300/25 bg-amber-300/10 text-amber-100 hover:border-amber-200/45"
                      : "border-white/10 bg-black/25 text-zinc-200 hover:border-cyan-300/40 hover:text-cyan-100"
                }`}
                data-team-footprint-role-chip={role}
              >
                {isActive ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {role}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3 lg:grid-cols-[0.8fr_0.8fr_1.3fr_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Custom role</span>
            <input
              data-team-footprint-custom-role
              value={customRole}
              onChange={(event) => setCustomRole(event.target.value)}
              className="min-h-11 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/45"
              placeholder="Example: Training Lead"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Owner</span>
            <input
              data-team-footprint-custom-owner
              value={customOwner}
              onChange={(event) => setCustomOwner(event.target.value)}
              className="min-h-11 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/45"
              placeholder="Optional"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Responsibility</span>
            <input
              data-team-footprint-custom-responsibility
              value={customResponsibility}
              onChange={(event) => setCustomResponsibility(event.target.value)}
              className="min-h-11 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/45"
              placeholder="What this role owns"
            />
          </label>
          <Button type="button" onClick={addCustomRole} data-team-footprint-add-custom>
            <Plus className="h-4 w-4" />
            Add role
          </Button>
        </div>
      </div>

      {!roles.length ? (
        <div
          className="mt-5 flex flex-col items-start gap-3 rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center"
          data-team-footprint-empty
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-100">
            <UsersRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-100">No roles added yet</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Select a common role above or add a custom role. Owners and responsibilities can be completed now or later.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-white/10 bg-black/20">
        <button
          type="button"
          onClick={bulkMode ? () => setBulkMode(false) : openBulkEditor}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          data-team-footprint-bulk-toggle
        >
          <span>
            <span className="block text-sm font-medium text-zinc-200">Advanced bulk edit</span>
            <span className="mt-1 block text-xs leading-5 text-zinc-500">
              Paste one role per line as Role | Owner | Responsibility when you need fast cleanup.
            </span>
          </span>
          <ClipboardPaste className="h-4 w-4 shrink-0 text-cyan-200" />
        </button>
        {bulkMode ? (
          <div className="grid gap-3 border-t border-white/10 p-3">
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
      </div>

      <div className="mt-5 grid gap-3">
        {roles.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={(event) => {
              setDraggingRoleId(item.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", item.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = event.dataTransfer.getData("text/plain") || draggingRoleId;
              if (sourceId) {
                reorderRole(sourceId, item.id);
              }
              setDraggingRoleId(null);
            }}
            onDragEnd={() => setDraggingRoleId(null)}
            className={`grid gap-3 rounded-xl border p-3 transition lg:grid-cols-[auto_minmax(0,1fr)_auto] ${
              draggingRoleId === item.id
                ? "border-cyan-300/40 bg-cyan-300/[0.06] opacity-75"
                : "border-white/10 bg-white/[0.025]"
            }`}
            data-team-footprint-row={item.role}
          >
            <div className="flex items-center gap-2 lg:flex-col lg:justify-center">
              <span
                className="flex h-9 w-9 cursor-grab items-center justify-center rounded-lg border border-white/10 bg-black/20 text-zinc-500"
                aria-label={`Drag ${item.role}`}
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <button
                type="button"
                aria-label={`Move ${item.role} up`}
                onClick={() => moveRole(item.id, "up")}
                disabled={index === 0}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-zinc-500 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${item.role} down`}
                onClick={() => moveRole(item.id, "down")}
                disabled={index === roles.length - 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-zinc-500 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-[0.85fr_0.85fr_1.3fr]">
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
            </div>
            <div className="flex items-end gap-2 lg:justify-end">
              <label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
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
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-zinc-500 transition hover:border-rose-300/40 hover:text-rose-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
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
