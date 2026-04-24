import { AILabSection } from "@/components/ai-lab-section";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function LabPage() {
  await requireSiteAccessPage("/lab");
  return (
    <main>
      <AILabSection />
    </main>
  );
}
