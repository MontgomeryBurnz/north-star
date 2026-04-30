import { NextResponse } from "next/server";
import type { ManagedAppUser, ManagedAppUserInput } from "@/lib/admin-user-types";
import { getInvitationProviderStatus, inviteManagedUser } from "@/lib/admin-user-invitations";
import { getAdminAccessContext } from "@/lib/leadership-auth";
import { deleteManagedUser, listManagedUsers, upsertManagedUser } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/server";

async function requireAdminAccess(request: Request) {
  const access = await getAdminAccessContext();
  if (!access.authorized) {
    if (!isSiteAccessRequestAuthorized(request)) {
      return createSiteAccessDeniedResponse();
    }

    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

function isAuthUserAlreadyGone(error: { message?: string; status?: number } | null) {
  if (!error) return false;
  return error.status === 404 || error.message?.toLowerCase().includes("not found");
}

async function findSupabaseAuthUserIdByEmail(email: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw new Error(error.message);
  }

  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

async function deleteLinkedAuthUser(user: ManagedAppUser) {
  if (!isSupabaseAdminConfigured()) {
    return { deleted: false, skipped: true };
  }

  const supabase = createSupabaseAdminClient();
  const authUserId = user.authUserId ?? (await findSupabaseAuthUserIdByEmail(user.email));

  if (!authUserId) {
    return { deleted: false, skipped: false };
  }

  const { error } = await supabase.auth.admin.deleteUser(authUserId);

  if (error && !isAuthUserAlreadyGone(error)) {
    throw new Error(error.message);
  }

  return { deleted: !error, skipped: false };
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
      const inviteResult = await inviteManagedUser(user, request);

      if (inviteResult.ok) {
        user = await upsertManagedUser({
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          credentialStatus: "invited",
          activationTokenCreatedAt: inviteResult.activationTokenCreatedAt,
          activationTokenExpiresAt: inviteResult.activationTokenExpiresAt,
          activationTokenHash: inviteResult.activationTokenHash,
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
          activationTokenHash: "",
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

export async function DELETE(request: Request) {
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

  try {
    const authDeletion = await deleteLinkedAuthUser(user);
    const deletedUser = await deleteManagedUser(userId);

    return NextResponse.json({
      authDeletion,
      invitationProvider: getInvitationProviderStatus(),
      user: deletedUser ?? user
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove user." },
      { status: 400 }
    );
  }
}
