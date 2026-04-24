import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const leadershipSessionCookieName = "leadership_session";

export type LeadershipAuthProvider = "env" | "supabase";

export type LeadershipAccessContext =
  | { provider: "env"; authorized: true; identity: { type: "env-session" } }
  | { provider: "supabase"; authorized: true; identity: { type: "supabase-user"; user: User } }
  | { provider: LeadershipAuthProvider; authorized: false; reason: string };

function splitCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function getLeadershipAuthConfig() {
  return {
    provider: getConfiguredLeadershipAuthProvider(),
    username: process.env.LEADERSHIP_AUTH_USERNAME ?? "",
    password: process.env.LEADERSHIP_AUTH_PASSWORD ?? "",
    sessionToken: process.env.LEADERSHIP_AUTH_SESSION_TOKEN ?? "",
    allowAnyAuthenticatedUser: process.env.SUPABASE_LEADERSHIP_ALLOW_ANY_AUTHENTICATED_USER === "true",
    allowedEmails: splitCsv(process.env.LEADERSHIP_ALLOWED_EMAILS),
    allowedDomains: splitCsv(process.env.LEADERSHIP_ALLOWED_DOMAINS),
    allowedRoles: splitCsv(process.env.LEADERSHIP_ALLOWED_ROLES)
  };
}

export function getConfiguredLeadershipAuthProvider(): LeadershipAuthProvider {
  const configured = process.env.LEADERSHIP_AUTH_PROVIDER;
  if (configured === "supabase" && isSupabaseConfigured()) return "supabase";
  return "env";
}

export function isLeadershipSessionTokenValid(token: string | undefined | null) {
  const { sessionToken } = getLeadershipAuthConfig();
  return Boolean(token && sessionToken && token === sessionToken);
}

export function isLeadershipCredentialsValid(username: string, password: string) {
  const config = getLeadershipAuthConfig();
  return Boolean(
    config.provider === "env" &&
      config.username &&
      config.password &&
      config.sessionToken &&
      username === config.username &&
      password === config.password
  );
}

function getUserRoles(user: User) {
  const roleValues = [
    user.app_metadata?.role,
    ...(Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : []),
    user.user_metadata?.role,
    ...(Array.isArray(user.user_metadata?.roles) ? user.user_metadata.roles : [])
  ];

  return roleValues
    .map((role) => String(role).trim().toLowerCase())
    .filter(Boolean);
}

function userHasLeadershipAccess(user: User) {
  const config = getLeadershipAuthConfig();
  const email = (user.email ?? "").toLowerCase();
  const domain = email.includes("@") ? email.split("@")[1] : "";
  const roles = getUserRoles(user);

  if (config.allowAnyAuthenticatedUser) return true;
  if (config.allowedEmails.includes(email)) return true;
  if (domain && config.allowedDomains.includes(domain)) return true;
  if (roles.some((role) => config.allowedRoles.includes(role))) return true;
  return false;
}

export async function getLeadershipAccessContext(): Promise<LeadershipAccessContext> {
  const provider = getConfiguredLeadershipAuthProvider();

  if (provider === "env") {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(leadershipSessionCookieName)?.value;

    if (!isLeadershipSessionTokenValid(sessionToken)) {
      return { provider: "env", authorized: false, reason: "No valid leadership session." };
    }

    return {
      provider: "env",
      authorized: true,
      identity: { type: "env-session" }
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { provider: "supabase", authorized: false, reason: "No active Supabase session." };
  }

  if (!userHasLeadershipAccess(user)) {
    return { provider: "supabase", authorized: false, reason: "Signed-in user is not allowed to view leadership data." };
  }

  return {
    provider: "supabase",
    authorized: true,
    identity: {
      type: "supabase-user",
      user
    }
  };
}
