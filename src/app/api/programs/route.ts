import { NextResponse } from "next/server";
import { requireSiteAccessRequest } from "@/lib/api-route-access";
import { getAssignedProgramIdSet, hasActiveUserCredentials, isExternalOnlyUserType, shouldScopeManagedUserPrograms } from "@/lib/admin-user-types";
import { buildSystemAuditActor } from "@/lib/audit-event-service";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { createAuditEvent, listPrograms, upsertProgram } from "@/lib/program-store";
import type { ProgramIntake } from "@/lib/program-intake-types";
import { syncProgramTeamFootprint } from "@/lib/team-roles";

export async function GET(request: Request) {
  const currentUser = await getCurrentManagedUser();
  const denied = requireSiteAccessRequest(request);
  if (denied && !hasActiveUserCredentials(currentUser)) return denied;

  const programs = await listPrograms();
  if (currentUser && shouldScopeManagedUserPrograms(currentUser)) {
    const assignedProgramIds = getAssignedProgramIdSet(currentUser);
    return NextResponse.json({
      programs: programs.filter((program) => assignedProgramIds.has(program.id))
    });
  }

  return NextResponse.json({ programs });
}

export async function POST(request: Request) {
  const denied = requireSiteAccessRequest(request);
  if (denied) return denied;
  const currentUser = await getCurrentManagedUser();
  if (currentUser && isExternalOnlyUserType(currentUser.userType)) {
    return NextResponse.json({ error: "Program creation is not available for this user type." }, { status: 403 });
  }

  const body = (await request.json()) as Partial<ProgramIntake>;

  if (!body.programName?.trim()) {
    return NextResponse.json({ error: "Program name is required." }, { status: 400 });
  }

  const intake = syncProgramTeamFootprint({
    clientName: body.clientName ?? "",
    programName: body.programName,
    programOwner: body.programOwner ?? "",
    vision: body.vision ?? "",
    sowSummary: body.sowSummary ?? "",
    outcomes: body.outcomes ?? "",
    stakeholders: body.stakeholders ?? "",
    risks: body.risks ?? "",
    constraints: body.constraints ?? "",
    currentStatus: body.currentStatus ?? "",
    decisionsNeeded: body.decisionsNeeded ?? "",
    blockers: body.blockers ?? "",
    teamFootprint: body.teamFootprint,
    teamRoles: body.teamRoles,
    leadershipReviewCadence: body.leadershipReviewCadence === "biweekly" ? "biweekly" : "weekly",
    artifacts: body.artifacts ?? [],
    reviewedContext: body.reviewedContext
  });
  const program = await upsertProgram(intake);
  await createAuditEvent({
    actor: buildSystemAuditActor(),
    entityId: program.id,
    entityLabel: program.intake.programName,
    entityType: "program",
    eventType: "program.create_or_update",
    metadata: {
      artifactCount: program.intake.artifacts.length,
      clientName: program.intake.clientName ?? "",
      roleCount: program.intake.teamFootprint?.filter((item) => item.active !== false).length ?? program.intake.teamRoles?.length ?? 0
    },
    programId: program.id,
    programName: program.intake.programName,
    summary: `${program.intake.programName} program record saved.`,
    surface: "Program Hub"
  });

  return NextResponse.json({ program });
}
