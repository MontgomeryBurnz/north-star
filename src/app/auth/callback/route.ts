import { NextResponse } from "next/server";
import { getConfiguredLeadershipAuthProvider, getLeadershipAccessContext } from "@/lib/leadership-auth";
import { attachSiteAccessCookie } from "@/lib/site-access";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type SupportedTokenHashType = "invite" | "recovery" | "signup" | "magiclink" | "email";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function getTokenHashType(value: string | null): SupportedTokenHashType | null {
  if (
    value === "invite" ||
    value === "recovery" ||
    value === "signup" ||
    value === "magiclink" ||
    value === "email"
  ) {
    return value;
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tokenType = getTokenHashType(url.searchParams.get("type"));
  const next = getSafeNextPath(url.searchParams.get("next") || "/leadership");

  if (!isSupabaseConfigured()) {
    return attachSiteAccessCookie(NextResponse.redirect(new URL(next, url.origin)));
  }

  if (code || (tokenHash && tokenType)) {
    const supabase = await createSupabaseServerClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash as string,
          type: tokenType as SupportedTokenHashType
        });

    if (error) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("authError", "expired");
      return attachSiteAccessCookie(NextResponse.redirect(loginUrl));
    }
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
