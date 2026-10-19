export const demoModeCookieName = "northstar-demo";
export const demoProgramId = "demo-regional-service-modernization";
export const demoModeValue = "regional-service-modernization";
export const demoStateCookiePrefix = "northstar-demo-state-";
export const demoStateCookieCount = 3;

export function getDemoRequestOrigin(request: Request) {
  const requested = new URL(request.url);
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))?.split(",")[0]?.trim();
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || requested.protocol.replace(":", "");
  if (host && (protocol === "http" || protocol === "https")) {
    try { return new URL(`${protocol}://${host}`).origin; } catch { /* Use the parsed request URL. */ }
  }
  return requested.origin;
}
