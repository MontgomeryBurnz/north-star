import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  description,
  className
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-normal text-zinc-50 md:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-sm leading-7 text-zinc-400 md:text-base">{description}</p> : null}
    </div>
  );
}
