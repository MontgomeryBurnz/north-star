import { NextResponse } from "next/server";
import { getAdminAccessContext } from "@/lib/leadership-auth";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";
import { getVercelOperationsSnapshot } from "@/lib/vercel-operations";
import type { VercelOperationsWindowKey } from "@/lib/vercel-operations-types";

const vercelWindowKeys = new Set<VercelOperationsWindowKey>(["last-7-days", "last-30-days"]);

function parseWindowKey(value: string | null): VercelOperationsWindowKey | undefined {
  return vercelWindowKeys.has(value as VercelOperationsWindowKey) ? (value as VercelOperationsWindowKey) : undefined;
}

export async function GET(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const access = await getAdminAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const vercel = await getVercelOperationsSnapshot({
    windowKey: parseWindowKey(url.searchParams.get("window"))
  });

  return NextResponse.json({ vercel });
}
