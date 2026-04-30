import { NextResponse } from "next/server";
import { hasActiveUserCredentials, requiresUserSetup } from "@/lib/admin-user-types";
import { syncManagedUserFromAuthUser } from "@/lib/current-managed-user";
import { attachSiteAccessCookie } from "@/lib/site-access";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "User account access is not configured." }, { status: 400 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const managedUser = await syncManagedUserFromAuthUser(data.user);
  if (!managedUser || !hasActiveUserCredentials(managedUser)) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json(
      {
        error: requiresUserSetup(managedUser)
          ? "Use the invitation link to create your password before signing in."
          : "No active North Star access assignment was found for this user."
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: managedUser.userType === "client" ? "/client" : undefined
  });

  return managedUser.userType === "client" ? response : attachSiteAccessCookie(response);
}
