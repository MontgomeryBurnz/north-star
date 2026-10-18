export const dynamic = "force-dynamic";

import { DiscoveryStudioConsole } from "@/components/discovery-studio-console";
import { requireInternalWorkspacePage } from "@/lib/app-page-access";

export const metadata = {
  title: "Studio | North Star"
};

export default async function ArtifactsPage() {
  await requireInternalWorkspacePage("/artifacts");
  return <DiscoveryStudioConsole />;
}
