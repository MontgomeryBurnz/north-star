import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requiresUserSetup } from "@/lib/admin-user-types";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { getSiteAccessConfig, isSiteAccessSessionTokenValid, siteAccessSessionCookieName } from "@/lib/site-access";

function hasSupabaseAuthSession(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

async function redirectPendingUserSetup(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  if (!hasSupabaseAuthSession(cookieStore)) return;

  const currentUser = await getCurrentManagedUser();
  if (requiresUserSetup(currentUser)) {
    redirect("/auth/setup");
  }
}

export async function requireSiteAccessPage(redirectTo: string) {
  const config = getSiteAccessConfig();
  if (!config.enabled) return;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(siteAccessSessionCookieName)?.value;
  if (isSiteAccessSessionTokenValid(sessionToken)) {
    await redirectPendingUserSetup(cookieStore);
    return;
  }

  redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
}

export async function hasSiteAccessPageSession() {
  const config = getSiteAccessConfig();
  if (!config.enabled) return true;

  const cookieStore = await cookies();
  const hasAccess = isSiteAccessSessionTokenValid(cookieStore.get(siteAccessSessionCookieName)?.value);
  if (hasAccess) {
    await redirectPendingUserSetup(cookieStore);
  }
  return hasAccess;
}
