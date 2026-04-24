import { ActiveProgramReviewSection } from "@/components/active-program-review-section";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function ActiveProgramPage() {
  await requireSiteAccessPage("/active-program");
  return <ActiveProgramReviewSection />;
}
