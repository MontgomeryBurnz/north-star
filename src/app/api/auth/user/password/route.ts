import { NextResponse } from "next/server";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import { listManagedUsers, upsertManagedUser } from "@/lib/program-store";
import { attachSiteAccessCookie } from "@/lib/site-access";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function matchManagedUser(users: ManagedAppUser[], authUser: { id: string; email?: string | null }) {
  const email = authUser.email?.trim().toLowerCase();
  return users.find((user) => user.authUserId === authUser.id || (email && user.email === email)) ?? null;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "User account access is not configured." }, { status: 400 });
  }

  const body = (await request.json()) as {
    displayName?: string;
    password?: string;
  };
  const displayName = body.displayName?.trim() ?? "";
  const password = body.password ?? "";

  if (password.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return NextResponse.json({ error: "A valid invitation or recovery session is required." }, { status: 401 });
  }

  const { data, error } = await supabase.auth.updateUser({
    data: displayName ? { full_name: displayName } : undefined,
    password
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || "Could not update password." }, { status: 400 });
  }

  const managedUsers = await listManagedUsers();
  const managedUser = matchManagedUser(managedUsers, data.user);
  if (!managedUser || managedUser.credentialStatus === "disabled") {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json({ error: "No active North Star access assignment was found for this user." }, { status: 403 });
  }

  const activeManagedUser = await upsertManagedUser({
    id: managedUser.id,
    name: displayName || managedUser.name,
    email: managedUser.email,
    userType: managedUser.userType,
    credentialStatus: "active",
    authUserId: data.user.id,
    lastAuthSyncAt: new Date().toISOString(),
    invitationError: ""
  });

  const response = NextResponse.json({
    ok: true,
    redirectTo: activeManagedUser.userType === "client" ? "/client" : undefined
  });

  return activeManagedUser.userType === "client" ? response : attachSiteAccessCookie(response);
}
