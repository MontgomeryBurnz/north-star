import { NextResponse } from "next/server";
import type { ManagedAppUser } from "@/lib/admin-user-types";
import { listManagedUsers, upsertManagedUser } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function matchManagedUser(users: ManagedAppUser[], authUser: { id: string; email?: string | null }) {
  const email = authUser.email?.trim().toLowerCase();
  return users.find((user) => user.authUserId === authUser.id || (email && user.email === email)) ?? null;
}

export async function GET(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ assignmentSource: "none", user: null });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ assignmentSource: "none", user: null });
  }

  const users = await listManagedUsers();
  const managedUser = matchManagedUser(users, authUser);

  if (!managedUser) {
    return NextResponse.json({
      assignmentSource: "supabase",
      authUser: {
        email: authUser.email,
        id: authUser.id
      },
      user: null
    });
  }

  const activeUser =
    managedUser.credentialStatus === "active" && managedUser.authUserId === authUser.id
      ? managedUser
      : await upsertManagedUser({
          id: managedUser.id,
          name: managedUser.name,
          email: managedUser.email,
          userType: managedUser.userType,
          credentialStatus: "active",
          authUserId: authUser.id,
          lastAuthSyncAt: new Date().toISOString(),
          invitationError: ""
        });

  return NextResponse.json({
    assignmentSource: "supabase",
    authUser: {
      email: authUser.email,
      id: authUser.id
    },
    user: activeUser
  });
}
