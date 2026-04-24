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
