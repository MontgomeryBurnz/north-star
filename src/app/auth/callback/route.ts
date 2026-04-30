import { NextResponse } from "next/server";
import { hasActiveUserCredentials, type ManagedAppUser } from "@/lib/admin-user-types";
import { syncManagedUserFromAuthUser } from "@/lib/current-managed-user";
import { getAdminAccessContext, getLeadershipAccessContext } from "@/lib/leadership-auth";
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
  const tokenNext = tokenType === "invite" || tokenType === "signup"
    ? "/auth/setup"
    : tokenType === "recovery"
      ? "/auth/reset-password"
      : null;
  const next = getSafeNextPath(tokenNext ?? (url.searchParams.get("next") || "/leadership"));
  let managedUser: ManagedAppUser | null = null;

  function attachInternalAccessForNonClient(response: NextResponse) {
    if (!hasActiveUserCredentials(managedUser)) return response;
    return managedUser?.userType === "client" ? response : attachSiteAccessCookie(response);
  }

  if (!isSupabaseConfigured()) {
    return attachSiteAccessCookie(NextResponse.redirect(new URL(next, url.origin)));
  }

  const supabase = await createSupabaseServerClient();
  if (code || (tokenHash && tokenType)) {
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          token_hash: tokenHash as string,
          type: tokenType as SupportedTokenHashType
        });

    if (error) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("authError", "expired");
      return NextResponse.redirect(loginUrl);
    }
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  managedUser = user ? await syncManagedUserFromAuthUser(user) : null;

  const protectedAdminPath = next.startsWith("/admin") || next.startsWith("/governance");
  const protectedLeadershipPath = next.startsWith("/leadership");
  if (!protectedAdminPath && !protectedLeadershipPath) {
    return attachInternalAccessForNonClient(NextResponse.redirect(new URL(next, url.origin)));
  }

  const access = protectedAdminPath ? await getAdminAccessContext() : await getLeadershipAccessContext();
  if (!access.authorized) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("redirect", next);
    return attachInternalAccessForNonClient(NextResponse.redirect(loginUrl));
  }

  return attachInternalAccessForNonClient(NextResponse.redirect(new URL(next, url.origin)));
}
