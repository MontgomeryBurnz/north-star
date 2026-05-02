import { NextResponse } from "next/server";
import type { AuditEventInput, AuditEventType } from "@/lib/audit-event-types";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { createAuditEvent } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

const clientWritableEvents = new Set<AuditEventType>(["artifact.copy", "artifact.export"]);

export async function POST(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const body = (await request.json().catch(() => null)) as Partial<AuditEventInput> | null;
  const currentUser = await getCurrentManagedUser();

  if (!body?.eventType || !clientWritableEvents.has(body.eventType)) {
    return NextResponse.json({ error: "Unsupported audit event type." }, { status: 400 });
  }

  if (!body.surface?.trim() || !body.entityType?.trim() || !body.summary?.trim()) {
    return NextResponse.json({ error: "Audit event surface, entity type, and summary are required." }, { status: 400 });
  }

  const event = await createAuditEvent({
    actor: currentUser
      ? {
          email: currentUser.email,
          name: currentUser.name,
          userId: currentUser.id,
          userType: currentUser.userType
        }
      : undefined,
    entityId: body.entityId?.trim() || undefined,
    entityLabel: body.entityLabel?.trim() || undefined,
    entityType: body.entityType.trim(),
    eventType: body.eventType,
    metadata: body.metadata ?? {},
    programId: body.programId?.trim() || undefined,
    programName: body.programName?.trim() || undefined,
    summary: body.summary.trim(),
    surface: body.surface.trim()
  });

  return NextResponse.json({ event });
}
