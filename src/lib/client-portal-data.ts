import "server-only";
import { redirect } from "next/navigation";
import { hasSiteAccessPageSession } from "@/lib/app-page-access";
import { buildClientPortalPortfolio, type ClientPortalProgramInput } from "@/lib/client-portal";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { listClientDecisionRequests, listClientPortalUpdates, listPrograms } from "@/lib/program-store";

function assignedProgramIds(assignments: Array<{ programId: string }>) {
  return new Set(assignments.map((assignment) => assignment.programId));
}

export async function loadClientPortalData(redirectTo = "/client") {
  const [currentUser, hasInternalSession] = await Promise.all([
    getCurrentManagedUser(),
    hasSiteAccessPageSession()
  ]);

  if (!currentUser && !hasInternalSession) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const allPrograms = await listPrograms();
  const visibleProgramIds = currentUser?.userType === "client"
    ? assignedProgramIds(currentUser.assignments)
    : null;
  const programs = visibleProgramIds
    ? allPrograms.filter((program) => visibleProgramIds.has(program.id))
    : allPrograms;

  const programInputs = await Promise.all<ClientPortalProgramInput>(
    programs.map(async (program) => {
      const [clientUpdates, clientDecisions] = await Promise.all([
        listClientPortalUpdates(program.id),
        listClientDecisionRequests(program.id)
      ]);

      return {
        assignedRoles: currentUser?.assignments
          .filter((assignment) => assignment.programId === program.id)
          .map((assignment) => assignment.role),
        clientDecisions,
        latestClientUpdate: clientUpdates[0] ?? null,
        program
      };
    })
  );

  const portfolio = buildClientPortalPortfolio({ programs: programInputs });
  const viewerLabel = currentUser
    ? `${currentUser.name} · ${currentUser.userType === "client" ? "Client access" : "Internal preview"}`
    : "Portfolio preview";

  return {
    canReturnToInternal: currentUser?.userType !== "client" && hasInternalSession,
    currentUser,
    hasInternalSession,
    portfolio,
    viewerLabel
  };
}
