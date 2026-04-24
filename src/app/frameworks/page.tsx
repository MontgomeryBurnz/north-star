import { frameworks } from "@/data";
import { FrameworkCard } from "@/components/framework-card";
import { SectionHeader } from "@/components/section-header";

export default function FrameworksPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Work path models"
        title="Best-fit path library"
        description="Reusable models for turning ambiguity, risk, stakeholder tension, and delivery pressure into a clear work path."
      />
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {frameworks.map((framework) => (
          <FrameworkCard key={framework.id} framework={framework} />
        ))}
      </div>
    </main>
  );
}
