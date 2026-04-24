import { notFound } from "next/navigation";
import { frameworks } from "@/data";
import { getFrameworkById, getRelatedInitiatives } from "@/lib/content";
import { RelatedContent } from "@/components/related-content";
import { SectionHeader } from "@/components/section-header";

export function generateStaticParams() {
  return frameworks.map((framework) => ({ id: framework.id }));
}

export default async function FrameworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const framework = getFrameworkById(id);
  if (!framework) notFound();

  const relatedInitiatives = getRelatedInitiatives(framework.relatedInitiativeIds).map((initiative) => ({
    id: initiative.id,
    title: initiative.title,
    href: `/systems/${initiative.id}`,
    label: "System"
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader eyebrow="Strategic model" title={framework.name} description={framework.coreIdea} />
      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        {[
          ["Problem solved", framework.problemSolved],
          ["Where it applies", framework.whereItApplies],
          ["Output", framework.output]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-cyan-300/15 bg-zinc-950/70 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">{label}</p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{value}</p>
          </div>
        ))}
      </section>
      <section className="mt-12">
        <SectionHeader eyebrow="Related systems" title="Where this model is applied." />
        <div className="mt-6">
          <RelatedContent items={relatedInitiatives} />
        </div>
      </section>
      <section className="mt-12 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.055] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Next step</p>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Convert the model into a decision artifact: owner, signal, threshold, output, and next review point.
        </p>
      </section>
    </main>
  );
}
