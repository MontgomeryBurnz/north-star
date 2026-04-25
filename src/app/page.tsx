import { ActiveSystemsSection } from "@/components/active-systems-section";
import { AssistantPreview } from "@/components/assistant-preview";
import { CommandCenterGrid } from "@/components/command-center-grid";
import { HeroSection } from "@/components/hero-section";
import { OperatorSignalStrip, type OperatorSignal } from "@/components/operator-signal-strip";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";
import { requireSiteAccessPage } from "@/lib/site-access";

export default async function Home() {
  await requireSiteAccessPage("/");
  const metrics = await getDashboardMetrics();
  const operatorSignals: OperatorSignal[] = [
    {
      id: "active-programs",
      label: "Active Programs",
      value: metrics.activePrograms,
      href: "/active-program",
      detail: "currently in motion"
    },
    {
      id: "guided-plans",
      label: "Guided Plans",
      value: metrics.guidedPlans,
      href: "/systems",
      detail: "current guidance paths"
    },
    {
      id: "risks",
      label: "Risks",
      value: metrics.riskCount,
      href: "/systems",
      detail: metrics.callouts.find((callout) => callout.type === "risk")
        ? `${metrics.callouts.find((callout) => callout.type === "risk")?.programName}: risk`
        : "guided-plan and update risks"
    },
    {
      id: "decisions",
      label: "Decisions Needed",
      value: metrics.decisionCount,
      href: "/systems",
      detail: metrics.callouts.find((callout) => callout.type === "decision")
        ? `${metrics.callouts.find((callout) => callout.type === "decision")?.programName}: decision`
        : "pending approvals and choices"
    }
  ];

  return (
    <main>
      <HeroSection metrics={metrics} />
      <OperatorSignalStrip signals={operatorSignals} />
      <CommandCenterGrid metrics={metrics} />
      <ActiveSystemsSection />
      <AssistantPreview />
    </main>
  );
}
