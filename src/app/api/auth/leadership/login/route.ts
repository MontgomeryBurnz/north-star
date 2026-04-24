import { NextResponse } from "next/server";
import {
  getConfiguredLeadershipAuthProvider,
  getLeadershipAuthConfig,
  isLeadershipCredentialsValid,
  leadershipSessionCookieName
} from "@/lib/leadership-auth";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function POST(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
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
