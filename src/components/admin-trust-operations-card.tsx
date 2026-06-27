import { Activity, BrainCircuit, FileClock, KeyRound, MailCheck, ShieldCheck, type LucideIcon } from "lucide-react";
import type { InvitationProviderStatus } from "@/lib/admin-user-invitations";
import type { AuditEventRecord } from "@/lib/audit-event-types";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import type { DocumentationFreshnessSnapshot } from "@/lib/documentation-freshness";
import type { GuidanceModelProfile } from "@/lib/guidance-model-profile";
import type { GuidanceFeedbackFlag } from "@/lib/program-intelligence-types";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminAuditHistoryPanel } from "@/components/admin-audit-history-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminTrustOperationsCardProps = {
  auditEvents: AuditEventRecord[];
  documentationFreshness: DocumentationFreshnessSnapshot;
  guidanceFlags: GuidanceFeedbackFlag[];
  guidanceModelProfile: GuidanceModelProfile;
  invitationProvider: InvitationProviderStatus;
  users: ManagedAppUser[];
};

const permissionRows = [
  {
    title: "Admin",
    detail: "Full control across users, program data, cost, model settings, disputed guidance, and audit review."
  },
  {
    title: "Leadership",
    detail: "Sponsor-level review, leadership feedback, and role-lane visibility for assigned program scope."
  },
  {
    title: "Delivery Lead",
    detail: "Program Hub ownership, team signal capture, guided plans, Studio outputs, and delivery board movement for assigned programs."
  },
  {
    title: "Team Member",
    detail: "Role-specific updates, artifacts, and adjacent program context for assigned programs."
  },
  {
    title: "Client",
    detail: "Client Portal access for assigned portfolio or program views without internal workflow controls."
  },
  {
    title: "Viewer",
    detail: "Read-focused visibility for assigned programs when collaboration rights are not needed."
  }
];

function readinessLabel(ready: boolean) {
  return ready ? "Ready" : "Needs review";
}

function readinessClassName(ready: boolean) {
  return ready
    ? "border-emerald-300/20 bg-emerald-300/[0.055] text-emerald-100"
    : "border-amber-300/20 bg-amber-300/[0.055] text-amber-100";
}

function ReliabilityTile({
  detail,
  icon: Icon,
  ready,
  title
}: {
  detail: string;
  icon: LucideIcon;
  ready: boolean;
  title: string;
}) {
  return (
    <div className={`rounded-md border p-4 ${readinessClassName(ready)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-50">
            <Icon className="h-4 w-4 text-current" />
            {title}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">{detail}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]">
          {readinessLabel(ready)}
        </span>
      </div>
    </div>
  );
}

function AuditCoverageTile({
  detail,
  label,
  value
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-50">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

function formatFreshnessDate(value: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "America/New_York",
    year: "numeric"
  }).format(date);
}

function DocumentationFreshnessPanel({ snapshot }: { snapshot: DocumentationFreshnessSnapshot }) {
  const isCurrent = snapshot.status === "current";
  const isUnknown = snapshot.status === "unknown";
  const statusLabel = isCurrent ? "Current" : isUnknown ? "Unknown" : "Needs review";
  const tone = isCurrent
    ? "border-emerald-300/20 bg-emerald-300/[0.055] text-emerald-100"
    : isUnknown
      ? "border-zinc-500/20 bg-white/[0.035] text-zinc-300"
      : "border-amber-300/25 bg-amber-300/[0.07] text-amber-100";
  let reviewSignal = "Review the Knowledge Center docs before the next release.";
  if (isCurrent) {
    reviewSignal = "Knowledge docs are aligned with the latest app change.";
  } else if (isUnknown) {
    reviewSignal = "Freshness could not be confirmed from Git or file metadata.";
  }

  return (
    <section className="grid gap-3" data-admin-documentation-freshness>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <FileClock className="h-4 w-4 text-cyan-200" />
            Documentation freshness
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Flags when user-facing application changes are newer than the Knowledge Center source docs.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${tone}`}>
          {statusLabel}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Latest docs update</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100">{formatFreshnessDate(snapshot.docsLatestAt)}</p>
          <p className="mt-1 truncate text-xs text-zinc-500">{snapshot.docsLatestPath ?? "No documentation source detected"}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Latest user-facing change</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100">{formatFreshnessDate(snapshot.productLatestAt)}</p>
          <p className="mt-1 truncate text-xs text-zinc-500">{snapshot.productLatestPath ?? "No app source detected"}</p>
        </div>
        <div className={`rounded-md border p-4 ${tone}`}>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em]">Review signal</p>
          <p className="mt-2 text-sm font-semibold text-zinc-50">{reviewSignal}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Use this as a release hygiene check, not a blocker for emergency fixes.
          </p>
        </div>
      </div>
    </section>
  );
}

export function AdminTrustOperationsCard({
  auditEvents,
  documentationFreshness,
  guidanceFlags,
  guidanceModelProfile,
  invitationProvider,
  users
}: AdminTrustOperationsCardProps) {
  const supabaseReady = isSupabaseConfigured() && isSupabaseAdminConfigured();
  const openAIReady =
    guidanceModelProfile.provider === "openai" && guidanceModelProfile.model !== "unconfigured" && Boolean(process.env.OPENAI_API_KEY);
  const vercelReady = Boolean(
    process.env.NORTHSTAR_VERCEL_API_TOKEN && (process.env.NORTHSTAR_VERCEL_PROJECT_ID || process.env.NORTHSTAR_VERCEL_PROJECT_NAME)
  );
  const emailReady = Boolean(invitationProvider.brandedEmail.configured);
  const pendingFlags = guidanceFlags.filter((flag) => flag.status === "pending").length;
  const reviewedFlags = guidanceFlags.length - pendingFlags;
  const userAccessEvents = auditEvents.filter((event) => event.eventType.startsWith("user.")).length;
  const guidanceRefreshEvents = auditEvents.filter((event) => event.eventType === "guidance.refresh").length;
  const exportEvents = auditEvents.filter((event) => event.eventType === "artifact.export" || event.eventType === "artifact.copy").length;
  const clientDecisionEvents = auditEvents.filter((event) => event.eventType === "client.decision.create").length;

  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-zinc-50">
              <ShieldCheck className="h-4 w-4 text-emerald-200" />
              Trust & Operations
            </CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Admin answers who can access what, what changed, why guidance can be trusted, and whether the operating layer is ready.
            </p>
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.08] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-100">
            Enterprise controls
          </span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 p-5">
        <section className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Permission model</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">User type defines the surface area; program assignments define the working scope.</p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
              {users.length} users
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {permissionRows.map((row) => (
              <div key={row.title} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <p className="text-sm font-semibold text-zinc-100">{row.title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{row.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3">
          <p className="text-sm font-semibold text-zinc-100">Reliability indicators</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ReliabilityTile
              title="Supabase"
              detail={supabaseReady ? "Auth, data access, and Admin service role are configured." : "Confirm auth and Admin service-role configuration."}
              icon={KeyRound}
              ready={supabaseReady}
            />
            <ReliabilityTile
              title="OpenAI"
              detail={openAIReady ? `${guidanceModelProfile.model} is configured for guided workflows.` : "Configure the model provider and API key before relying on generated guidance."}
              icon={BrainCircuit}
              ready={openAIReady}
            />
            <ReliabilityTile
              title="Vercel"
              detail={vercelReady ? "Deployment and operations telemetry can sync from Vercel." : "Connect the Vercel API token and project reference for live operations metrics."}
              icon={Activity}
              ready={vercelReady}
            />
            <ReliabilityTile
              title="Email"
              detail={
                emailReady
                  ? `Invite and recovery delivery uses ${invitationProvider.brandedEmail.provider}.`
                  : "Configure branded email delivery before inviting external client testers."
              }
              icon={MailCheck}
              ready={emailReady}
            />
          </div>
        </section>

        <DocumentationFreshnessPanel snapshot={documentationFreshness} />

        <section className="grid gap-3">
          <p className="text-sm font-semibold text-zinc-100">Audit coverage</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <AuditCoverageTile label="User access" value={String(userAccessEvents).padStart(2, "0")} detail="Invites, setup links, role assignments, and removals." />
            <AuditCoverageTile label="Guidance refreshes" value={String(guidanceRefreshEvents).padStart(2, "0")} detail="Plan refreshes triggered by program signal." />
            <AuditCoverageTile label="Guidance flags" value={`${pendingFlags}/${reviewedFlags}`} detail="Pending flags / reviewed flags." />
            <AuditCoverageTile label="Exports" value={String(exportEvents).padStart(2, "0")} detail="Studio copy, DOCX export, and CSV export activity." />
            <AuditCoverageTile label="Client decisions" value={String(clientDecisionEvents).padStart(2, "0")} detail="Client Portal decision requests." />
          </div>
        </section>

        <AdminAuditHistoryPanel auditEvents={auditEvents} />
      </CardContent>
    </Card>
  );
}
