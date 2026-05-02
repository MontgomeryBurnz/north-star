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

test("Artifact Studio output keeps generated detail compact and export-first", () => {
  const source = readFileSync(new URL("../src/components/role-artifact-studio-card.tsx", import.meta.url), "utf8");

  assert.match(source, /Export DOCX/);
  assert.match(source, /Export CSV/);
  assert.match(source, /Full export table/);
  assert.match(source, /Supporting guidance/);
  assert.doesNotMatch(source, /Artifact preview/);
  assert.doesNotMatch(source, /Executive snapshot/);
  assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_300px\]/);
  assert.doesNotMatch(source, /xl:grid-cols-\[minmax\(0,0\.78fr\)_minmax\(0,1\.22fr\)\]/);
});

test("Studio recommendations use a full-width brief browser", () => {
  const source = readFileSync(new URL("../src/components/artifact-studio-console.tsx", import.meta.url), "utf8");

  assert.match(source, /Recommended briefs/);
  assert.match(source, /buildStarterSuggestion/);
  assert.match(source, /Refresh intelligence/);
  assert.match(source, /data-studio-suggestions/);
  assert.match(source, /lg:grid-cols-2 2xl:grid-cols-3/);
  assert.match(source, /Load \{suggestion\.title\}/);
  assert.match(source, /scrollIntoView/);
  assert.doesNotMatch(source, /void loadSuggestions\(\);\s*\n\s*}, \[loadSuggestions\]/);
  assert.doesNotMatch(source, /Recommendation source/);
  assert.doesNotMatch(source, /All roles/);
  assert.doesNotMatch(source, /xl:grid-cols-\[430px_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(source, /xl:sticky xl:top-24/);
});

test("Studio role filtering is enforced after OpenAI recommendations return", () => {
  const serverSource = readFileSync(new URL("../src/lib/role-artifact-suggestions.ts", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("../src/components/artifact-studio-console.tsx", import.meta.url), "utf8");
  const generationSource = readFileSync(new URL("../src/lib/role-artifact-service.ts", import.meta.url), "utf8");
  const workbenchSource = readFileSync(new URL("../src/components/role-artifact-studio-card.tsx", import.meta.url), "utf8");

  assert.match(serverSource, /filterSuggestionsByRole\(normalizeOpenAISuggestions\(payload\), context\.roleFocus\)/);
  assert.match(serverSource, /When roleFocus is a specific role, every suggestion must be directly tailored to that role only\./);
  assert.match(clientSource, /visibleSuggestions/);
  assert.match(clientSource, /suggestionMatchesRole\(suggestion, selectedRoleFocus\)/);
  assert.match(generationSource, /Make tables the primary artifact/);
  assert.match(generationSource, /Avoid repeating the same context/);
  assert.match(workbenchSource, /Artifact type/);
  assert.match(workbenchSource, /ArtifactCatalogSelect/);
  assert.doesNotMatch(workbenchSource, /ArtifactDefinitionButton/);
});

test("Studio catalog includes starter artifacts for expanded delivery roles", () => {
  const source = readFileSync(new URL("../src/lib/role-artifact-types.ts", import.meta.url), "utf8");

  for (const role of ["Application Development", "Data Engineering", "Change Management", "Scrum Master", "Delivery Lead"]) {
    assert.match(source, new RegExp(`role: "${role}"`));
  }
});

test("Navigation presents Quick Start and keeps Admin as settings access", () => {
  const navSource = readFileSync(new URL("../src/components/site-nav.tsx", import.meta.url), "utf8");
  const loginSource = readFileSync(new URL("../src/components/site-access-login-form.tsx", import.meta.url), "utf8");

  assert.match(navSource, /Quick Start/);
  assert.match(navSource, /Settings/);
  assert.doesNotMatch(navSource, /label: "Admin"/);
  assert.match(loginSource, /Welcome to North Star/);
});
