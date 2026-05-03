import { NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/api-route-access";
import { getVercelOperationsSnapshot } from "@/lib/vercel-operations";
import type { VercelOperationsWindowKey } from "@/lib/vercel-operations-types";

const vercelWindowKeys = new Set<VercelOperationsWindowKey>(["last-7-days", "last-30-days"]);

function parseWindowKey(value: string | null): VercelOperationsWindowKey | undefined {
  return vercelWindowKeys.has(value as VercelOperationsWindowKey) ? (value as VercelOperationsWindowKey) : undefined;
}

export async function GET(request: Request) {
  const { response } = await requireAdminRouteAccess(request);
  if (response) return response;

  const url = new URL(request.url);
  const vercel = await getVercelOperationsSnapshot({
    windowKey: parseWindowKey(url.searchParams.get("window"))
  });

  return NextResponse.json({ vercel });
}
