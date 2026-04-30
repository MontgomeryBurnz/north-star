import { AILabSection } from "@/components/ai-lab-section";
import { requireSiteAccessPage } from "@/lib/app-page-access";

export default async function LabPage() {
  await requireSiteAccessPage("/lab");
  return (
    <main>
      <AILabSection />
    </main>
  );
}
