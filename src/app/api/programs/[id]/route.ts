import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { auditActorFromManagedUser, buildSystemAuditActor } from "@/lib/audit-event-service";
import { normalizeClientName } from "@/lib/client-portfolio";
import { createAuditEvent, getProgram, upsertProgram } from "@/lib/program-store";

type ProgramPatchBody = {
  clientName?: string;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { currentUser, response } = await requireProgramRouteAccess(request, id, { loadCurrentUser: true });
  if (response) return response;

  const program = await getProgram(id);
  if (!program) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as ProgramPatchBody;
  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
  const previousClientName = program.intake.clientName?.trim() ?? "";

  const updatedProgram = await upsertProgram({
    ...program.intake,
    clientName
  });

  await createAuditEvent({
    actor: auditActorFromManagedUser(currentUser) ?? buildSystemAuditActor(),
    entityId: updatedProgram.id,
    entityLabel: updatedProgram.intake.programName,
    entityType: "program",
    eventType: "program.client.update",
    metadata: {
      clientName: updatedProgram.intake.clientName ?? "",
      previousClientName
    },
    programId: updatedProgram.id,
    programName: updatedProgram.intake.programName,
    summary: `${updatedProgram.intake.programName} assigned to ${normalizeClientName(updatedProgram.intake.clientName)}.`,
    surface: "Program Hub"
  });

  return NextResponse.json({ program: updatedProgram });
}
