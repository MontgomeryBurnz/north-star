import { Buffer } from "node:buffer";
import type { ClientPortalPortfolio, ClientPortalProgram } from "./client-portal.ts";

type PdfFont = "regular" | "bold";

const pageWidth = 612;
const pageHeight = 792;
const margin = 48;
const contentWidth = pageWidth - margin * 2;

function sanitizePdfText(value: string | number | undefined | null) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string | number | undefined | null) {
  return sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function byteLength(value: string) {
  return Buffer.byteLength(value, "latin1");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return sanitizePdfText(value);
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "America/New_York",
    year: "numeric"
  }).format(date);
}

function statusLabel(program: ClientPortalProgram) {
  return `${program.statusSignal} - ${program.postureLabel}`;
}

function wrapText(value: string, fontSize: number, width: number) {
  const text = sanitizePdfText(value);
  if (!text) return [];

  const maxChars = Math.max(12, Math.floor(width / (fontSize * 0.52)));
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word.length > maxChars ? word.slice(0, maxChars - 1) : word;
  }

  if (line) lines.push(line);
  return lines;
}

class PdfReport {
  private pages: string[][] = [[]];
  private y = pageHeight - margin;

  private get commands() {
    return this.pages[this.pages.length - 1]!;
  }

  private add(command: string) {
    this.commands.push(command);
  }

  private addPage() {
    this.pages.push([]);
    this.y = pageHeight - margin;
  }

  private ensureSpace(height: number) {
    if (this.y - height < margin) this.addPage();
  }

  private textLine(text: string, x: number, y: number, options: { color?: string; font?: PdfFont; size?: number } = {}) {
    const font = options.font === "bold" ? "F2" : "F1";
    const size = options.size ?? 10;
    const color = options.color ?? "15 23 42";
    this.add(`BT /${font} ${size} Tf ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
  }

  private rect(x: number, y: number, width: number, height: number, color: string) {
    this.add(`q ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f Q`);
  }

  private strokeRect(x: number, y: number, width: number, height: number, color = "203 213 225") {
    this.add(`q ${color} RG 1 w ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S Q`);
  }

  private divider() {
    const y = (this.y - 4).toFixed(2);
    this.add(`q 226 232 240 RG 1 w ${margin} ${y} m ${margin + contentWidth} ${y} l S Q`);
    this.y -= 16;
  }

  heading(label: string, title: string, subtitle?: string) {
    this.ensureSpace(108);
    this.rect(margin, this.y - 96, contentWidth, 96, "2 6 23");
    this.textLine(label.toUpperCase(), margin + 18, this.y - 28, { color: "110 231 183", font: "bold", size: 9 });
    this.textLine(title, margin + 18, this.y - 55, { color: "255 255 255", font: "bold", size: 22 });
    if (subtitle) this.textLine(subtitle, margin + 18, this.y - 78, { color: "203 213 225", size: 10 });
    this.y -= 116;
  }

  section(title: string) {
    this.ensureSpace(42);
    this.textLine(title, margin, this.y, { font: "bold", size: 15 });
    this.y -= 18;
    this.divider();
  }

  paragraph(value: string, options: { maxLines?: number; width?: number } = {}) {
    const width = options.width ?? contentWidth;
    const lines = wrapText(value, 10, width).slice(0, options.maxLines ?? 999);
    this.ensureSpace(lines.length * 15 + 6);
    for (const line of lines) {
      this.textLine(line, margin, this.y, { color: "51 65 85", size: 10 });
      this.y -= 15;
    }
    this.y -= 4;
  }

  bulletList(items: string[], emptyText: string) {
    const rows = items.length ? items : [emptyText];
    for (const item of rows.slice(0, 8)) {
      const lines = wrapText(item, 10, contentWidth - 16).slice(0, 3);
      this.ensureSpace(lines.length * 15 + 6);
      this.textLine("-", margin, this.y, { color: "15 23 42", font: "bold", size: 10 });
      lines.forEach((line, index) => {
        this.textLine(line, margin + 16, this.y - index * 15, { color: "51 65 85", size: 10 });
      });
      this.y -= lines.length * 15 + 5;
    }
  }

  programCard(program: ClientPortalProgram) {
    const cardHeight = 126;
    this.ensureSpace(cardHeight + 10);
    const top = this.y;
    this.strokeRect(margin, top - cardHeight, contentWidth, cardHeight);
    this.textLine(program.name, margin + 16, top - 22, { font: "bold", size: 13 });
    this.textLine(program.clientName, margin + 16, top - 40, { color: "71 85 105", size: 9 });
    this.textLine(statusLabel(program), margin + 330, top - 22, { font: "bold", size: 10 });
    this.textLine(`${program.metrics.programCompletionPercent}% complete`, margin + 330, top - 40, { color: "71 85 105", size: 9 });
    this.textLine("Phase", margin + 16, top - 70, { color: "100 116 139", font: "bold", size: 8 });
    this.textLine(program.phase, margin + 16, top - 87, { font: "bold", size: 10 });
    this.textLine("Next Milestone", margin + 180, top - 70, { color: "100 116 139", font: "bold", size: 8 });
    this.textLine(program.nextMilestone.name, margin + 180, top - 87, { font: "bold", size: 10 });
    const note = wrapText(program.statusNote, 9, contentWidth - 32).slice(0, 2);
    note.forEach((line, index) => this.textLine(line, margin + 16, top - 108 - index * 13, { color: "51 65 85", size: 9 }));
    this.y -= cardHeight + 12;
  }

  toBuffer() {
    const objects: string[] = [];
    const addObject = (body: string) => {
      objects.push(body);
      return objects.length;
    };

    addObject("<< /Type /Catalog /Pages 2 0 R >>");
    addObject("PAGES_PLACEHOLDER");
    addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const pageObjectIds: number[] = [];
    for (const pageCommands of this.pages) {
      const stream = pageCommands.join("\n");
      const contentId = objects.length + 2;
      const pageId = addObject(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageObjectIds.push(pageId);
      addObject(`<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    }

    objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

    let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets = [0];
    objects.forEach((body, index) => {
      offsets.push(byteLength(pdf));
      pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefOffset = byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf, "latin1");
  }
}

export function buildClientPortalPdf(input: {
  clientName: string;
  generatedAt: string;
  portfolio: ClientPortalPortfolio;
  programs: ClientPortalProgram[];
  scope: "portfolio" | "program";
  selectedProgram?: ClientPortalProgram | null;
  viewerLabel: string;
}) {
  const report = new PdfReport();
  const generatedLabel = `Generated ${formatDateTime(input.generatedAt)} by ${input.viewerLabel}`;

  if (input.scope === "program" && input.selectedProgram) {
    const program = input.selectedProgram;
    report.heading("Program executive report", program.name, `${program.clientName} - ${generatedLabel}`);
    report.section("Executive Summary");
    report.paragraph(program.executiveSummary, { maxLines: 7 });
    report.section("Program Posture");
    report.bulletList(
      [
        `Status: ${statusLabel(program)}`,
        `Completion: ${program.metrics.programCompletionPercent}% (${program.metrics.completionBasis})`,
        `Current phase: ${program.phase}`,
        `Next milestone: ${program.nextMilestone.name}${program.nextMilestone.dateLabel ? ` - ${program.nextMilestone.dateLabel}` : ""}`
      ],
      "No client-facing posture has been published yet."
    );
    report.section("Recent Accomplishments");
    report.bulletList(program.recentAccomplishments, "No accomplishments have been published yet.");
    report.section("Upcoming Work");
    report.bulletList(program.upcomingWork, "No upcoming work has been published yet.");
    report.section("Risks And Decisions");
    report.bulletList([...program.risks, ...program.decisions], "No executive risks or decisions are currently visible.");
  } else {
    report.heading("Client portfolio report", input.clientName, generatedLabel);
    report.section("Program Updates");
    input.programs.forEach((program) => report.programCard(program));
    report.section("Upcoming Milestones");
    const programIds = new Set(input.programs.map((program) => program.id));
    const milestones = input.portfolio.upcomingMilestones
      .filter((milestone) => programIds.has(milestone.programId))
      .map((milestone) => `${milestone.title} - ${milestone.programName}${milestone.dateLabel ? ` - ${milestone.dateLabel}` : ""}`);
    report.bulletList(milestones, "No published milestones are currently visible.");
    report.section("Key Risks");
    const risks = input.portfolio.keyRisks
      .filter((risk) => programIds.has(risk.programId))
      .map((risk) => `${risk.programName}: ${risk.description}`);
    report.bulletList(risks, "No executive risks are currently visible.");
  }

  report.section("Report Basis");
  report.paragraph(
    "This report uses only published client-facing updates and client decisions. Internal role updates, tactical notes, private blockers, and working-team commentary are excluded from this client report path.",
    { maxLines: 5 }
  );

  return report.toBuffer();
}

export function clientPortalPdfFilename(input: { clientName: string; programName?: string; scope: "portfolio" | "program" }) {
  const base = input.scope === "program" && input.programName ? input.programName : `${input.clientName} Portfolio`;
  return `${sanitizePdfText(base).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "north-star-report"}.pdf`;
}
