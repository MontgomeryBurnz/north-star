import { NextResponse } from "next/server";
import { attachSiteAccessCookie, getSiteAccessConfig, isSiteAccessPasswordValid } from "@/lib/site-access";

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

  return attachSiteAccessCookie(NextResponse.json({ ok: true }));
}
