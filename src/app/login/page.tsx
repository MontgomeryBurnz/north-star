import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteAccessLoginForm } from "@/components/site-access-login-form";
import { requiresUserSetup } from "@/lib/admin-user-types";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { getAdminAccessContext, getLeadershipAccessContext } from "@/lib/leadership-auth";
import { getSiteAccessConfig, isSiteAccessSessionTokenValid, siteAccessSessionCookieName } from "@/lib/site-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function getRequiredAccessSurface(pathname: string) {
  if (pathname.startsWith("/admin") || pathname.startsWith("/governance")) return "admin";
  if (pathname.startsWith("/leadership")) return "leadership";
  return null;
}

export default async function SiteLoginPage({
  searchParams
}: {
  searchParams: Promise<{ authError?: string; redirect?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const config = getSiteAccessConfig();
  const redirectTo = resolvedSearchParams.redirect || "/";
  const authError = resolvedSearchParams.authError === "expired" ? "expired" : undefined;
  const requiredAccessSurface = getRequiredAccessSurface(redirectTo);

  if (!config.enabled) {
    redirect(redirectTo);
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(siteAccessSessionCookieName)?.value;
  const hasSupabaseSession = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
  if (hasSupabaseSession) {
    const currentUser = await getCurrentManagedUser();
    if (requiresUserSetup(currentUser)) {
      redirect("/auth/setup");
    }
  }

  if (requiredAccessSurface) {
    const access = requiredAccessSurface === "admin"
      ? await getAdminAccessContext()
      : await getLeadershipAccessContext();

    if (access.authorized) {
      redirect(redirectTo);
    }
  } else if (isSiteAccessSessionTokenValid(sessionToken)) {
    redirect(redirectTo);
  }

  return (
    <SiteAccessLoginForm
      authError={authError}
      redirectTo={redirectTo}
      userAuthEnabled={isSupabaseConfigured()}
    />
  );
}
