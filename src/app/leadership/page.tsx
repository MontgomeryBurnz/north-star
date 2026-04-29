import { redirect } from "next/navigation";
import { LeadershipReviewConsole } from "@/components/leadership-review-console";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function LeadershipPage() {
  await requireSiteAccessPage("/leadership");
  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    redirect("/leadership/login?redirect=/leadership");
  }

  return <LeadershipReviewConsole />;
}
