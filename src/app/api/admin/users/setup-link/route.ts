import { NextResponse } from "next/server";
import { createManagedUserSetupLink, getInvitationProviderStatus } from "@/lib/admin-user-invitations";
import { getAdminAccessContext } from "@/lib/leadership-auth";
import { listManagedUsers, upsertManagedUser } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

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

export async function POST(request: Request) {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { id?: string };
  const userId = body.id?.trim();

  if (!userId) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const users = await listManagedUsers();
  const user = users.find((item) => item.id === userId);

  if (!user) {
    return NextResponse.json({ error: "Managed user was not found." }, { status: 404 });
  }

  if (user.credentialStatus === "disabled") {
    return NextResponse.json({ error: "Disabled users cannot receive setup links." }, { status: 400 });
  }

  const linkResult = await createManagedUserSetupLink(user, request);

  if (!linkResult.ok) {
    const updatedUser = await upsertManagedUser({
      id: user.id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      credentialStatus: user.credentialStatus,
      lastAuthSyncAt: new Date().toISOString(),
      invitationError: linkResult.error
    });

    return NextResponse.json(
      { error: linkResult.error, invitationProvider: getInvitationProviderStatus(), user: updatedUser },
      { status: 400 }
    );
  }

  const updatedUser = await upsertManagedUser({
    id: user.id,
    name: user.name,
    email: user.email,
    userType: user.userType,
    credentialStatus: "invited",
    authUserId: linkResult.authUserId,
    invitedAt: linkResult.invitedAt,
    lastAuthSyncAt: new Date().toISOString(),
    invitationError: ""
  });

  return NextResponse.json({
    invitationProvider: getInvitationProviderStatus(),
    setupLink: {
      type: linkResult.type,
      url: linkResult.setupUrl
    },
    user: updatedUser
  });
}
