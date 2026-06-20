import "server-only";
import { redirect } from "next/navigation";
import { requiresUserSetup } from "@/lib/admin-user-types";
import { tryGetCurrentManagedUser } from "@/lib/current-managed-user";
import { getSiteAccessConfig, isSiteAccessSessionTokenValid, siteAccessSessionCookieName } from "@/lib/site-access";

async function getCookieStore() {
  const { cookies } = await import("next/headers");
  return cookies();
}

function hasSupabaseAuthSession(cookieStore: Awaited<ReturnType<typeof getCookieStore>>) {
  return cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

async function redirectPendingUserSetup(cookieStore: Awaited<ReturnType<typeof getCookieStore>>) {
  if (!hasSupabaseAuthSession(cookieStore)) return;

  const currentUser = await tryGetCurrentManagedUser();
  if (requiresUserSetup(currentUser)) {
    redirect("/auth/setup");
  }
}

export async function requireSiteAccessPage(redirectTo: string) {
  const config = getSiteAccessConfig();
  if (!config.enabled) return;

  const cookieStore = await getCookieStore();
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

  const cookieStore = await getCookieStore();
  const hasAccess = isSiteAccessSessionTokenValid(cookieStore.get(siteAccessSessionCookieName)?.value);
  if (hasAccess) {
    await redirectPendingUserSetup(cookieStore);
  }
  return hasAccess;
}
