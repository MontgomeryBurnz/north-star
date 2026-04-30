import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SiteAccessLoginForm } from "@/components/site-access-login-form";
import { getSiteAccessConfig, isSiteAccessSessionTokenValid, siteAccessSessionCookieName } from "@/lib/site-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function SiteLoginPage({
  searchParams
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const config = getSiteAccessConfig();
  const redirectTo = resolvedSearchParams.redirect || "/";

  if (!config.enabled) {
    redirect(redirectTo);
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(siteAccessSessionCookieName)?.value;
  if (isSiteAccessSessionTokenValid(sessionToken)) {
    redirect(redirectTo);
  }

  return <SiteAccessLoginForm redirectTo={redirectTo} userAuthEnabled={isSupabaseConfigured()} />;
}
