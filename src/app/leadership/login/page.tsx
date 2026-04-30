import { redirect } from "next/navigation";
import { getAdminAccessContext, getLeadershipAccessContext } from "@/lib/leadership-auth";

export default async function LeadershipLoginPage({
  searchParams
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const redirectTo = resolvedSearchParams.redirect || "/leadership";
  const access = redirectTo.startsWith("/admin") || redirectTo.startsWith("/governance")
    ? await getAdminAccessContext()
    : await getLeadershipAccessContext();

  if (access.authorized) {
    redirect(redirectTo);
  }

  redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
}
