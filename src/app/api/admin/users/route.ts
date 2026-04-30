import { NextResponse } from "next/server";
import type { ManagedAppUserInput } from "@/lib/admin-user-types";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";
import { listManagedUsers, upsertManagedUser } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

async function requireAdminAccess(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  const users = await listManagedUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  const body = (await request.json()) as ManagedAppUserInput;

  try {
    const user = await upsertManagedUser(body);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save user." },
      { status: 400 }
    );
  }
}
