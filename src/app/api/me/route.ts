import { NextResponse } from "next/server";
import { requireSiteAccessRequest } from "@/lib/api-route-access";
import { syncManagedUserFromAuthUser } from "@/lib/current-managed-user";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const denied = requireSiteAccessRequest(request);
  if (denied) return denied;

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

  const managedUser = await syncManagedUserFromAuthUser(authUser);

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

  return NextResponse.json({
    assignmentSource: "supabase",
    authUser: {
      email: authUser.email,
      id: authUser.id
    },
    user: managedUser
  });
}
