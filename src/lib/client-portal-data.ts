import "server-only";
import { redirect } from "next/navigation";
import { hasSiteAccessPageSession } from "@/lib/app-page-access";
import { getAssignedProgramIdSet, isExternalOnlyUserType, shouldScopeManagedUserPrograms } from "@/lib/admin-user-types";
import { buildClientPortalPortfolio, type ClientPortalProgramInput } from "@/lib/client-portal";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import { listClientDecisionRequests, listClientPortalUpdates, listPrograms } from "@/lib/program-store";

export async function loadClientPortalData(redirectTo = "/client") {
  const [currentUser, hasInternalSession] = await Promise.all([
    getCurrentManagedUser(),
    hasSiteAccessPageSession()
  ]);

  if (!currentUser && !hasInternalSession) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const allPrograms = await listPrograms();
  const visibleProgramIds = currentUser && shouldScopeManagedUserPrograms(currentUser)
    ? getAssignedProgramIdSet(currentUser)
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
    ? `${currentUser.name} · ${
        currentUser.userType === "client"
          ? "Client access"
          : currentUser.userType === "client-dashboard-contributor"
            ? "Client dashboard input"
            : "Internal preview"
      }`
    : "Portfolio preview";

  return {
    canReturnToInternal: currentUser ? !isExternalOnlyUserType(currentUser.userType) && hasInternalSession : hasInternalSession,
    currentUser,
    hasInternalSession,
    portfolio,
    viewerLabel
  };
}
