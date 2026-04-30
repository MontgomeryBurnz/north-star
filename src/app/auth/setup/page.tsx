import { redirect } from "next/navigation";
import { AuthPasswordForm } from "@/components/auth-password-form";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function AuthSetupPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  return <AuthPasswordForm email={user.email ?? ""} initialName={initialName} mode="setup" />;
}
