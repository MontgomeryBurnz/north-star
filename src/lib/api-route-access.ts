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

async function requireProtectedRouteAccess(resolveAccess: AccessResolver) {
  const access = await resolveAccess();
  if (!access.authorized) {
    return { access: null, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  return { access: access as AuthorizedAccess, response: null };
}

export function requireSiteAccessRequest(request: Request) {
  return isSiteAccessRequestAuthorized(request) ? null : createSiteAccessDeniedResponse();
}

export async function requireAdminRouteAccess(_request: Request) {
  return requireProtectedRouteAccess(getAdminAccessContext);
}

export async function requireLeadershipRouteAccess(_request: Request) {
  return requireProtectedRouteAccess(getLeadershipAccessContext);
}

export async function requireProgramRouteAccess(
  request: Request,
  programId: string,
  options: ProgramRouteAccessOptions = {}
): Promise<{ currentUser: ManagedAppUser | null; response: NextResponse | null }> {
  const scope = options.scope ?? "internal";
  const currentUser = await getCurrentManagedUser();

  if (currentUser) {
    if (isClientDashboardOnlyUserType(currentUser.userType) && scope !== "client-dashboard") {
      return {
        currentUser,
        response: NextResponse.json({ error: "Program access denied." }, { status: 403 })
      };
    }

    const canAccess =
      scope === "client-dashboard"
        ? canAccessClientDashboardScope(currentUser, programId)
        : canAccessProgramScope(currentUser, programId);

    return canAccess
      ? { currentUser: options.loadCurrentUser ? currentUser : null, response: null }
      : {
          currentUser,
          response: NextResponse.json({ error: "Program access denied." }, { status: 403 })
        };
  }

  if (isSiteAccessRequestAuthorized(request)) {
    return { currentUser: null, response: null };
  }

  return {
    currentUser: null,
    response: createSiteAccessDeniedResponse()
  };
}
