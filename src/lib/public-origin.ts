function normalizeOrigin(value: string | undefined | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string | null) {
  if (!origin) return true;

  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return true;
  }
}

export function getPublicAppOrigin(request?: Request | string) {
  const explicitOrigin =
    normalizeOrigin(process.env.NORTHSTAR_APP_URL) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_NORTHSTAR_APP_URL) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);

  if (explicitOrigin) return explicitOrigin;

  if (request instanceof Request) {
    const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    const forwardedOrigin = forwardedHost ? normalizeOrigin(`${forwardedProto}://${forwardedHost}`) : null;

    if (forwardedOrigin && !isLocalOrigin(forwardedOrigin)) {
      return forwardedOrigin;
    }
  }

  const requestOrigin = typeof request === "string"
    ? normalizeOrigin(new URL(request).origin)
    : request
      ? normalizeOrigin(request.url)
      : null;

  if (requestOrigin && !isLocalOrigin(requestOrigin)) {
    return requestOrigin;
  }

  const vercelOrigin =
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeOrigin(process.env.VERCEL_URL);

  return vercelOrigin ?? requestOrigin ?? "http://localhost:3000";
}

export function buildPublicAppUrl(path: string, request?: Request | string) {
  return new URL(path, getPublicAppOrigin(request));
}
