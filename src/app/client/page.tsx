export const dynamic = "force-dynamic";

import { ClientPortalConsole } from "@/components/client-portal-console";
import { loadClientPortalData } from "@/lib/client-portal-data";

export default async function ClientPortalPage() {
  const { canReturnToInternal, portfolio, viewerLabel } = await loadClientPortalData("/client");

  return (
    <ClientPortalConsole
      canReturnToInternal={canReturnToInternal}
      portfolio={portfolio}
      viewerLabel={viewerLabel}
    />
  );
}
