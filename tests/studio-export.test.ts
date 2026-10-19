import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { generateStudioExport, normalizeStudioExportRequest, StudioExportError } from "../src/lib/studio-export.ts";
import { STUDIO_OUTPUT_OPTIONS, type StudioExportFormat } from "../src/lib/studio-export-types.ts";

function input(format: StudioExportFormat = "docx") {
  return {
    workspaceName: 'Resident requests & approvals <pilot> "2026"',
    format,
    outputs: STUDIO_OUTPUT_OPTIONS.map(({ id }) => id),
    synthesis: {
      executiveSummary: "Reduce request delays while preserving approval evidence.",
      evidenceSummary: "Six interviews and the request register informed the scope.",
      capabilities: ["Request intake"], painPoints: ["Manual reassignment"], businessRules: ["An approver cannot approve their own request."], assumptions: ["Identity federation is available."],
      readinessScore: 67, readinessNarrative: "Confirm the exception approver before configuration.", sourceCount: 1, generatedAt: "2026-10-18T12:00:00.000Z", provider: "openai",
      roadmap: [{ horizon: "Now", title: "Pilot intake", outcome: "Route requests within four hours", featureIds: ["F-1"], dependencies: ["Approve the routing policy"] }],
      epics: [{ id: "E-1", title: "Controlled intake", objective: "One request journey", featureIds: ["F-1"], sourceIds: ["SRC-1"] }],
      features: [{ id: "F-1", epicId: "E-1", title: "Submit request", description: "Capture valid requests", outcome: "Complete intake", priority: "must", sourceIds: ["SRC-1"] }],
      stories: [{ id: "S-1", epicId: "E-1", featureId: "F-1", title: "Resident submits request", story: "As a resident I want to submit a request so that the correct team can respond.", acceptanceCriteria: ["Given a valid request, when submitted, then create a reference.", "Reject missing region."], sourceIds: ["SRC-1"], readiness: "needs-input", testCases: [{ id: "T-1", title: "Missing region", type: "negative", steps: ["Open intake", "Submit without region"], expectedResult: "Show a region validation message and create no request." }] }],
      gaps: [{ id: "G-1", title: "Exception approver", severity: "blocking", description: "Regions disagree on exception ownership.", question: "Who approves cross-region exceptions?", sourceIds: ["SRC-1"] }],
      quality: { status: "reviewed", checks: ["Every story traces to a source."], warnings: ["Approval ownership requires confirmation."] },
      research: { status: "completed", summary: "Research supports accessible intake validation.", sources: [{ title: "Official guidance", url: "https://example.org/accessibility?a=1&b=2" }] },
      revision: { number: 2, summary: "Clarified regional routing.", feedback: "Keep region mandatory." },
      sources: [{ id: "SRC-1", name: "Intake rules & interview.docx", coverage: "complete", characters: 3400 }]
    }
  };
}

function decodeXml(text: string) {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

async function assertPackageRelationships(zip: JSZip) {
  for (const name of Object.keys(zip.files).filter((name) => name.endsWith(".rels"))) {
    const content = await zip.file(name)!.async("string");
    const root = name === "_rels/.rels" ? "" : name.replace(/_rels\/[^/]+$/, "");
    for (const [, target] of content.matchAll(/Target="([^"]+)"/g)) {
      const parts = `${root}${target}`.split("/");
      const normalized: string[] = [];
      for (const part of parts) if (part === "..") normalized.pop(); else if (part && part !== ".") normalized.push(part);
      assert.ok(zip.file(normalized.join("/")), `${name} target ${target} exists`);
    }
  }
}

test("Word export is a valid editable package with complete selected requirements", async () => {
  const request = input();
  request.outputs = ["stories", "tests", "gaps"];
  request.synthesis.stories[0].story += ` ${"Detailed requirement & <condition> 😀. ".repeat(120)}`;
  const result = await generateStudioExport(normalizeStudioExportRequest(request));
  const zip = await JSZip.loadAsync(result.buffer);
  await assertPackageRelationships(zip);
  assert.match(result.filename, /\.docx$/);
  assert.match(result.contentType, /wordprocessingml/);
  const document = await zip.file("word/document.xml")!.async("string");
  assert.match(document, /w:pStyle w:val="Title"/);
  assert.match(document, /&amp;/);
  assert.match(document, /&lt;condition&gt;/);
  const value = [...document.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((match) => decodeXml(match[1])).join("\n");
  assert.ok(value.includes(request.synthesis.stories[0].story));
  assert.ok(value.includes(request.synthesis.stories[0].testCases[0].expectedResult));
  assert.ok(value.includes("SRC-1 (Intake rules & interview.docx)"));
  assert.ok(!value.includes("Pilot intake"), "unselected roadmap is omitted");
});

test("Excel export separates usable engineering sheets, preserves long text, and treats formulas as text", async () => {
  const request = input("xlsx");
  request.synthesis.stories[0].story = `=HYPERLINK(\"https://example.org\",\"Requirement\") ${"Full requirement detail & evidence 😀 ".repeat(1100)} END-OF-REQUIREMENT`;
  const result = await generateStudioExport(normalizeStudioExportRequest(request));
  const zip = await JSZip.loadAsync(result.buffer);
  await assertPackageRelationships(zip);
  const workbook = await zip.file("xl/workbook.xml")!.async("string");
  for (const sheet of ["Roadmap", "Epics", "Features", "User Stories", "Acceptance Criteria", "Test Cases", "Gaps", "Analysis", "Sources"]) assert.ok(workbook.includes(`name="${sheet}"`));
  const sheetId = workbook.match(/<sheet name="User Stories" sheetId="(\d+)"/)?.[1];
  assert.ok(sheetId);
  const sheet = await zip.file(`xl/worksheets/sheet${sheetId}.xml`)!.async("string");
  assert.match(sheet, /state="frozen"/);
  assert.match(sheet, /autoFilter/);
  assert.doesNotMatch(sheet, /<f[ >]/);
  const storyParts = [...sheet.matchAll(/<c r="E\d+"[^>]*><is><t[^>]*>([\s\S]*?)<\/t>/g)].slice(1).map((match) => decodeXml(match[1]));
  assert.equal(storyParts.join(""), request.synthesis.stories[0].story);
  assert.ok(storyParts.every((part) => part.length <= 450));
});

test("PowerPoint paginates long requirements into linked editable slides without losing text", async () => {
  const request = input("pptx");
  request.outputs = ["stories"];
  request.synthesis.stories[0].story = "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW " + "A complete requirement with <edge> & Unicode 😀. ".repeat(260) + "FINAL REQUIREMENT";
  const result = await generateStudioExport(normalizeStudioExportRequest(request));
  const zip = await JSZip.loadAsync(result.buffer);
  await assertPackageRelationships(zip);
  const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  assert.ok(slides.length > 8);
  let body = "";
  for (const slide of slides) {
    const text = await zip.file(slide)!.async("string");
    const content = text.match(/name="Content"([\s\S]*?)<\/p:sp>/)?.[1] ?? "";
    const lines = [...content.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) => decodeXml(match[1]));
    assert.ok(lines.length <= 14, "content fits the paginated slide template");
    body += lines.join("");
  }
  assert.ok(body.includes(request.synthesis.stories[0].story));
  assert.ok(body.includes("FINAL REQUIREMENT"));
  assert.ok(body.includes("SRC-1 (Intake rules & interview.docx)"));
  assert.ok(!body.includes("Exception approver"));
});

test("analysis exports preserve research, quality review, revision feedback, and evidence coverage", async () => {
  const request = input("md");
  request.outputs = ["analysis"];
  const result = await generateStudioExport(normalizeStudioExportRequest(request));
  const markdown = result.buffer.toString("utf8");
  for (const detail of ["Official guidance", "https://example.org/accessibility?a=1&b=2", "Every story traces to a source.", "Keep region mandatory.", "Coverage: complete", "3,400 characters"]) assert.ok(markdown.includes(detail));
  assert.ok(!markdown.includes("## Test cases"));
});

test("a provisional Excel review notice remains visible when analysis and gaps are not selected", async () => {
  const request = input("xlsx");
  request.outputs = ["roadmap"];
  request.synthesis.quality.status = "provisional";
  request.synthesis.readinessScore = 60;
  request.synthesis.readinessNarrative = "Review draft — policy interpretation requires human review. Do not treat this package as build-ready.";
  const result = await generateStudioExport(normalizeStudioExportRequest(request));
  const zip = await JSZip.loadAsync(result.buffer);
  const overview = decodeXml(await zip.file("xl/worksheets/sheet1.xml")!.async("string"));
  assert.match(overview, /provisional/);
  assert.match(overview, /Review draft/);
  assert.match(overview, /Do not treat this package as build-ready/);
  assert.doesNotMatch(await zip.file("xl/workbook.xml")!.async("string"), /name="Analysis"/);
});

test("export validation rejects malformed and oversized inputs and removes invalid XML controls", async () => {
  assert.throws(() => normalizeStudioExportRequest({}), StudioExportError);
  assert.throws(() => normalizeStudioExportRequest({ ...input(), format: "pdf" }), /not supported/);
  assert.throws(() => normalizeStudioExportRequest({ ...input(), outputs: [] }), /Select at least one/);
  const invalid = input();
  invalid.synthesis.stories[0].testCases[0].steps = "not a list" as unknown as string[];
  assert.throws(() => normalizeStudioExportRequest(invalid), /Test steps must be a list/);
  const oversized = input();
  oversized.synthesis.evidenceSummary = "x".repeat(100_001);
  assert.throws(() => normalizeStudioExportRequest(oversized), (error) => error instanceof StudioExportError && error.status === 413);
  const safe = input("docx");
  safe.synthesis.executiveSummary = "Safe\u0000\u0008\uFFFF\nvalid";
  const result = await generateStudioExport(normalizeStudioExportRequest(safe));
  const zip = await JSZip.loadAsync(result.buffer);
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.ok(!xml.includes("\u0000") && !xml.includes("\u0008") && !xml.includes("\uFFFF"));
  assert.match(xml, /Safe/);
});
