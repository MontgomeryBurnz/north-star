import { NextResponse } from "next/server";
import { getLeadershipAccessContext } from "@/lib/leadership-auth";
import { createLeadershipFeedback, listLeadershipFeedback } from "@/lib/program-store";
import type { LeadershipReviewInput } from "@/lib/leadership-feedback-types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const feedback = await listLeadershipFeedback(id);
  return NextResponse.json({ feedback });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getLeadershipAccessContext();
  if (!access.authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<LeadershipReviewInput>;

  if (!body.programName?.trim()) {
    return NextResponse.json({ error: "Program name is required." }, { status: 400 });
  }

  const feedback = await createLeadershipFeedback(id, {
    programName: body.programName,
    timelineSummary: body.timelineSummary ?? "",
    progressHighlights: body.progressHighlights ?? "",
    activeRisks: body.activeRisks ?? "",
    leadershipGuidance: body.leadershipGuidance ?? "",
    supportRequests: body.supportRequests ?? "",
    feedbackToDeliveryLead: body.feedbackToDeliveryLead ?? ""
  });

  return NextResponse.json({ feedback });
}
