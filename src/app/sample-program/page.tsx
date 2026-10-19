export const dynamic = "force-dynamic";

import { SampleProgramExperience } from "@/components/sample-program-experience";
import { requireInternalWorkspacePage } from "@/lib/app-page-access";

export const metadata = {
  title: "Sample Program | North Star",
  description: "Explore a fictional program from discovery evidence to product definition, delivery, and stakeholder outcomes."
};

export default async function SampleProgramPage() {
  await requireInternalWorkspacePage("/sample-program");
  return <SampleProgramExperience />;
}
