export const dynamic = "force-dynamic";

import { ArtifactStudioConsole } from "@/components/artifact-studio-console";
import { requireInternalWorkspacePage } from "@/lib/app-page-access";

export const metadata = {
  title: "Studio | North Star"
};

export default async function ArtifactsPage() {
  await requireInternalWorkspacePage("/artifacts");
  return <ArtifactStudioConsole />;
}
