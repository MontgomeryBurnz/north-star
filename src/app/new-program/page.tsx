import { redirect } from "next/navigation";

export default async function NewProgramPage() {
  redirect("/active-program?mode=setup");
}
