import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { StoredProgram } from "@/lib/program-intake-types";

export type GanttPhase = {
  id: string;
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
};

export function phaseIndexFromLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("discovery")) return 0;
  if (normalized.includes("design") || normalized.includes("planning")) return 1;
  if (normalized.includes("build") || normalized.includes("execution")) return 2;
  if (normalized.includes("recovery") || normalized.includes("stabil")) return 3;
  if (normalized.includes("launch") || normalized.includes("rollout") || normalized.includes("scale")) return 4;
  return 2;
}

export function buildProgramGantt(
  program: Pick<StoredProgram, "intake"> | null | undefined,
  latestUpdate: Pick<StoredProgramUpdate, "review"> | undefined
): GanttPhase[] {
  const currentPhaseLabel = latestUpdate?.review.currentPhase || program?.intake.currentStatus || "Execution";
  const currentIndex = phaseIndexFromLabel(currentPhaseLabel);

  return [
    {
      id: "discover",
      label: "Discover",
      description: "Problem shape, north star, and constraints were framed.",
      status: currentIndex > 0 ? "completed" : currentIndex === 0 ? "current" : "upcoming"
    },
    {
      id: "design",
      label: "Design",
      description: "Decision rights, checkpoints, and work path were defined.",
      status: currentIndex > 1 ? "completed" : currentIndex === 1 ? "current" : "upcoming"
    },
    {
      id: "execute",
      label: "Execute",
      description: "Delivery is moving and progress evidence is being produced.",
      status: currentIndex > 2 ? "completed" : currentIndex === 2 ? "current" : "upcoming"
    },
    {
      id: "stabilize",
      label: "Stabilize",
      description: "Risk is being reduced and the path is being tightened.",
      status: currentIndex > 3 ? "completed" : currentIndex === 3 ? "current" : "upcoming"
    },
    {
      id: "scale",
      label: "Scale",
      description: "The operating path is repeatable and ready to widen.",
      status: currentIndex > 4 ? "completed" : currentIndex === 4 ? "current" : "upcoming"
    }
  ];
}
