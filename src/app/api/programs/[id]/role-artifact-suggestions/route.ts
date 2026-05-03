import { NextResponse } from "next/server";
import { requireProgramRouteAccess } from "@/lib/api-route-access";
import {
  createOpenAIUsageRecord,
  getLatestGuidedPlan,
  getProgram,
  listAssistantConversations,
  listLeadershipFeedback,
  listMeetingInputs,
  listProgramUpdates
} from "@/lib/program-store";
import { suggestRoleArtifacts } from "@/lib/role-artifact-suggestions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { response } = await requireProgramRouteAccess(request, id);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const roleFocus = searchParams.get("role") ?? undefined;
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
  const result = await suggestRoleArtifacts({
    assistantConversations,
    latestPlan,
    leadershipFeedbacks,
    meetingInputs,
    program,
    roleFocus,
    updates
  });

  if (result.modelUsage) {
    await createOpenAIUsageRecord(id, {
      ...result.modelUsage,
      sourceId: `role-artifact-suggestions:${roleFocus || "all"}`
    });
  }

  return NextResponse.json({
    provider: result.provider,
    suggestions: result.suggestions
  });
}
