import { NextResponse } from "next/server";
import {
  canAccessClientDashboardScope,
  canAccessProgramScope,
  isClientDashboardOnlyUserType,
  type ManagedAppUser
} from "@/lib/admin-user-types";
import { getCurrentManagedUser } from "@/lib/current-managed-user";
import type { LeadershipAccessContext } from "@/lib/leadership-auth";
import { getAdminAccessContext, getLeadershipAccessContext } from "@/lib/leadership-auth";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

type AuthorizedAccess = Extract<LeadershipAccessContext, { authorized: true }>;
type AccessResolver = () => Promise<LeadershipAccessContext>;
type ProgramRouteAccessOptions = {
  loadCurrentUser?: boolean;
  scope?: "internal" | "client-dashboard";
};

async function requireProtectedRouteAccess(request: Request, resolveAccess: AccessResolver) {
  if (!isSiteAccessRequestAuthorized(request)) {
    return { access: null, response: createSiteAccessDeniedResponse() };
  }

  const access = await resolveAccess();
  if (!access.authorized) {
    return { access: null, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  return { access: access as AuthorizedAccess, response: null };
}

export function requireSiteAccessRequest(request: Request) {
  return isSiteAccessRequestAuthorized(request) ? null : createSiteAccessDeniedResponse();
}

export async function requireAdminRouteAccess(request: Request) {
  return requireProtectedRouteAccess(request, getAdminAccessContext);
}

export async function requireLeadershipRouteAccess(request: Request) {
  return requireProtectedRouteAccess(request, getLeadershipAccessContext);
}

export async function requireProgramRouteAccess(
  request: Request,
  programId: string,
  options: ProgramRouteAccessOptions = {}
): Promise<{ currentUser: ManagedAppUser | null; response: NextResponse | null }> {
  const scope = options.scope ?? "internal";

  if (isSiteAccessRequestAuthorized(request)) {
    const authenticatedUser = await getCurrentManagedUser();
    if (authenticatedUser && isClientDashboardOnlyUserType(authenticatedUser.userType) && scope !== "client-dashboard") {
      return {
        currentUser: authenticatedUser,
        response: NextResponse.json({ error: "Program access denied." }, { status: 403 })
      };
    }
    return { currentUser: options.loadCurrentUser ? authenticatedUser : null, response: null };
  }

  const currentUser = await getCurrentManagedUser();
  const canAccess =
    scope === "client-dashboard"
      ? canAccessClientDashboardScope(currentUser, programId)
      : canAccessProgramScope(currentUser, programId);

  if (canAccess) {
    return { currentUser, response: null };
  }

  return {
    currentUser,
    response: currentUser
      ? NextResponse.json({ error: "Program access denied." }, { status: 403 })
      : createSiteAccessDeniedResponse()
  };
}
