import { NextResponse } from "next/server";
import { getAdminAccessContext } from "@/lib/leadership-auth";
import { createGuidedPlan, getProgram, upsertProgram } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";
import { addProgramRoleToIntake } from "@/lib/team-roles";

async function requireAdminAccess(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const access = await getAdminAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

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

  return NextResponse.json({
    plan,
    program: savedProgram,
    refreshedAt: plan.createdAt,
    role: roleMutation.role,
    roles: roleMutation.roles
  });
}
