import { redirect } from "next/navigation";
import { ClientPortalConsole } from "@/components/client-portal-console";
import { buildClientPortalPortfolio, type ClientPortalProgramInput } from "@/lib/client-portal";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import {
  getLatestGuidedPlan,
  listLeadershipFeedback,
  listPrograms,
  listProgramUpdates
} from "@/lib/program-store";
import { hasSiteAccessPageSession } from "@/lib/site-access";

function assignedProgramIds(assignments: Array<{ programId: string }>) {
  return new Set(assignments.map((assignment) => assignment.programId));
}

export default async function ClientPortalPage() {
  const [currentUser, hasInternalSession] = await Promise.all([
    getCurrentManagedUser(),
    hasSiteAccessPageSession()
  ]);

  if (!currentUser && !hasInternalSession) {
    redirect("/login?redirect=/client");
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
      const [updates, latestPlan, leadershipFeedback] = await Promise.all([
        listProgramUpdates(program.id),
        getLatestGuidedPlan(program.id),
        listLeadershipFeedback(program.id)
      ]);
      return {
        assignedRoles: currentUser?.assignments
          .filter((assignment) => assignment.programId === program.id)
          .map((assignment) => assignment.role),
        latestLeadership: leadershipFeedback[0] ?? null,
        latestPlan,
        latestUpdate: updates[0] ?? null,
        program
      };
    })
  );

  const portfolio = buildClientPortalPortfolio({ programs: programInputs });
  const viewerLabel = currentUser
    ? `${currentUser.name} · ${currentUser.userType === "client" ? "Client access" : "Internal preview"}`
    : "Alpha preview";

  return (
    <ClientPortalConsole
      canReturnToInternal={currentUser?.userType !== "client" && hasInternalSession}
      portfolio={portfolio}
      viewerLabel={viewerLabel}
    />
  );
}
