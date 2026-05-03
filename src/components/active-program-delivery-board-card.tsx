"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { CalendarClock, FileUp, KanbanSquare, Paperclip, Plus, Save, Trash2 } from "lucide-react";
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
  const activeItems = deliveryBoardItems.filter((item) => item.status !== "done");
  const attachmentCount = deliveryBoardItems.reduce((total, item) => total + item.attachments.length, 0);
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

  const handleAddItem = () => {
    if (!canAddItem) return;
    onAddDeliveryBoardItem(draft);
    setDraft(emptyDraft(draft.role));
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
              Track role-owned actions, deliverables, review needs, blockers, and attached evidence.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <span className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
              {deliveryBoardItems.length} cards
            </span>
            <span className="rounded-md border border-amber-300/15 bg-amber-300/[0.055] px-3 py-2 text-xs text-amber-100">
              {statusCounts["needs-review"] + statusCounts.blocked} need action
            </span>
            <span className="rounded-md border border-emerald-300/15 bg-emerald-300/[0.055] px-3 py-2 text-xs text-emerald-100">
              {attachmentCount} attachments
            </span>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_160px_160px]">
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
          </div>
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-end">
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
            <label className="grid gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Context</span>
              <input
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="What outcome, milestone, or blocker does this card support?"
                className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
              />
            </label>
            <Button type="button" data-delivery-board-add onClick={handleAddItem} disabled={!canAddItem}>
              <Plus className="h-4 w-4" />
              Add card
            </Button>
          </div>
        </div>

        <div className="grid gap-5">
          {roleLanes.length ? (
            roleLanes.map((role) => {
              const roleItems = deliveryBoardItems.filter((item) => normalizeRoleKey(item.role) === normalizeRoleKey(role));
              const roleAttachments = roleItems.reduce((total, item) => total + item.attachments.length, 0);

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
                  <div className="grid gap-3 xl:grid-cols-5">
                    {deliveryBoardStatuses.map((status) => {
                      const statusItems = roleItems.filter((item) => item.status === status.value);

                      return (
                        <div
                          key={status.value}
                          data-delivery-board-column={status.value}
                          className="min-h-[150px] rounded-lg border border-white/10 bg-black/20 p-3"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <span className={`rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${status.tone}`}>
                              {status.label}
                            </span>
                            <span className="text-xs text-zinc-500">{statusItems.length}</span>
                          </div>
                          <div className="grid gap-3">
                            {statusItems.length ? (
                              statusItems.map((item) => (
                                <article
                                  key={item.id}
                                  data-delivery-board-card={item.id}
                                  className="grid gap-3 rounded-md border border-white/10 bg-zinc-950 p-3 shadow-[0_16px_45px_rgba(0,0,0,0.18)]"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="line-clamp-2 text-sm font-medium leading-5 text-zinc-100">{item.title}</p>
                                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                                        {item.description || "No context captured yet."}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      aria-label={`Remove ${item.title}`}
                                      onClick={() => onRemoveDeliveryBoardItem(item.id)}
                                      className="rounded-md border border-white/10 p-1.5 text-zinc-500 transition-colors hover:border-rose-300/30 hover:text-rose-100"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <div className="grid gap-2 text-xs text-zinc-400">
                                    <span className="inline-flex items-center gap-2">
                                      <CalendarClock className="h-3.5 w-3.5 text-cyan-200" />
                                      {item.dueDate || "No due date"}
                                    </span>
                                    <input
                                      value={item.owner}
                                      onChange={(event) => onUpdateDeliveryBoardItem(item.id, { owner: event.target.value })}
                                      placeholder={roleOwnerPlaceholder(item.role, assignedOwnersByRole)}
                                      className="min-h-9 rounded-md border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                                    />
                                    <select
                                      data-delivery-board-status
                                      value={item.status}
                                      onChange={(event) =>
                                        onUpdateDeliveryBoardItem(item.id, { status: event.target.value as DeliveryBoardStatus })
                                      }
                                      className={`min-h-9 rounded-md border px-2.5 py-2 text-xs outline-none transition-colors focus:border-cyan-300/50 ${deliveryBoardStatusTone(
                                        item.status
                                      )}`}
                                    >
                                      {deliveryBoardStatuses.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <textarea
                                    value={item.latestNote}
                                    onChange={(event) => onUpdateDeliveryBoardItem(item.id, { latestNote: event.target.value })}
                                    placeholder="Latest movement, review note, or blocker."
                                    rows={2}
                                    className="min-h-[72px] resize-none rounded-md border border-white/10 bg-black/20 px-2.5 py-2 text-xs leading-5 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
                                  />
                                  <div className="grid gap-2 border-t border-white/10 pt-3">
                                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-cyan-300/30 hover:text-cyan-100">
                                      <FileUp className="h-3.5 w-3.5" />
                                      Attach evidence
                                      <input
                                        data-delivery-board-attachment
                                        type="file"
                                        multiple
                                        className="sr-only"
                                        onChange={(event) => void onDeliveryBoardAttachmentsChange(item.id, event)}
                                      />
                                    </label>
                                    {deliveryBoardUploadState?.itemId === item.id ? (
                                      <p className="text-[11px] text-zinc-500">
                                        {deliveryBoardUploadState.status === "uploading"
                                          ? "Uploading..."
                                          : deliveryBoardUploadState.status === "uploaded"
                                            ? "Attachment added"
                                            : deliveryBoardUploadState.status === "error"
                                              ? "Upload failed"
                                              : ""}
                                      </p>
                                    ) : null}
                                    {item.attachments.length ? (
                                      <div className="grid gap-1">
                                        {item.attachments.map((attachment) => (
                                          <div
                                            key={attachment.id}
                                            className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-2.5 py-2"
                                          >
                                            <span className="inline-flex min-w-0 items-center gap-2 text-[11px] text-zinc-400">
                                              <Paperclip className="h-3 w-3 shrink-0 text-cyan-200" />
                                              <span className="truncate">{attachment.fileName}</span>
                                              <span className="shrink-0 text-zinc-600">{formatFileSize(attachment.sizeBytes)}</span>
                                            </span>
                                            <button
                                              type="button"
                                              aria-label={`Remove ${attachment.fileName}`}
                                              onClick={() => onRemoveDeliveryBoardAttachment(item.id, attachment.id)}
                                              className="text-zinc-500 transition-colors hover:text-rose-100"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                </article>
                              ))
                            ) : (
                              <p className="rounded-md border border-white/10 bg-zinc-950/60 p-3 text-xs leading-5 text-zinc-600">
                                No {deliveryBoardStatusLabel(status.value).toLowerCase()} cards.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
