import { NextResponse } from "next/server";
import { listGuidanceJustifications } from "@/lib/program-store";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const justifications = await listGuidanceJustifications(id);
  return NextResponse.json({ justifications });
}
