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
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");
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

  if ((tokenHash || token) && tokenType) {
    const activateUrl = new URL("/auth/activate", url.origin);
    if (email) activateUrl.searchParams.set("email", email);
    if (token) activateUrl.searchParams.set("token", token);
    if (tokenHash) activateUrl.searchParams.set("token_hash", tokenHash);
    activateUrl.searchParams.set("type", tokenType);
    activateUrl.searchParams.set("next", next);
    return NextResponse.redirect(activateUrl);
  }

  const supabase = await createSupabaseServerClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

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
