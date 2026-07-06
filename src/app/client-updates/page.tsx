export const dynamic = "force-dynamic";

import { ClientDashboardUpdatesConsole } from "@/components/client-dashboard-updates-console";
import { ProductPageHeader } from "@/components/product-page-header";
import { canAccessClientDashboardUpdateSurface, getAssignedProgramIdSet, shouldScopeManagedUserPrograms } from "@/lib/admin-user-types";
import { loadClientPortalData } from "@/lib/client-portal-data";
import { listPrograms } from "@/lib/program-store";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Client Updates | North Star"
};

export default async function ClientUpdatesPage() {
  const { currentUser } = await loadClientPortalData("/client-updates");
  if (currentUser?.userType === "client") {
    redirect("/client");
  }
  if (currentUser && !canAccessClientDashboardUpdateSurface(currentUser)) {
    redirect("/client");
  }
  const programs = await listPrograms();
  const visiblePrograms = currentUser && shouldScopeManagedUserPrograms(currentUser)
    ? programs.filter((program) => getAssignedProgramIdSet(currentUser).has(program.id))
    : programs;

  return (
    <main>
      <section className="border-b border-white/10 bg-white/[0.015]">
        <div className="northstar-shell py-10">
          <ProductPageHeader
            eyebrow="Client dashboard inputs"
            title="Publish the client-facing program story."
            description="Use this governed surface for teams that only maintain Client Portal updates. Internal role notes stay private; only reviewed executive, domain, risk, decision, and timeline inputs publish to the Client Portal."
          />
        </div>
      </section>

      <ClientDashboardUpdatesConsole
        currentUserName={currentUser?.name ?? ""}
        programs={visiblePrograms}
        restrictedMode={currentUser?.userType === "client-dashboard-contributor"}
      />
    </main>
  );
}
