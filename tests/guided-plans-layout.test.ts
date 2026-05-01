import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Guided Plans renders Gantt and Team Action Plans before change rationale", () => {
  const source = readFileSync(new URL("../src/components/guided-plans-console.tsx", import.meta.url), "utf8");
  const contentStart = source.indexOf("<GuidedPlanOverviewCard");
  const contentBlock = source.slice(contentStart);
  const ganttIndex = contentBlock.indexOf("<GuidedPlanGanttSummary");
  const teamActionPlanIndex = contentBlock.indexOf("<RolePlansCard");
  const guidanceReviewIndex = contentBlock.indexOf("<GuidanceReviewPanel");

  assert.notEqual(ganttIndex, -1);
  assert.notEqual(teamActionPlanIndex, -1);
  assert.notEqual(guidanceReviewIndex, -1);
  assert.ok(ganttIndex < teamActionPlanIndex);
  assert.ok(teamActionPlanIndex < guidanceReviewIndex);
});
