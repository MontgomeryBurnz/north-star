import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import { createGuidedPlan, createMeetingInput, getLatestGuidedPlan, listMeetingInputs } from "@/lib/program-store";
import type { ProgramMeetingInput } from "@/lib/program-intelligence-types";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const meetingInputs = await listMeetingInputs(id);
  return NextResponse.json({ meetingInputs });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

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
    attachments: (body.attachments ?? []).map((attachment) => ({
      id: attachment.id ?? "",
      fileName: attachment.fileName ?? "Untitled file",
      mimeType: attachment.mimeType ?? "unknown",
      sizeBytes: Number(attachment.sizeBytes ?? 0),
      provider: attachment.provider === "blob" || attachment.provider === "supabase" ? attachment.provider : "local",
      storageKey: attachment.storageKey ?? "",
      createdAt: attachment.createdAt ?? new Date().toISOString()
    })),
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
