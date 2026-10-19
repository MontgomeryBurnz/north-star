import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProductPageHeaderProps = {
  actions?: ReactNode;
  className?: string;
  description: string;
  eyebrow: string;
  title: string;
};

export function ProductPageHeader({
  actions,
  className,
  description,
  eyebrow,
  title
}: ProductPageHeaderProps) {
  return (
    <div className={cn("grid gap-5", actions && "2xl:grid-cols-[minmax(0,1fr)_minmax(32rem,0.8fr)] 2xl:items-end", className)}>
      <div className="min-w-0 max-w-6xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">{eyebrow}</p>
        <h1 className="text-balance text-[1.75rem] font-semibold leading-[1.18] tracking-[-0.025em] text-zinc-50 sm:text-[2rem] lg:text-[2.25rem]">{title}</h1>
        <p className="mt-3 max-w-5xl text-pretty text-sm leading-6 text-zinc-400 sm:text-[0.9375rem]">{description}</p>
      </div>
      {actions ? <div className="min-w-0">{actions}</div> : null}
    </div>
  );
}
