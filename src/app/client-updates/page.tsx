export const dynamic = "force-dynamic";

import { ClientDashboardUpdatesConsole } from "@/components/client-dashboard-updates-console";
import { ProductPageHeader } from "@/components/product-page-header";
import { requireClientDashboardUpdatePage } from "@/lib/app-page-access";
import { isExternalOnlyUserType } from "@/lib/admin-user-types";
import { listPrograms } from "@/lib/program-store";

export const metadata = {
  title: "Client Updates | North Star"
};

export default async function ClientUpdatesPage() {
  const { currentUser } = await requireClientDashboardUpdatePage("/client-updates");
  const programs = await listPrograms();
  const visiblePrograms = currentUser && isExternalOnlyUserType(currentUser.userType)
    ? programs.filter((program) => currentUser.assignments.some((assignment) => assignment.programId === program.id))
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
