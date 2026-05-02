import { NextResponse } from "next/server";
import { buildSystemAuditActor } from "@/lib/audit-event-service";
import { createAuditEvent, listPrograms, upsertProgram } from "@/lib/program-store";
import type { ProgramIntake } from "@/lib/program-intake-types";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const programs = await listPrograms();
  return NextResponse.json({ programs });
}

export async function POST(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const body = (await request.json()) as Partial<ProgramIntake>;

  if (!body.programName?.trim()) {
    return NextResponse.json({ error: "Program name is required." }, { status: 400 });
  }

  const program = await upsertProgram({
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
    teamRoles: Array.from(
      new Set(
        (body.teamRoles ?? [])
          .map((role) => role?.trim())
          .filter((role): role is string => Boolean(role))
      )
    ),
    leadershipReviewCadence: body.leadershipReviewCadence === "biweekly" ? "biweekly" : "weekly",
    artifacts: body.artifacts ?? [],
    reviewedContext: body.reviewedContext
  });
  await createAuditEvent({
    actor: buildSystemAuditActor(),
    entityId: program.id,
    entityLabel: program.intake.programName,
    entityType: "program",
    eventType: "program.create_or_update",
    metadata: {
      artifactCount: program.intake.artifacts.length,
      roleCount: program.intake.teamRoles?.length ?? 0
    },
    programId: program.id,
    programName: program.intake.programName,
    summary: `${program.intake.programName} program record saved.`,
    surface: "Program Hub"
  });

  return NextResponse.json({ program });
}
