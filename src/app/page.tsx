import { CommandCenterGrid } from "@/components/command-center-grid";
import { HeroSection } from "@/components/hero-section";
import { OperatorSignalStrip, type OperatorSignal } from "@/components/operator-signal-strip";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";
import { requireSiteAccessPage } from "@/lib/app-page-access";

export default async function Home() {
  await requireSiteAccessPage("/");
  const metrics = await getDashboardMetrics();
  const operatorSignals: OperatorSignal[] = [
    {
      id: "active-programs",
      label: "Programs",
      value: metrics.activePrograms,
      href: "/active-program",
      detail: "saved in this workspace"
    },
    {
      id: "guided-plans",
      label: "Plans",
      value: metrics.guidedPlans,
      href: "/systems",
      detail: "generated guidance views"
    },
    {
      id: "risks",
      label: "Risks",
      value: metrics.riskCount,
      href: "/systems",
      detail: metrics.callouts.find((callout) => callout.type === "risk")
        ? `${metrics.callouts.find((callout) => callout.type === "risk")?.programName}: risk`
        : "surfaced from guided plans"
    },
    {
      id: "decisions",
      label: "Decisions",
      value: metrics.decisionCount,
      href: "/systems",
      detail: metrics.callouts.find((callout) => callout.type === "decision")
        ? `${metrics.callouts.find((callout) => callout.type === "decision")?.programName}: decision`
        : "choices requiring action"
    },
    {
      id: "leadership-reviews",
      label: "Reviews",
      value: metrics.leadershipReviewsDue,
      href: "/leadership?queue=due",
      detail: metrics.leadershipReviewsDue
        ? metrics.duePrograms.slice(0, 2).map((program) => program.programName).join(" • ")
        : "no leadership reviews due this week"
    }
  ];

  return (
    <main>
      <HeroSection metrics={metrics} />
      <OperatorSignalStrip signals={operatorSignals} />
      <CommandCenterGrid metrics={metrics} />
    </main>
  );
}
