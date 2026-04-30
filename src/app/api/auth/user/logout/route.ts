import { NextResponse } from "next/server";
import { leadershipSessionCookieName } from "@/lib/leadership-auth";
import { siteAccessSessionCookieName } from "@/lib/site-access";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

const logoutRedirectPath = "/login?redirect=%2F";
const northStarSessionCookies = [siteAccessSessionCookieName, leadershipSessionCookieName] as const;

function expireSessionCookie(response: NextResponse, name: string) {
  response.cookies.set({
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/"
  });
}

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
  }

  const response = NextResponse.redirect(new URL(logoutRedirectPath, request.url), { status: 303 });
  response.headers.set("cache-control", "no-store");
  northStarSessionCookies.forEach((cookieName) => expireSessionCookie(response, cookieName));
  return response;
}
