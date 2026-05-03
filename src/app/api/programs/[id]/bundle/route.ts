import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { getGuidedPlanBundle } from "@/lib/program-aggregates";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const bundle = await getGuidedPlanBundle(id);
  return NextResponse.json(bundle);
}
