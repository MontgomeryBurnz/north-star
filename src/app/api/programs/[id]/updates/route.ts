import { NextResponse } from "next/server";
import { createProgramUpdate, listProgramUpdates } from "@/lib/program-store";
import type { ActiveProgramReview } from "@/lib/active-program-types";
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

  if (!body.programName?.trim()) {
    return NextResponse.json({ error: "Program name is required." }, { status: 400 });
  }

  const update = await createProgramUpdate(id, {
    programName: body.programName,
    originalNorthStar: body.originalNorthStar ?? "",
    currentPhase: body.currentPhase ?? "",
    progressSinceLastReview: body.progressSinceLastReview ?? "",
    planChanges: body.planChanges ?? "",
    activeRisks: body.activeRisks ?? "",
    stakeholderTemperature: body.stakeholderTemperature ?? "",
    decisionsPending: body.decisionsPending ?? "",
    deliveryHealth: body.deliveryHealth ?? "",
    supportNeeded: body.supportNeeded ?? "",
    artifacts: body.artifacts ?? []
  });

  return NextResponse.json({ update });
}
