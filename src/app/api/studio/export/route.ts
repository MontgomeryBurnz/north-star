import { denyExplorerRequest } from "@/lib/explorer-access";
import { NextResponse } from "next/server";
import { requireInternalWorkspaceRouteAccess } from "@/lib/api-route-access";
import { generateStudioExport, MAX_STUDIO_EXPORT_BYTES, normalizeStudioExportRequest, StudioExportError } from "@/lib/studio-export";
import { getStudioExport } from "@/lib/studio-collaboration-persistence";
import { StudioCollaborationError } from "@/lib/studio-collaboration-types";
import { requireStudioIdentity } from "@/lib/studio-route-access";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { sampleDiscoverySynthesis, sampleProgram } from "@/data/sample-program";

export const runtime = "nodejs";

async function readExportBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new StudioExportError("Provide a valid export request.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_STUDIO_EXPORT_BYTES) {
      await reader.cancel();
      throw new StudioExportError("This export is too large. Select fewer outputs or reduce the workspace size.", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: Request) {
  const explorerDenied = await denyExplorerRequest(request);
  if (explorerDenied) return explorerDenied;
  const { response } = await requireInternalWorkspaceRouteAccess(request);
  if (response) return response;

  try {
    if (Number(request.headers.get("content-length")) > MAX_STUDIO_EXPORT_BYTES) throw new StudioExportError("This export is too large. Select fewer outputs or reduce the workspace size.", 413);
    const raw = await readExportBody(request);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new StudioExportError("Provide a valid export request.");
    }
    if ((await getCurrentManagedUser())?.userType === "explorer") {
      // Only format/deliverable selections are accepted. Never trust a supplied
      // synthesis, title, package ID, revision, or evidence in Explorer mode.
      const selection = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
      body = { format: selection.format, outputs: selection.outputs, workspaceName: sampleProgram.name, synthesis: sampleDiscoverySynthesis };
    } else if (body && typeof body === "object" && !Array.isArray(body) && "packageId" in body) {
      const input = body as Record<string, unknown>;
      if (typeof input.packageId !== "string" || typeof input.revisionId !== "string") throw new StudioExportError("Choose a saved package revision to export.");
      const saved = await getStudioExport(await requireStudioIdentity(), input.packageId, input.revisionId);
      body = { ...input, workspaceName: saved.title, synthesis: saved.synthesis };
    }
    const result = await generateStudioExport(normalizeStudioExportRequest(body));
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": String(result.buffer.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error instanceof StudioCollaborationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof StudioExportError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Studio export failed", error);
    return NextResponse.json({ error: "The export could not be created. Please try again." }, { status: 500 });
  }
}
