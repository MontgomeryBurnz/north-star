import { NextResponse } from "next/server";
import { requireInternalWorkspaceRouteAccess } from "@/lib/api-route-access";
import { generateStudioExport, MAX_STUDIO_EXPORT_BYTES, normalizeStudioExportRequest, StudioExportError } from "@/lib/studio-export";

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
    if (error instanceof StudioExportError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Studio export failed", error);
    return NextResponse.json({ error: "The export could not be created. Please try again." }, { status: 500 });
  }
}
