import { NextResponse } from "next/server";
import { getConfiguredLeadershipAuthProvider, getLeadershipAccessContext } from "@/lib/leadership-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/leadership";

  if (getConfiguredLeadershipAuthProvider() !== "supabase") {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return NextResponse.redirect(new URL("/leadership/login?error=access", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
