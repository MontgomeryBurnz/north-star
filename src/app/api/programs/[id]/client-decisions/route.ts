import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { auditActorFromManagedUser } from "@/lib/audit-event-service";
import { createAuditEvent, createClientDecisionRequest, listClientDecisionRequests } from "@/lib/program-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id, { loadCurrentUser: true });
  if (response) return response;

  const decisions = await listClientDecisionRequests(id);
  return NextResponse.json({ decisions });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentUser, response } = await requireProgramRouteAccess(request, id, { loadCurrentUser: true });
  if (response) return response;

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
