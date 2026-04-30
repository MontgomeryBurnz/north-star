import { redirect } from "next/navigation";
import { AdminOperatingCostCenter } from "@/components/admin-operating-cost-center";
import { AdminUserManagementCard } from "@/components/admin-user-management-card";
import { GovernanceDashboard } from "@/components/governance-dashboard";
import { SectionHeader } from "@/components/section-header";
import { getGuidanceModelProfile } from "@/lib/guidance-model-profile";
import { getAdminAccessContext } from "@/lib/leadership-auth";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function AdminPage() {
  await requireSiteAccessPage("/admin");
  const access = await getAdminAccessContext();
  if (!access.authorized) {
    redirect("/login?redirect=/admin");
  }
  const guidanceModelProfile = getGuidanceModelProfile();

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Admin"
        title="Admin Console"
        description="Manage user access, program role assignments, model spend, guidance quality, and the governance controls that keep North Star safe to scale."
      />

      <section className="mt-10">
        <AdminUserManagementCard />
      </section>

      <AdminOperatingCostCenter guidanceModelProfile={guidanceModelProfile} />

      <GovernanceDashboard embedded guidanceModelProfile={guidanceModelProfile} showOperatingCostPanels={false} />
    </main>
  );
}
