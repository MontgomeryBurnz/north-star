"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Download, FileText, Search } from "lucide-react";
import type { AuditEventRecord, AuditEventType } from "@/lib/audit-event-types";
import { Button } from "@/components/ui/button";

type AdminAuditHistoryPanelProps = {
  auditEvents: AuditEventRecord[];
};

type AuditCategory = "all" | "access" | "guidance" | "studio" | "client" | "cost" | "system";
type AuditGroupMode = "time" | "user";
type AuditVisibility = "important" | "all";
type DateFilter = "all" | "today" | "last-7-days" | "last-30-days";

const maxEventsPerGroup = 12;
const maxSummaryItems = 4;

const auditActionLabels: Record<AuditEventType, string> = {
  "artifact.copy": "Artifact copied",
  "artifact.export": "Artifact exported",
  "artifact.generate": "Artifact generated",
  "client.decision.create": "Client decision added",
  "flag.create": "Guidance flagged",
  "flag.review": "Flag reviewed",
  "guide.dialogue": "Guide dialogue recorded",
  "guidance.refresh": "Guidance refreshed",
  "leadership.feedback": "Leadership feedback saved",
  "model.settings.update": "Model settings changed",
  "program.client.update": "Client portfolio assigned",
  "program.create_or_update": "Program saved",
  "program.role.add": "Program role added",
  "program.update": "Program updated",
  "user.access.remove": "User access removed",
  "user.access.update": "User access updated",
  "user.invite.link": "Invite link generated",
  "user.invite.send": "User invited"
};

const dateOptions: Array<{ label: string; value: DateFilter }> = [
  { label: "All dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "last-7-days" },
  { label: "Last 30 days", value: "last-30-days" }
];

const categoryOptions: Array<{ label: string; value: AuditCategory }> = [
  { label: "All", value: "all" },
  { label: "Access", value: "access" },
  { label: "Guidance", value: "guidance" },
  { label: "Studio", value: "studio" },
  { label: "Client", value: "client" },
  { label: "Cost / Model", value: "cost" },
  { label: "System", value: "system" }
];

const importantEventTypes = new Set<AuditEventType>([
  "client.decision.create",
  "flag.create",
  "flag.review",
  "guidance.refresh",
  "leadership.feedback",
  "model.settings.update",
  "program.client.update",
  "program.role.add",
  "user.access.remove",
  "user.access.update",
  "user.invite.link",
  "user.invite.send"
]);

function formatTimestamp(value: string | undefined) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatAuditType(value: AuditEventRecord["eventType"]) {
  if (value.startsWith("artifact.")) return "Studio";
  if (value.startsWith("client.")) return "Client Portal";
  if (value.startsWith("flag.")) return "Flag";
  if (value.startsWith("guide.")) return "Guide";
  if (value.startsWith("guidance.")) return "Guidance";
  if (value.startsWith("leadership.")) return "Leadership";
  if (value.startsWith("model.")) return "Model settings";
  if (value.startsWith("program.")) return "Program";
  if (value.startsWith("user.")) return "User access";
  return "Audit";
}

function formatAuditAction(value: AuditEventType) {
  return auditActionLabels[value] ?? formatAuditType(value);
}

function eventCategory(eventType: AuditEventType): AuditCategory {
  if (eventType.startsWith("user.")) return "access";
  if (eventType.startsWith("artifact.")) return "studio";
  if (eventType.startsWith("client.")) return "client";
  if (eventType.startsWith("model.")) return "cost";
  if (eventType.startsWith("flag.") || eventType.startsWith("guide.") || eventType.startsWith("guidance.") || eventType.startsWith("leadership.")) {
    return "guidance";
  }
  return "system";
}

function isImportantEvent(event: AuditEventRecord) {
  return importantEventTypes.has(event.eventType);
}

function actorLabel(event: AuditEventRecord) {
  return event.actor?.name || event.actor?.email || event.actor?.userType || "System";
}

function actorDetail(event: AuditEventRecord) {
  return event.actor?.email || event.actor?.userType || (event.actor ? "User activity" : "Automated system activity");
}

function actorKey(event: AuditEventRecord) {
  return event.actor?.userId || event.actor?.email || event.actor?.name || event.actor?.userType || "system";
}

function selectOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function matchesDateFilter(event: AuditEventRecord, dateFilter: DateFilter) {
  if (dateFilter === "all") return true;

  const eventTime = new Date(event.createdAt).getTime();
  if (!Number.isFinite(eventTime)) return false;

  const now = new Date();
  if (dateFilter === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return eventTime >= start;
  }

  const dayWindow = dateFilter === "last-7-days" ? 7 : 30;
  return eventTime >= now.getTime() - dayWindow * 24 * 60 * 60 * 1000;
}

function getAuditGroupLabel(createdAt: string) {
  const eventTime = new Date(createdAt).getTime();
  if (!Number.isFinite(eventTime)) return "Older";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  if (eventTime >= todayStart) return "Today";
  if (eventTime >= yesterdayStart) return "Yesterday";
  if (eventTime >= sevenDaysStart) return "Last 7 days";
  return "Older";
}

type AuditEventGroup = {
  detail?: string;
  events: AuditEventRecord[];
  key: string;
  label: string;
};

type AuditSummaryItem = {
  count: number;
  detail?: string;
  key: string;
  label: string;
  latestAt?: string;
  secondary?: string;
};

function sortAuditEvents(events: AuditEventRecord[]) {
  return [...events].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function groupAuditEventsByTime(events: AuditEventRecord[]): AuditEventGroup[] {
  const groups = new Map<string, AuditEventRecord[]>();

  for (const event of sortAuditEvents(events)) {
    const label = getAuditGroupLabel(event.createdAt);
    const groupEvents = groups.get(label);
    if (groupEvents) {
      groupEvents.push(event);
    } else {
      groups.set(label, [event]);
    }
  }

  return ["Today", "Yesterday", "Last 7 days", "Older"]
    .map((label) => ({ events: groups.get(label) ?? [], key: label, label }))
    .filter((group) => group.events.length > 0);
}

function groupAuditEventsByActor(events: AuditEventRecord[]): AuditEventGroup[] {
  const groups = new Map<string, AuditEventGroup>();

  for (const event of sortAuditEvents(events)) {
    const key = actorKey(event);
    const current = groups.get(key);

    if (current) {
      current.events.push(event);
    } else {
      groups.set(key, {
        detail: actorDetail(event),
        events: [event],
        key,
        label: actorLabel(event)
      });
    }
  }

  return Array.from(groups.values()).sort((left, right) => {
    const rightLatest = new Date(right.events[0]?.createdAt ?? 0).getTime();
    const leftLatest = new Date(left.events[0]?.createdAt ?? 0).getTime();
    return rightLatest - leftLatest;
  });
}

function groupAuditEvents(events: AuditEventRecord[], groupMode: AuditGroupMode) {
  return groupMode === "user" ? groupAuditEventsByActor(events) : groupAuditEventsByTime(events);
}

function summarizeEventsByCategory(events: AuditEventRecord[]) {
  const counts = new Map<AuditCategory, number>();

  for (const event of events) {
    const category = eventCategory(event.eventType);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return categoryOptions
    .filter((option) => option.value !== "all")
    .map((option) => ({ count: counts.get(option.value) ?? 0, label: option.label }))
    .filter((item) => item.count > 0);
}

function newestTimestamp(left?: string, right?: string) {
  if (!left) return right;
  if (!right) return left;
  return new Date(right).getTime() > new Date(left).getTime() ? right : left;
}

function topCategoryLabel(events: AuditEventRecord[]) {
  const [topCategory] = summarizeEventsByCategory(events).sort((left, right) => right.count - left.count);
  return topCategory ? `${topCategory.label}: ${topCategory.count}` : undefined;
}

function buildTopActorSummary(events: AuditEventRecord[]): AuditSummaryItem[] {
  const grouped = new Map<string, AuditEventRecord[]>();

  for (const event of events) {
    const key = actorKey(event);
    const actorEvents = grouped.get(key);
    if (actorEvents) {
      actorEvents.push(event);
    } else {
      grouped.set(key, [event]);
    }
  }

  return Array.from(grouped.entries())
    .map(([key, actorEvents]) => {
      const latestAt = actorEvents.reduce<string | undefined>((current, event) => newestTimestamp(current, event.createdAt), undefined);
      return {
        count: actorEvents.length,
        detail: actorDetail(actorEvents[0]),
        key,
        label: actorLabel(actorEvents[0]),
        latestAt,
        secondary: topCategoryLabel(actorEvents)
      };
    })
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return new Date(right.latestAt ?? 0).getTime() - new Date(left.latestAt ?? 0).getTime();
    })
    .slice(0, maxSummaryItems);
}

function buildTopActionSummary(events: AuditEventRecord[]): AuditSummaryItem[] {
  const grouped = new Map<AuditEventType, { actors: Set<string>; count: number; latestAt?: string }>();

  for (const event of events) {
    const current = grouped.get(event.eventType) ?? { actors: new Set<string>(), count: 0, latestAt: undefined };
    current.actors.add(actorLabel(event));
    current.count += 1;
    current.latestAt = newestTimestamp(current.latestAt, event.createdAt);
    grouped.set(event.eventType, current);
  }

  return Array.from(grouped.entries())
    .map(([eventType, item]) => ({
      count: item.count,
      detail: eventType,
      key: eventType,
      label: formatAuditAction(eventType),
      latestAt: item.latestAt,
      secondary: `${item.actors.size} actor${item.actors.size === 1 ? "" : "s"}`
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return new Date(right.latestAt ?? 0).getTime() - new Date(left.latestAt ?? 0).getTime();
    })
    .slice(0, maxSummaryItems);
}

function csvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportAuditEvents(events: AuditEventRecord[]) {
  const headers = [
    "createdAt",
    "eventType",
    "surface",
    "programName",
    "actor",
    "actorEmail",
    "entityType",
    "entityLabel",
    "summary"
  ];
  const rows = events.map((event) => [
    event.createdAt,
    event.eventType,
    event.surface,
    event.programName ?? "",
    actorLabel(event),
    event.actor?.email ?? "",
    event.entityType,
    event.entityLabel ?? "",
    event.summary
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  anchor.href = url;
  anchor.download = `north-star-audit-events-${timestamp}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SelectFilter({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          data-admin-audit-filter={label.toLowerCase()}
          className="h-10 w-full appearance-none rounded-md border border-white/10 bg-zinc-950 px-3 pr-9 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      </span>
    </label>
  );
}

function EventDetail({ event }: { event: AuditEventRecord }) {
  const metadata = event.metadata ? JSON.stringify(event.metadata, null, 2) : "";

  return (
    <div className="grid gap-3 border-t border-white/10 px-4 py-3 text-xs leading-5 text-zinc-400 md:grid-cols-3">
      <div>
        <p className="font-medium uppercase tracking-[0.14em] text-zinc-500">Actor</p>
        <p className="mt-1 text-zinc-200">{actorLabel(event)}</p>
        {event.actor?.email ? <p className="break-all text-zinc-500">{event.actor.email}</p> : null}
      </div>
      <div>
        <p className="font-medium uppercase tracking-[0.14em] text-zinc-500">Entity</p>
        <p className="mt-1 text-zinc-200">{event.entityLabel || event.entityId || "Not recorded"}</p>
        <p className="text-zinc-500">{event.entityType}</p>
      </div>
      <div>
        <p className="font-medium uppercase tracking-[0.14em] text-zinc-500">Source</p>
        <p className="mt-1 text-zinc-200">{event.surface}</p>
        <p className="break-all text-zinc-500">{event.programName || event.programId || "No program scope"}</p>
      </div>
      {metadata ? (
        <pre className="max-h-48 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-[11px] leading-5 text-zinc-400 md:col-span-3">
          {metadata}
        </pre>
      ) : null}
    </div>
  );
}

function EventRow({ event }: { event: AuditEventRecord }) {
  return (
    <details
      data-admin-audit-event-row
      data-admin-audit-actor={actorLabel(event)}
      data-admin-audit-created-at={event.createdAt}
      data-admin-audit-event-type={event.eventType}
      data-admin-audit-program={event.programName ?? event.programId ?? ""}
      data-admin-audit-summary={event.summary}
      className="group overflow-hidden rounded-md border border-white/10 bg-black/20 transition-colors open:border-cyan-300/25 open:bg-cyan-300/[0.035]"
    >
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 hover:bg-white/[0.025] md:grid-cols-[9rem_minmax(0,1fr)_9rem] md:items-center [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-200">
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition-transform group-open:rotate-180" />
          {formatAuditType(event.eventType)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-zinc-100">{event.summary}</span>
          <span className="mt-1 block truncate text-xs leading-5 text-zinc-500">
            {[event.surface, event.programName, actorLabel(event), event.entityLabel].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="text-xs text-zinc-500 md:text-right">{formatTimestamp(event.createdAt)}</span>
      </summary>
      <EventDetail event={event} />
    </details>
  );
}

function AuditGroupDetails({
  group,
  groupMode
}: {
  group: AuditEventGroup;
  groupMode: AuditGroupMode;
}) {
  const previewEvents = group.events.slice(0, maxEventsPerGroup);
  const hiddenCount = Math.max(0, group.events.length - previewEvents.length);
  const categorySummary = groupMode === "user" ? summarizeEventsByCategory(group.events) : [];
  const latestEvent = group.events[0];

  return (
    <details
      open={groupMode === "user" ? group.events.length <= maxEventsPerGroup : group.label === "Today"}
      className="group rounded-md border border-white/10 bg-white/[0.018]"
      data-admin-audit-group={group.label}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-zinc-400 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
          <span className="truncate">{group.label}</span>
          {group.detail ? <span className="hidden truncate normal-case tracking-normal text-zinc-600 sm:inline">{group.detail}</span> : null}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-2">
          {categorySummary.slice(0, 3).map((item) => (
            <span key={item.label} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">
              {item.label}: {item.count}
            </span>
          ))}
          {latestEvent ? <span className="text-zinc-600">Last {formatTimestamp(latestEvent.createdAt)}</span> : null}
          <span>{group.events.length} events</span>
        </span>
      </summary>
      <div className="grid gap-2 border-t border-white/10 p-2">
        {previewEvents.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
        {hiddenCount ? (
          <div className="rounded-md border border-dashed border-white/10 bg-black/20 px-4 py-3 text-xs leading-5 text-zinc-500">
            {hiddenCount} additional event{hiddenCount === 1 ? "" : "s"} hidden in this group. Use search, filters, or CSV export for the full filtered audit set.
          </div>
        ) : null}
      </div>
    </details>
  );
}

function AuditSummaryList({ items, label }: { items: AuditSummaryItem[]; label: string }) {
  if (!items.length) {
    return <p className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-500">No {label.toLowerCase()} in this filtered view.</p>;
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="grid gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          data-admin-audit-summary-card
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-zinc-100">{item.label}</span>
            <span className="mt-0.5 block truncate text-xs text-zinc-500">
              {[item.detail, item.secondary, item.latestAt ? `Last ${formatTimestamp(item.latestAt)}` : ""].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs font-medium text-emerald-100">
            {item.count} event{item.count === 1 ? "" : "s"}
          </span>
        </div>
      ))}
    </div>
  );
}

function AuditActivitySummary({
  topActions,
  topActors
}: {
  topActions: AuditSummaryItem[];
  topActors: AuditSummaryItem[];
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2" data-admin-audit-summary>
      <section className="rounded-md border border-white/10 bg-white/[0.025] p-3" data-admin-audit-top-users>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Top active users</p>
            <p className="mt-1 text-xs text-zinc-500">Who is creating the most audit signal in this view.</p>
          </div>
        </div>
        <AuditSummaryList items={topActors} label="Top users" />
      </section>

      <section className="rounded-md border border-white/10 bg-white/[0.025] p-3" data-admin-audit-top-actions>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">Top actions</p>
            <p className="mt-1 text-xs text-zinc-500">Which behaviors are happening most often.</p>
          </div>
        </div>
        <AuditSummaryList items={topActions} label="Top actions" />
      </section>
    </div>
  );
}

export function AdminAuditHistoryPanel({ auditEvents }: AdminAuditHistoryPanelProps) {
  const [actorFilter, setActorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [groupMode, setGroupMode] = useState<AuditGroupMode>("user");
  const [programFilter, setProgramFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibility, setVisibility] = useState<AuditVisibility>("important");

  const actorOptions = useMemo(() => selectOptions(auditEvents.map(actorLabel)), [auditEvents]);
  const eventTypeOptions = useMemo(() => selectOptions(auditEvents.map((event) => event.eventType)), [auditEvents]);
  const programOptions = useMemo(() => selectOptions(auditEvents.map((event) => event.programName ?? event.programId ?? "")), [auditEvents]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return auditEvents.filter((event) => {
      const currentActorLabel = actorLabel(event);
      const currentProgramLabel = event.programName ?? event.programId ?? "";
      const searchableText = [
        event.summary,
        event.surface,
        event.eventType,
        event.entityLabel,
        event.entityType,
        event.programName,
        event.programId,
        event.actor?.email,
        event.actor?.name,
        event.actor?.userType,
        event.metadata ? JSON.stringify(event.metadata) : ""
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (visibility === "all" || isImportantEvent(event)) &&
        (categoryFilter === "all" || eventCategory(event.eventType) === categoryFilter) &&
        (actorFilter === "all" || currentActorLabel === actorFilter) &&
        (eventTypeFilter === "all" || event.eventType === eventTypeFilter) &&
        (programFilter === "all" || currentProgramLabel === programFilter) &&
        matchesDateFilter(event, dateFilter) &&
        (!query || searchableText.includes(query))
      );
    });
  }, [actorFilter, auditEvents, categoryFilter, dateFilter, eventTypeFilter, programFilter, searchQuery, visibility]);
  const groupedEvents = useMemo(() => groupAuditEvents(filteredEvents, groupMode), [filteredEvents, groupMode]);
  const topActors = useMemo(() => buildTopActorSummary(filteredEvents), [filteredEvents]);
  const topActions = useMemo(() => buildTopActionSummary(filteredEvents), [filteredEvents]);

  return (
    <section className="grid gap-4" data-admin-audit-history>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <FileText className="h-4 w-4 text-cyan-200" />
            Audit history
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Compact trust trail grouped by user by default. Open a row only when you need full metadata.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500"
            data-admin-audit-count
          >
            Showing {filteredEvents.length} of {auditEvents.length}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportAuditEvents(filteredEvents)}
            disabled={!filteredEvents.length}
            data-admin-audit-export
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] p-2">
        <button
          type="button"
          onClick={() => setVisibility("important")}
          data-admin-audit-visibility="important"
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            visibility === "important"
              ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
              : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-100"
          }`}
        >
          Important only
        </button>
        <button
          type="button"
          onClick={() => setVisibility("all")}
          data-admin-audit-visibility="all"
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            visibility === "all"
              ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
              : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-100"
          }`}
        >
          All events
        </button>
        <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        <button
          type="button"
          onClick={() => setGroupMode("user")}
          data-admin-audit-group-mode="user"
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            groupMode === "user"
              ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
              : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-100"
          }`}
        >
          Group by user
        </button>
        <button
          type="button"
          onClick={() => setGroupMode("time")}
          data-admin-audit-group-mode="time"
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            groupMode === "time"
              ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
              : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-100"
          }`}
        >
          Group by time
        </button>
        <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        {categoryOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setCategoryFilter(option.value)}
            data-admin-audit-category={option.value}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === option.value
                ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.025] p-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
        <label className="grid gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Search</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search summary, actor, surface..."
              data-admin-audit-search
              className="h-10 w-full rounded-md border border-white/10 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15"
            />
          </span>
        </label>
        <SelectFilter
          label="Program"
          value={programFilter}
          onChange={setProgramFilter}
          options={[{ label: "All programs", value: "all" }, ...programOptions.map((value) => ({ label: value, value }))]}
        />
        <SelectFilter
          label="Actor"
          value={actorFilter}
          onChange={setActorFilter}
          options={[{ label: "All actors", value: "all" }, ...actorOptions.map((value) => ({ label: value, value }))]}
        />
        <SelectFilter
          label="Event"
          value={eventTypeFilter}
          onChange={setEventTypeFilter}
          options={[
            { label: "All events", value: "all" },
            ...eventTypeOptions.map((value) => ({
              label: `${formatAuditType(value as AuditEventRecord["eventType"])} - ${value}`,
              value
            }))
          ]}
        />
        <SelectFilter
          label="Date"
          value={dateFilter}
          onChange={(value) => setDateFilter(value as DateFilter)}
          options={dateOptions}
        />
      </div>

      <AuditActivitySummary topActors={topActors} topActions={topActions} />

      {groupedEvents.length ? (
        <div className="grid gap-3">
          {groupedEvents.map((group) => (
            <AuditGroupDetails key={group.key} group={group} groupMode={groupMode} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-zinc-400">
          No audit events match the selected filters.
        </div>
      )}
    </section>
  );
}
