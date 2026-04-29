import test from "node:test";
import assert from "node:assert/strict";
import { getProgramSlicerButtonLabel, programsToSlicerOptions } from "../src/lib/program-slicer.ts";
import type { StoredProgram } from "../src/lib/program-intake-types.ts";

const programs: StoredProgram[] = [
  {
    id: "program-1",
    createdAt: "2026-04-28T10:00:00.000Z",
    updatedAt: "2026-04-28T10:00:00.000Z",
    intake: {
      programName: "Compass Compliance Hub Alpha",
      programOwner: "Alex",
      vision: "Align compliance operations.",
      sowSummary: "",
      outcomes: "Reduce review friction.",
      stakeholders: "",
      risks: "",
      constraints: "",
      currentStatus: "",
      decisionsNeeded: "",
      blockers: "",
      artifacts: []
    }
  }
];

test("programsToSlicerOptions keeps dropdown values compact", () => {
  assert.deepEqual(programsToSlicerOptions(programs), [
    {
      id: "program-1",
      label: "Compass Compliance Hub Alpha",
      detail: "Lead: Alex"
    }
  ]);
});

test("programsToSlicerOptions can use program signal as secondary detail", () => {
  assert.equal(programsToSlicerOptions(programs, "signal")[0]?.detail, "Align compliance operations.");
});

test("getProgramSlicerButtonLabel handles empty, unselected, and selected states", () => {
  const options = programsToSlicerOptions(programs);

  assert.equal(
    getProgramSlicerButtonLabel({
      emptyLabel: "No programs",
      options: [],
      placeholder: "Select a program",
      selectedProgramId: ""
    }),
    "No programs"
  );
  assert.equal(
    getProgramSlicerButtonLabel({
      emptyLabel: "No programs",
      options,
      placeholder: "Select a program",
      selectedProgramId: ""
    }),
    "Select a program"
  );
  assert.equal(
    getProgramSlicerButtonLabel({
      emptyLabel: "No programs",
      options,
      placeholder: "Select a program",
      selectedProgramId: "program-1"
    }),
    "Compass Compliance Hub Alpha"
  );
});
