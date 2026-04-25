import { redirect } from "next/navigation";
import { GovernanceDashboard } from "@/components/governance-dashboard";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function GovernancePage() {
  await requireSiteAccessPage("/governance");
  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    redirect("/leadership/login?redirect=/governance");
  }

  return <GovernanceDashboard />;
}
