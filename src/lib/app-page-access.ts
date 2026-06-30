import "server-only";
import { redirect } from "next/navigation";
import {
  canAccessClientDashboardUpdateSurface,
  isExternalOnlyUserType,
  requiresUserSetup,
  type ManagedAppUser
} from "@/lib/admin-user-types";
import { getCurrentManagedUser, tryGetCurrentManagedUser } from "@/lib/current-managed-user";
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

function redirectExternalOnlyUser(user: ManagedAppUser | null | undefined) {
  if (!user || requiresUserSetup(user)) return;
  if (user.userType === "client") {
    redirect("/client");
  }
  if (user.userType === "client-dashboard-contributor") {
    redirect("/client-updates");
  }
}

export async function requireInternalWorkspacePage(redirectTo: string) {
  await requireSiteAccessPage(redirectTo);
  const currentUser = await tryGetCurrentManagedUser();
  redirectExternalOnlyUser(currentUser);
}

export async function requireClientDashboardUpdatePage(redirectTo: string) {
  const [currentUser, hasInternalSession] = await Promise.all([
    getCurrentManagedUser(),
    hasSiteAccessPageSession()
  ]);

  if (currentUser && requiresUserSetup(currentUser)) {
    redirect("/auth/setup");
  }

  if (currentUser?.userType === "client") {
    redirect("/client");
  }

  if (canAccessClientDashboardUpdateSurface(currentUser)) {
    return { currentUser };
  }

  if (!currentUser && hasInternalSession) {
    return { currentUser: null };
  }

  if (currentUser && isExternalOnlyUserType(currentUser.userType)) {
    redirect("/client");
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
