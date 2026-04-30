import { NextResponse } from "next/server";
import type { ManagedAppUserInput } from "@/lib/admin-user-types";
import { getInvitationProviderStatus, inviteManagedUser } from "@/lib/admin-user-invitations";
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
  return NextResponse.json({ invitationProvider: getInvitationProviderStatus(), users });
}

export async function POST(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  const body = (await request.json()) as ManagedAppUserInput & { sendInvite?: boolean };

  try {
    let user = await upsertManagedUser(body);
    let invitation:
      | { ok: true; invitedAt: string }
      | { ok: false; error: string }
      | null = null;

    if (body.sendInvite) {
      const inviteResult = await inviteManagedUser(user, request.url);

      if (inviteResult.ok) {
        user = await upsertManagedUser({
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          credentialStatus: "invited",
          authUserId: inviteResult.authUserId,
          invitedAt: inviteResult.invitedAt,
          lastAuthSyncAt: new Date().toISOString(),
          invitationError: ""
        });
        invitation = { ok: true, invitedAt: inviteResult.invitedAt };
      } else {
        user = await upsertManagedUser({
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          credentialStatus: user.credentialStatus,
          lastAuthSyncAt: new Date().toISOString(),
          invitationError: inviteResult.error
        });
        invitation = { ok: false, error: inviteResult.error };
      }
    }

    return NextResponse.json({ invitation, invitationProvider: getInvitationProviderStatus(), user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save user." },
      { status: 400 }
    );
  }
}
