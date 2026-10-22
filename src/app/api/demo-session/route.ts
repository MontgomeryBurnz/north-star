import { denyExplorerRequest } from "@/lib/explorer-access";
import { NextResponse } from "next/server";
import { requireInternalWorkspaceRouteAccess } from "@/lib/api-route-access";
import { demoModeCookieName, demoModeValue, demoProgramId, demoStateCookieCount, demoStateCookiePrefix, getDemoRequestOrigin } from "@/lib/demo-mode";

export async function GET(request: Request) {
  const explorerDenied = await denyExplorerRequest(request);
  if (explorerDenied) return explorerDenied;
  const { response: denied } = await requireInternalWorkspaceRouteAccess(request);
  if (denied) return denied;
  const response = NextResponse.redirect(new URL(`/active-program?mode=manage&program=${demoProgramId}`, getDemoRequestOrigin(request)), 303);
  response.cookies.set(demoModeCookieName, demoModeValue, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return response;
}

export async function POST(request: Request) {
  const explorerDenied = await denyExplorerRequest(request);
  if (explorerDenied) return explorerDenied;
  const { response: denied } = await requireInternalWorkspaceRouteAccess(request);
  if (denied) return denied;
  const origin = getDemoRequestOrigin(request);
  if (request.headers.get("origin") && request.headers.get("origin") !== origin) {
    return NextResponse.json({ error: "Use the North Star workspace to change sample data mode." }, { status: 403 });
  }
  const form = await request.formData();
  const action = form.get("action");
  const next = form.get("next");
  const destination = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/api/") && !/[\\\r\n]/.test(next) ? next : `/active-program?mode=manage&program=${demoProgramId}`;
  const response = NextResponse.redirect(new URL(destination, origin), 303);
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  if (action === "exit") {
    response.cookies.set(demoModeCookieName, "", { ...options, maxAge: 0 });
  } else {
    response.cookies.set(demoModeCookieName, demoModeValue, options);
  }
  for (let index = 0; index < demoStateCookieCount; index += 1) {
    response.cookies.set(`${demoStateCookiePrefix}${index}`, "", { ...options, maxAge: 0 });
  }
  return response;
}
