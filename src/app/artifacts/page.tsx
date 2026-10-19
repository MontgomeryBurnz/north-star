export const dynamic = "force-dynamic";

import { DiscoveryStudioConsole } from "@/components/discovery-studio-console";
import { requireInternalWorkspacePage } from "@/lib/app-page-access";

export const metadata = {
  title: "Studio | North Star"
};

export default async function ArtifactsPage({
  searchParams
}: {
  searchParams: Promise<{ sample?: string }>;
}) {
  await requireInternalWorkspacePage("/artifacts");
  const { sample } = await searchParams;
  return <DiscoveryStudioConsole initialSample={sample === "regional-service-modernization"} />;
}
