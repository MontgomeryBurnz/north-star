import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  return NextResponse.json({ conversations: [] });
}
