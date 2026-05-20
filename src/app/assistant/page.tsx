import { redirect } from "next/navigation";

export const metadata = {
  title: "Guided Plans | North Star"
};

export default function AssistantPage() {
  redirect("/systems");
}
