import { denyExplorerRequest } from "@/lib/explorer-access";
import { NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/api-route-access";
import { listOpenAIUsageRecords } from "@/lib/program-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const explorerDenied = await denyExplorerRequest(request);
  if (explorerDenied) return explorerDenied;
  const { response } = await requireAdminRouteAccess(request);
  if (response) return response;

  const { id } = await params;
  const usageRecords = await listOpenAIUsageRecords(id);
  return NextResponse.json({ usageRecords });
}
