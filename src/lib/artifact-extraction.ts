import JSZip from "jszip";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import type { ProgramArtifact } from "@/lib/program-intake-types";

export type ArtifactExtractionResult = Pick<
  ProgramArtifact,
  "extractedText" | "extractionStatus" | "extractionSummary" | "extractionMethod" | "sourceKind"
>;

function compactText(value: string, limit = 160) {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, limit).trim()}...` : compacted;
}

function summarizeExtraction(text: string, source: string) {
  return `${text.length.toLocaleString()} characters extracted from ${source}. ${compactText(text)}`;
}

function emptyResult(source: string): ArtifactExtractionResult {
  return {
    sourceKind: "text",
    extractionStatus: "empty",
    extractionMethod: "server-parser",
    extractionSummary: `${source} was readable, but no useful text was found.`
  };
}

function legacyBinaryText(buffer: Buffer) {
  const asciiRuns = buffer
    .toString("latin1")
    .match(/[A-Za-z0-9][A-Za-z0-9\s.,;:!?'"()[\]{}@#$%&*+=/_\\|<>-]{7,}/g);
  const utf16Runs = buffer
    .toString("utf16le")
    .match(/[A-Za-z0-9][A-Za-z0-9\s.,;:!?'"()[\]{}@#$%&*+=/_\\|<>-]{7,}/g);

  return [...(asciiRuns ?? []), ...(utf16Runs ?? [])]
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item, index, all) => item.length > 12 && all.indexOf(item) === index)
    .slice(0, 150)
    .join("\n");
}

function decodeXmlText(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractPptxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.values(zip.files)
    .filter((file) => /^ppt\/slides\/slide\d+\.xml$/.test(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const noteFiles = Object.values(zip.files)
    .filter((file) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(file.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const parts = await Promise.all(
    [...slideFiles, ...noteFiles].map(async (file) => {
      const xml = await file.async("text");
      const textRuns = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)].map((match) => decodeXmlText(match[1] ?? ""));
      return textRuns.join(" ");
    })
  );

  return parts
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export async function extractArtifactText(buffer: Buffer, fileFormat: ProgramArtifact["fileFormat"]): Promise<ArtifactExtractionResult> {
  try {
    if (fileFormat === "txt") {
      const text = buffer.toString("utf8").trim();
      return text
        ? {
            sourceKind: "text",
            extractionStatus: "extracted",
            extractionMethod: "server-parser",
            extractionSummary: summarizeExtraction(text, "TXT"),
            extractedText: text
          }
        : emptyResult("TXT");
    }

    if (fileFormat === "pdf") {
      const parsed = await pdfParse(buffer);
      const text = parsed.text.trim();
      return text
        ? {
            sourceKind: "text",
            extractionStatus: "extracted",
            extractionMethod: "server-parser",
            extractionSummary: summarizeExtraction(text, "PDF"),
            extractedText: text
          }
        : emptyResult("PDF");
    }

    if (fileFormat === "docx") {
      const parsed = await mammoth.extractRawText({ buffer });
      const text = parsed.value.trim();
      return text
        ? {
            sourceKind: "text",
            extractionStatus: "extracted",
            extractionMethod: "server-parser",
            extractionSummary: summarizeExtraction(text, "DOCX"),
            extractedText: text
          }
        : emptyResult("DOCX");
    }

    if (fileFormat === "pptx") {
      const text = (await extractPptxText(buffer)).trim();
      return text
        ? {
            sourceKind: "text",
            extractionStatus: "extracted",
            extractionMethod: "server-parser",
            extractionSummary: summarizeExtraction(text, "PPTX"),
            extractedText: text
          }
        : emptyResult("PPTX");
    }

    if (fileFormat === "doc" || fileFormat === "ppt") {
      const text = legacyBinaryText(buffer).trim();
      return text
        ? {
            sourceKind: "text",
            extractionStatus: "partial",
            extractionMethod: "legacy-best-effort",
            extractionSummary: summarizeExtraction(text, `${fileFormat.toUpperCase()} legacy best-effort`),
            extractedText: text
          }
        : {
            sourceKind: "metadata-only",
            extractionStatus: "unsupported",
            extractionMethod: "metadata-only",
            extractionSummary: `${fileFormat.toUpperCase()} is a legacy binary Office format. Metadata was captured, but clean text extraction needs a conversion service.`
          };
    }

    return {
      sourceKind: "metadata-only",
      extractionStatus: "unsupported",
      extractionMethod: "metadata-only",
      extractionSummary: "This file format is not supported by the local parser yet."
    };
  } catch {
    return {
      sourceKind: "metadata-only",
      extractionStatus: "error",
      extractionMethod: "server-parser",
      extractionSummary: "Server extraction failed for this artifact."
    };
  }
}
