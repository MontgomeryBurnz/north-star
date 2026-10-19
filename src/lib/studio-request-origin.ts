/** Validate the browser-facing Host, not Next's internal loopback hostname. */
export function isStudioRequestSameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser authenticated clients still require identity.
  try {
    const incoming = new URL(origin);
    const target = new URL(request.url);
    const host = request.headers.get("host") || target.host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto");
    const protocol = forwardedProtocol === "https" || forwardedProtocol === "http" ? `${forwardedProtocol}:` : target.protocol;
    return incoming.origin === origin && incoming.host === host && incoming.protocol === protocol;
  } catch { return false; }
}
