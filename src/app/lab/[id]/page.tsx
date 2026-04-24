import { notFound } from "next/navigation";
import { aiProducts } from "@/data";
import { getAIProductById, getRelatedInitiatives } from "@/lib/content";
import { RelatedContent } from "@/components/related-content";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { requireSiteAccessPage } from "@/lib/site-access";

export function generateStaticParams() {
  return aiProducts.map((product) => ({ id: product.id }));
}

export default async function AIProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSiteAccessPage(`/lab/${id}`);
  const product = getAIProductById(id);
  if (!product) notFound();

  const relatedInitiatives = getRelatedInitiatives(product.relatedInitiativeIds).map((initiative) => ({
    id: initiative.id,
    title: initiative.title,
    href: `/systems/${initiative.id}`,
    label: "System"
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-6">
        <StatusBadge status={product.status} />
      </div>
      <SectionHeader eyebrow="AI product" title={product.name} description={product.summary} />
      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-amber-300/15 bg-zinc-950/70 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">Purpose</p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{product.purpose}</p>
        </div>
        <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.055] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">Value</p>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{product.value}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Inputs</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.inputs.map((input) => (
              <span key={input} className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-zinc-300">
                {input}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Outputs</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.outputs.map((output) => (
              <span key={output} className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-zinc-300">
                {output}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="mt-12">
        <SectionHeader eyebrow="Related systems" title="Where this product creates leverage." />
        <div className="mt-6">
          <RelatedContent items={relatedInitiatives} />
        </div>
      </section>
      <section className="mt-12 rounded-lg border border-amber-300/20 bg-amber-300/[0.055] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200">Strategic implication</p>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Keep this surface local-first until retrieval quality, source confidence, and human control gates are stable.
        </p>
      </section>
    </main>
  );
}
