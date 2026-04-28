import { NextResponse } from "next/server";
import { createGuidedPlan, createProgramUpdate, getLatestGuidedPlan, listProgramUpdates } from "@/lib/program-store";
import type { ActiveProgramReview } from "@/lib/active-program-types";
import { saveActiveProgramReview } from "@/lib/program-loop-service";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const updates = await listProgramUpdates(id);
  return NextResponse.json({ updates });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<ActiveProgramReview>;
  const result = await saveActiveProgramReview(
    {
      createProgramUpdate,
      getLatestGuidedPlan,
      createGuidedPlan
    },
    id,
    body
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ update: result.record, plan: result.plan });
}
