import { redirect } from "next/navigation";
import { LeadershipReviewConsole } from "@/components/leadership-review-console";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";

export default async function LeadershipPage() {
  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    redirect("/leadership/login?redirect=/leadership");
  }

  return <LeadershipReviewConsole />;
}
