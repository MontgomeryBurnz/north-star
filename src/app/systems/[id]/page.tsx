import { notFound } from "next/navigation";
import { initiatives } from "@/data";
import { getInitiativeById, getRelatedFrameworks, getRelatedProducts } from "@/lib/content";
import { RelatedContent } from "@/components/related-content";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";

export function generateStaticParams() {
  return initiatives.map((initiative) => ({ id: initiative.id }));
}

export default async function InitiativeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initiative = getInitiativeById(id);
  if (!initiative) notFound();

  const relatedFrameworks = getRelatedFrameworks(initiative.relatedFrameworkIds).map((framework) => ({
    id: framework.id,
    title: framework.name,
    href: `/frameworks/${framework.id}`,
    label: "Framework"
  }));

  const relatedProducts = getRelatedProducts(initiative.relatedProductIds).map((product) => ({
    id: product.id,
    title: product.name,
    href: `/lab/${product.id}`,
    label: "AI product"
  }));
  const outputGroups: { label: string; values: string[] }[] = [
    { label: "Input context", values: initiative.inputContext },
    { label: "Key next steps", values: initiative.recommendedNextSteps },
    { label: "Key outputs", values: initiative.deliveryOutputs },
    { label: "Risk signals", values: initiative.riskSignals }
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusBadge status={initiative.status} />
        {initiative.tags.map((tag) => (
          <span key={tag} className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-zinc-400">
            {tag}
          </span>
        ))}
      </div>
      <SectionHeader eyebrow="Delivery guidance set" title={initiative.title} description={initiative.summary} />

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        {[
          ["When this helps", initiative.problemSpace],
          ["Tailored guidance", initiative.systemDesigned],
          ["How it decides", initiative.howItWorks],
          ["Work path value", initiative.valueCreated],
          ["Planning approach", initiative.strategicAngle]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-zinc-950/70 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        {outputGroups.map(({ label, values }) => (
          <div key={label} className="rounded-lg border border-white/10 bg-zinc-950/70 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
            <div className="mt-3 grid gap-2">
              {values.map((value) => (
                <p key={value} className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-6 text-zinc-300">
                  {value}
                </p>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <SectionHeader eyebrow="Related" title="Connected work path models and AI surfaces." />
        <div className="mt-6">
          <RelatedContent items={[...relatedFrameworks, ...relatedProducts]} />
        </div>
      </section>

      <section className="mt-12 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.055] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">Delivery implication</p>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Use this output as the starting point, not the final answer. The delivery lead should validate the assumptions,
          confirm owners, and use new evidence to regenerate the next iteration.
        </p>
      </section>
    </main>
  );
}
