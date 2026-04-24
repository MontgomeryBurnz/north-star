import { initiatives } from "@/data";
import { MotionDiv } from "@/components/motion";
import { OperatingCard } from "@/components/operating-card";
import { SectionHeader } from "@/components/section-header";

export function ActiveSystemsSection() {
  const featuredInitiatives = initiatives.filter((initiative) => initiative.featured);

  return (
    <section id="systems" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Guided plans"
        title="What the assistant helps shape."
        description="Sample guided plans for turning program context into a work path, planning approach, key outcomes, critical requirements, outputs, and next steps."
      />
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {featuredInitiatives.map((initiative, index) => (
          <MotionDiv
            key={initiative.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: index * 0.08 }}
          >
            <OperatingCard initiative={initiative} />
          </MotionDiv>
        ))}
      </div>
    </section>
  );
}
