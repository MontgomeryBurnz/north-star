import { NextResponse } from "next/server";
import { leadershipSessionCookieName } from "@/lib/leadership-auth";
import { siteAccessSessionCookieName } from "@/lib/site-access";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { demoModeCookieName, demoStateCookieCount, demoStateCookiePrefix } from "@/lib/demo-mode";

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

async function handleLogout(request: Request) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Still clear North Star cookies so stale auth state cannot trap users on a server error page.
    }
  }

  const response = NextResponse.redirect(new URL(logoutRedirectPath, request.url), { status: 303 });
  response.headers.set("cache-control", "no-store");
  northStarSessionCookies.forEach((cookieName) => expireSessionCookie(response, cookieName));
  expireSessionCookie(response, demoModeCookieName);
  for (let index = 0; index < demoStateCookieCount; index += 1) {
    expireSessionCookie(response, `${demoStateCookiePrefix}${index}`);
  }
  return response;
}

export async function GET(request: Request) {
  return handleLogout(request);
}

export async function POST(request: Request) {
  return handleLogout(request);
}
