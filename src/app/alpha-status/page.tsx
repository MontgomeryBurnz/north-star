import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConfiguredArtifactStorageProvider } from "@/lib/artifact-storage";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";
import { getConfiguredGuidedPlanProvider } from "@/lib/guided-plan-service";
import { getConfiguredLeadershipAuthProvider } from "@/lib/leadership-auth";
import { getConfiguredPersistenceProvider } from "@/lib/program-repository";
import { getSiteAccessConfig, requireSiteAccessPage } from "@/lib/site-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function statusTone(value: boolean) {
  return value
    ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
    : "border-amber-300/25 bg-amber-300/10 text-amber-100";
}

export default async function AlphaStatusPage() {
  await requireSiteAccessPage("/alpha-status");
  const metrics = await getDashboardMetrics();
  const assistantProvider = process.env.ASSISTANT_PROVIDER === "openai" ? "openai" : "local";
  const guidedPlanProvider = getConfiguredGuidedPlanProvider();
  const persistenceProvider = getConfiguredPersistenceProvider();
  const artifactStorageProvider = getConfiguredArtifactStorageProvider();
  const leadershipAuthProvider = getConfiguredLeadershipAuthProvider();
  const siteAccess = getSiteAccessConfig();
  const leadershipAuthConfigured = Boolean(
    process.env.LEADERSHIP_AUTH_USERNAME &&
      process.env.LEADERSHIP_AUTH_PASSWORD &&
      process.env.LEADERSHIP_AUTH_SESSION_TOKEN
  );
  const supabaseConfigured = isSupabaseConfigured();
  const deploymentChecks = [
    {
      label: "Alpha access gate",
      ok: siteAccess.enabled,
      detail: siteAccess.enabled ? "Shared password gate is active in front of the app." : "The public URL is not gated yet."
    },
    {
      label: "Postgres persistence",
      ok: persistenceProvider === "postgres",
      detail: persistenceProvider === "postgres" ? "Shared persistence is active." : "Still using local file persistence."
    },
    {
      label: "Artifact storage",
      ok: artifactStorageProvider === "supabase",
      detail:
        artifactStorageProvider === "supabase" ? "Artifacts store in Supabase." : "Artifacts are not on shared object storage yet."
    },
    {
      label: "Guide provider",
      ok: assistantProvider === "openai",
      detail: assistantProvider === "openai" ? "Server-side OpenAI is enabled." : "Guide is still using the local fallback."
    },
    {
      label: "Guided plan provider",
      ok: guidedPlanProvider === "openai",
      detail:
        guidedPlanProvider === "openai"
          ? "Guided plans are generated through the OpenAI provider with local fallback."
          : "Guided plans are still using the local deterministic generator."
    },
    {
      label: "Leadership gate",
      ok: leadershipAuthConfigured,
      detail: leadershipAuthConfigured ? `Leadership auth is configured via ${leadershipAuthProvider}.` : "Leadership auth is not configured."
    },
    {
      label: "Supabase config",
      ok: supabaseConfigured,
      detail: supabaseConfigured ? "Supabase env is present." : "Supabase env is incomplete."
    }
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Alpha status"
        title="Deployment posture and readiness."
        description="Use this page to verify the app is configured for internal alpha testing before you hand it to users."
      />

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-zinc-50">Environment posture</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {deploymentChecks.map((check) => (
                <div key={check.label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-100">{check.label}</p>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${statusTone(check.ok)}`}>
                      {check.ok ? "ready" : "attention"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">{check.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-zinc-50">Live counts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-4">
              {[
                ["Active programs", metrics.activePrograms],
                ["Guided plans", metrics.guidedPlans],
                ["Risks", metrics.riskCount],
                ["Decisions needed", metrics.decisionCount],
                ["Reviews due", metrics.leadershipReviewsDue]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-2xl font-semibold text-zinc-50">{String(value).padStart(2, "0")}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-zinc-50">Alpha test sequence</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {[
                "Create a new program and save it.",
                "Upload a real artifact and confirm extraction.",
                "Generate the guided plan.",
                "Update the program in Active Program.",
                "Enter leadership feedback.",
                "Regenerate the plan and confirm leadership signal appears.",
                "Ask Guide a grounded program question."
              ].map((step) => (
                <div key={step} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-zinc-300">
                  {step}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950/80">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-zinc-50">Remaining operator checks</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-5">
              {[
                "Run the alpha test sequence against the deployed app.",
                "Decide whether to keep prototype leadership credentials or replace them before sharing wider.",
                "Rotate any secrets that were pasted into chat before broader internal use.",
                "Move leadership auth to SSO when the prototype is approved."
              ].map((item) => (
                <div key={item} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-zinc-300">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
