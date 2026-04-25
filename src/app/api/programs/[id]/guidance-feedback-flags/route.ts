import { NextResponse } from "next/server";
import { createGuidanceFeedbackFlag, listGuidanceFeedbackFlags } from "@/lib/program-store";
import type { GuidanceFeedbackFlag } from "@/lib/program-intelligence-types";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const flags = await listGuidanceFeedbackFlags(id);
  return NextResponse.json({ flags });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<GuidanceFeedbackFlag>;

  if (!body.guidanceJustificationId?.trim()) {
    return NextResponse.json({ error: "Guidance justification is required." }, { status: 400 });
  }

  if (!body.userReason?.trim()) {
    return NextResponse.json({ error: "A flag reason is required." }, { status: 400 });
  }

  if (!body.userContext?.trim()) {
    return NextResponse.json({ error: "User context is required." }, { status: 400 });
  }

  const flag = await createGuidanceFeedbackFlag(id, {
    guidanceJustificationId: body.guidanceJustificationId,
    citationId: body.citationId?.trim() || undefined,
    scope: body.scope === "partial" ? "partial" : "whole",
    userReason: body.userReason,
    userContext: body.userContext
  });

  return NextResponse.json({ flag });
}
