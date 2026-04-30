import { NextResponse } from "next/server";
import { getConfiguredLeadershipAuthProvider, getLeadershipAccessContext } from "@/lib/leadership-auth";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/leadership";

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const protectedLeadershipPath = next.startsWith("/leadership") || next.startsWith("/admin") || next.startsWith("/governance");
  if (!protectedLeadershipPath || getConfiguredLeadershipAuthProvider() !== "supabase") {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return NextResponse.redirect(new URL("/leadership/login?error=access", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
