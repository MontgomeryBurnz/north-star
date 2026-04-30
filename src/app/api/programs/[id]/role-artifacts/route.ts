import { NextResponse } from "next/server";
import {
  createOpenAIUsageRecord,
  getLatestGuidedPlan,
  getProgram,
  listAssistantConversations,
  listLeadershipFeedback,
  listMeetingInputs,
  listProgramUpdates
} from "@/lib/program-store";
import { generateRoleArtifactDraft } from "@/lib/role-artifact-service";
import { isRoleArtifactType } from "@/lib/role-artifact-types";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { artifactType?: string; feedback?: string } | null;
  const artifactType = body?.artifactType;

  if (!artifactType || !isRoleArtifactType(artifactType)) {
    return NextResponse.json({ error: "A supported role artifact type is required." }, { status: 400 });
  }

  const program = await getProgram(id);
  if (!program) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  const [latestPlan, updates, leadershipFeedbacks, assistantConversations, meetingInputs] = await Promise.all([
    getLatestGuidedPlan(id),
    listProgramUpdates(id),
    listLeadershipFeedback(id),
    listAssistantConversations(id),
    listMeetingInputs(id)
  ]);
  const artifact = await generateRoleArtifactDraft({
    artifactType,
    program,
    latestPlan,
    updates,
    leadershipFeedbacks,
    assistantConversations,
    meetingInputs,
    feedback: body?.feedback
  });

  if (artifact.modelUsage) {
    await createOpenAIUsageRecord(id, { ...artifact.modelUsage, sourceId: artifact.id });
  }

  return NextResponse.json({ artifact });
}
