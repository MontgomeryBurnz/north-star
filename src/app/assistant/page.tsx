import { AssistantChat } from "@/components/assistant-chat";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function AssistantPage() {
  await requireSiteAccessPage("/assistant");
  return <AssistantChat />;
}
