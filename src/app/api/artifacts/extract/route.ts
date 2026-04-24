import { NextResponse } from "next/server";
import { extractArtifactText } from "@/lib/artifact-extraction";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

export const runtime = "nodejs";

function detectFileFormat(fileName: string): NonNullable<ProgramArtifact["fileFormat"]> {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "txt" || extension === "pdf" || extension === "doc" || extension === "docx" || extension === "ppt" || extension === "pptx") {
    return extension;
  }
  return "unknown";
}

export async function POST(request: Request) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return createSiteAccessDeniedResponse();
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const requestedFormat = formData.get("fileFormat");
  const fileFormat =
    typeof requestedFormat === "string" && requestedFormat
      ? (requestedFormat as NonNullable<ProgramArtifact["fileFormat"]>)
      : detectFileFormat(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const extraction = await extractArtifactText(buffer, fileFormat);

  return NextResponse.json({ extraction });
}
