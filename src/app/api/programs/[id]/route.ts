import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { auditActorFromManagedUser, buildSystemAuditActor } from "@/lib/audit-event-service";
import { normalizeClientName } from "@/lib/client-portfolio";
import { createAuditEvent, createGuidedPlan, getProgram, upsertProgram } from "@/lib/program-store";
import type { ProgramTeamFootprintRole } from "@/lib/program-intake-types";
import { syncProgramTeamFootprint } from "@/lib/team-roles";

type ProgramPatchBody = {
  clientName?: string;
  teamFootprint?: ProgramTeamFootprintRole[];
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
  const hasClientNamePatch = Object.prototype.hasOwnProperty.call(body, "clientName");
  const hasTeamFootprintPatch = Array.isArray(body.teamFootprint);
  const clientName = hasClientNamePatch ? (typeof body.clientName === "string" ? body.clientName.trim() : "") : program.intake.clientName ?? "";
  const previousClientName = program.intake.clientName?.trim() ?? "";

  const updatedProgram = await upsertProgram(syncProgramTeamFootprint({
    ...program.intake,
    clientName,
    teamFootprint: hasTeamFootprintPatch ? body.teamFootprint : program.intake.teamFootprint
  }));

  let planRefresh: { status: "current" | "failed" | "refreshed"; refreshedAt?: string } = { status: "current" };

  const actor = auditActorFromManagedUser(currentUser) ?? buildSystemAuditActor();

  if (hasClientNamePatch) {
    await createAuditEvent({
      actor,
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
  }

  if (hasTeamFootprintPatch) {
    const roleCount = updatedProgram.intake.teamFootprint?.filter((item) => item.active !== false).length ?? 0;
    const ownerCount = updatedProgram.intake.teamFootprint?.filter((item) => item.active !== false && item.owner.trim()).length ?? 0;

    await createAuditEvent({
      actor,
      entityId: updatedProgram.id,
      entityLabel: updatedProgram.intake.programName,
      entityType: "program",
      eventType: "program.team_footprint.update",
      metadata: {
        ownerCount,
        roleCount
      },
      programId: updatedProgram.id,
      programName: updatedProgram.intake.programName,
      summary: `${updatedProgram.intake.programName} team footprint updated.`,
      surface: "Program Hub"
    });

    const plan = await createGuidedPlan(updatedProgram.id);
    planRefresh = plan ? { refreshedAt: plan.createdAt, status: "refreshed" } : { status: "failed" };

    if (plan) {
      await createAuditEvent({
        actor,
        entityId: plan.id,
        entityLabel: plan.programName,
        entityType: "guided-plan",
        eventType: "guidance.refresh",
        metadata: {
          trigger: "team-footprint"
        },
        programId: updatedProgram.id,
        programName: plan.programName,
        summary: `${plan.programName} guidance refreshed after team footprint change.`,
        surface: "Guided Plans"
      });
    }
  }

  return NextResponse.json({ planRefresh, program: updatedProgram });
}
