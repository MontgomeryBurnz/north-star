import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type RelatedItem = {
  id: string;
  title: string;
  href: string;
  label: string;
};

export function RelatedContent({ items }: { items: RelatedItem[] }) {
  if (!items.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <Link
          key={`${item.label}-${item.id}`}
          href={item.href}
          className="group rounded-lg border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-emerald-300/30"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-400">
              {item.label}
            </span>
            <ArrowUpRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-emerald-200" />
          </div>
          <p className="text-sm font-medium text-zinc-100">{item.title}</p>
        </Link>
      ))}
    </div>
  );
}
