import { NextResponse } from "next/server";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import { auditActorFromManagedUser } from "@/lib/audit-event-service";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { createAuditEvent, createClientDecisionRequest, listClientDecisionRequests } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

function canAccessProgram(user: ManagedAppUser | null, programId: string, hasSiteAccess: boolean) {
  if (hasSiteAccess) return true;
  if (!user || user.credentialStatus === "disabled") return false;
  if (user.userType !== "client") return true;
  return user.assignments.some((assignment) => assignment.programId === programId);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [currentUser, hasSiteAccess] = await Promise.all([
    getCurrentManagedUser(),
    Promise.resolve(isSiteAccessRequestAuthorized(request))
  ]);

  if (!canAccessProgram(currentUser, id, hasSiteAccess)) {
    return currentUser ? NextResponse.json({ error: "Program access denied." }, { status: 403 }) : createSiteAccessDeniedResponse();
  }

  const decisions = await listClientDecisionRequests(id);
  return NextResponse.json({ decisions });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [currentUser, hasSiteAccess] = await Promise.all([
    getCurrentManagedUser(),
    Promise.resolve(isSiteAccessRequestAuthorized(request))
  ]);

  if (!canAccessProgram(currentUser, id, hasSiteAccess)) {
    return currentUser ? NextResponse.json({ error: "Program access denied." }, { status: 403 }) : createSiteAccessDeniedResponse();
  }

  const body = (await request.json().catch(() => ({}))) as { decisionText?: string };
  const decisionText = body.decisionText?.trim();

  if (!decisionText) {
    return NextResponse.json({ error: "Decision text is required." }, { status: 400 });
  }

  const decision = await createClientDecisionRequest(id, {
    decisionText,
    requestedBy: currentUser?.name ?? currentUser?.email ?? "Client portal"
  });

  await createAuditEvent({
    actor: auditActorFromManagedUser(currentUser),
    entityId: decision.id,
    entityLabel: decision.decisionText.slice(0, 120),
    entityType: "client-decision",
    eventType: "client.decision.create",
    metadata: {
      requestedBy: decision.requestedBy,
      status: decision.status
    },
    programId: decision.programId,
    programName: decision.programName,
    summary: `Client decision was requested for ${decision.programName}.`,
    surface: "Client Portal"
  });

  return NextResponse.json({ decision });
}
