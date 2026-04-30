import { NextResponse } from "next/server";
import { buildProgramTeamAssignments } from "@/lib/program-team-assignments";
import { getProgram, listManagedUsers } from "@/lib/program-store";
import { normalizeTeamRoles } from "@/lib/team-roles";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await context.params;
  const program = await getProgram(id);

  if (!program) {
    return NextResponse.json({ assignments: [] });
  }

  const users = await listManagedUsers();
  const assignments = buildProgramTeamAssignments({
    programId: id,
    roles: normalizeTeamRoles(program.intake.teamRoles),
    users
  });

  return NextResponse.json({ assignments });
}
