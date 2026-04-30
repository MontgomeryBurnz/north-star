import { NextResponse } from "next/server";
import { getConfiguredLeadershipAuthProvider, getLeadershipAccessContext } from "@/lib/leadership-auth";
import { attachSiteAccessCookie } from "@/lib/site-access";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next") || "/leadership");

  if (!isSupabaseConfigured()) {
    return attachSiteAccessCookie(NextResponse.redirect(new URL(next, url.origin)));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const protectedLeadershipPath = next.startsWith("/leadership") || next.startsWith("/admin") || next.startsWith("/governance");
  if (!protectedLeadershipPath || getConfiguredLeadershipAuthProvider() !== "supabase") {
    return attachSiteAccessCookie(NextResponse.redirect(new URL(next, url.origin)));
  }

  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return attachSiteAccessCookie(NextResponse.redirect(new URL("/leadership/login?error=access", url.origin)));
  }

  return attachSiteAccessCookie(NextResponse.redirect(new URL(next, url.origin)));
}
