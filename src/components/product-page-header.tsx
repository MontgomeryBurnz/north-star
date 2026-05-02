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
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(20rem,0.55fr)] lg:items-end", className)}>
      <div className="max-w-4xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">{eyebrow}</p>
        <h1 className="text-4xl font-semibold tracking-normal text-zinc-50 md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">{description}</p>
      </div>
      {actions ? <div className="min-w-0">{actions}</div> : null}
    </div>
  );
}
