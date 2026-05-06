"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { CalendarClock, FileUp, KanbanSquare, Paperclip, Plus, Save, Trash2, X } from "lucide-react";
import type { DeliveryBoardItem, DeliveryBoardStatus, TeamRoleUpdate } from "@/lib/active-program-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const deliveryBoardStatuses: Array<{ value: DeliveryBoardStatus; label: string; tone: string }> = [
  { value: "not-started", label: "Not started", tone: "border-white/10 bg-black/20 text-zinc-300" },
  { value: "in-progress", label: "In progress", tone: "border-cyan-300/25 bg-cyan-300/[0.065] text-cyan-100" },
  { value: "needs-review", label: "Needs review", tone: "border-amber-300/25 bg-amber-300/[0.065] text-amber-100" },
  { value: "blocked", label: "Blocked", tone: "border-rose-300/25 bg-rose-300/[0.065] text-rose-100" },
  { value: "done", label: "Done", tone: "border-emerald-300/25 bg-emerald-300/[0.065] text-emerald-100" }
];

type DeliveryBoardUploadState = {
  itemId: string;
  status: "idle" | "uploading" | "uploaded" | "error";
} | null;

type DeliveryBoardDraft = Pick<DeliveryBoardItem, "description" | "dueDate" | "latestNote" | "owner" | "role" | "status" | "title">;

type ActiveProgramDeliveryBoardCardProps = {
  deliveryBoardItems: DeliveryBoardItem[];
  deliveryBoardUploadState: DeliveryBoardUploadState;
  teamRoleUpdates: TeamRoleUpdate[];
  assignedOwnersByRole: Record<string, string[]>;
  saveState: "idle" | "saving" | "saved" | "error";
  saveConfirmation: {
    savedAt?: string;
    scope: string;
    status: "saving" | "saved" | "error";
  } | null;
  formatFileSize: (size: number) => string;
  onAddDeliveryBoardItem: (input: DeliveryBoardDraft) => void;
  onUpdateDeliveryBoardItem: (itemId: string, patch: Partial<Omit<DeliveryBoardItem, "attachments" | "createdAt" | "id">>) => void;
  onRemoveDeliveryBoardItem: (itemId: string) => void;
  onDeliveryBoardAttachmentsChange: (itemId: string, event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemoveDeliveryBoardAttachment: (itemId: string, attachmentId: string) => void;
  onSaveDeliveryBoard: () => void | Promise<void>;
};

function normalizeRoleKey(role: string) {
  return role.trim().toLowerCase();
}

function deliveryBoardStatusLabel(status: DeliveryBoardStatus) {
  return deliveryBoardStatuses.find((option) => option.value === status)?.label ?? "Not started";
}

function deliveryBoardStatusTone(status: DeliveryBoardStatus) {
  return deliveryBoardStatuses.find((option) => option.value === status)?.tone ?? deliveryBoardStatuses[0].tone;
}

function emptyDraft(role = ""): DeliveryBoardDraft {
  return {
    role,
    title: "",
    description: "",
    owner: "",
    status: "not-started",
    dueDate: "",
    latestNote: ""
  };
}

function roleOwnerPlaceholder(role: string, assignedOwnersByRole: Record<string, string[]>) {
  return assignedOwnersByRole[normalizeRoleKey(role)]?.join(", ") || "Owner";
}

function sortDeliveryBoardItemsByCreatedAt(items: DeliveryBoardItem[]) {
  return [...items].sort((first, second) => (second.createdAt ?? "").localeCompare(first.createdAt ?? ""));
}

export function ActiveProgramDeliveryBoardCard({
  deliveryBoardItems,
  deliveryBoardUploadState,
  teamRoleUpdates,
  assignedOwnersByRole,
  saveState,
  saveConfirmation,
  formatFileSize,
  onAddDeliveryBoardItem,
  onUpdateDeliveryBoardItem,
  onRemoveDeliveryBoardItem,
  onDeliveryBoardAttachmentsChange,
  onRemoveDeliveryBoardAttachment,
  onSaveDeliveryBoard
}: ActiveProgramDeliveryBoardCardProps) {
  const roleLanes = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const roleUpdate of teamRoleUpdates) {
      byKey.set(normalizeRoleKey(roleUpdate.role), roleUpdate.role);
    }
    for (const item of deliveryBoardItems) {
      if (item.role.trim()) byKey.set(normalizeRoleKey(item.role), item.role);
    }
    return Array.from(byKey.values());
  }, [deliveryBoardItems, teamRoleUpdates]);
  const [draft, setDraft] = useState<DeliveryBoardDraft>(() => emptyDraft(roleLanes[0] ?? ""));
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<DeliveryBoardStatus | null>(null);
  const activeItems = deliveryBoardItems.filter((item) => item.status !== "done");
  const attachmentCount = deliveryBoardItems.reduce((total, item) => total + item.attachments.length, 0);
  const selectedItem = useMemo(
    () => deliveryBoardItems.find((item) => item.id === selectedItemId) ?? null,
    [deliveryBoardItems, selectedItemId]
  );
  const statusCounts = Object.fromEntries(
    deliveryBoardStatuses.map((status) => [
      status.value,
      deliveryBoardItems.filter((item) => item.status === status.value).length
    ])
  ) as Record<DeliveryBoardStatus, number>;
  const canAddItem = Boolean(draft.role && draft.title.trim());

  useEffect(() => {
    setDraft((current) => {
      if (current.role || !roleLanes[0]) return current;
      return { ...current, role: roleLanes[0] };
    });
  }, [roleLanes]);

  useEffect(() => {
    if (roleLanes.length) return;
    setIsAddCardOpen(false);
  }, [roleLanes.length]);

  useEffect(() => {
    if (!isAddCardOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsAddCardOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddCardOpen]);

  useEffect(() => {
    if (!selectedItemId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelectedItemId(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId]);

  useEffect(() => {
    if (!selectedItemId) return;
    if (deliveryBoardItems.some((item) => item.id === selectedItemId)) return;
    setSelectedItemId(null);
  }, [deliveryBoardItems, selectedItemId]);

  const handleAddItem = () => {
    if (!canAddItem) return;
    onAddDeliveryBoardItem(draft);
    setDraft(emptyDraft(draft.role));
    setIsAddCardOpen(false);
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, itemId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
    setDraggingItemId(itemId);
  };

  const moveDeliveryBoardItem = (item: DeliveryBoardItem, status: DeliveryBoardStatus) => {
    setSelectedItemId(item.id);
    if (item.status === status) return;
    onUpdateDeliveryBoardItem(item.id, { status });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, status: DeliveryBoardStatus) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain") || draggingItemId;
    setDraggingItemId(null);
    setDragOverStatus(null);

    if (!itemId) return;

    const item = deliveryBoardItems.find((candidate) => candidate.id === itemId);
    if (!item || item.status === status) {
      setSelectedItemId(itemId);
      return;
    }

    moveDeliveryBoardItem(item, status);
  };

  return (
    <Card data-active-delivery-board className="overflow-hidden bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-zinc-50">
          <span className="flex items-center gap-2">
            <KanbanSquare className="h-4 w-4 text-cyan-200" />
            Delivery Board
          </span>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.055] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-100">
            {activeItems.length} active
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 md:p-5">
        <div className="grid gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-sm font-medium text-zinc-100">Weekly delivery center</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Track role-owned actions, deliverables, review needs, blockers, and attached evidence. Drag cards on desktop, or tap
              a status chip on mobile, then save the board to refresh guidance.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
            <span className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">{deliveryBoardItems.length} cards</span>
            <span className="rounded-md border border-amber-300/15 bg-amber-300/[0.055] px-3 py-2 text-xs text-amber-100">
              {statusCounts["needs-review"] + statusCounts.blocked} need action
            </span>
            <span className="rounded-md border border-emerald-300/15 bg-emerald-300/[0.055] px-3 py-2 text-xs text-emerald-100">
              {attachmentCount} attachments
            </span>
            <Button
              type="button"
              data-delivery-board-open-add
              onClick={() => setIsAddCardOpen(true)}
              disabled={!roleLanes.length}
              className="min-h-10"
            >
              <Plus className="h-4 w-4" />
              Add action
            </Button>
          </div>
        </div>

        {isAddCardOpen ? (
          <div
            data-delivery-board-add-panel
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-board-add-title"
            onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              setIsAddCardOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          >
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-100">Delivery Board</p>
                  <h3 id="delivery-board-add-title" className="mt-1 text-lg font-semibold text-zinc-50">
                    Add action
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Create one role-owned action, deliverable, review item, blocker, or artifact.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close add action panel"
                  onClick={() => setIsAddCardOpen(false)}
                  className="rounded-md border border-white/10 p-2 text-zinc-500 transition-colors hover:border-cyan-300/30 hover:text-cyan-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <label className="grid gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Function</span>
                    <select
                      data-delivery-board-role
                      value={draft.role}
                      onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    >
                      <option value="">Select role...</option>
                      {roleLanes.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Action or deliverable</span>
                    <input
                      data-delivery-board-title
                      value={draft.title}
                      onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Action, deliverable, review item, or dependency"
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="grid gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Owner</span>
                    <input
                      value={draft.owner}
                      onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))}
                      placeholder={roleOwnerPlaceholder(draft.role, assignedOwnersByRole)}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Due</span>
                    <input
                      type="date"
                      value={draft.dueDate}
                      onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Status</span>
                    <select
                      value={draft.status}
                      onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as DeliveryBoardStatus }))}
                      className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    >
                      {deliveryBoardStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Context</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="What outcome, milestone, or blocker does this card support?"
                    rows={3}
                    className="min-h-[112px] resize-y rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                  />
                </label>

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddCardOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" data-delivery-board-add onClick={handleAddItem} disabled={!canAddItem}>
                    <Plus className="h-4 w-4" />
                    Add card
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-5">
          {roleLanes.length ? (
            roleLanes.map((role) => {
              const roleItems = deliveryBoardItems.filter((item) => normalizeRoleKey(item.role) === normalizeRoleKey(role));
              const roleAttachments = roleItems.reduce((total, item) => total + item.attachments.length, 0);
              const roleStatusCounts = Object.fromEntries(
                deliveryBoardStatuses.map((status) => [
                  status.value,
                  roleItems.filter((item) => item.status === status.value).length
                ])
              ) as Record<DeliveryBoardStatus, number>;
              const statusGroups = deliveryBoardStatuses
                .map((status) => ({
                  status,
                  items: sortDeliveryBoardItemsByCreatedAt(roleItems.filter((item) => item.status === status.value))
                }))
                .filter((group) => group.items.length > 0);

              return (
                <section key={role} data-delivery-board-lane={normalizeRoleKey(role)} className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-100">{role}</h3>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        {roleItems.length} card{roleItems.length === 1 ? "" : "s"} / {roleAttachments} attachment
                        {roleAttachments === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  {draggingItemId && roleItems.length ? (
                    <div
                      data-delivery-board-status-rail
                      className="flex items-center gap-2 overflow-x-auto rounded-lg border border-cyan-300/20 bg-cyan-300/[0.035] p-2"
                    >
                      <span className="shrink-0 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-100">
                        Drop to move
                      </span>
                      {deliveryBoardStatuses.map((status) => (
                        <div
                          key={status.value}
                          data-delivery-board-drop-target={status.value}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            setDragOverStatus(status.value);
                          }}
                          onDragLeave={() => setDragOverStatus((current) => (current === status.value ? null : current))}
                          onDrop={(event) => handleDrop(event, status.value)}
                          className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 transition-colors ${
                            dragOverStatus === status.value ? "border-cyan-300/50 bg-cyan-300/[0.09]" : status.tone
                          }`}
                        >
                          <span className="text-[10px] font-medium uppercase tracking-[0.12em]">{status.label}</span>
                          <span className="text-[10px] text-zinc-500">{roleStatusCounts[status.value]}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {statusGroups.length ? (
                    <div className="grid gap-4">
                      {statusGroups.map(({ status, items }) => (
                        <div
                          key={status.value}
                          data-delivery-board-column={status.value}
                          className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${status.tone}`}
                            >
                              {status.label}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {items.length} card{items.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                            {items.map((item) => {
                              const isSelected = selectedItemId === item.id;

                              return (
                                <article
                                  key={item.id}
                                  data-delivery-board-card={item.id}
                                  draggable
                                  onDragStart={(event) => handleDragStart(event, item.id)}
                                  onDragEnd={() => {
                                    setDraggingItemId(null);
                                    setDragOverStatus(null);
                                  }}
                                  className={`grid gap-3 rounded-md border bg-zinc-950 p-3 shadow-[0_16px_45px_rgba(0,0,0,0.18)] transition-colors ${
                                    isSelected
                                      ? "border-cyan-300/40 ring-1 ring-cyan-300/20"
                                      : draggingItemId === item.id
                                        ? "border-cyan-300/30 opacity-70"
                                        : "border-white/10"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <button
                                      type="button"
                                      data-delivery-board-card-open
                                      onClick={() => setSelectedItemId(item.id)}
                                      className="min-w-0 flex-1 text-left"
                                    >
                                      <span className="block break-words text-sm font-medium leading-5 text-zinc-100">{item.title}</span>
                                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-zinc-500">
                                        {item.description || item.latestNote || "Open details to add context, notes, and evidence."}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Remove ${item.title}`}
                                      onClick={() => onRemoveDeliveryBoardItem(item.id)}
                                      className="rounded-md border border-white/10 p-1.5 text-zinc-500 transition-colors hover:border-rose-300/30 hover:text-rose-100"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <div className="grid gap-2 text-[11px] text-zinc-500">
                                    <span className="inline-flex items-center gap-2">
                                      <CalendarClock className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
                                      <span>{item.dueDate || "No due date"}</span>
                                    </span>
                                    <span className="truncate">{item.owner || roleOwnerPlaceholder(item.role, assignedOwnersByRole)}</span>
                                    <span className="inline-flex items-center gap-2">
                                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
                                      {item.attachments.length} attachment{item.attachments.length === 1 ? "" : "s"}
                                    </span>
                                  </div>
                                  <div data-delivery-board-status-chips className="grid gap-2 border-t border-white/10 pt-3">
                                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">Move card</p>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                      {deliveryBoardStatuses.map((option) => {
                                        const isCurrentStatus = item.status === option.value;

                                        return (
                                          <button
                                            key={option.value}
                                            type="button"
                                            data-delivery-board-status-chip={option.value}
                                            aria-pressed={isCurrentStatus}
                                            aria-label={`Move ${item.title} to ${option.label}`}
                                            onClick={() => moveDeliveryBoardItem(item, option.value)}
                                            className={`min-h-10 shrink-0 rounded-full border px-3 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors ${
                                              isCurrentStatus
                                                ? option.tone
                                                : "border-white/10 bg-white/[0.025] text-zinc-500 hover:border-cyan-300/30 hover:text-cyan-100"
                                            }`}
                                          >
                                            {option.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedItemId(item.id)}
                                    className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-cyan-300/30 hover:text-cyan-100"
                                  >
                                    Open details
                                  </button>
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                      <p className="text-sm font-medium text-zinc-100">No delivery cards for this role yet.</p>
                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        Add a card above when this function owns an action, deliverable, review item, blocker, or artifact.
                      </p>
                    </div>
                  )}
                </section>
              );
            })
          ) : (
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.055] p-4">
              <p className="text-sm font-medium text-amber-100">Add team roles before building the delivery board.</p>
              <p className="mt-2 text-xs leading-5 text-zinc-300">
                Program roles create the swimlanes used to track delivery actions and attached evidence.
              </p>
            </div>
          )}
        </div>

        {selectedItem ? (
          <div
            data-delivery-board-detail-panel
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-board-detail-title"
            onClick={(event) => {
              if (event.target !== event.currentTarget) return;
              setSelectedItemId(null);
            }}
            className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
          >
            <div className="flex h-full w-full flex-col overflow-hidden border-white/10 bg-zinc-950 shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:w-[min(780px,calc(100vw-2rem))] sm:border-l">
              <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4 md:p-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-100">Delivery Board</p>
                  <h3 id="delivery-board-detail-title" className="mt-1 break-words text-lg font-semibold text-zinc-50">
                    {selectedItem.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">{selectedItem.role}</p>
                </div>
                <button
                  type="button"
                  data-delivery-board-detail-close
                  aria-label="Close delivery card details"
                  onClick={() => setSelectedItemId(null)}
                  className="rounded-md border border-white/10 p-2 text-zinc-500 transition-colors hover:border-cyan-300/30 hover:text-cyan-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div data-delivery-board-detail-workspace className="grid flex-1 overflow-y-auto xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid content-start gap-4 p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-100">Task workspace</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">Update the work, movement, and evidence without leaving the board.</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${deliveryBoardStatusTone(selectedItem.status)}`}>
                      {deliveryBoardStatusLabel(selectedItem.status)}
                    </span>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Action or deliverable</span>
                    <input
                      value={selectedItem.title}
                      onChange={(event) => onUpdateDeliveryBoardItem(selectedItem.id, { title: event.target.value })}
                      className="min-h-12 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-base font-medium text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Work context</span>
                    <textarea
                      value={selectedItem.description}
                      onChange={(event) => onUpdateDeliveryBoardItem(selectedItem.id, { description: event.target.value })}
                      placeholder="What outcome, milestone, or blocker does this card support?"
                      rows={4}
                      className="min-h-[132px] resize-y rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Latest movement</span>
                    <textarea
                      value={selectedItem.latestNote}
                      onChange={(event) => onUpdateDeliveryBoardItem(selectedItem.id, { latestNote: event.target.value })}
                      placeholder="Latest movement, review note, blocker, or leadership ask."
                      rows={3}
                      className="min-h-[104px] resize-y rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                    />
                  </label>
                </div>

                <aside className="grid content-start gap-4 border-t border-white/10 bg-black/20 p-4 md:p-5 xl:border-l xl:border-t-0">
                  <div className="grid gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-100">Operating details</p>
                    <p className="text-xs leading-5 text-zinc-500">Keep ownership, timing, status, and evidence current for this task.</p>
                  </div>

                  <div className="grid gap-3 rounded-lg border border-white/10 bg-zinc-950/70 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {deliveryBoardStatuses.map((option) => {
                        const isCurrentStatus = selectedItem.status === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            data-delivery-board-detail-status-chip={option.value}
                            aria-pressed={isCurrentStatus}
                            onClick={() => onUpdateDeliveryBoardItem(selectedItem.id, { status: option.value })}
                            className={`min-h-10 rounded-full border px-3 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors ${
                              isCurrentStatus
                                ? option.tone
                                : "border-white/10 bg-white/[0.025] text-zinc-500 hover:border-cyan-300/30 hover:text-cyan-100"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <label className="grid gap-2 rounded-lg border border-white/10 bg-zinc-950/70 p-3">
                      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Owner</span>
                      <input
                        value={selectedItem.owner}
                        onChange={(event) => onUpdateDeliveryBoardItem(selectedItem.id, { owner: event.target.value })}
                        placeholder={roleOwnerPlaceholder(selectedItem.role, assignedOwnersByRole)}
                        className="min-h-11 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                      />
                    </label>
                    <label className="grid gap-2 rounded-lg border border-white/10 bg-zinc-950/70 p-3">
                      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Due date</span>
                      <input
                        type="date"
                        value={selectedItem.dueDate}
                        onChange={(event) => onUpdateDeliveryBoardItem(selectedItem.id, { dueDate: event.target.value })}
                        className="min-h-11 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.035] p-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">Evidence</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">Attach proof points for review, leadership, and client-ready follow-through.</p>
                    </div>
                    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-cyan-300/20 bg-cyan-300/[0.055] px-3 py-2 text-xs font-medium text-cyan-100 transition-colors hover:border-cyan-300/40">
                      <FileUp className="h-3.5 w-3.5" />
                      Attach evidence
                      <input
                        data-delivery-board-attachment
                        type="file"
                        multiple
                        className="sr-only"
                        onChange={(event) => void onDeliveryBoardAttachmentsChange(selectedItem.id, event)}
                      />
                    </label>
                    {deliveryBoardUploadState?.itemId === selectedItem.id ? (
                      <p className="text-xs text-zinc-500">
                        {deliveryBoardUploadState.status === "uploading"
                          ? "Uploading..."
                          : deliveryBoardUploadState.status === "uploaded"
                            ? "Attachment added"
                            : deliveryBoardUploadState.status === "error"
                              ? "Upload failed"
                              : ""}
                      </p>
                    ) : null}
                    {selectedItem.attachments.length ? (
                      <div className="grid gap-2">
                        {selectedItem.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2"
                          >
                            <span className="inline-flex min-w-0 items-center gap-2 text-xs text-zinc-400">
                              <Paperclip className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
                              <span className="truncate">{attachment.fileName}</span>
                              <span className="shrink-0 text-zinc-600">{formatFileSize(attachment.sizeBytes)}</span>
                            </span>
                            <button
                              type="button"
                              aria-label={`Remove ${attachment.fileName}`}
                              onClick={() => onRemoveDeliveryBoardAttachment(selectedItem.id, attachment.id)}
                              className="text-zinc-500 transition-colors hover:text-rose-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-zinc-600">
                        No evidence attached yet.
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs leading-5 text-zinc-500">
            Saving the board refreshes Guided Plans and Studio suggestions against the latest execution evidence.
          </p>
          <Button type="button" data-delivery-board-save variant="outline" onClick={() => void onSaveDeliveryBoard()} disabled={saveState === "saving"}>
            <Save className="h-4 w-4" />
            {saveState === "saving" && saveConfirmation?.scope === "Delivery board" ? "Saving..." : "Save delivery board"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
