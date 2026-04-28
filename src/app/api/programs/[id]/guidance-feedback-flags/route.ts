import { NextResponse } from "next/server";
import { createGuidanceFeedbackFlag, listGuidanceFeedbackFlags } from "@/lib/program-store";
import type { GuidanceFeedbackFlag } from "@/lib/program-intelligence-types";
import { createGovernanceFlag } from "@/lib/program-loop-service";
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
  const result = await createGovernanceFlag(
    {
      createGuidanceFeedbackFlag
    },
    id,
    body
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ flag: result.record });
}
