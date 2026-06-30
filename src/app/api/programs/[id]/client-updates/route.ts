import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { canAccessClientDashboardUpdateSurface } from "@/lib/admin-user-types";
import { auditActorFromManagedUser } from "@/lib/audit-event-service";
import type { TeamRoleUpdateStatus } from "@/lib/active-program-types";
import { validateClientPortalUpdateInput } from "@/lib/client-safe-copy";
import type { ClientPortalUpdateInput } from "@/lib/client-portal-update-types";
import {
  createAuditEvent,
  createClientPortalUpdate,
  deleteClientPortalUpdatesByTag,
  listClientPortalUpdates
} from "@/lib/program-store";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDomainStatus(value: unknown): TeamRoleUpdateStatus {
  return value === "blocked" || value === "at-risk" ? value : "on-track";
}

function normalizeClientUpdateInput(body: Partial<ClientPortalUpdateInput>): ClientPortalUpdateInput {
  return {
    activeRisks: clean(body.activeRisks),
    clientStatusNote: clean(body.clientStatusNote),
    completionDelta: clean(body.completionDelta),
    createdBy: clean(body.createdBy),
    currentPhase: clean(body.currentPhase),
    decisionsPending: clean(body.decisionsPending),
    deliveryBoardItems: Array.isArray(body.deliveryBoardItems) ? body.deliveryBoardItems : [],
    deliveryHealth: clean(body.deliveryHealth),
    domainUpdates: Array.isArray(body.domainUpdates)
      ? body.domainUpdates
          .map((domain) => ({
            attachments: Number.isFinite(Number(domain.attachments)) ? Number(domain.attachments) : 0,
            decisionsOrOutcomes: clean(domain.decisionsOrOutcomes),
            owner: clean(domain.owner),
            pursuit: clean(domain.pursuit),
            risksOrBlockers: clean(domain.risksOrBlockers),
            role: clean(domain.role),
            status: normalizeDomainStatus(domain.status)
          }))
          .filter((domain) => domain.role)
      : [],
    executiveOverview: clean(body.executiveOverview),
    executiveSponsor: clean(body.executiveSponsor),
    nextMilestoneDate: clean(body.nextMilestoneDate),
    nextMilestoneName: clean(body.nextMilestoneName),
    nextMilestonePriority: clean(body.nextMilestonePriority),
    originalNorthStar: clean(body.originalNorthStar),
    pmo: clean(body.pmo),
    programCompletionPercent: clean(body.programCompletionPercent),
    programLead: clean(body.programLead),
    programMilestones: Array.isArray(body.programMilestones) ? body.programMilestones : [],
    programStartDate: clean(body.programStartDate),
    programTargetFinishDate: clean(body.programTargetFinishDate),
    progressSinceLastReview: clean(body.progressSinceLastReview),
    publicationNote: clean(body.publicationNote),
    supportNeeded: clean(body.supportNeeded),
    timelineMonth: clean(body.timelineMonth),
    timelineScale: body.timelineScale === "month" || body.timelineScale === "week" ? body.timelineScale : "year",
    timelineWeek: clean(body.timelineWeek),
    timelineYear: clean(body.timelineYear),
    upcomingWork: clean(body.upcomingWork)
  };
}

function hasClientVisibleContent(input: ClientPortalUpdateInput) {
  return Boolean(
    input.clientStatusNote ||
      input.executiveOverview ||
      input.progressSinceLastReview ||
      input.upcomingWork ||
      input.activeRisks ||
      input.decisionsPending ||
      input.domainUpdates.some(
        (domain) => domain.pursuit || domain.risksOrBlockers || domain.decisionsOrOutcomes || domain.owner
      )
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id, { loadCurrentUser: true, scope: "client-dashboard" });
  if (response) return response;

  const updates = await listClientPortalUpdates(id);
  return NextResponse.json({ updates });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentUser, response } = await requireProgramRouteAccess(request, id, { loadCurrentUser: true, scope: "client-dashboard" });
  if (response) return response;
  if (currentUser && !canAccessClientDashboardUpdateSurface(currentUser)) {
    return NextResponse.json({ error: "Client update publishing is not available for this user type." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<ClientPortalUpdateInput>;
  const input = normalizeClientUpdateInput({
    ...body,
    createdBy: currentUser?.name ?? currentUser?.email ?? body.createdBy
  });

  if (!hasClientVisibleContent(input)) {
    return NextResponse.json({ error: "Add client-facing update content before publishing." }, { status: 400 });
  }

  const copySafety = validateClientPortalUpdateInput(input);
  if (!copySafety.ok) {
    return NextResponse.json(
      {
        error: "Client-facing update contains internal or tactical language. Rewrite it before publishing.",
        issues: copySafety.issues
      },
      { status: 400 }
    );
  }

  const update = await createClientPortalUpdate(id, input);

  await createAuditEvent({
    actor: auditActorFromManagedUser(currentUser),
    entityId: update.id,
    entityLabel: update.programName,
    entityType: "client-update",
    eventType: "client.update.publish",
    metadata: {
      domainCount: update.domainUpdates.length,
      hasRisks: Boolean(update.activeRisks),
      hasDecisions: Boolean(update.decisionsPending)
    },
    programId: update.programId,
    programName: update.programName,
    summary: `${update.programName} client-facing update was published.`,
    surface: currentUser?.userType === "client-dashboard-contributor" ? "Client Updates" : "Program Hub"
  });

  return NextResponse.json({ update });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentUser, response } = await requireProgramRouteAccess(request, id, { loadCurrentUser: true, scope: "client-dashboard" });
  if (response) return response;
  if (currentUser && !canAccessClientDashboardUpdateSurface(currentUser)) {
    return NextResponse.json({ error: "Client update cleanup is not available for this user type." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { tag?: string };
  const tag = body.tag?.trim();
  if (!tag) {
    return NextResponse.json({ error: "Tag is required." }, { status: 400 });
  }

  const deletedCount = await deleteClientPortalUpdatesByTag(id, tag);
  if (deletedCount) {
    await createAuditEvent({
      actor: auditActorFromManagedUser(currentUser),
      entityId: id,
      entityLabel: tag.slice(0, 120),
      entityType: "client-update",
      eventType: "client.update.delete",
      metadata: {
        cleanup: true,
        deletedCount
      },
      programId: id,
      summary: `Pruned ${deletedCount} tagged client-facing update${deletedCount === 1 ? "" : "s"}.`,
      surface: currentUser?.userType === "client-dashboard-contributor" ? "Client Updates" : "Program Hub"
    });
  }

  return NextResponse.json({ deletedCount });
}
