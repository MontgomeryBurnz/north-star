import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricBasisLabelProps = {
  children: string;
  className?: string;
};

export function MetricBasisLabel({ children, className }: MetricBasisLabelProps) {
  return (
    <p className={cn("mt-2 inline-flex items-start gap-1.5 text-xs font-medium leading-5 text-zinc-500", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200/70" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
