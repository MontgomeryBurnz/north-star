import "server-only";
import { NextResponse } from "next/server";
import { hasActiveUserCredentials } from "@/lib/admin-user-types";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { StudioCollaborationError } from "@/lib/studio-collaboration-types";
import { isStudioRequestSameOrigin } from "@/lib/studio-request-origin";

// Package access always requires an individually authenticated, active account.
// The shared site-password cookie is deliberately not an identity or a grant.
export async function requireStudioIdentity() {
  const user = await getCurrentManagedUser();
  if (!user || !hasActiveUserCredentials(user)) {
    throw new StudioCollaborationError("Sign in with an active NorthStar account to use saved Studio collaboration.", 401);
  }
  if (user.userType === "explorer") {
    throw new StudioCollaborationError("Explorer accounts can preview the fictional sample only, not access or change saved workspace packages.", 403);
  }
  return user;
}

export async function readStudioJson(request: Request, maxBytes = 4_000_000): Promise<Record<string, unknown>> {
  if (!isStudioRequestSameOrigin(request)) {
    throw new StudioCollaborationError("Cross-origin Studio changes are not allowed.", 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new StudioCollaborationError("Send a JSON Studio request.", 415);
  }
  if (Number(request.headers.get("content-length")) > maxBytes) throw new StudioCollaborationError("This Studio request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new StudioCollaborationError("Provide a Studio request.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) { await reader.cancel(); throw new StudioCollaborationError("This Studio request is too large.", 413); }
    chunks.push(value);
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new StudioCollaborationError("Invalid Studio request."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new StudioCollaborationError("Invalid Studio request.");
  return body as Record<string, unknown>;
}

export function studioJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export function studioRouteError(error: unknown) {
  if (error instanceof StudioCollaborationError) return studioJson({ error: error.message }, error.status);
  console.error("Studio collaboration request failed", error instanceof Error ? error.name : "UnknownError");
  return studioJson({ error: "Saved Studio collaboration is temporarily unavailable. Your current output package is preserved." }, 503);
}
