import { NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/api-route-access";
import { auditActorFromAccess } from "@/lib/audit-event-service";
import { createAuditEvent, createGuidedPlan, getProgram, upsertProgram } from "@/lib/program-store";
import { addProgramRoleToIntake } from "@/lib/team-roles";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { access, response } = await requireAdminRouteAccess(request);
  if (response) return response;

  const { id } = await params;
  const body = (await request.json()) as { role?: string };
  const program = await getProgram(id);

  if (!program) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  const roleMutation = addProgramRoleToIntake(program.intake, body.role);
  if (!roleMutation.ok) {
    return NextResponse.json(
      {
        error: roleMutation.error,
        roles: roleMutation.roles
      },
      { status: 400 }
    );
  }

  const savedProgram = await upsertProgram(roleMutation.intake);
  const plan = await createGuidedPlan(savedProgram.id);

  if (!plan) {
    return NextResponse.json({ error: "Program role was saved, but guidance could not be refreshed." }, { status: 500 });
  }

  const actor = auditActorFromAccess(access);
  await createAuditEvent({
    actor,
    entityId: savedProgram.id,
    entityLabel: roleMutation.role,
    entityType: "program-role",
    eventType: "program.role.add",
    metadata: {
      roleCount: roleMutation.roles.length
    },
    programId: savedProgram.id,
    programName: savedProgram.intake.programName,
    summary: `${roleMutation.role} role added to ${savedProgram.intake.programName}.`,
    surface: "Admin"
  });
  await createAuditEvent({
    actor,
    entityId: plan.id,
    entityLabel: plan.programName,
    entityType: "guided-plan",
    eventType: "guidance.refresh",
    metadata: {
      role: roleMutation.role,
      trigger: "program-role"
    },
    programId: savedProgram.id,
    programName: plan.programName,
    summary: `${plan.programName} guidance refreshed after role change.`,
    surface: "Guided Plans"
  });

  return NextResponse.json({
    plan,
    program: savedProgram,
    refreshedAt: plan.createdAt,
    role: roleMutation.role,
    roles: roleMutation.roles
  });
}
