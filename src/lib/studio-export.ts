import JSZip from "jszip";
import type { DiscoverySynthesis } from "./discovery-studio-types.ts";
import { STUDIO_EXPORT_FORMATS, STUDIO_OUTPUT_OPTIONS, type StudioExportFormat, type StudioOutputId } from "./studio-export-types.ts";

export const MAX_STUDIO_EXPORT_BYTES = 2 * 1024 * 1024;

export class StudioExportError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StudioExportError";
    this.status = status;
  }
}

type ExportSynthesis = DiscoverySynthesis & {
  quality?: { status: "reviewed" | "provisional"; checks: string[]; warnings: string[] };
  research?: { status: "not-requested" | "completed" | "unavailable"; summary: string; sources: { title: string; url: string }[] };
  revision?: { number: number; summary: string; feedback?: string };
  sources?: { id: string; name: string; coverage: "complete" | "excerpt"; characters: number }[];
};

export type StudioExportRequest = {
  workspaceName: string;
  synthesis: ExportSynthesis;
  format: StudioExportFormat;
  outputs: StudioOutputId[];
};

type ExportEntry = { title: string; lines: string[] };
type ExportSection = { title: string; entries: ExportEntry[] };
type ExportSheet = { name: string; headers: string[]; rows: (string | number)[][] };

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StudioExportError(`${name} must be an object.`);
  return value as Record<string, unknown>;
}

function cleanText(value: unknown, name: string, optional = false): string {
  if (value === undefined && optional) return "";
  if (typeof value !== "string") throw new StudioExportError(`${name} must be text.`);
  if (value.length > 100_000) throw new StudioExportError(`${name} is too long to export.`, 413);
  // XML 1.0 rejects these control characters. Preserve tabs, newlines, and all valid Unicode.
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "").toWellFormed();
}

function array(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) throw new StudioExportError(`${name} must be a list.`);
  if (value.length > 500) throw new StudioExportError(`${name} contains too many items to export.`, 413);
  return value;
}

function texts(value: unknown, name: string): string[] {
  return array(value, name).map((item) => cleanText(item, name));
}

function number(value: unknown, name: string, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) throw new StudioExportError(`${name} must be a valid nonnegative number.`);
  return value;
}

function choice<T extends string>(value: unknown, options: readonly T[], name: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) throw new StudioExportError(`${name} is not supported.`);
  return value as T;
}

export function normalizeStudioExportRequest(value: unknown): StudioExportRequest {
  const input = record(value, "Export request");
  const raw = record(input.synthesis, "Synthesis");
  const list = <T>(key: string, convert: (item: Record<string, unknown>) => T) => array(raw[key], key).map((item) => convert(record(item, key)));
  const synthesis: ExportSynthesis = {
    executiveSummary: cleanText(raw.executiveSummary, "Executive summary"),
    evidenceSummary: cleanText(raw.evidenceSummary, "Evidence summary"),
    capabilities: texts(raw.capabilities, "Capabilities"),
    painPoints: texts(raw.painPoints, "Pain points"),
    businessRules: texts(raw.businessRules, "Business rules"),
    assumptions: texts(raw.assumptions, "Assumptions"),
    readinessScore: number(raw.readinessScore, "Readiness score", 100),
    readinessNarrative: cleanText(raw.readinessNarrative, "Readiness narrative"),
    sourceCount: number(raw.sourceCount, "Source count"),
    generatedAt: cleanText(raw.generatedAt, "Generation time"),
    provider: choice(raw.provider, ["local", "openai"], "Provider"),
    roadmap: list("roadmap", (item) => ({
      horizon: cleanText(item.horizon, "Horizon"), title: cleanText(item.title, "Roadmap title"),
      outcome: cleanText(item.outcome, "Roadmap outcome"), featureIds: texts(item.featureIds, "Feature references"), dependencies: texts(item.dependencies, "Dependencies")
    })),
    epics: list("epics", (item) => ({
      id: cleanText(item.id, "Epic ID"), title: cleanText(item.title, "Epic title"), objective: cleanText(item.objective, "Epic objective"),
      featureIds: texts(item.featureIds, "Epic feature references"), sourceIds: texts(item.sourceIds, "Epic source references")
    })),
    features: list("features", (item) => ({
      id: cleanText(item.id, "Feature ID"), epicId: cleanText(item.epicId, "Feature epic ID"), title: cleanText(item.title, "Feature title"),
      description: cleanText(item.description, "Feature description"), outcome: cleanText(item.outcome, "Feature outcome"),
      priority: choice(item.priority, ["must", "should", "could"], "Feature priority"), sourceIds: texts(item.sourceIds, "Feature source references")
    })),
    stories: list("stories", (item) => ({
      id: cleanText(item.id, "Story ID"), epicId: cleanText(item.epicId, "Story epic ID"), featureId: cleanText(item.featureId, "Story feature ID"),
      title: cleanText(item.title, "Story title"), story: cleanText(item.story, "User story"), acceptanceCriteria: texts(item.acceptanceCriteria, "Acceptance criteria"),
      sourceIds: texts(item.sourceIds, "Story source references"), readiness: choice(item.readiness, ["ready", "needs-input"], "Story readiness"),
      testCases: array(item.testCases, "Test cases").map((value) => {
        const test = record(value, "Test case");
        return { id: cleanText(test.id, "Test ID"), title: cleanText(test.title, "Test title"), type: choice(test.type, ["happy-path", "negative", "edge"], "Test type"), steps: texts(test.steps, "Test steps"), expectedResult: cleanText(test.expectedResult, "Expected result") };
      })
    })),
    gaps: list("gaps", (item) => ({
      id: cleanText(item.id, "Gap ID"), title: cleanText(item.title, "Gap title"), description: cleanText(item.description, "Gap description"),
      question: cleanText(item.question, "Gap question"), severity: choice(item.severity, ["blocking", "important", "optional"], "Gap severity"), sourceIds: texts(item.sourceIds, "Gap source references")
    }))
  };
  if (raw.quality !== undefined) {
    const quality = record(raw.quality, "Quality review");
    synthesis.quality = { status: choice(quality.status, ["reviewed", "provisional"], "Quality status"), checks: texts(quality.checks, "Quality checks"), warnings: texts(quality.warnings, "Quality warnings") };
  }
  if (raw.research !== undefined) {
    const research = record(raw.research, "Research");
    synthesis.research = {
      status: choice(research.status, ["not-requested", "completed", "unavailable"], "Research status"), summary: cleanText(research.summary, "Research summary"),
      sources: array(research.sources, "Research sources").map((value) => {
        const source = record(value, "Research source");
        return { title: cleanText(source.title, "Research source title"), url: cleanText(source.url, "Research source URL") };
      })
    };
  }
  if (raw.revision !== undefined) {
    const revision = record(raw.revision, "Revision");
    synthesis.revision = { number: number(revision.number, "Revision number"), summary: cleanText(revision.summary, "Revision summary"), feedback: cleanText(revision.feedback, "Revision feedback", true) };
  }
  if (raw.sources !== undefined) {
    synthesis.sources = array(raw.sources, "Sources").map((value) => {
      const source = record(value, "Source");
      return { id: cleanText(source.id, "Source ID"), name: cleanText(source.name, "Source name"), coverage: choice(source.coverage, ["complete", "excerpt"], "Source coverage"), characters: number(source.characters, "Source character count") };
    });
  }
  const outputs = input.outputs === undefined ? STUDIO_OUTPUT_OPTIONS.map(({ id }) => id) : array(input.outputs, "Selected outputs").map((value) => choice(value, STUDIO_OUTPUT_OPTIONS.map(({ id }) => id), "Output"));
  if (!outputs.length) throw new StudioExportError("Select at least one output to export.");
  const workspaceName = cleanText(input.workspaceName, "Workspace name", true).trim() || "Discovery workspace";
  if (workspaceName.length > 240) throw new StudioExportError("Workspace name must be 240 characters or fewer.");
  return { workspaceName, synthesis, format: choice(input.format, STUDIO_EXPORT_FORMATS.map(({ id }) => id), "Export format"), outputs: [...new Set(outputs)] };
}

function sourceReferences(synthesis: ExportSynthesis, ids: string[]) {
  const names = new Map(synthesis.sources?.map((source) => [source.id, source.name]));
  return ids.map((id) => names.get(id) ? `${id} (${names.get(id)})` : id).join("; ") || "No source reference provided";
}

function exportSections(request: StudioExportRequest): ExportSection[] {
  const { synthesis: s, outputs } = request;
  const sections: ExportSection[] = [];
  const refs = (ids: string[]) => `Evidence: ${sourceReferences(s, ids)}`;
  if (outputs.includes("analysis")) {
    sections.push({ title: "Discovery analysis", entries: [
      { title: "Executive summary", lines: [s.executiveSummary] },
      { title: "Evidence summary", lines: [s.evidenceSummary] },
      { title: "Capabilities", lines: s.capabilities },
      { title: "Pain points", lines: s.painPoints },
      { title: "Business rules", lines: s.businessRules },
      { title: "Assumptions requiring validation", lines: s.assumptions },
      { title: "Readiness assessment", lines: [`Readiness score: ${s.readinessScore}/100`, s.readinessNarrative] },
      ...(s.quality ? [{ title: "Quality review", lines: [`Status: ${s.quality.status}`, ...s.quality.checks.map((text) => `Check: ${text}`), ...s.quality.warnings.map((text) => `Warning: ${text}`)] }] : []),
      ...(s.research ? [{ title: "External research", lines: [`Status: ${s.research.status}`, s.research.summary, ...s.research.sources.map((source) => `${source.title}: ${source.url}`)] }] : []),
      ...(s.revision ? [{ title: "Revision history", lines: [`Revision ${s.revision.number}`, s.revision.summary, ...(s.revision.feedback ? [`User feedback: ${s.revision.feedback}`] : [])] }] : []),
      ...(s.sources?.length ? [{ title: "Source register", lines: s.sources.map((source) => `${source.id}: ${source.name}. Coverage: ${source.coverage}. ${source.characters.toLocaleString("en-US")} characters analyzed.`) }] : [])
    ] });
  }
  if (outputs.includes("roadmap")) sections.push({ title: "Product roadmap", entries: s.roadmap.map((item) => ({ title: `${item.horizon}: ${item.title}`, lines: [item.outcome, `Features: ${item.featureIds.join(", ") || "None specified"}`, `Dependencies: ${item.dependencies.join("; ") || "None specified"}`] })) });
  if (outputs.includes("backlog")) {
    sections.push({ title: "Epics", entries: s.epics.map((epic) => ({ title: `${epic.id}: ${epic.title}`, lines: [epic.objective, `Features: ${epic.featureIds.join(", ")}`, refs(epic.sourceIds)] })) });
    sections.push({ title: "Features", entries: s.features.map((feature) => ({ title: `${feature.id}: ${feature.title}`, lines: [`Epic: ${feature.epicId}. Priority: ${feature.priority}.`, feature.description, `Outcome: ${feature.outcome}`, refs(feature.sourceIds)] })) });
  }
  if (outputs.includes("stories")) sections.push({ title: "User stories and acceptance criteria", entries: s.stories.map((story) => ({ title: `${story.id}: ${story.title}`, lines: [`Epic: ${story.epicId}. Feature: ${story.featureId}. Readiness: ${story.readiness}.`, story.story, ...story.acceptanceCriteria.map((text, index) => `AC ${index + 1}: ${text}`), refs(story.sourceIds)] })) });
  if (outputs.includes("tests")) sections.push({ title: "Test cases", entries: s.stories.flatMap((story) => story.testCases.map((test) => ({ title: `${test.id}: ${test.title}`, lines: [`Story: ${story.id}. Feature: ${story.featureId}. Type: ${test.type}.`, ...test.steps.map((step, index) => `Step ${index + 1}: ${step}`), `Expected result: ${test.expectedResult}`, refs(story.sourceIds)] }))) });
  if (outputs.includes("gaps")) sections.push({ title: "Gaps and open questions", entries: s.gaps.map((gap) => ({ title: `${gap.id}: ${gap.title}`, lines: [`Severity: ${gap.severity}`, gap.description, `Question: ${gap.question}`, refs(gap.sourceIds)] })) });
  return sections.map((section) => section.entries.length ? section : { ...section, entries: [{ title: "No items identified", lines: ["The current synthesis contains no items for this output."] }] });
}

function xml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const relNamespace = "http://schemas.openxmlformats.org/package/2006/relationships";
const officeRelationships = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const contentTypesNamespace = "http://schemas.openxmlformats.org/package/2006/content-types";
const drawingNamespace = "http://schemas.openxmlformats.org/drawingml/2006/main";

function relations(items: { id: string; type: string; target: string }[]) {
  return `${declaration}<Relationships xmlns="${relNamespace}">${items.map((item) => `<Relationship Id="${item.id}" Type="${officeRelationships}/${item.type}" Target="${item.target}"/>`).join("")}</Relationships>`;
}

function contentTypes(items: { part: string; type: string }[]) {
  return `${declaration}<Types xmlns="${contentTypesNamespace}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${items.map((item) => `<Override PartName="/${item.part}" ContentType="${item.type}"/>`).join("")}</Types>`;
}

function addCoreProperties(zip: JSZip, request: StudioExportRequest) {
  zip.file("docProps/core.xml", `${declaration}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(request.workspaceName)} product definition</dc:title><dc:creator>NorthStar Studio</dc:creator><dc:description>${xml(request.outputs.join(", "))}</dc:description></cp:coreProperties>`);
}

function packageRelations(main: string) {
  return `${declaration}<Relationships xmlns="${relNamespace}"><Relationship Id="rId1" Type="${officeRelationships}/officeDocument" Target="${main}"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
}

const coreContentType = { part: "docProps/core.xml", type: "application/vnd.openxmlformats-package.core-properties+xml" };

function wordParagraph(text: string, style = "Normal", keepNext = false) {
  const runs = text.split(/\r\n|\r|\n/).map((line, index) => `${index ? "<w:r><w:br/></w:r>" : ""}<w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join("");
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${keepNext ? "<w:keepNext/>" : ""}</w:pPr>${runs}</w:p>`;
}

async function createWord(request: StudioExportRequest, sections: ExportSection[]) {
  const zip = new JSZip();
  addCoreProperties(zip, request);
  zip.file("_rels/.rels", packageRelations("word/document.xml"));
  zip.file("[Content_Types].xml", contentTypes([
    coreContentType,
    { part: "word/document.xml", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml" },
    { part: "word/styles.xml", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml" },
    { part: "word/footer1.xml", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml" }
  ]));
  zip.file("word/_rels/document.xml.rels", relations([{ id: "rId1", type: "styles", target: "styles.xml" }, { id: "rId2", type: "footer", target: "footer1.xml" }]));
  zip.file("word/styles.xml", `${declaration}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="182735"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="240"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="48"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="143C44"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/></w:rPr></w:style></w:styles>`);
  zip.file("word/footer1.xml", `${declaration}<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>NorthStar Studio  </w:t></w:r><w:fldSimple w:instr="PAGE"/></w:p></w:ftr>`);
  const body = [
    wordParagraph(request.workspaceName, "Title"),
    wordParagraph("Product definition from discovery evidence"),
    wordParagraph(`Generated ${request.synthesis.generatedAt}. ${request.synthesis.sourceCount} discovery sources. Readiness ${request.synthesis.readinessScore}/100.`),
    wordParagraph(`Included outputs: ${request.outputs.map((id) => STUDIO_OUTPUT_OPTIONS.find((option) => option.id === id)?.label).join("; ")}.`),
    ...sections.flatMap((section) => [wordParagraph(section.title, "Heading1"), ...section.entries.flatMap((entry) => {
      const keepEntryTogether = entry.lines.join("").length < 1600;
      return [wordParagraph(entry.title, "Heading2"), ...entry.lines.map((line, index) => wordParagraph(line, "Normal", keepEntryTogether ? index < entry.lines.length - 1 : index === 0))];
    })])
  ].join("");
  zip.file("word/document.xml", `${declaration}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="${officeRelationships}"><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="540" w:footer="540"/><w:cols w:space="720"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function exportSheets(request: StudioExportRequest, sections: ExportSection[]): ExportSheet[] {
  const { synthesis: s, outputs } = request;
  const refs = (ids: string[]) => sourceReferences(s, ids);
  const sheets: ExportSheet[] = [{ name: "Overview", headers: ["Field", "Value"], rows: [
    ["Workspace", request.workspaceName], ["Generated", s.generatedAt], ["Source count", s.sourceCount], ["Readiness score", s.readinessScore], ["Readiness assessment", s.readinessNarrative], ["Outputs", outputs.join(", ")], ["Analysis provider", s.provider],
    ...(s.quality ? [["Quality status", s.quality.status]] : []), ...(s.revision ? [["Revision", s.revision.number], ["Revision summary", s.revision.summary]] : [])
  ] }];
  if (outputs.includes("analysis")) sheets.push({ name: "Analysis", headers: ["Section", "Topic", "Detail"], rows: (sections.find((section) => section.title === "Discovery analysis")?.entries ?? []).flatMap((entry) => entry.lines.map((line) => ["Discovery analysis", entry.title, line])) });
  if (outputs.includes("roadmap")) sheets.push({ name: "Roadmap", headers: ["Horizon", "Title", "Outcome", "Features", "Dependencies"], rows: s.roadmap.map((item) => [item.horizon, item.title, item.outcome, item.featureIds.join("\n"), item.dependencies.join("\n")]) });
  if (outputs.includes("backlog")) {
    sheets.push({ name: "Epics", headers: ["Epic ID", "Title", "Objective", "Features", "Evidence"], rows: s.epics.map((item) => [item.id, item.title, item.objective, item.featureIds.join("\n"), refs(item.sourceIds)]) });
    sheets.push({ name: "Features", headers: ["Feature ID", "Epic ID", "Title", "Description", "Outcome", "Priority", "Evidence"], rows: s.features.map((item) => [item.id, item.epicId, item.title, item.description, item.outcome, item.priority, refs(item.sourceIds)]) });
  }
  if (outputs.includes("stories")) {
    sheets.push({ name: "User Stories", headers: ["Story ID", "Epic ID", "Feature ID", "Title", "User story", "Readiness", "Evidence"], rows: s.stories.map((item) => [item.id, item.epicId, item.featureId, item.title, item.story, item.readiness, refs(item.sourceIds)]) });
    sheets.push({ name: "Acceptance Criteria", headers: ["Story ID", "Feature ID", "Criterion", "Acceptance criterion", "Evidence"], rows: s.stories.flatMap((item) => item.acceptanceCriteria.map((text, index) => [item.id, item.featureId, index + 1, text, refs(item.sourceIds)])) });
  }
  if (outputs.includes("tests")) sheets.push({ name: "Test Cases", headers: ["Test ID", "Story ID", "Feature ID", "Title", "Type", "Steps", "Expected result", "Evidence"], rows: s.stories.flatMap((story) => story.testCases.map((test) => [test.id, story.id, story.featureId, test.title, test.type, test.steps.map((step, index) => `${index + 1}. ${step}`).join("\n"), test.expectedResult, refs(story.sourceIds)])) });
  if (outputs.includes("gaps")) sheets.push({ name: "Gaps", headers: ["Gap ID", "Title", "Severity", "Description", "Question", "Evidence"], rows: s.gaps.map((item) => [item.id, item.title, item.severity, item.description, item.question, refs(item.sourceIds)]) });
  if (s.sources?.length) sheets.push({ name: "Sources", headers: ["Source ID", "Name", "Coverage", "Characters analyzed"], rows: s.sources.map((source) => [source.id, source.name, source.coverage, source.characters]) });
  return sheets;
}

function columnName(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : `${columnName(Math.floor(index / 26) - 1)}${String.fromCharCode(65 + index % 26)}`;
}

function splitCell(value: string | number): (string | number)[] {
  // Keep exported rows readable as well as staying below Excel's 32,767-character cell limit.
  if (typeof value === "number" || value.length <= 450) return [value];
  const result: string[] = [];
  let remaining = value;
  while (remaining.length) {
    let boundary = Math.min(450, remaining.length);
    if (boundary < remaining.length && /[\uD800-\uDBFF]/.test(remaining[boundary - 1])) boundary--;
    result.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary);
  }
  return result;
}

async function createExcel(request: StudioExportRequest, sections: ExportSection[]) {
  const zip = new JSZip();
  const sheets = exportSheets(request, sections);
  addCoreProperties(zip, request);
  zip.file("_rels/.rels", packageRelations("xl/workbook.xml"));
  zip.file("[Content_Types].xml", contentTypes([
    coreContentType, { part: "xl/workbook.xml", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" },
    { part: "xl/styles.xml", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml" },
    ...sheets.map((_, index) => ({ part: `xl/worksheets/sheet${index + 1}.xml`, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" }))
  ]));
  zip.file("xl/workbook.xml", `${declaration}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${officeRelationships}"><bookViews><workbookView/></bookViews><sheets>${sheets.map((sheet, index) => `<sheet name="${xml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", relations([...sheets.map((_, index) => ({ id: `rId${index + 1}`, type: "worksheet", target: `worksheets/sheet${index + 1}.xml` })), { id: `rId${sheets.length + 1}`, type: "styles", target: "styles.xml" }]));
  zip.file("xl/styles.xml", `${declaration}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><color rgb="FF182735"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF143C44"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  sheets.forEach((sheet, index) => {
    // Continue long fields onto adjacent rows instead of hiding or discarding long requirements.
    const hasContinuation = sheet.rows.some((row) => row.some((value) => typeof value === "string" && value.length > 450));
    const rows = [hasContinuation ? [...sheet.headers, "Text part"] : sheet.headers, ...sheet.rows.flatMap((row) => {
      const parts = row.map(splitCell);
      const count = Math.max(1, ...parts.map((item) => item.length));
      return Array.from({ length: count }, (_, part) => [...parts.map((item) => item.length === 1 ? item[0] : item[part] ?? ""), ...(hasContinuation ? [`${part + 1}/${count}`] : [])]);
    })];
    const width = (col: number) => sheet.headers[col]?.includes("ID") ? 20 : sheet.headers[col] === "Value" || /Detail|Description|User story|criterion|Steps|result|Outcome|Question|Objective/.test(sheet.headers[col] ?? "") ? 65 : 34;
    const cell = (value: string | number, row: number, col: number) => typeof value === "number" ? `<c r="${columnName(col)}${row + 1}" s="${row ? 0 : 1}"><v>${value}</v></c>` : `<c r="${columnName(col)}${row + 1}" s="${row ? 0 : 1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    zip.file(`xl/worksheets/sheet${index + 1}.xml`, `${declaration}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${columnName(rows[0].length - 1)}${rows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols>${rows[0].map((_, col) => `<col min="${col + 1}" max="${col + 1}" width="${width(col)}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.map((row, rowIndex) => {
      const estimatedLines = Math.max(...row.map((value, col) => String(value).split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / width(col))), 0)));
      const height = rowIndex ? Math.max(30, Math.min(409, estimatedLines * 15 + 8)) : 32;
      return `<row r="${rowIndex + 1}" ht="${height}" customHeight="1">${row.map((value, col) => cell(value, rowIndex, col)).join("")}</row>`;
    }).join("")}</sheetData><autoFilter ref="A1:${columnName(rows[0].length - 1)}${rows.length}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>`);
  });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function wrapSlideText(value: string, limit = 82) {
  const result: string[] = [];
  for (const paragraph of value.split(/\r\n|\r|\n/)) {
    let remaining = paragraph;
    while (remaining.length) {
      let units = 0;
      let measuredBoundary = 0;
      for (const character of remaining) {
        // Conservative Arial width estimates also handle unbroken IDs, wide glyphs, and CJK text.
        const width = /[MW@#\u2E80-\uFFFF]/u.test(character) ? 1 : /[A-Z0-9]/.test(character) ? 0.7 : /[il.,' !|:;]/.test(character) ? 0.3 : 0.58;
        if (units + width > limit * 0.48) break;
        units += width;
        measuredBoundary += character.length;
      }
      if (measuredBoundary >= remaining.length) break;
      const space = remaining.lastIndexOf(" ", measuredBoundary);
      let boundary = space > measuredBoundary * 0.55 ? space + 1 : measuredBoundary;
      if (/[\uD800-\uDBFF]/.test(remaining[boundary - 1])) boundary--;
      result.push(remaining.slice(0, boundary));
      remaining = remaining.slice(boundary);
    }
    result.push(remaining);
  }
  return result;
}

function themeXml() {
  return `${declaration}<a:theme xmlns:a="${drawingNamespace}" name="NorthStar"><a:themeElements><a:clrScheme name="NorthStar"><a:dk1><a:srgbClr val="182735"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="143C44"/></a:dk2><a:lt2><a:srgbClr val="F4F7F7"/></a:lt2>${["32958A", "D8A643", "587FA3", "8D6A9F", "C77854", "708C66"].map((color, index) => `<a:accent${index + 1}><a:srgbClr val="${color}"/></a:accent${index + 1}>`).join("")}<a:hlink><a:srgbClr val="216A99"/></a:hlink><a:folHlink><a:srgbClr val="785A8C"/></a:folHlink></a:clrScheme><a:fontScheme name="NorthStar"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="NorthStar"><a:fillStyleLst>${Array.from({ length: 3 }, () => '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>').join("")}</a:fillStyleLst><a:lnStyleLst>${[9525, 25400, 38100].map((width) => `<a:ln w="${width}"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>`).join("")}</a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${Array.from({ length: 3 }, () => '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>').join("")}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
}

const emptyShapeTree = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const colorMap = '<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>';

function textShape(id: number, name: string, lines: string[], y: number, height: number, fontSize: number, color: string, bold = false) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="731520" y="${y}"/><a:ext cx="10759440" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>${lines.map((text) => `<a:p><a:pPr><a:lnSpc><a:spcPct val="110000"/></a:lnSpc><a:spcAft><a:spcPts val="300"/></a:spcAft></a:pPr><a:r><a:rPr lang="en-US" sz="${fontSize}"${bold ? ' b="1"' : ""}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t xml:space="preserve">${xml(text)}</a:t></a:r><a:endParaRPr lang="en-US" sz="${fontSize}"/></a:p>`).join("")}</p:txBody></p:sp>`;
}

async function createPowerPoint(request: StudioExportRequest, sections: ExportSection[]) {
  const maximumLines = 14;
  const overviewLines = [...wrapSlideText(request.workspaceName), "", `Readiness: ${request.synthesis.readinessScore}/100`, `Discovery sources: ${request.synthesis.sourceCount}`, ...wrapSlideText(`Generated: ${request.synthesis.generatedAt}`), ...request.outputs.map((id) => STUDIO_OUTPUT_OPTIONS.find((option) => option.id === id)?.label ?? id)];
  const slides: { title: string; lines: string[] }[] = [];
  for (let index = 0; index < overviewLines.length; index += maximumLines) slides.push({ title: `Discovery product definition${index ? " continued" : ""}`, lines: overviewLines.slice(index, index + maximumLines) });
  for (const section of sections) {
    for (const entry of section.entries) {
      const lines = [...wrapSlideText(entry.title), "", ...entry.lines.flatMap((line) => wrapSlideText(line))];
      const linesPerPage = Math.ceil(lines.length / Math.ceil(lines.length / maximumLines));
      for (let index = 0; index < lines.length; index += linesPerPage) {
        slides.push({ title: `${section.title}${index ? " continued" : ""}`, lines: lines.slice(index, index + linesPerPage) });
      }
    }
  }
  if (slides.length > 500) throw new StudioExportError("This presentation exceeds 500 slides. Select fewer outputs or export to Word or Excel.", 413);
  const zip = new JSZip();
  addCoreProperties(zip, request);
  zip.file("_rels/.rels", packageRelations("ppt/presentation.xml"));
  zip.file("[Content_Types].xml", contentTypes([
    coreContentType,
    { part: "ppt/presentation.xml", type: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml" },
    { part: "ppt/slideMasters/slideMaster1.xml", type: "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml" },
    { part: "ppt/slideLayouts/slideLayout1.xml", type: "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml" },
    { part: "ppt/theme/theme1.xml", type: "application/vnd.openxmlformats-officedocument.theme+xml" },
    ...slides.map((_, index) => ({ part: `ppt/slides/slide${index + 1}.xml`, type: "application/vnd.openxmlformats-officedocument.presentationml.slide+xml" }))
  ]));
  zip.file("ppt/presentation.xml", `${declaration}<p:presentation xmlns:a="${drawingNamespace}" xmlns:r="${officeRelationships}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`);
  zip.file("ppt/_rels/presentation.xml.rels", relations([{ id: "rId1", type: "slideMaster", target: "slideMasters/slideMaster1.xml" }, ...slides.map((_, index) => ({ id: `rId${index + 2}`, type: "slide", target: `slides/slide${index + 1}.xml` }))]));
  zip.file("ppt/theme/theme1.xml", themeXml());
  zip.file("ppt/slideMasters/slideMaster1.xml", `${declaration}<p:sldMaster xmlns:a="${drawingNamespace}" xmlns:r="${officeRelationships}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="F4F7F7"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${emptyShapeTree}</p:spTree></p:cSld>${colorMap}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`);
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", relations([{ id: "rId1", type: "slideLayout", target: "../slideLayouts/slideLayout1.xml" }, { id: "rId2", type: "theme", target: "../theme/theme1.xml" }]));
  zip.file("ppt/slideLayouts/slideLayout1.xml", `${declaration}<p:sldLayout xmlns:a="${drawingNamespace}" xmlns:r="${officeRelationships}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="NorthStar content"><p:spTree>${emptyShapeTree}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", relations([{ id: "rId1", type: "slideMaster", target: "../slideMasters/slideMaster1.xml" }]));
  slides.forEach((slide, index) => {
    zip.file(`ppt/slides/slide${index + 1}.xml`, `${declaration}<p:sld xmlns:a="${drawingNamespace}" xmlns:r="${officeRelationships}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${emptyShapeTree}${textShape(2, "Title", wrapSlideText(slide.title, 62), 411480, 1005840, 3000, "143C44", true)}${textShape(3, "Content", slide.lines, 1554480, 4800600, 2000, "182735")}${textShape(4, "Footer", [`NorthStar Studio     ${index + 1} / ${slides.length}`], 6416040, 228600, 1000, "64748B")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
    zip.file(`ppt/slides/_rels/slide${index + 1}.xml.rels`, relations([{ id: "rId1", type: "slideLayout", target: "../slideLayouts/slideLayout1.xml" }]));
  });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function generateStudioExport(request: StudioExportRequest): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const sections = exportSections(request);
  const base = request.workspaceName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "discovery-workspace";
  const filename = `${base}-product-definition.${request.format}`;
  if (request.format === "md") {
    const markdown = [`# ${request.workspaceName}`, "Product definition from discovery evidence", `Generated: ${request.synthesis.generatedAt}`, `Readiness: ${request.synthesis.readinessScore}/100. Sources: ${request.synthesis.sourceCount}.`, ...sections.flatMap((section) => [`## ${section.title}`, ...section.entries.flatMap((entry) => [`### ${entry.title}`, ...entry.lines])])].join("\n\n");
    return { buffer: Buffer.from(markdown, "utf8"), contentType: "text/markdown; charset=utf-8", filename };
  }
  if (request.format === "docx") return { buffer: await createWord(request, sections), contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename };
  if (request.format === "xlsx") return { buffer: await createExcel(request, sections), contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename };
  return { buffer: await createPowerPoint(request, sections), contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", filename };
}
