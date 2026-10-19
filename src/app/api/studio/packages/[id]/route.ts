import { listManagedUsers } from "@/lib/program-store";
import { getStudioPackage, mutateStudioPackage } from "@/lib/studio-collaboration-persistence";
import { StudioCollaborationError, type StudioPackageAction } from "@/lib/studio-collaboration-types";
import { readStudioJson, requireStudioIdentity, studioJson, studioRouteError } from "@/lib/studio-route-access";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireStudioIdentity();
    const { id } = await context.params;
    const revisionId = new URL(request.url).searchParams.get("revisionId") || undefined;
    return studioJson({ package: await getStudioPackage(user, id, revisionId) });
  } catch (error) { return studioRouteError(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireStudioIdentity();
    const { id } = await context.params;
    const body = await readStudioJson(request, 64_000);
    if (!Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion) < 1) throw new StudioCollaborationError("Refresh the package before making changes.", 409);
    if (!body.action || typeof body.action !== "object" || Array.isArray(body.action)) throw new StudioCollaborationError("Provide a valid Studio action.");
    const action = { ...body.action } as Record<string, unknown>;
    if (action.type === "share" || action.type === "assign") {
      // Resolve exact registered identities only AFTER package management access.
      const view = await getStudioPackage(user, id);
      if (!view.canManage) throw new StudioCollaborationError("Only the package owner or an internal admin can manage sharing.", 403);
      const emailField = action.type === "share" ? "recipientEmail" : "assigneeEmail";
      const email = typeof action[emailField] === "string" ? (action[emailField] as string).trim().toLowerCase() : "";
      if (action.type === "assign" && !email) action.assigneeId = null;
      else {
        if (!email || email.length > 254) throw new StudioCollaborationError("Enter the registered reviewer's email address.");
        const recipient = (await listManagedUsers()).find(candidate => candidate.email.trim().toLowerCase() === email && candidate.credentialStatus === "active");
        if (!recipient) throw new StudioCollaborationError("No active registered reviewer matches that email. An admin must provision their account first.");
        if (action.type === "share") action.recipientId = recipient.id;
        else { action.assigneeId = recipient.id; action.assigneeName = recipient.name; }
      }
      delete action[emailField];
    }
    const saved = await mutateStudioPackage(user, id, Number(body.expectedVersion), action as StudioPackageAction);
    return studioJson({ package: saved });
  } catch (error) { return studioRouteError(error); }
}
