import { NextResponse } from "next/server";
import {
  createOpenAIUsageRecord,
  createRoleArtifact,
  getLatestGuidedPlan,
  getProgram,
  listAssistantConversations,
  listLeadershipFeedback,
  listMeetingInputs,
  listProgramUpdates,
  listRoleArtifacts
} from "@/lib/program-store";
import { generateRoleArtifactDraft } from "@/lib/role-artifact-service";
import { isRoleArtifactType } from "@/lib/role-artifact-types";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const requestedArtifactType = searchParams.get("artifactType") ?? undefined;

  if (requestedArtifactType && !isRoleArtifactType(requestedArtifactType)) {
    return NextResponse.json({ error: "A supported role artifact type is required." }, { status: 400 });
  }
  const artifactType = requestedArtifactType && isRoleArtifactType(requestedArtifactType) ? requestedArtifactType : undefined;

  const program = await getProgram(id);
  if (!program) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  const artifacts = await listRoleArtifacts(id, artifactType);
  return NextResponse.json({ artifacts });
}

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
  const draft = await generateRoleArtifactDraft({
    artifactType,
    program,
    latestPlan,
    updates,
    leadershipFeedbacks,
    assistantConversations,
    meetingInputs,
    feedback: body?.feedback
  });
  const artifact = await createRoleArtifact(id, {
    ...draft,
    feedback: body?.feedback?.trim() || undefined
  });

  if (artifact.modelUsage) {
    await createOpenAIUsageRecord(id, { ...artifact.modelUsage, sourceId: artifact.id });
  }

  const history = await listRoleArtifacts(id, artifactType);
  return NextResponse.json({ artifact, history });
}
