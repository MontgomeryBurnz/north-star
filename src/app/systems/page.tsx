import { GuidedPlansConsole } from "@/components/guided-plans-console";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function SystemsPage() {
  await requireSiteAccessPage("/systems");
  return <GuidedPlansConsole />;
}
