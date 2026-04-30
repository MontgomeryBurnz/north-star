import { NextResponse } from "next/server";
import { upsertManagedUser } from "@/lib/program-store";
import { attachSiteAccessCookie } from "@/lib/site-access";
import { createSupabaseAdminClient, createSupabaseServerClient, isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/supabase/server";
import { findManagedUserByActivationToken } from "@/lib/user-activation-tokens";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "User account activation is not configured." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    displayName?: string;
    inviteToken?: string;
    password?: string;
  };
  const displayName = body.displayName?.trim() ?? "";
  const inviteToken = body.inviteToken?.trim() ?? "";
  const password = body.password ?? "";

  if (password.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
  }

  const managedUser = await findManagedUserByActivationToken(inviteToken);
  if (!managedUser || managedUser.credentialStatus === "disabled" || !managedUser.authUserId) {
    return NextResponse.json({ error: "This setup link is invalid or expired." }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(managedUser.authUserId, {
    email_confirm: true,
    password,
    user_metadata: {
      full_name: displayName || managedUser.name,
      northStarManagedUserId: managedUser.id,
      northStarUserType: managedUser.userType
    }
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || "Could not activate access." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const signIn = await supabase.auth.signInWithPassword({
    email: managedUser.email,
    password
  });

  if (signIn.error || !signIn.data.user) {
    return NextResponse.json({ error: signIn.error?.message || "Could not sign in after activation." }, { status: 400 });
  }

  const activeManagedUser = await upsertManagedUser({
    id: managedUser.id,
    name: displayName || managedUser.name,
    email: managedUser.email,
    userType: managedUser.userType,
    credentialStatus: "active",
    activationTokenHash: "",
    authUserId: signIn.data.user.id,
    lastAuthSyncAt: new Date().toISOString(),
    invitationError: ""
  });

  const response = NextResponse.json({
    ok: true,
    redirectTo: activeManagedUser.userType === "client" ? "/client" : undefined
  });

  return activeManagedUser.userType === "client" ? response : attachSiteAccessCookie(response);
}
