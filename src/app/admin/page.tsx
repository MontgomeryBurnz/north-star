import { redirect } from "next/navigation";
import { AdminOperatingCostCenter } from "@/components/admin-operating-cost-center";
import { AdminTrustOperationsCard } from "@/components/admin-trust-operations-card";
import { AdminUserManagementCard } from "@/components/admin-user-management-card";
import { GovernanceDashboard } from "@/components/governance-dashboard";
import { SectionHeader } from "@/components/section-header";
import { getInvitationProviderStatus } from "@/lib/admin-user-invitations";
import { getGuidanceModelProfile } from "@/lib/guidance-model-profile";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import { getAdminAccessContext } from "@/lib/leadership-auth";
import { requireSiteAccessPage } from "@/lib/app-page-access";
import {
  getLatestGuidedPlan,
  listAllOpenAIUsageRecords,
  listGuidanceFeedbackFlags,
  listManagedUsers,
  listPrograms
} from "@/lib/program-store";

export default async function AdminPage() {
  await requireSiteAccessPage("/admin");
  const access = await getAdminAccessContext();
  if (!access.authorized) {
    redirect("/login?redirect=/admin");
  }
  const guidanceModelProfile = getGuidanceModelProfile();
  const invitationProvider = getInvitationProviderStatus();
  const [initialUsers, initialPrograms, usageRecords] = await Promise.all([
    listManagedUsers(),
    listPrograms(),
    listAllOpenAIUsageRecords()
  ]);
  const [latestGuidedPlans, guidanceFlagsByProgram] = await Promise.all([
    Promise.all(initialPrograms.map((program) => getLatestGuidedPlan(program.id))),
    Promise.all(initialPrograms.map((program) => listGuidanceFeedbackFlags(program.id)))
  ]);
  const latestPlans = latestGuidedPlans.filter((plan): plan is GuidedPlan => Boolean(plan));
  const guidanceFlags = guidanceFlagsByProgram.flat();

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
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
          guidanceFlags={guidanceFlags}
          guidanceModelProfile={guidanceModelProfile}
          invitationProvider={invitationProvider}
          latestGuidedPlans={latestPlans}
          programs={initialPrograms}
          usageRecords={usageRecords}
          users={initialUsers}
        />
      </section>

      <AdminOperatingCostCenter guidanceModelProfile={guidanceModelProfile} />

      <GovernanceDashboard embedded guidanceModelProfile={guidanceModelProfile} showOperatingCostPanels={false} />
    </main>
  );
}
