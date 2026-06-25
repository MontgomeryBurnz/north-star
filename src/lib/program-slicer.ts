import type { StoredProgram } from "@/lib/program-intake-types";
import { compareClientNames, getProgramClientName } from "./client-portfolio.ts";

export type ProgramSlicerOption = {
  clientName?: string;
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
  const clientName = getProgramClientName(program);

  return {
    clientName,
    id: program.id,
    label,
    detail: detailMode === "owner" ? `Client: ${clientName} · Lead: ${owner || "Owner not set"}` : `Client: ${clientName} · ${signal}`
  };
}

export function programsToSlicerOptions(programs: StoredProgram[], detailMode: ProgramSlicerDetailMode = "owner") {
  return programs
    .map((program) => programToSlicerOption(program, detailMode))
    .sort((a, b) => compareClientNames(a.clientName ?? "", b.clientName ?? "") || a.label.localeCompare(b.label));
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
