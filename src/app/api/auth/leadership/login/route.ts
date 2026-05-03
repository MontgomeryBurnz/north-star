import { NextResponse } from "next/server";
import { requireSiteAccessRequest } from "@/lib/api-route-access";
import {
  getConfiguredLeadershipAuthProvider,
  getLeadershipAuthConfig,
  isLeadershipCredentialsValid,
  leadershipSessionCookieName
} from "@/lib/leadership-auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const denied = requireSiteAccessRequest(request);
  if (denied) return denied;

  if (isSupabaseConfigured()) {
    return NextResponse.json({ error: "Use your North Star username and password." }, { status: 400 });
  }

  if (getConfiguredLeadershipAuthProvider() !== "env") {
    return NextResponse.json({ error: "Password login is disabled. Use Microsoft sign-in." }, { status: 400 });
  }

  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (!isLeadershipCredentialsValid(body.username ?? "", body.password ?? "")) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: leadershipSessionCookieName,
    value: getLeadershipAuthConfig().sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return response;
}
