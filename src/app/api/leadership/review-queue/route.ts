import { denyExplorerRequest } from "@/lib/explorer-access";
import { NextResponse } from "next/server";
import { requireLeadershipRouteAccess } from "@/lib/api-route-access";
import { getLeadershipReviewQueue } from "@/lib/program-aggregates";

export async function GET(request: Request) {
  const explorerDenied = await denyExplorerRequest(request);
  if (explorerDenied) return explorerDenied;
  const { response } = await requireLeadershipRouteAccess(request);
  if (response) return response;

  const reviewQueue = await getLeadershipReviewQueue();
  return NextResponse.json({ reviewQueue });
}
