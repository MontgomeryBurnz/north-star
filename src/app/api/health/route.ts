import { NextResponse } from "next/server";
import { getConfiguredArtifactStorageProvider } from "@/lib/artifact-storage";
import { getConfiguredLeadershipAuthProvider } from "@/lib/leadership-auth";
import { getConfiguredPersistenceProvider } from "@/lib/program-repository";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    environment: process.env.NODE_ENV,
    persistenceProvider: getConfiguredPersistenceProvider(),
    artifactStorageProvider: getConfiguredArtifactStorageProvider(),
    assistantProvider: process.env.ASSISTANT_PROVIDER === "openai" ? "openai" : "local",
    leadershipAuthProvider: getConfiguredLeadershipAuthProvider(),
    leadershipAuthConfigured: Boolean(
      process.env.LEADERSHIP_AUTH_USERNAME &&
        process.env.LEADERSHIP_AUTH_PASSWORD &&
        process.env.LEADERSHIP_AUTH_SESSION_TOKEN
    ),
    supabaseConfigured: isSupabaseConfigured()
  });
}
