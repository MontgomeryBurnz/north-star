export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { LeadershipReviewConsole } from "@/components/leadership-review-console";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";
import { requireSiteAccessPage } from "@/lib/app-page-access";
import { requireInternalWorkspacePage } from "@/lib/app-page-access";
import { isDemoMode } from "@/lib/demo-session";

export default async function LeadershipPage() {
  if (await isDemoMode()) {
    await requireInternalWorkspacePage("/leadership");
    return <LeadershipReviewConsole />;
  }
  await requireSiteAccessPage("/leadership");
  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    redirect("/login?redirect=/leadership");
  }

  return <LeadershipReviewConsole />;
}
