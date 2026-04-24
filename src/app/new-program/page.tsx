import { ProgramIntakeSection } from "@/components/program-intake-section";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function NewProgramPage() {
  await requireSiteAccessPage("/new-program");
  return <ProgramIntakeSection />;
}
