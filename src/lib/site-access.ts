import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export const siteAccessSessionCookieName = "site_access_session";

export function getSiteAccessConfig() {
  const password = process.env.SITE_ACCESS_PASSWORD ?? process.env.LEADERSHIP_AUTH_PASSWORD ?? "";
  const sessionToken = process.env.SITE_ACCESS_SESSION_TOKEN ?? process.env.LEADERSHIP_AUTH_SESSION_TOKEN ?? "";
  const explicitlyEnabled = process.env.SITE_ACCESS_ENABLED;
  const enabled = explicitlyEnabled ? explicitlyEnabled === "true" : process.env.NODE_ENV === "production";

  return {
    enabled: enabled && Boolean(password && sessionToken),
    password,
    sessionToken
  };
}

export function isSiteAccessSessionTokenValid(token: string | undefined | null) {
  const { sessionToken } = getSiteAccessConfig();
  return Boolean(token && sessionToken && token === sessionToken);
}

export function isSiteAccessPasswordValid(password: string) {
  const config = getSiteAccessConfig();
  return Boolean(config.enabled && config.password && password === config.password);
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function requireSiteAccessPage(redirectTo: string) {
  const config = getSiteAccessConfig();
  if (!config.enabled) return;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(siteAccessSessionCookieName)?.value;
  if (isSiteAccessSessionTokenValid(sessionToken)) return;

  redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
}

export async function hasSiteAccessPageSession() {
  const config = getSiteAccessConfig();
  if (!config.enabled) return true;

  const cookieStore = await cookies();
  return isSiteAccessSessionTokenValid(cookieStore.get(siteAccessSessionCookieName)?.value);
}

export function isSiteAccessRequestAuthorized(request: Request) {
  const config = getSiteAccessConfig();
  if (!config.enabled) return true;

  const sessionToken = getCookieValue(request.headers.get("cookie"), siteAccessSessionCookieName);
  return isSiteAccessSessionTokenValid(sessionToken);
}

export function createSiteAccessDeniedResponse() {
  return NextResponse.json({ error: "Site access required." }, { status: 401 });
}

export function attachSiteAccessCookie(response: NextResponse) {
  const config = getSiteAccessConfig();
  if (!config.enabled) return response;

  response.cookies.set({
    name: siteAccessSessionCookieName,
    value: config.sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return response;
}
