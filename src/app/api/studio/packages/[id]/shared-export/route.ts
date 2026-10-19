import { getStudioPackage } from "@/lib/studio-collaboration-persistence";
import { StudioCollaborationError } from "@/lib/studio-collaboration-types";
import { requireStudioIdentity, studioRouteError } from "@/lib/studio-route-access";

export const dynamic = "force-dynamic";
const plain = (value: string) => value.replace(/[<>\u0000\r]/g, "");

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudioIdentity();
    const { id } = await context.params;
    const revisionId = new URL(request.url).searchParams.get("revisionId");
    if (!revisionId) throw new StudioCollaborationError("Choose an explicitly shared revision.");
    // Recheck the grant at download time; serialize only the server projection.
    const view = await getStudioPackage(user, id, revisionId);
    if (view.canManage) throw new StudioCollaborationError("Use the full package export in Studio for internal work.", 400);
    const lines = [`# ${plain(view.title)} - Shared work`, `Revision ${view.revision.number}`, "", "This document contains only work explicitly shared with this account. It is not the full internal product package.", ""];
    for (const contextText of view.sharedContext) lines.push("## Explicitly shared context", plain(contextText), "");
    for (const item of view.items) {
      lines.push(`## ${plain(item.id)} - ${plain(item.title)}`, plain(item.story), "", `AI readiness: ${item.readiness}. Human review: ${item.review.status}.`, "", "### Acceptance criteria");
      for (const criterion of item.acceptanceCriteria) lines.push(`- ${plain(criterion)}`);
      lines.push("", "### Test cases");
      for (const test of item.testCases) lines.push(`- ${plain(test.id)}: ${plain(test.title)} (${test.type})`, ...test.steps.map(step => `  - ${plain(step)}`), `  - Expected: ${plain(test.expectedResult)}`);
      lines.push("");
    }
    return new Response(lines.join("\n"), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": 'attachment; filename="northstar-shared-requirements.md"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return studioRouteError(error); }
}
