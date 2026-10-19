import { NextResponse } from "next/server";
import { requireSiteAccessRequest } from "@/lib/api-route-access";
import { getConfiguredArtifactStorageProvider } from "@/lib/artifact-storage";
import { getConfiguredGuidedPlanProvider } from "@/lib/guided-plan-service";
import { getConfiguredLeadershipAuthProvider } from "@/lib/leadership-auth";
import { getConfiguredPersistenceProvider } from "@/lib/program-repository";
import { deploymentCommitSha } from "@/lib/deployment-identity";
import { getSiteAccessConfig } from "@/lib/site-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const denied = requireSiteAccessRequest(request);
  if (denied) return denied;

  const siteAccess = getSiteAccessConfig();
  return NextResponse.json({
    ok: true,
    environment: process.env.NODE_ENV,
    deploymentCommit: deploymentCommitSha(process.env.VERCEL_GIT_COMMIT_SHA),
    persistenceProvider: getConfiguredPersistenceProvider(),
    artifactStorageProvider: getConfiguredArtifactStorageProvider(),
    chatGuideEnabled: false,
    guidedPlanProvider: getConfiguredGuidedPlanProvider(),
    siteAccessEnabled: siteAccess.enabled,
    leadershipAuthProvider: getConfiguredLeadershipAuthProvider(),
    leadershipAuthConfigured: Boolean(
      process.env.LEADERSHIP_AUTH_USERNAME &&
        process.env.LEADERSHIP_AUTH_PASSWORD &&
        process.env.LEADERSHIP_AUTH_SESSION_TOKEN
    ),
    supabaseConfigured: isSupabaseConfigured()
  }, { headers: { "cache-control": "no-store" } });
}
