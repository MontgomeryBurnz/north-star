"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FileText, Search } from "lucide-react";
import type { AuditEventRecord } from "@/lib/audit-event-types";

type AdminAuditHistoryPanelProps = {
  auditEvents: AuditEventRecord[];
};

type DateFilter = "all" | "today" | "last-7-days" | "last-30-days";

const dateOptions: Array<{ label: string; value: DateFilter }> = [
  { label: "All dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "last-7-days" },
  { label: "Last 30 days", value: "last-30-days" }
];

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

function actorLabel(event: AuditEventRecord) {
  return event.actor?.name || event.actor?.email || event.actor?.userType || "System";
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

export function AdminAuditHistoryPanel({ auditEvents }: AdminAuditHistoryPanelProps) {
  const [actorFilter, setActorFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

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
        event.actor?.userType
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (actorFilter === "all" || currentActorLabel === actorFilter) &&
        (eventTypeFilter === "all" || event.eventType === eventTypeFilter) &&
        (programFilter === "all" || currentProgramLabel === programFilter) &&
        matchesDateFilter(event, dateFilter) &&
        (!query || searchableText.includes(query))
      );
    });
  }, [actorFilter, auditEvents, dateFilter, eventTypeFilter, programFilter, searchQuery]);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <FileText className="h-4 w-4 text-cyan-200" />
            Audit history
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Review activity by program, actor, event type, and date.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
          Showing {filteredEvents.length} of {auditEvents.length}
        </span>
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

      {filteredEvents.length ? (
        <div className="grid gap-2">
          {filteredEvents.slice(0, 40).map((event) => (
            <div
              key={event.id}
              className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 md:grid-cols-[9rem_minmax(0,1fr)_10rem] md:items-center"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-200">
                {formatAuditType(event.eventType)}
              </span>
              <span>
                <span className="block text-sm font-medium text-zinc-100">{event.summary}</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">
                  {[event.surface, event.programName, actorLabel(event), event.entityLabel].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="text-xs text-zinc-500 md:text-right">{formatTimestamp(event.createdAt)}</span>
            </div>
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
