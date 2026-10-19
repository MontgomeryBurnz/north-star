import { redirect } from "next/navigation";
import { StudioCollaborationWorkspace } from "@/components/studio-collaboration-workspace";
import { ProductPageHeader } from "@/components/product-page-header";
import { hasActiveUserCredentials, requiresUserSetup } from "@/lib/admin-user-types";
import { getCurrentManagedUser } from "@/lib/current-managed-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shared Studio | North Star" };

export default async function SharedStudioPage({ searchParams }: { searchParams: Promise<{ packageId?: string; revisionId?: string }> }) {
  const user = await getCurrentManagedUser();
  if (requiresUserSetup(user)) redirect("/auth/setup");
  if (!user || !hasActiveUserCredentials(user)) redirect("/login?redirect=%2Fstudio%2Fshared");
  const { packageId, revisionId } = await searchParams;
  return <main className="northstar-shell grid min-w-0 gap-6 py-8 sm:py-10">
    <ProductPageHeader eyebrow="Shared Studio" title="Review the work shared with you." description="Review requirements, acceptance criteria and tests. Request clarification and collaborate on the exact work and revisions explicitly shared with your account." />
    <StudioCollaborationWorkspace external packageId={packageId} initialRevisionId={revisionId} />
  </main>;
}
