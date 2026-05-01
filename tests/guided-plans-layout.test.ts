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

test("Team Action Plan focused roles can still collapse", () => {
  const source = readFileSync(new URL("../src/components/guided-plan-section-cards.tsx", import.meta.url), "utf8");

  assert.match(source, /const isExpanded = expandedRoleKeys\.has\(roleKey\)/);
  assert.doesNotMatch(source, /const isExpanded = isFocusedRole \|\|/);
});

test("Artifact Studio output uses a digest-first full-width layout", () => {
  const source = readFileSync(new URL("../src/components/role-artifact-studio-card.tsx", import.meta.url), "utf8");

  assert.match(source, /At a glance/);
  assert.match(source, /Detailed artifact table/);
  assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_320px\]/);
  assert.doesNotMatch(source, /xl:grid-cols-\[minmax\(0,0\.78fr\)_minmax\(0,1\.22fr\)\]/);
});
