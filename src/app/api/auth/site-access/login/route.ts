import { NextResponse } from "next/server";
import { getSiteAccessConfig, isSiteAccessPasswordValid, siteAccessSessionCookieName } from "@/lib/site-access";

export async function POST(request: Request) {
  const config = getSiteAccessConfig();
  if (!config.enabled) {
    return NextResponse.json({ error: "Site access gate is disabled." }, { status: 400 });
  }

  const body = (await request.json()) as {
    password?: string;
  };

  if (!isSiteAccessPasswordValid(body.password ?? "")) {
    return NextResponse.json({ error: "Invalid access password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: siteAccessSessionCookieName,
    value: config.sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return response;
}
