import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  return NextResponse.json(
    {
      error:
        "Chat prompt briefing has been disabled. Program intelligence now refreshes through intake, updates, guided plans, Studio, leadership feedback, and executive dashboard workflows."
    },
    { status: 410 }
  );
}
