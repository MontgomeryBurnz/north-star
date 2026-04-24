import { ActiveSystemsSection } from "@/components/active-systems-section";
import { AssistantPreview } from "@/components/assistant-preview";
import { CommandCenterGrid } from "@/components/command-center-grid";
import { HeroSection } from "@/components/hero-section";
import { OperatorSignalStrip, type OperatorSignal } from "@/components/operator-signal-strip";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";

export default async function Home() {
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
      id: "actionable-callouts",
      label: "Actionable Callouts",
      value: metrics.actionableCallouts,
      href: "/systems",
      detail: metrics.callouts[0]
        ? `${metrics.callouts[0].programName}: ${metrics.callouts[0].type}`
        : "risks, timing, blockers"
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
