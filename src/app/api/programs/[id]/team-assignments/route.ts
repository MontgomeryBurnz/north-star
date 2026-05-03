import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { buildProgramTeamAssignments } from "@/lib/program-team-assignments";
import { getProgram, listManagedUsers } from "@/lib/program-store";
import { normalizeTeamRoles } from "@/lib/team-roles";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

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
