import { denyExplorerRequest } from "@/lib/explorer-access";
import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { listGuidanceJustifications } from "@/lib/program-store";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const explorerDenied = await denyExplorerRequest(request);
  if (explorerDenied) return explorerDenied;
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const justifications = await listGuidanceJustifications(id);
  return NextResponse.json({ justifications });
}
