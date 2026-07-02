import { Buffer } from "node:buffer";
import type { ClientPortalPortfolio, ClientPortalProgram } from "./client-portal.ts";
import { shouldRenderClientPortalList, splitClientPortalListText } from "./client-portal-text.ts";

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

function pdfColor(value: string) {
  const channels = value
    .trim()
    .split(/\s+/)
    .map((channel) => Number(channel));
  const normalized = channels.length === 3 && channels.every((channel) => Number.isFinite(channel))
    ? channels.map((channel) => {
        const clamped = Math.max(0, Math.min(255, channel));
        return (clamped / 255).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
      })
    : ["0", "0", "0"];

  return normalized.join(" ");
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
  return program.statusSignal;
}

function clientRoadmapTitle(programName: string) {
  const cleaned = programName
    .replace(/\b(application|app)\s+build\b/gi, "")
    .replace(/\bbuild\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${cleaned || programName} Roadmap`;
}

function isClientFunctionSignal(value: string) {
  const cleaned = value.trim();

  if (!cleaned) return false;
  if (/^no\s+/i.test(cleaned)) return false;
  if (/not captured|not published|will appear|will populate|will sharpen/i.test(cleaned)) return false;

  return true;
}

function functionRows(program: ClientPortalProgram, mode: "accomplishments" | "upcoming") {
  const rows = program.domainSummaries
    .map((domain) => ({
      attachments: domain.attachments,
      owner: domain.owner,
      role: domain.role,
      statusLabel: domain.statusLabel,
      text: mode === "accomplishments" ? domain.pursuit : domain.decisionsOrOutcomes
    }))
    .filter((row) => isClientFunctionSignal(row.text));

  if (rows.length) return rows;

  const fallbackItems = mode === "accomplishments" ? program.recentAccomplishments : program.upcomingWork;
  return fallbackItems
    .filter(isClientFunctionSignal)
    .map((item, index) => ({
      attachments: 0,
      owner: program.owner,
      role: index === 0 ? "Program team" : `Program team ${index + 1}`,
      statusLabel: "Published",
      text: item
    }));
}

const roadmapStatusLabels: Record<ClientPortalProgram["clientRoadmapItems"][number]["status"], string> = {
  "at-risk": "At risk",
  blocked: "Blocked",
  complete: "Complete",
  "in-progress": "In progress",
  planned: "Planned"
};

const roadmapStatusColors: Record<ClientPortalProgram["clientRoadmapItems"][number]["status"], string> = {
  "at-risk": "245 158 11",
  blocked: "244 63 94",
  complete: "5 150 105",
  "in-progress": "3 105 161",
  planned: "51 65 85"
};

function parseRoadmapMonth(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return Number.isNaN(date.getTime()) ? null : date;
}

function roadmapMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function roadmapMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date).toUpperCase();
}

function buildClientRoadmapMonths(items: ClientPortalProgram["clientRoadmapItems"]) {
  const dates = items
    .flatMap((item) => [parseRoadmapMonth(item.startMonth), parseRoadmapMonth(item.endMonth)])
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (!dates.length) return [];

  const start = new Date(Date.UTC(dates[0].getUTCFullYear(), dates[0].getUTCMonth(), 1));
  const end = new Date(Date.UTC(dates[dates.length - 1].getUTCFullYear(), dates[dates.length - 1].getUTCMonth(), 1));
  const months: Array<{ key: string; label: string }> = [];
  const cursor = new Date(start);

  while (cursor <= end && months.length < 12) {
    months.push({ key: roadmapMonthKey(cursor), label: roadmapMonthLabel(cursor) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function clientRoadmapRange(item: ClientPortalProgram["clientRoadmapItems"][number], months: Array<{ key: string; label: string }>) {
  const startIndex = months.findIndex((month) => month.key === item.startMonth);
  const endIndex = months.findIndex((month) => month.key === item.endMonth);
  const safeStart = startIndex >= 0 ? startIndex : 0;
  const safeEnd = endIndex >= 0 ? endIndex : safeStart;

  return {
    end: Math.max(safeStart, safeEnd),
    start: Math.min(safeStart, safeEnd)
  };
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

function wrapMultilineText(value: string, fontSize: number, width: number) {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .flatMap((line) => {
      const trimmed = line.trim();
      return trimmed ? wrapText(trimmed, fontSize, width) : [""];
    });
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
    const color = pdfColor(options.color ?? "15 23 42");
    this.add(`BT /${font} ${size} Tf ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
  }

  private rect(x: number, y: number, width: number, height: number, color: string) {
    this.add(`q ${pdfColor(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f Q`);
  }

  private strokeRect(x: number, y: number, width: number, height: number, color = "203 213 225") {
    this.add(`q ${pdfColor(color)} RG 1 w ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S Q`);
  }

  private divider() {
    const y = (this.y - 4).toFixed(2);
    this.add(`q ${pdfColor("226 232 240")} RG 1 w ${margin} ${y} m ${margin + contentWidth} ${y} l S Q`);
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
    this.y -= 10;
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
    const cardHeight = 118;
    this.ensureSpace(cardHeight + 10);
    const top = this.y;
    this.strokeRect(margin, top - cardHeight, contentWidth, cardHeight);
    this.textLine(program.name, margin + 16, top - 22, { font: "bold", size: 13 });
    this.textLine(program.clientName, margin + 16, top - 40, { color: "71 85 105", size: 9 });
    this.textLine(program.postureLabel, margin + 330, top - 22, { font: "bold", size: 10 });
    this.textLine(`${program.metrics.programCompletionPercent}% complete`, margin + 330, top - 40, { color: "71 85 105", size: 9 });
    this.textLine("Phase", margin + 16, top - 70, { color: "100 116 139", font: "bold", size: 8 });
    this.textLine(program.phase, margin + 16, top - 87, { font: "bold", size: 10 });
    this.textLine("Executive Summary", margin + 180, top - 70, { color: "100 116 139", font: "bold", size: 8 });
    const note = wrapText(program.statusNote, 9, contentWidth - 32).slice(0, 2);
    const summary = wrapText(program.executiveOverview, 9, 300).slice(0, 2);
    summary.forEach((line, index) => this.textLine(line, margin + 180, top - 87 - index * 13, { color: "51 65 85", size: 9 }));
    note.forEach((line, index) => this.textLine(line, margin + 16, top - 105 - index * 13, { color: "51 65 85", size: 9 }));
    this.y -= cardHeight + 12;
  }

  programHero(program: ClientPortalProgram, generatedLabel: string) {
    const heroHeight = 312;
    this.ensureSpace(heroHeight + 20);
    const top = this.y;
    const heroY = top - heroHeight;

    this.rect(margin, heroY, contentWidth, heroHeight, "2 6 23");
    this.textLine(program.clientName.toUpperCase(), margin + 18, top - 28, { color: "186 230 253", font: "bold", size: 9 });
    this.textLine(program.name, margin + 18, top - 60, { color: "255 255 255", font: "bold", size: 21 });
    this.textLine(generatedLabel, margin + 18, top - 80, { color: "148 163 184", size: 8 });

    const metricTop = top - 108;
    const metricHeight = 66;
    const gap = 10;
    const metricWidth = (contentWidth - gap - 36) / 2;
    const metricX = margin + 18;
    const metrics = [
      { label: "Overall Status", helper: program.postureLabel, value: statusLabel(program) },
      { label: "Current Phase", helper: "", value: program.phase }
    ];

    metrics.forEach((metric, index) => {
      const x = metricX + index * (metricWidth + gap);
      this.strokeRect(x, metricTop - metricHeight, metricWidth, metricHeight, "30 41 59");
      this.textLine(metric.label.toUpperCase(), x + 10, metricTop - 17, { color: "148 163 184", font: "bold", size: 7 });
      wrapText(metric.value, 12, metricWidth - 20)
        .slice(0, 2)
        .forEach((line, lineIndex) => this.textLine(line, x + 10, metricTop - 34 - lineIndex * 13, { color: "255 255 255", font: "bold", size: 12 }));
      wrapText(metric.helper, 6, metricWidth - 20)
        .slice(0, 2)
        .forEach((line, lineIndex) => this.textLine(line, x + 10, metricTop - 52 - lineIndex * 8, { color: "186 230 253", size: 6 }));
    });

    this.textLine(`Executive Sponsor: ${program.executiveSponsor}`, margin + 18, top - 188, { color: "203 213 225", size: 9 });
    this.rect(margin + 18, top - 296, contentWidth - 36, 90, "255 255 255");
    this.strokeRect(margin + 18, top - 296, contentWidth - 36, 90, "226 232 240");
    this.textLine("EXECUTIVE SUMMARY", margin + 30, top - 224, { color: "3 105 161", font: "bold", size: 8 });
    wrapMultilineText(program.executiveOverview, 9, contentWidth - 60)
      .slice(0, 5)
      .forEach((line, index) => {
        if (!line) return;
        this.textLine(line, margin + 30, top - 241 - index * 12, { color: "51 65 85", size: 9 });
      });

    this.y -= heroHeight + 18;
  }

  clientRoadmap(program: ClientPortalProgram) {
    this.section(clientRoadmapTitle(program.name));
    const months = buildClientRoadmapMonths(program.clientRoadmapItems);
    const groupedItems = program.clientRoadmapItems.reduce<Record<string, ClientPortalProgram["clientRoadmapItems"]>>((groups, item) => {
      const category = item.category.trim() || "Roadmap";
      groups[category] = [...(groups[category] ?? []), item];
      return groups;
    }, {});

    if (!program.clientRoadmapItems.length) {
      this.paragraph("Publish roadmap rows to show component, workstream, or feature movement over time.", {
        maxLines: 3
      });
      return;
    }

    if (!months.length) {
      this.paragraph("Publish roadmap rows with start and end months to show the roadmap timeline.", {
        maxLines: 3
      });
      return;
    }

    const itemColumnWidth = 150;
    const monthWidth = (contentWidth - itemColumnWidth) / months.length;
    const tableWidth = itemColumnWidth + monthWidth * months.length;

    this.ensureSpace(36);
    const headerTop = this.y;
    this.rect(margin, headerTop - 26, tableWidth, 26, "2 6 23");
    this.textLine("WORK ITEM", margin + 10, headerTop - 17, { color: "203 213 225", font: "bold", size: 7 });
    months.forEach((month, index) => {
      const x = margin + itemColumnWidth + index * monthWidth;
      this.strokeRect(x, headerTop - 26, monthWidth, 26, "30 41 59");
      this.textLine(month.label, x + monthWidth / 2 - 11, headerTop - 17, { color: "255 255 255", font: "bold", size: 8 });
    });
    this.y -= 28;

    for (const [category, items] of Object.entries(groupedItems)) {
      this.ensureSpace(28);
      this.rect(margin, this.y - 20, tableWidth, 20, "239 246 255");
      this.textLine(category.toUpperCase(), margin + 10, this.y - 14, { color: "3 105 161", font: "bold", size: 8 });
      this.y -= 28;

      for (const item of items.slice(0, 12)) {
        const noteLines = wrapText(item.note, 8, itemColumnWidth - 22).slice(0, 2);
        const titleLines = wrapText(item.title, 9, itemColumnWidth - 22).slice(0, 2);
        const rowHeight = 72 + Math.max(0, noteLines.length - 1) * 10 + Math.max(0, titleLines.length - 1) * 10;
        const range = clientRoadmapRange(item, months);
        this.ensureSpace(rowHeight + 8);
        const rowTop = this.y;
        this.strokeRect(margin, rowTop - rowHeight, tableWidth, rowHeight, "226 232 240");
        months.forEach((_, index) => {
          const x = margin + itemColumnWidth + index * monthWidth;
          this.strokeRect(x, rowTop - rowHeight, monthWidth, rowHeight, "226 232 240");
        });
        titleLines.forEach((line, index) => this.textLine(line, margin + 10, rowTop - 17 - index * 10, { font: "bold", size: 9 }));
        this.textLine(item.owner ? `Owner: ${item.owner}` : "Owner not set", margin + 10, rowTop - 40, { color: "100 116 139", size: 7 });
        noteLines.forEach((line, index) => this.textLine(line, margin + 10, rowTop - 54 - index * 10, { color: "71 85 105", size: 8 }));

        const barX = margin + itemColumnWidth + range.start * monthWidth + 4;
        const barWidth = Math.max(34, (range.end - range.start + 1) * monthWidth - 8);
        const barY = rowTop - Math.min(48, Math.max(34, rowHeight * 0.58));
        this.rect(barX, barY, barWidth, 18, roadmapStatusColors[item.status]);
        this.textLine(roadmapStatusLabels[item.status].toUpperCase(), barX + Math.max(8, barWidth / 2 - 24), barY + 6, {
          color: "255 255 255",
          font: "bold",
          size: 7
        });
        this.y -= rowHeight + 14;
      }
    }
    this.y -= 4;
  }

  functionUpdates(title: string, program: ClientPortalProgram, mode: "accomplishments" | "upcoming") {
    this.section(title);
    const rows = functionRows(program, mode);

    if (!rows.length) {
      this.paragraph(`No client-facing ${mode === "accomplishments" ? "accomplishments" : "upcoming work"} have been published yet.`, {
        maxLines: 2
      });
      return;
    }

    for (const row of rows.slice(0, 8)) {
      const renderList = shouldRenderClientPortalList(row.text);
      const textGroups = (renderList ? splitClientPortalListText(row.text) : [row.text])
        .slice(0, 5)
        .map((item) => wrapText(item, 9, contentWidth - (renderList ? 42 : 28)).slice(0, 2));
      const textLineCount = textGroups.reduce((count, lines) => count + Math.max(lines.length, 1), 0);
      const height = 64 + textLineCount * 12 + (renderList ? textGroups.length * 3 : 0);
      this.ensureSpace(height + 8);
      const top = this.y;
      this.strokeRect(margin, top - height, contentWidth, height, "226 232 240");
      this.textLine(row.role.toUpperCase(), margin + 12, top - 18, { color: "3 105 161", font: "bold", size: 8 });
      this.textLine(row.owner || "Owner not set", margin + 12, top - 36, { font: "bold", size: 10 });
      this.textLine(row.statusLabel, margin + 385, top - 18, { color: "51 65 85", font: "bold", size: 8 });
      if (row.attachments > 0) this.textLine(`${row.attachments} attachment${row.attachments === 1 ? "" : "s"}`, margin + 385, top - 34, { color: "16 185 129", size: 8 });
      let textY = top - 58;
      textGroups.forEach((lines) => {
        if (renderList) this.textLine("-", margin + 12, textY, { color: "3 105 161", font: "bold", size: 9 });
        lines.forEach((line, index) => {
          this.textLine(line, margin + (renderList ? 26 : 12), textY - index * 12, { color: "51 65 85", size: 9 });
        });
        textY -= Math.max(lines.length, 1) * 12 + (renderList ? 3 : 0);
      });
      this.y -= height + 14;
    }
  }

  riskDecisionSection(program: ClientPortalProgram) {
    this.section("Risks / Issues / Dependencies");
    this.bulletList(program.risks, "No executive risks, issues, or dependencies are currently captured for this program.");

    this.section("Leadership Decisions Needed");
    this.bulletList(program.decisions, "No executive decision is currently pending from saved program updates or client requests.");
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
    report.programHero(program, generatedLabel);
    report.clientRoadmap(program);
    report.functionUpdates("Recent Accomplishments", program, "accomplishments");
    report.functionUpdates("Upcoming Work (Next 2 Weeks)", program, "upcoming");
    report.riskDecisionSection(program);
  } else {
    report.heading("North Star Client Portal", "Portfolio Dashboard", `${input.clientName} - ${generatedLabel}`);
    report.section("Program View");
    input.programs.forEach((program) => report.programCard(program));

    for (const program of input.programs.slice(0, 4)) {
      report.programHero(program, generatedLabel);
      report.clientRoadmap(program);
      report.functionUpdates("Recent Accomplishments", program, "accomplishments");
      report.functionUpdates("Upcoming Work (Next 2 Weeks)", program, "upcoming");
      report.riskDecisionSection(program);
    }
  }

  return report.toBuffer();
}

export function clientPortalPdfFilename(input: { clientName: string; programName?: string; scope: "portfolio" | "program" }) {
  const base = input.scope === "program" && input.programName ? input.programName : `${input.clientName} Portfolio`;
  return `${sanitizePdfText(base).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "north-star-report"}.pdf`;
}
