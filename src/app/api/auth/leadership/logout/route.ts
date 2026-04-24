import { NextResponse } from "next/server";
import { getConfiguredLeadershipAuthProvider, leadershipSessionCookieName } from "@/lib/leadership-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  if (getConfiguredLeadershipAuthProvider() === "supabase") {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: leadershipSessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/"
  });
  return response;
}
