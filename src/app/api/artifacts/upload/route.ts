import { NextResponse } from "next/server";
import { getArtifactStorageProvider } from "@/lib/artifact-storage";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storedArtifact = await getArtifactStorageProvider().saveArtifact({
    fileName: file.name,
    mimeType: file.type,
    buffer
  });

  // Future insertion point:
  // Persist the returned artifact record into the `artifacts` table together with
  // extraction metadata and an optional programId when the UI starts using this route.
  return NextResponse.json({ artifact: storedArtifact });
}
