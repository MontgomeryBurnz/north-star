import { ProgramWorkspace } from "@/components/program-workspace";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function ActiveProgramPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  await requireSiteAccessPage("/active-program");
  const resolvedSearchParams = await searchParams;
  return <ProgramWorkspace initialMode={resolvedSearchParams.mode === "setup" ? "setup" : "manage"} />;
}
