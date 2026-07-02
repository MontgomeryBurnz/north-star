export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auditActorFromManagedUser } from "@/lib/audit-event-service";
import { buildClientPortalPdf, clientPortalPdfFilename } from "@/lib/client-portal-pdf";
import { loadClientPortalData } from "@/lib/client-portal-data";
import { createAuditEvent } from "@/lib/program-store";
import { after } from "next/server";

type ExportScope = "portfolio" | "program";

async function recordPdfExportAudit(input: {
  clientName: string;
  currentUser: Awaited<ReturnType<typeof loadClientPortalData>>["currentUser"];
  programId?: string;
  programName?: string;
  scope: ExportScope;
}) {
  try {
    await createAuditEvent({
      actor: auditActorFromManagedUser(input.currentUser),
      entityId: input.programId ?? input.clientName,
      entityLabel: input.programName ?? input.clientName,
      entityType: input.scope === "program" ? "client-program-report" : "client-portfolio-report",
      eventType: "client.portal.export",
      metadata: {
        clientName: input.clientName,
        exportFormat: "pdf",
        scope: input.scope
      },
      programId: input.programId,
      programName: input.programName,
      summary: input.scope === "program"
        ? `${input.programName ?? "Program"} client PDF report downloaded.`
        : `${input.clientName} portfolio PDF report downloaded.`,
      surface: "Client Portal"
    });
  } catch (error) {
    console.error("Client Portal PDF export audit failed", {
      error: error instanceof Error ? error.message : String(error),
      programId: input.programId,
      scope: input.scope
    });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope: ExportScope = url.searchParams.get("scope") === "program" ? "program" : "portfolio";
  const requestedProgramId = url.searchParams.get("programId") ?? "";
  const requestedClientName = url.searchParams.get("client")?.trim() ?? "";
  const { currentUser, portfolio, viewerLabel } = await loadClientPortalData("/client");

  const requestedProgram = requestedProgramId
    ? portfolio.programs.find((program) => program.id === requestedProgramId)
    : null;
  const clientName = requestedClientName || requestedProgram?.clientName || portfolio.clients[0]?.clientName || "Client Portfolio";
  const clientPrograms = portfolio.programs.filter((program) => program.clientName === clientName);
  const programs = clientPrograms.length ? clientPrograms : portfolio.programs;
  const selectedProgram = scope === "program" ? requestedProgram ?? programs[0] ?? null : null;
  const reportClientName = selectedProgram?.clientName ?? clientName;

  const pdf = buildClientPortalPdf({
    clientName: reportClientName,
    generatedAt: portfolio.generatedAt,
    portfolio,
    programs,
    scope,
    selectedProgram,
    viewerLabel
  });
  const filename = clientPortalPdfFilename({
    clientName: reportClientName,
    programName: selectedProgram?.name,
    scope
  });

  after(() => {
    void recordPdfExportAudit({
      clientName: reportClientName,
      currentUser,
      programId: selectedProgram?.id,
      programName: selectedProgram?.name,
      scope
    });
  });

  return new Response(pdf, {
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(pdf.byteLength),
      "content-type": "application/pdf"
    }
  });
}
