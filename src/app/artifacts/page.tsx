import { ArtifactStudioConsole } from "@/components/artifact-studio-console";
import { requireSiteAccessPage } from "@/lib/app-page-access";

export const metadata = {
  title: "Artifacts | North Star"
};

export default async function ArtifactsPage() {
  await requireSiteAccessPage("/artifacts");
  return <ArtifactStudioConsole />;
}
