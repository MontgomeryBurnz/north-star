import { Badge } from "@/components/ui/badge";

const toneMap = {
  Active: "default",
  Scaling: "cyan",
  Concept: "amber",
  Delivered: "zinc",
  live: "default",
  scaling: "cyan",
  piloting: "amber",
  designing: "zinc",
  prototype: "amber",
  beta: "cyan",
  watching: "zinc",
  testing: "amber",
  shipped: "default",
  concept: "amber",
  evolving: "cyan"
} as const;

type Status = keyof typeof toneMap;

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={toneMap[status]}>{status}</Badge>;
}
