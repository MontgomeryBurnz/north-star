export const dynamic = "force-dynamic";

import { KnowledgeCenterConsole } from "@/components/knowledge-center-console";
import { requireSiteAccessPage } from "@/lib/app-page-access";
import { getKnowledgeArticles } from "@/lib/knowledge-center";

export const metadata = {
  title: "Knowledge Center | North Star"
};

export default async function KnowledgePage() {
  await requireSiteAccessPage("/knowledge");
  const articles = getKnowledgeArticles();

  return <KnowledgeCenterConsole articles={articles} />;
}
