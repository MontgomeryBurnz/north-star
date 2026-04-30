import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Guided Plans renders Gantt and Team Action Plans before change rationale", () => {
  const source = readFileSync(new URL("../src/components/guided-plans-console.tsx", import.meta.url), "utf8");
  const contentStart = source.indexOf("<GuidedPlanOverviewCard");
  const contentEnd = source.indexOf("<GuidedPlanFollowUpCard");
  const contentBlock = source.slice(contentStart, contentEnd);
  const ganttIndex = contentBlock.indexOf("<GuidedPlanGanttSummary");
  const teamActionPlanIndex = contentBlock.indexOf("<RolePlansCard");
  const whyThisChangedIndex = contentBlock.indexOf("<GuidedPlanJustificationCard");

  assert.notEqual(ganttIndex, -1);
  assert.notEqual(teamActionPlanIndex, -1);
  assert.notEqual(whyThisChangedIndex, -1);
  assert.ok(ganttIndex < teamActionPlanIndex);
  assert.ok(teamActionPlanIndex < whyThisChangedIndex);
});
