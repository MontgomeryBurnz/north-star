export const dynamic = "force-dynamic";

import { ClientPortalConsole } from "@/components/client-portal-console";
import { loadClientPortalData } from "@/lib/client-portal-data";

export default async function ClientPortalPage({
  searchParams
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const clientName = params.client?.trim() ?? "";
  const redirectTo = clientName ? `/client?client=${encodeURIComponent(clientName)}` : "/client";
  const { canReturnToInternal, portfolio, viewerLabel } = await loadClientPortalData(redirectTo, { clientName });

  return (
    <ClientPortalConsole
      canReturnToInternal={canReturnToInternal}
      portfolio={portfolio}
      viewerLabel={viewerLabel}
    />
  );
}
