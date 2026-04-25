import { NextResponse } from "next/server";
import { createGuidedPlan, createMeetingInput, getLatestGuidedPlan, listMeetingInputs } from "@/lib/program-store";
import type { ProgramMeetingInput } from "@/lib/program-intelligence-types";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const meetingInputs = await listMeetingInputs(id);
  return NextResponse.json({ meetingInputs });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<ProgramMeetingInput>;

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Meeting title is required." }, { status: 400 });
  }

  if (!body.summary?.trim()) {
    return NextResponse.json({ error: "Meeting summary is required." }, { status: 400 });
  }

  const meetingInput = await createMeetingInput(id, {
    title: body.title,
    sourceType: body.sourceType === "recording" || body.sourceType === "transcript" ? body.sourceType : "meeting-notes",
    sourceProvider:
      body.sourceProvider === "linked-series" || body.sourceProvider === "upload" ? body.sourceProvider : "manual",
    meetingSeriesId: body.meetingSeriesId?.trim() || undefined,
    capturedAt: body.capturedAt ?? new Date().toISOString(),
    summary: body.summary,
    transcriptExcerpt: body.transcriptExcerpt?.trim() || undefined,
    recommendedPlanAdjustments: (body.recommendedPlanAdjustments ?? []).map((item) => item.trim()).filter(Boolean),
    extractedSignals: (body.extractedSignals ?? []).map((item) => item.trim()).filter(Boolean),
    justificationStatus: "plan-refreshed"
  });

  const latestPlan = await getLatestGuidedPlan(id);
  const plan =
    latestPlan?.sourceRecordIds.includes(meetingInput.id)
      ? latestPlan
      : await createGuidedPlan(id);

  return NextResponse.json({ meetingInput, plan });
}
