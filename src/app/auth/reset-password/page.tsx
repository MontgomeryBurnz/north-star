import { redirect } from "next/navigation";
import { AuthPasswordForm } from "@/components/auth-password-form";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function AuthResetPasswordPage() {
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

  return <AuthPasswordForm email={user.email ?? ""} mode="reset" />;
}
