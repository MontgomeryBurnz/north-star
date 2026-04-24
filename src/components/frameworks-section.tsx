import { frameworks } from "@/data";
import { FrameworkCard } from "@/components/framework-card";
import { SectionHeader } from "@/components/section-header";

export function FrameworksSection() {
  return (
    <section id="frameworks" className="border-y border-white/10 bg-white/[0.025]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Decision frameworks"
          title="Reusable strategic models built as tools."
          description="Each framework defines the problem, applies a model, and produces a decision artifact."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {frameworks.map((framework) => (
            <FrameworkCard key={framework.id} framework={framework} />
          ))}
        </div>
      </div>
    </section>
  );
}
