import { NextResponse, type NextRequest } from "next/server";
import { buildCanonicalRedirectUrl } from "@/lib/public-origin";
import { getSiteAccessConfig, isSiteAccessSessionTokenValid, siteAccessSessionCookieName } from "@/lib/site-access";

function isPublicPath(pathname: string) {
  if (
    pathname.startsWith("/api/") ||
    pathname === "/login" ||
    pathname === "/client" ||
    pathname === "/auth/activate" ||
    pathname === "/auth/callback" ||
    pathname === "/auth/reset-password" ||
    pathname === "/auth/setup" ||
    pathname === "/leadership/login" ||
    pathname.startsWith("/api/auth/site-access/login") ||
    pathname.startsWith("/api/auth/user/") ||
    pathname.startsWith("/api/security/supabase-rls-check") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return true;
  }

  return /\.(.*)$/.test(pathname);
}

function isCanonicalRedirectEnabled() {
  if (process.env.NORTHSTAR_CANONICAL_REDIRECT_ENABLED === "false") return false;
  if (process.env.NODE_ENV === "development") return false;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;
  return true;
}

export function middleware(request: NextRequest) {
  if (isCanonicalRedirectEnabled()) {
    const canonicalUrl = buildCanonicalRedirectUrl(request.url);
    if (canonicalUrl) {
      return NextResponse.redirect(canonicalUrl, 308);
    }
  }

  const { enabled } = getSiteAccessConfig();
  if (!enabled || isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(siteAccessSessionCookieName)?.value;
  if (isSiteAccessSessionTokenValid(sessionToken)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (redirectTarget && redirectTarget !== "/login") {
    loginUrl.searchParams.set("redirect", redirectTarget);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico).*)"]
};
