export const dynamic = "force-dynamic";

import { ProgramWorkspace } from "@/components/program-workspace";
import { requireInternalWorkspacePage } from "@/lib/app-page-access";

export default async function ActiveProgramPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  await requireInternalWorkspacePage("/active-program");
  const resolvedSearchParams = await searchParams;
  const initialMode =
    resolvedSearchParams.mode === "setup" || resolvedSearchParams.mode === "manage"
      ? resolvedSearchParams.mode
      : null;

  return <ProgramWorkspace initialMode={initialMode} />;
}
