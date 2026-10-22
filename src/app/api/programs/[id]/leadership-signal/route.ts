import { denyExplorerRequest } from "@/lib/explorer-access";
import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { getLatestGuidedPlan, listLeadershipFeedback } from "@/lib/program-store";
import { buildDeliveryLeadershipSignal } from "@/lib/leadership-signal";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const explorerDenied = await denyExplorerRequest(request);
  if (explorerDenied) return explorerDenied;
  const { id } = await context.params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const [feedbacks, plan] = await Promise.all([listLeadershipFeedback(id), getLatestGuidedPlan(id)]);
  const latestFeedback = feedbacks[0] ?? null;
  const signal = buildDeliveryLeadershipSignal(latestFeedback, plan);

  return NextResponse.json({ signal });
}
