import { NextResponse } from "next/server";
import { getConfiguredLeadershipAuthProvider } from "@/lib/leadership-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (getConfiguredLeadershipAuthProvider() !== "supabase") {
    return NextResponse.redirect(new URL("/leadership/login", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect") || "/leadership";
  const callbackUrl = new URL("/auth/callback", url.origin);
  callbackUrl.searchParams.set("next", redirect);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      redirectTo: callbackUrl.toString(),
      scopes: "email"
    }
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/leadership/login?error=sso", request.url));
  }

  return NextResponse.redirect(data.url);
}
