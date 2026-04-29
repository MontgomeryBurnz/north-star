import type { StoredProgram } from "@/lib/program-intake-types";

export type ProgramSlicerOption = {
  detail?: string;
  id: string;
  label: string;
};

export type ProgramSlicerDetailMode = "owner" | "signal";

function firstText(...values: Array<string | undefined | null>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}

export function programToSlicerOption(program: StoredProgram, detailMode: ProgramSlicerDetailMode = "owner"): ProgramSlicerOption {
  const label = firstText(program.intake.programName, "Untitled program");
  const owner = firstText(program.intake.programOwner);
  const signal = firstText(program.intake.vision, program.intake.outcomes, "No north star captured yet.");

  return {
    id: program.id,
    label,
    detail: detailMode === "owner" ? `Lead: ${owner || "Owner not set"}` : signal
  };
}

export function programsToSlicerOptions(programs: StoredProgram[], detailMode: ProgramSlicerDetailMode = "owner") {
  return programs.map((program) => programToSlicerOption(program, detailMode));
}

export function getProgramSlicerButtonLabel(input: {
  emptyLabel: string;
  options: ProgramSlicerOption[];
  placeholder: string;
  selectedProgramId: string;
}) {
  if (!input.options.length) return input.emptyLabel;
  return input.options.find((option) => option.id === input.selectedProgramId)?.label ?? input.placeholder;
}
