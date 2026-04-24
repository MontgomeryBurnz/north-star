import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LeadershipLoginForm } from "@/components/leadership-login-form";
import {
  getConfiguredLeadershipAuthProvider,
  getLeadershipAccessContext,
  isLeadershipSessionTokenValid,
  leadershipSessionCookieName
} from "@/lib/leadership-auth";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function LeadershipLoginPage({
  searchParams
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  await requireSiteAccessPage("/leadership/login");
  const resolvedSearchParams = await searchParams;
  const authProvider = getConfiguredLeadershipAuthProvider();

  if (authProvider === "supabase") {
    const access = await getLeadershipAccessContext();
    if (access.authorized) {
      redirect(resolvedSearchParams.redirect || "/leadership");
    }
  } else {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(leadershipSessionCookieName)?.value;
    if (isLeadershipSessionTokenValid(sessionToken)) {
      redirect(resolvedSearchParams.redirect || "/leadership");
    }
  }

  return <LeadershipLoginForm redirectTo={resolvedSearchParams.redirect || "/leadership"} provider={authProvider} />;
}
