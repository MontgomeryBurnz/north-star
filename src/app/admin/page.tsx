import { redirect } from "next/navigation";
import { AdminOperatingCostCenter } from "@/components/admin-operating-cost-center";
import { AdminTrustOperationsCard } from "@/components/admin-trust-operations-card";
import { AdminUserManagementCard } from "@/components/admin-user-management-card";
import { GovernanceDashboard } from "@/components/governance-dashboard";
import { ProductPageHeader } from "@/components/product-page-header";
import { getInvitationProviderStatus } from "@/lib/admin-user-invitations";
import { getGuidanceModelProfile } from "@/lib/guidance-model-profile";
import { getAdminAccessContext } from "@/lib/leadership-auth";
import { requireSiteAccessPage } from "@/lib/app-page-access";
import {
  listAuditEvents,
  listGuidanceFeedbackFlags,
  listManagedUsers,
  listPrograms
} from "@/lib/program-store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireSiteAccessPage("/admin");
  const access = await getAdminAccessContext();
  if (!access.authorized) {
    redirect("/login?redirect=/admin");
  }
  const guidanceModelProfile = getGuidanceModelProfile();
  const invitationProvider = getInvitationProviderStatus();
  const [initialUsers, initialPrograms, auditEvents] = await Promise.all([
    listManagedUsers(),
    listPrograms(),
    listAuditEvents(40)
  ]);
  const guidanceFlagsByProgram = await Promise.all(
    initialPrograms.map((program) => listGuidanceFeedbackFlags(program.id))
  );
  const guidanceFlags = guidanceFlagsByProgram.flat();

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <ProductPageHeader
        eyebrow="Admin"
        title="Admin Console"
        description="Control user access, program role assignments, guidance quality, audit history, reliability, and operating cost from one protected surface."
      />

      <section className="mt-10">
        <AdminUserManagementCard
          initialInvitationProvider={invitationProvider}
          initialPrograms={initialPrograms}
          initialUsers={initialUsers}
        />
      </section>

      <section className="mt-8">
        <AdminTrustOperationsCard
          auditEvents={auditEvents}
          guidanceFlags={guidanceFlags}
          guidanceModelProfile={guidanceModelProfile}
          invitationProvider={invitationProvider}
          users={initialUsers}
        />
      </section>

      <AdminOperatingCostCenter guidanceModelProfile={guidanceModelProfile} />

      <GovernanceDashboard embedded guidanceModelProfile={guidanceModelProfile} showOperatingCostPanels={false} />
    </main>
  );
}
