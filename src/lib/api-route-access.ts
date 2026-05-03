import { NextResponse } from "next/server";
import type { LeadershipAccessContext } from "@/lib/leadership-auth";
import { getAdminAccessContext, getLeadershipAccessContext } from "@/lib/leadership-auth";
import { createSiteAccessDeniedResponse, isSiteAccessRequestAuthorized } from "@/lib/site-access";

type AuthorizedAccess = Extract<LeadershipAccessContext, { authorized: true }>;
type AccessResolver = () => Promise<LeadershipAccessContext>;

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
