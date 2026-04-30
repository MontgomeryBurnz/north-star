import { AssistantChat } from "@/components/assistant-chat";
import { requireSiteAccessPage } from "@/lib/app-page-access";

export const metadata = {
  title: "Guide | North Star"
};

export default async function AssistantPage() {
  await requireSiteAccessPage("/assistant");
  return <AssistantChat />;
}
