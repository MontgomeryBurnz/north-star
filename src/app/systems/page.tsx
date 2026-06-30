export const dynamic = "force-dynamic";

import { GuidedPlansConsole } from "@/components/guided-plans-console";
import { requireInternalWorkspacePage } from "@/lib/app-page-access";

export default async function SystemsPage() {
  await requireInternalWorkspacePage("/systems");
  return <GuidedPlansConsole />;
}
