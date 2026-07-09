import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

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

test("Client Portal frames executive overview and domain progress", () => {
  const source = readFileSync(new URL("../src/components/client-portal-console.tsx", import.meta.url), "utf8");
  const modelSource = readFileSync(new URL("../src/lib/client-portal.ts", import.meta.url), "utf8");
  const safetySource = readFileSync(new URL("../src/lib/client-safe-copy.ts", import.meta.url), "utf8");

  assert.match(source, /Portfolio Dashboard/);
  assert.match(source, /bg-slate-100 text-slate-950/);
  assert.match(source, /border-slate-200 bg-white/);
  assert.match(source, /text-slate-700/);
  assert.doesNotMatch(source, /bg-\[radial-gradient\(circle_at_top_left/);
  assert.doesNotMatch(source, /FY25 Strategic Program Intelligence/);
  assert.doesNotMatch(source, /Portfolio Program Grid/);
  assert.doesNotMatch(source, /Weekly Updates/);
  assert.doesNotMatch(source, /Upcoming Milestones/);
  assert.doesNotMatch(source, /Key Risks Across Portfolio/);
  assert.doesNotMatch(source, /Portfolio Roadmap -/);
  assert.doesNotMatch(source, /Program Timeline/);
  assert.doesNotMatch(source, /Milestone Timeline/);
  assert.doesNotMatch(source, /Workstream Status/);
  assert.doesNotMatch(source, /Client Work Roadmap/);
  assert.match(source, /clientRoadmapTitle/);
  assert.match(source, /title=\{clientRoadmapTitle\(program\.name\)\}/);
  assert.match(source, /showClientSelector = false/);
  assert.match(source, /showProgramScope = clientPrograms\.length > 1/);
  assert.match(source, /data-client-program-hero/);
  assert.match(source, /data-client-hero-metric/);
  assert.match(source, /MetricBasisLabel/);
  assert.match(source, /grid gap-2 sm:grid-cols-2 sm:gap-3/);
  assert.doesNotMatch(source, /metricId="percent-complete"/);
  assert.match(source, /grid min-w-0 max-w-full gap-6 overflow-hidden/);
  assert.match(source, /data-client-executive-sponsor/);
  assert.match(source, /data-client-executive-summary/);
  assert.doesNotMatch(source, /data-client-program-lead/);
  assert.doesNotMatch(source, /data-client-pmo/);
  assert.doesNotMatch(source, /xl:grid-cols-\[minmax\(0,1fr\)_minmax\(22rem,0\.5fr\)\]/);
  assert.doesNotMatch(source, /Averaged from each program's shown completion basis/);
  assert.doesNotMatch(source, /MetricTile label="Total Programs"/);
  assert.match(source, /Executive Summary/);
  assert.match(source, /whitespace-pre-line/);
  assert.match(source, /ClientWorkRoadmap/);
  assert.match(source, /data-client-work-roadmap-item/);
  assert.match(source, /FunctionUpdateCard/);
  assert.match(source, /data-client-function-section/);
  assert.match(source, /data-client-function-update-card/);
  assert.match(source, /data-client-function-bullet/);
  assert.match(source, /splitClientPortalListText/);
  assert.match(source, /shouldRenderClientPortalList/);
  assert.match(source, /buildFunctionRows/);
  assert.match(source, /Recent Accomplishments/);
  assert.match(source, /Upcoming Work \(Next 2 Weeks\)/);
  assert.match(source, /Risks \/ Issues \/ Dependencies/);
  assert.match(source, /Leadership Decisions Needed/);
  assert.match(modelSource, /domainSummaries: ClientPortalDomainSummary\[\]/);
  assert.match(modelSource, /clientRoadmapItems: ClientPortalComponentRoadmapItem\[\]/);
  assert.match(modelSource, /buildClientRoadmapItems/);
  assert.match(modelSource, /upcomingMilestones: ClientPortalPortfolioMilestone\[\]/);
  assert.match(modelSource, /keyRisks: ClientPortalPortfolioRisk\[\]/);
  assert.match(modelSource, /roadmap: ClientPortalRoadmapRow\[\]/);
  assert.match(modelSource, /statusSignal: ClientProgramStatusSignal/);
  assert.match(modelSource, /nextMilestone:/);
  assert.match(modelSource, /executiveStatusHighlights: string\[\]/);
  assert.match(modelSource, /recentAccomplishments: string\[\]/);
  assert.match(modelSource, /upcomingWork: string\[\]/);
  assert.match(modelSource, /buildRecentAccomplishments/);
  assert.match(modelSource, /buildLeadershipDecisions/);
  assert.match(modelSource, /buildWorkstreams/);
  assert.match(modelSource, /buildMilestones/);
  assert.match(modelSource, /buildDomainSummaries/);
  assert.match(modelSource, /programGuide\?\.sponsorReadout/);
  assert.match(modelSource, /buildClientExecutiveOverview/);
  assert.match(modelSource, /firstNonEmpty\(input\.review\?\.programSynthesisNote, input\.review\?\.clientStatusNote\)/);
  assert.match(modelSource, /function cleanMultiline/);
  assert.match(modelSource, /executiveSummary: cleanMultiline\(firstNonEmpty\(executiveOverview/);
  assert.match(modelSource, /buildPortfolioMilestones/);
  assert.match(modelSource, /buildPortfolioRisks/);
  assert.match(modelSource, /buildPortfolioRoadmap/);
  assert.match(modelSource, /buildRoadmapWindow/);
  assert.match(modelSource, /getRoadmapCompletionPercent/);
  assert.match(modelSource, /completionBasis: roadmapCompletion\.basis/);
  assert.match(modelSource, /deriveMonthWindowLabels/);
  assert.match(modelSource, /formatShortDateLabel/);
  assert.match(modelSource, /function clientPhaseLabel/);
  assert.match(modelSource, /sanitizeClientPortalUpdateForDisplay/);
  assert.match(modelSource, /"roadmap", "scope"/);
  assert.match(modelSource, /timelineScale: roadmapWindow\.scale/);
  assert.match(modelSource, /windowMode: program\.timelineScale/);
  assert.match(modelSource, /buildReviewMilestones/);
  assert.match(modelSource, /ProgramTimelineMilestone/);
  assert.match(modelSource, /buildDomainMovementSignal/);
  assert.match(modelSource, /buildDeliveryBoardProgressSignal/);
  assert.match(modelSource, /conciseSignal/);
  assert.match(modelSource, /Risk:/);
  assert.match(modelSource, /Decision:/);
  assert.match(safetySource, /validateClientPortalUpdateInput/);
  assert.match(safetySource, /sanitizeClientPortalUpdateForDisplay/);
  assert.match(safetySource, /clientRoadmapItems/);
  assert.match(safetySource, /internal-markers/);
  assert.match(safetySource, /relationship-sensitive/);
});

test("Active Program captures configurable timeline windows and milestones for Client Portal", () => {
  const stateSource = readFileSync(new URL("../src/components/active-program-state-card.tsx", import.meta.url), "utf8");
  const roleLaneSource = readFileSync(new URL("../src/components/active-program-team-updates-card.tsx", import.meta.url), "utf8");
  const flowSource = readFileSync(new URL("../src/components/active-program-state-flow.tsx", import.meta.url), "utf8");
  const controllerSource = readFileSync(new URL("../src/hooks/use-active-program-review-controller.ts", import.meta.url), "utf8");
  const typeSource = readFileSync(new URL("../src/lib/active-program-types.ts", import.meta.url), "utf8");
  const programRouteSource = readFileSync(new URL("../src/app/api/programs/[id]/route.ts", import.meta.url), "utf8");
  const auditTypesSource = readFileSync(new URL("../src/lib/audit-event-types.ts", import.meta.url), "utf8");
  const activeSmokeSource = readFileSync(new URL("../scripts/smoke-active-program-save.mjs", import.meta.url), "utf8");
  const clientSmokeSource = readFileSync(new URL("../scripts/smoke-client-portal.mjs", import.meta.url), "utf8");

  assert.match(typeSource, /ProgramTimelineScale/);
  assert.match(typeSource, /ProgramTimelineMilestone/);
  assert.match(stateSource, /data-active-program-client-assignment/);
  assert.match(stateSource, /data-active-client-portfolio-field/);
  assert.match(stateSource, /data-active-client-portfolio-save/);
  assert.match(stateSource, /data-active-client-portfolio-save-confirmation/);
  assert.match(stateSource, /data-active-program-timeline-fields/);
  assert.match(stateSource, /data-active-timeline-scale/);
  assert.match(stateSource, /data-active-timeline-year/);
  assert.match(stateSource, /data-active-timeline-month/);
  assert.match(stateSource, /data-active-timeline-week/);
  assert.match(stateSource, /data-active-program-add-milestone/);
  assert.match(stateSource, /data-active-program-milestone-row/);
  assert.match(stateSource, /data-active-program-milestone-drag-handle/);
  assert.match(stateSource, /data-active-program-timeline-save/);
  assert.match(stateSource, /data-active-program-timeline-save-confirmation/);
  assert.match(stateSource, /data-active-program-profile-save/);
  assert.match(roleLaneSource, /data-active-role-risk-count/);
  assert.match(roleLaneSource, /data-active-role-decision-count/);
  assert.match(flowSource, /onTimelineMilestoneChange/);
  assert.match(flowSource, /onClientPortfolioChange/);
  assert.match(flowSource, /onSaveClientPortfolio/);
  assert.match(flowSource, /onReorderTimelineMilestone/);
  assert.match(flowSource, /onSaveTimeline/);
  assert.match(controllerSource, /clientPortfolioDraft/);
  assert.match(controllerSource, /saveClientPortfolio/);
  assert.match(controllerSource, /addTimelineMilestone/);
  assert.match(controllerSource, /updateTimelineMilestone/);
  assert.match(controllerSource, /reorderTimelineMilestone/);
  assert.match(controllerSource, /removeTimelineMilestone/);
  assert.match(activeSmokeSource, /data-active-program-client-assignment/);
  assert.match(activeSmokeSource, /data-active-client-portfolio-field/);
  assert.match(activeSmokeSource, /data-active-client-portfolio-save/);
  assert.match(activeSmokeSource, /Smoke custom timeline milestone/);
  assert.match(activeSmokeSource, /timelineYear === "FY99"/);
  assert.match(programRouteSource, /PATCH/);
  assert.match(programRouteSource, /clientName/);
  assert.match(programRouteSource, /program\.client\.update/);
  assert.match(auditTypesSource, /program\.client\.update/);
  assert.match(clientSmokeSource, /Client Portal smoke value gate/);
  assert.match(clientSmokeSource, /timelineYear: "FY99"/);
});

test("Program setup transitions into a readiness checkpoint after save", () => {
  const source = readFileSync(new URL("../src/components/program-intake-section.tsx", import.meta.url), "utf8");

  assert.match(source, /buildProgramReadinessModel/);
  assert.match(source, /showReadinessTransition/);
  assert.match(source, /data-program-readiness-transition/);
  assert.match(source, /North Star readiness/);
  assert.match(source, /What we understand/);
  assert.match(source, /Further advised info/);
  assert.match(source, /data-program-readiness-actions/);
  assert.match(source, /Upload artifact/);
  assert.match(source, /Complete Team Footprint/);
  assert.match(source, /Go to Program Hub/);
  assert.match(source, /Open Guided Plans/);
  assert.match(source, /Basis: intake fields, team footprint, named owners, risks, decisions, and attached artifacts/);
  assert.match(source, /program-intake-artifacts/);
  assert.match(source, /program-intake-team-footprint/);
  assert.ok(!source.includes("router.push(`/systems?program=${encodeURIComponent(savePayload.program.id)}`)"));
});

test("Role-aware UI profile is shared across role-centric surfaces", () => {
  const hookSource = readFileSync(new URL("../src/hooks/use-current-user-assignments.ts", import.meta.url), "utf8");
  const activeControllerSource = readFileSync(new URL("../src/hooks/use-active-program-review-controller.ts", import.meta.url), "utf8");
  const guidedSource = readFileSync(new URL("../src/components/guided-plans-console.tsx", import.meta.url), "utf8");
  const studioSource = readFileSync(new URL("../src/components/artifact-studio-console.tsx", import.meta.url), "utf8");
  const leadershipSource = readFileSync(new URL("../src/components/leadership-review-console.tsx", import.meta.url), "utf8");

  assert.match(hookSource, /getRoleUiProfileForProgram/);
  assert.match(activeControllerSource, /roleUiProfile/);
  assert.match(activeControllerSource, /defaultFocusRole = roleUiProfile\?\.defaultRole/);
  assert.match(guidedSource, /roleUiProfile/);
  assert.match(guidedSource, /assignedRoleForProgram = roleUiProfile\?\.assignedRole/);
  assert.match(studioSource, /roleUiProfile/);
  assert.match(studioSource, /data-role-aware-ui-summary/);
  assert.match(leadershipSource, /roleUiProfile/);
  assert.match(leadershipSource, /assignedLane = roleUiProfile\?\.assignedRole/);
});

test("Knowledge Center renders versioned docs as searchable in-app guidance", () => {
  const pageSource = readFileSync(new URL("../src/app/knowledge/page.tsx", import.meta.url), "utf8");
  const loaderSource = readFileSync(new URL("../src/lib/knowledge-center.ts", import.meta.url), "utf8");
  const consoleSource = readFileSync(new URL("../src/components/knowledge-center-console.tsx", import.meta.url), "utf8");
  const navSource = readFileSync(new URL("../src/components/site-nav.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /requireSiteAccessPage\("\/knowledge"\)/);
  assert.match(pageSource, /getKnowledgeArticles/);
  assert.match(loaderSource, /docs\/northstar-executive-demo-guide\.md/);
  assert.match(loaderSource, /docs\/northstar-team-user-guide\.md/);
  assert.match(loaderSource, /docs\/northstar-knowledge-management-solution\.md/);
  assert.match(loaderSource, /docs\/northstar-release-checklist\.md/);
  assert.match(consoleSource, /data-knowledge-center/);
  assert.match(consoleSource, /data-knowledge-search-input/);
  assert.match(consoleSource, /data-knowledge-article-list/);
  assert.match(consoleSource, /MarkdownArticle/);
  assert.match(consoleSource, /Knowledge Center/);
  assert.match(navSource, /Knowledge/);
  assert.match(navSource, /\/knowledge/);
});

test("Primary app surfaces use the wider North Star shell", () => {
  const globalSource = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const clientSource = readFileSync(new URL("../src/components/client-portal-console.tsx", import.meta.url), "utf8");
  const guidedSource = readFileSync(new URL("../src/components/guided-plans-console.tsx", import.meta.url), "utf8");
  const activeSource = readFileSync(new URL("../src/components/active-program-review-section.tsx", import.meta.url), "utf8");
  const navSource = readFileSync(new URL("../src/components/site-nav.tsx", import.meta.url), "utf8");

  assert.match(globalSource, /max-w-\[100rem\]/);
  assert.match(clientSource, /northstar-shell py-10/);
  assert.match(guidedSource, /northstar-shell py-16/);
  assert.match(activeSource, /northstar-shell py-16/);
  assert.match(navSource, /northstar-shell/);
});

test("Artifact Studio output keeps generated detail compact and export-first", () => {
  const source = readFileSync(new URL("../src/components/role-artifact-studio-card.tsx", import.meta.url), "utf8");

  assert.match(source, /Export DOCX/);
  assert.match(source, /Export CSV/);
  assert.match(source, /function ArtifactSliceRow/);
  assert.match(source, /sliceTableTitle\(artifact, table\)/);
  assert.match(source, /\$\{title\} Slice/);
  assert.doesNotMatch(source, /<table/);
  assert.doesNotMatch(source, /Generated work product/);
  assert.doesNotMatch(source, /Generated artifact detail/);
  assert.doesNotMatch(source, /Inputs behind this artifact/);
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
  assert.match(source, /Select a role to continue/);
  assert.match(source, /Select a program first/);
  assert.match(source, /Inputs used/);
  assert.match(source, /data-studio-suggestions/);
  assert.match(source, /lg:grid-cols-2 2xl:grid-cols-3/);
  assert.match(source, /Load \{suggestion\.title\}/);
  assert.match(source, /scrollIntoView/);
  assert.doesNotMatch(source, /void loadSuggestions\(\);\s*\n\s*}, \[loadSuggestions\]/);
  assert.doesNotMatch(source, /Recommendation source/);
  assert.doesNotMatch(source, /All roles/);
  assert.doesNotMatch(source, /Studio context/);
  assert.doesNotMatch(source, /defaultStudioRole/);
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
  assert.doesNotMatch(workbenchSource, /roleFocus = "Product Management"/);
  assert.doesNotMatch(workbenchSource, /ArtifactDefinitionButton/);
});

test("Studio catalog includes starter artifacts for expanded delivery roles", () => {
  const source = readFileSync(new URL("../src/lib/role-artifact-types.ts", import.meta.url), "utf8");

  for (const role of ["Application Development", "Data Engineering", "Data Analysis", "Change Management", "Scrum Master", "Delivery Lead"]) {
    assert.match(source, new RegExp(`role: "${role}"`));
  }
});

test("Studio includes a governed delivery agent workbench with UX coverage", () => {
  const agentSource = readFileSync(new URL("../src/lib/delivery-agent-types.ts", import.meta.url), "utf8");
  const workbenchSource = readFileSync(new URL("../src/components/agent-workbench-card.tsx", import.meta.url), "utf8");
  const studioSource = readFileSync(new URL("../src/components/artifact-studio-console.tsx", import.meta.url), "utf8");
  const catalogSource = readFileSync(new URL("../src/lib/role-artifact-types.ts", import.meta.url), "utf8");
  const smokeSource = readFileSync(new URL("../scripts/smoke-studio.mjs", import.meta.url), "utf8");

  for (const agentId of [
    "program-management",
    "requirements-elicitation",
    "product-management",
    "user-experience",
    "data-analysis",
    "application-development",
    "data-engineering"
  ]) {
    assert.match(agentSource, new RegExp(`id: "${agentId}"`));
    assert.match(smokeSource, new RegExp(`"${agentId}"`));
  }

  assert.match(agentSource, /title: "UX Agent"/);
  assert.match(agentSource, /roleLens: "User Experience"/);
  assert.match(agentSource, /handoffTo/);
  assert.match(agentSource, /suggestedArtifactTypes/);
  assert.match(workbenchSource, /data-agent-workbench/);
  assert.match(workbenchSource, /data-agent-card=\{agent\.id\}/);
  assert.match(workbenchSource, /data-agent-output=\{definition\.type\}/);
  assert.match(studioSource, /AgentWorkbenchCard/);
  assert.match(studioSource, /selectedAgentId/);
  assert.match(studioSource, /getDeliveryAgentRoleLenses/);
  assert.match(studioSource, /useAgentArtifact/);
  assert.match(catalogSource, /data-analysis-kpi-definition-matrix/);
  assert.match(catalogSource, /data-analysis-reporting-requirements/);
  assert.match(smokeSource, /verifyAgentWorkbench/);
});

test("Navigation presents Quick Start and keeps Admin as settings access", () => {
  const navSource = readFileSync(new URL("../src/components/site-nav.tsx", import.meta.url), "utf8");
  const loginSource = readFileSync(new URL("../src/components/site-access-login-form.tsx", import.meta.url), "utf8");

  assert.match(navSource, /Quick Start/);
  assert.match(navSource, /Program Hub/);
  assert.match(navSource, /Settings/);
  assert.doesNotMatch(navSource, /label: "Admin"/);
  assert.match(loginSource, /Welcome to North Star/);
});

test("Program Hub launches setup and active management as separate paths", () => {
  const pageSource = readFileSync(new URL("../src/app/active-program/page.tsx", import.meta.url), "utf8");
  const programSource = readFileSync(new URL("../src/components/program-workspace.tsx", import.meta.url), "utf8");
  const slicerSmokeSource = readFileSync(new URL("../scripts/smoke-program-slicers.mjs", import.meta.url), "utf8");

  assert.match(pageSource, /: null/);
  assert.match(programSource, /data-program-hub-landing/);
  assert.match(programSource, /data-program-hub-entry=\{entry\.id\}/);
  assert.match(programSource, /Set Up New Program/);
  assert.match(programSource, /Manage Active Program/);
  assert.match(programSource, /href: "\/active-program\?mode=setup"/);
  assert.match(programSource, /href: "\/active-program\?mode=manage"/);
  assert.match(programSource, /Program Hub home/);
  assert.doesNotMatch(programSource, /useState/);
  assert.match(slicerSmokeSource, /smokeProgramHubLanding/);
  assert.match(slicerSmokeSource, /\/active-program\?mode=manage/);
  assert.match(slicerSmokeSource, /buildSmokePath/);
});

test("Buyer-ready surfaces map each module to a clear user job", () => {
  const heroSource = readFileSync(new URL("../src/components/hero-section.tsx", import.meta.url), "utf8");
  const quickStartSource = readFileSync(new URL("../src/components/command-center-grid.tsx", import.meta.url), "utf8");
  const programSource = readFileSync(new URL("../src/components/program-workspace.tsx", import.meta.url), "utf8");
  const guidedSource = readFileSync(new URL("../src/components/guided-plans-console.tsx", import.meta.url), "utf8");
  const studioSource = readFileSync(new URL("../src/components/artifact-studio-console.tsx", import.meta.url), "utf8");
  const leadershipSource = readFileSync(new URL("../src/components/leadership-review-console.tsx", import.meta.url), "utf8");

  assert.match(heroSource, /Turn program noise into focused action/);
  assert.match(quickStartSource, /One job for every surface/);
  assert.match(quickStartSource, /What should clients see/);
  assert.match(programSource, /What changed, who owns it, and what needs action/);
  assert.match(guidedSource, /What should we do next/);
  assert.match(studioSource, /What should we create next/);
  assert.match(leadershipSource, /What input do leaders need to give/);
});

test("Primary workflow pages share the product header template and stronger empty states", () => {
  const programSource = readFileSync(new URL("../src/components/program-workspace.tsx", import.meta.url), "utf8");
  const guidedSource = readFileSync(new URL("../src/components/guided-plans-console.tsx", import.meta.url), "utf8");
  const studioSource = readFileSync(new URL("../src/components/artifact-studio-console.tsx", import.meta.url), "utf8");
  const leadershipSource = readFileSync(new URL("../src/components/leadership-review-console.tsx", import.meta.url), "utf8");
  const adminSource = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
  const guidedEmptyStateSource = readFileSync(new URL("../src/components/guided-plan-empty-state-card.tsx", import.meta.url), "utf8");

  for (const source of [programSource, guidedSource, studioSource, leadershipSource, adminSource]) {
    assert.match(source, /ProductPageHeader/);
  }

  assert.match(guidedEmptyStateSource, /Select a program to begin/);
  assert.match(studioSource, /Select a program to begin/);
});

test("Admin includes Trust and Operations controls", () => {
  const adminSource = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
  const trustSource = readFileSync(new URL("../src/components/admin-trust-operations-card.tsx", import.meta.url), "utf8");
  const freshnessSource = readFileSync(new URL("../src/lib/documentation-freshness.ts", import.meta.url), "utf8");

  assert.match(adminSource, /AdminTrustOperationsCard/);
  assert.match(adminSource, /getDocumentationFreshnessSnapshot/);
  assert.match(adminSource, /documentationFreshness=\{documentationFreshness\}/);
  assert.match(trustSource, /Trust & Operations/);
  assert.match(trustSource, /Permission model/);
  assert.match(trustSource, /Reliability indicators/);
  assert.match(trustSource, /Documentation freshness/);
  assert.match(trustSource, /data-admin-documentation-freshness/);
  assert.match(trustSource, /Latest docs update/);
  assert.match(trustSource, /Latest user-facing change/);
  assert.match(trustSource, /Audit coverage/);
  assert.match(trustSource, /AdminAuditHistoryPanel/);
  assert.match(trustSource, /DOCX export/);
  assert.match(freshnessSource, /documentationPaths/);
  assert.match(freshnessSource, /userFacingProductPaths/);
  assert.match(freshnessSource, /git/);
  assert.match(freshnessSource, /needs-review/);
});

test("Admin audit history uses persisted audit events instead of inferred activity", () => {
  const repositorySource = readFileSync(new URL("../src/lib/program-repository.ts", import.meta.url), "utf8");
  const repositorySharedSource = readFileSync(new URL("../src/lib/program-repository-shared.ts", import.meta.url), "utf8");
  const auditPersistenceSource = readFileSync(new URL("../src/lib/audit-persistence.ts", import.meta.url), "utf8");
  const repositoryTypesSource = readFileSync(new URL("../src/lib/program-repository-types.ts", import.meta.url), "utf8");
  const storeSource = readFileSync(new URL("../src/lib/program-store.ts", import.meta.url), "utf8");
  const adminSource = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
  const trustSource = readFileSync(new URL("../src/components/admin-trust-operations-card.tsx", import.meta.url), "utf8");
  const auditPanelSource = readFileSync(new URL("../src/components/admin-audit-history-panel.tsx", import.meta.url), "utf8");
  const auditApiSource = readFileSync(new URL("../src/app/api/audit-events/route.ts", import.meta.url), "utf8");

  assert.match(repositorySource, /createFileAuditPersistence/);
  assert.match(repositorySource, /createPostgresAuditPersistence/);
  assert.match(repositorySharedSource, /CREATE TABLE IF NOT EXISTS audit_events/);
  assert.match(repositoryTypesSource, /listAuditEvents/);
  assert.match(repositoryTypesSource, /createAuditEvent/);
  assert.match(auditPersistenceSource, /export function createFileAuditPersistence/);
  assert.match(auditPersistenceSource, /export function createPostgresAuditPersistence/);
  assert.match(storeSource, /export async function listAuditEvents/);
  assert.match(storeSource, /export async function createAuditEvent/);
  assert.match(adminSource, /listAuditEvents\(250\)/);
  assert.match(trustSource, /AdminAuditHistoryPanel auditEvents=\{auditEvents\}/);
  assert.match(auditPanelSource, /programFilter/);
  assert.match(auditPanelSource, /actorFilter/);
  assert.match(auditPanelSource, /eventTypeFilter/);
  assert.match(auditPanelSource, /dateFilter/);
  assert.match(auditPanelSource, /searchQuery/);
  assert.match(auditPanelSource, /visibility/);
  assert.match(auditPanelSource, /groupMode/);
  assert.match(auditPanelSource, /importantEventTypes/);
  assert.match(auditPanelSource, /categoryOptions/);
  assert.match(auditPanelSource, /groupAuditEvents/);
  assert.match(auditPanelSource, /groupAuditEventsByActor/);
  assert.match(auditPanelSource, /maxEventsPerGroup/);
  assert.match(auditPanelSource, /buildTopActorSummary/);
  assert.match(auditPanelSource, /buildTopActionSummary/);
  assert.match(auditPanelSource, /AuditActivitySummary/);
  assert.match(auditPanelSource, /Top active users/);
  assert.match(auditPanelSource, /Top actions/);
  assert.match(auditPanelSource, /EventDetail/);
  assert.match(auditPanelSource, /exportAuditEvents\(filteredEvents\)/);
  assert.match(auditPanelSource, /Important only/);
  assert.match(auditPanelSource, /All events/);
  assert.match(auditPanelSource, /Group by user/);
  assert.match(auditPanelSource, /Group by time/);
  assert.match(auditPanelSource, /data-admin-audit-export/);
  assert.match(auditPanelSource, /data-admin-audit-filter/);
  assert.match(auditPanelSource, /data-admin-audit-summary/);
  assert.match(auditPanelSource, /data-admin-audit-summary-card/);
  assert.match(auditPanelSource, /data-admin-audit-top-users/);
  assert.match(auditPanelSource, /data-admin-audit-top-actions/);
  assert.match(auditPanelSource, /data-admin-audit-group-mode/);
  assert.match(auditPanelSource, /data-admin-audit-visibility/);
  assert.match(auditPanelSource, /data-admin-audit-category/);
  assert.match(auditPanelSource, /data-admin-audit-group/);
  assert.match(auditPanelSource, /data-admin-audit-event-row/);
  assert.match(auditPanelSource, /data-admin-audit-count/);
  assert.match(auditApiSource, /artifact\.copy/);
  assert.match(auditApiSource, /artifact\.export/);
  assert.doesNotMatch(trustSource, /buildAuditEvents/);
});

test("Repository persistence is split by domain modules", () => {
  const repositorySource = readFileSync(new URL("../src/lib/program-repository.ts", import.meta.url), "utf8");
  const programPersistenceSource = readFileSync(new URL("../src/lib/program-persistence.ts", import.meta.url), "utf8");
  const guidancePersistenceSource = readFileSync(new URL("../src/lib/guidance-persistence.ts", import.meta.url), "utf8");
  const artifactPersistenceSource = readFileSync(new URL("../src/lib/artifact-persistence.ts", import.meta.url), "utf8");
  const auditPersistenceSource = readFileSync(new URL("../src/lib/audit-persistence.ts", import.meta.url), "utf8");
  const userPersistenceSource = readFileSync(new URL("../src/lib/user-persistence.ts", import.meta.url), "utf8");

  assert.match(repositorySource, /createFileProgramPersistence/);
  assert.match(repositorySource, /createFileGuidancePersistence/);
  assert.match(repositorySource, /createFileArtifactPersistence/);
  assert.match(repositorySource, /createFileAuditPersistence/);
  assert.match(repositorySource, /createFileUserPersistence/);
  assert.doesNotMatch(repositorySource, /CREATE TABLE IF NOT EXISTS programs/);
  assert.match(programPersistenceSource, /createProgramUpdate/);
  assert.match(guidancePersistenceSource, /createGuidedPlan/);
  assert.match(guidancePersistenceSource, /createLeadershipFeedback/);
  assert.match(artifactPersistenceSource, /createRoleArtifact/);
  assert.match(auditPersistenceSource, /createAuditEvent/);
  assert.match(userPersistenceSource, /upsertManagedUser/);
});

test("Active Program review is split into state, cockpit, and team signal flows", () => {
  const reviewSectionSource = readFileSync(new URL("../src/components/active-program-review-section.tsx", import.meta.url), "utf8");
  const reviewControllerSource = readFileSync(new URL("../src/hooks/use-active-program-review-controller.ts", import.meta.url), "utf8");
  const reviewModelSource = readFileSync(new URL("../src/components/active-program-review-model.ts", import.meta.url), "utf8");
  const routeSource = readFileSync(new URL("../src/app/api/programs/[id]/updates/route.ts", import.meta.url), "utf8");
  const programPatchRouteSource = readFileSync(new URL("../src/app/api/programs/[id]/route.ts", import.meta.url), "utf8");
  const repositoryTypesSource = readFileSync(new URL("../src/lib/program-repository-types.ts", import.meta.url), "utf8");
  const programPersistenceSource = readFileSync(new URL("../src/lib/program-persistence.ts", import.meta.url), "utf8");
  const storeSource = readFileSync(new URL("../src/lib/program-store.ts", import.meta.url), "utf8");
  const stateFlowSource = readFileSync(new URL("../src/components/active-program-state-flow.tsx", import.meta.url), "utf8");
  const stateCardSource = readFileSync(new URL("../src/components/active-program-state-card.tsx", import.meta.url), "utf8");
  const clientUpdateCardSource = readFileSync(new URL("../src/components/active-program-client-update-card.tsx", import.meta.url), "utf8");
  const cockpitFlowSource = readFileSync(new URL("../src/components/active-program-cockpit-flow.tsx", import.meta.url), "utf8");
  const cockpitSource = readFileSync(new URL("../src/components/active-program-cockpit-card.tsx", import.meta.url), "utf8");
  const teamSignalFlowSource = readFileSync(new URL("../src/components/active-program-team-signal-flow.tsx", import.meta.url), "utf8");
  const programIntakeSource = readFileSync(new URL("../src/components/program-intake-section.tsx", import.meta.url), "utf8");
  const teamFootprintEditorSource = readFileSync(new URL("../src/components/team-footprint-editor.tsx", import.meta.url), "utf8");
  const adminUserManagementSource = readFileSync(new URL("../src/components/admin-user-management-card.tsx", import.meta.url), "utf8");
  const deliveryBoardSource = readFileSync(new URL("../src/components/active-program-delivery-board-card.tsx", import.meta.url), "utf8");
  const teamUpdatesSource = readFileSync(new URL("../src/components/active-program-team-updates-card.tsx", import.meta.url), "utf8");
  const meetingInputSource = readFileSync(new URL("../src/components/active-program-meeting-intelligence-card.tsx", import.meta.url), "utf8");
  const statusArtifactsSource = readFileSync(new URL("../src/components/active-program-status-artifacts-card.tsx", import.meta.url), "utf8");
  const sidebarSource = readFileSync(new URL("../src/components/active-program-sidebar.tsx", import.meta.url), "utf8");
  const activeProgramTypesSource = readFileSync(new URL("../src/lib/active-program-types.ts", import.meta.url), "utf8");
  const programLoopSource = readFileSync(new URL("../src/lib/program-loop-service.ts", import.meta.url), "utf8");
  const guidedGeneratorSource = readFileSync(new URL("../src/lib/guided-plan-generator.ts", import.meta.url), "utf8");
  const guidedProviderSource = readFileSync(new URL("../src/lib/guided-plan-openai-provider.ts", import.meta.url), "utf8");
  const artifactSuggestionSource = readFileSync(new URL("../src/lib/role-artifact-suggestions.ts", import.meta.url), "utf8");
  const artifactGeneratorSource = readFileSync(new URL("../src/lib/role-artifact-generator.ts", import.meta.url), "utf8");
  const artifactServiceSource = readFileSync(new URL("../src/lib/role-artifact-service.ts", import.meta.url), "utf8");
  const packageSource = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const activeProgramSaveSmokeSource = readFileSync(new URL("../scripts/smoke-active-program-save.mjs", import.meta.url), "utf8");
  const clientPortalSmokeSource = readFileSync(new URL("../scripts/smoke-client-portal.mjs", import.meta.url), "utf8");
  const clientIsolationSmokeSource = readFileSync(new URL("../scripts/smoke-client-isolation.mjs", import.meta.url), "utf8");
  const teamFootprintSmokeSource = readFileSync(new URL("../scripts/smoke-team-footprint.mjs", import.meta.url), "utf8");
  const productionSmokeSource = readFileSync(new URL("../scripts/smoke-production.mjs", import.meta.url), "utf8");
  const browserWebdriverSource = readFileSync(new URL("../scripts/browser-webdriver.mjs", import.meta.url), "utf8");
  const clientPortalPageSource = readFileSync(new URL("../src/app/client/page.tsx", import.meta.url), "utf8");
  const clientPortalDataSource = readFileSync(new URL("../src/lib/client-portal-data.ts", import.meta.url), "utf8");
  const clientPortalExportPageSource = readFileSync(new URL("../src/app/client/export/page.tsx", import.meta.url), "utf8");
  const clientPortalPdfRouteSource = readFileSync(new URL("../src/app/api/client-portal/export/pdf/route.ts", import.meta.url), "utf8");
  const clientPortalPdfSource = readFileSync(new URL("../src/lib/client-portal-pdf.ts", import.meta.url), "utf8");
  const clientPortalConsoleSource = readFileSync(new URL("../src/components/client-portal-console.tsx", import.meta.url), "utf8");
  const clientUpdatesRouteSource = readFileSync(new URL("../src/app/api/programs/[id]/client-updates/route.ts", import.meta.url), "utf8");
  const clientSafetySource = readFileSync(new URL("../src/lib/client-safe-copy.ts", import.meta.url), "utf8");

  assert.match(reviewSectionSource, /useActiveProgramReviewController/);
  assert.match(reviewSectionSource, /ActiveProgramStateFlow/);
  assert.match(reviewSectionSource, /ActiveProgramCockpitFlow/);
  assert.match(reviewSectionSource, /ActiveProgramClientUpdateCard/);
  assert.match(reviewSectionSource, /ActiveProgramTeamSignalFlow/);
  assert.match(programIntakeSource, /TeamFootprintEditor/);
  assert.match(teamSignalFlowSource, /TeamFootprintEditor/);
  assert.match(teamFootprintEditorSource, /data-team-footprint-editor/);
  assert.match(teamFootprintEditorSource, /data-team-footprint-bulk-toggle/);
  assert.match(teamFootprintEditorSource, /data-team-footprint-bulk-input/);
  assert.match(teamFootprintEditorSource, /data-team-footprint-apply-bulk/);
  assert.match(teamFootprintEditorSource, /data-team-footprint-role-library/);
  assert.match(teamFootprintEditorSource, /data-team-footprint-role-chip/);
  assert.match(teamFootprintEditorSource, /data-team-footprint-custom-role/);
  assert.match(teamFootprintEditorSource, /data-team-footprint-add-custom/);
  assert.match(teamFootprintEditorSource, /Advanced bulk edit/);
  assert.match(teamFootprintEditorSource, /Start with common delivery roles/);
  assert.doesNotMatch(teamFootprintEditorSource, /const nextIndex = roles\.length \+ 1/);
  assert.doesNotMatch(teamFootprintEditorSource, /New role/);
  assert.match(teamFootprintEditorSource, /draggable/);
  assert.match(teamFootprintEditorSource, /reorderRole/);
  assert.match(teamFootprintEditorSource, /data-team-footprint-row/);
  assert.match(adminUserManagementSource, /data-admin-footprint-context/);
  assert.match(adminUserManagementSource, /Footprint ownership/);
  assert.match(adminUserManagementSource, /getAssignmentFootprint/);
  assert.match(reviewControllerSource, /saveTeamFootprint/);
  assert.doesNotMatch(reviewSectionSource, /useRequestSequence/);
  assert.doesNotMatch(reviewSectionSource, /useForegroundRefresh/);
  assert.doesNotMatch(reviewSectionSource, /useCurrentUserAssignments/);
  assert.doesNotMatch(reviewSectionSource, /ActiveProgramStateCard/);
  assert.doesNotMatch(reviewSectionSource, /ActiveProgramTeamUpdatesCard/);
  assert.match(reviewControllerSource, /export function useActiveProgramReviewController/);
  assert.match(reviewControllerSource, /useRequestSequence/);
  assert.match(reviewControllerSource, /useForegroundRefresh/);
  assert.match(reviewControllerSource, /useCurrentUserAssignments/);
  assert.match(reviewControllerSource, /currentUserId: currentUser\?\.id \?\? null/);
  assert.doesNotMatch(reviewControllerSource, /const completion =/);
  assert.doesNotMatch(reviewControllerSource, /const programSynthesis =/);
  assert.doesNotMatch(reviewControllerSource, /const updateImpact =/);
  assert.match(routeSource, /export async function DELETE/);
  assert.match(routeSource, /Only tagged Active Program smoke updates can be pruned/);
  assert.match(routeSource, /deleteProgramUpdatesByTag/);
  assert.match(teamFootprintSmokeSource, /cleanupStaleSmokeFootprints/);
  assert.match(teamFootprintSmokeSource, /NORTHSTAR_TEAM_FOOTPRINT_SMOKE_CLEANUP_ONLY/);
  assert.match(teamFootprintSmokeSource, /isSmokeFootprintItem/);
  assert.match(programPatchRouteSource, /teamRoles: hasTeamFootprintPatch \? patchedTeamRoles : program\.intake\.teamRoles/);
  assert.match(repositoryTypesSource, /deleteProgramUpdatesByTag/);
  assert.match(programPersistenceSource, /review::text LIKE/);
  assert.match(storeSource, /export async function deleteProgramUpdatesByTag/);
  assert.match(reviewModelSource, /export function normalizeReview/);
  assert.match(stateFlowSource, /ActiveProgramStateCard/);
  assert.match(stateFlowSource, /Keep the program aligned as reality changes/);
  assert.match(stateFlowSource, /Select a program, then use the cockpit, role updates, and progress board/);
  assert.match(stateCardSource, /Select a program to manage the live operating view/);
  assert.match(stateCardSource, /Profile fields should change only when the program baseline changes/);
  assert.match(stateCardSource, /Client \/ executive update fields/);
  assert.match(stateCardSource, /The Client Portal changes only after a reviewed update is published/);
  assert.match(stateCardSource, /Program start/);
  assert.match(stateCardSource, /Expected finish/);
  assert.match(stateCardSource, /Manual % override/);
  assert.match(stateCardSource, /Client status note/);
  assert.match(stateCardSource, /const hasSelectedProgram = Boolean\(selectedProgramId\)/);
  assert.doesNotMatch(stateCardSource, /setIsSetupOpen\(!hasSelectedProgram\)/);
  assert.match(cockpitFlowSource, /ActiveProgramCockpitCard/);
  assert.match(cockpitSource, /Program cockpit/);
  assert.match(cockpitSource, /derivePhaseProgress/);
  assert.match(cockpitSource, /Phase progress/);
  assert.match(cockpitSource, /Basis: phase estimate from the saved current phase, not task completion\./);
  assert.match(cockpitSource, /phase estimate/);
  assert.match(cockpitSource, /Update program phase/);
  assert.match(cockpitSource, /data-active-program-phase-select/);
  assert.match(cockpitSource, /data-active-program-phase-save/);
  assert.match(cockpitSource, /Phase changes update the cockpit, Guided Plans timeline, and client executive view after save/);
  assert.match(cockpitSource, /Milestone/);
  assert.match(cockpitSource, /Top risk/);
  assert.match(cockpitSource, /Next decision/);
  assert.match(cockpitSource, /Leadership/);
  assert.match(teamSignalFlowSource, /ActiveProgramTeamUpdatesCard/);
  assert.match(teamSignalFlowSource, /ActiveProgramDeliveryBoardCard/);
  assert.match(teamSignalFlowSource, /data-active-program-workspace-tab/);
  assert.match(teamSignalFlowSource, /Role update/);
  assert.match(teamSignalFlowSource, /Progress board/);
  assert.match(teamSignalFlowSource, /Artifacts/);
  assert.match(teamSignalFlowSource, /deliveryBoardItems=\{deliveryBoardItems\}/);
  assert.match(teamSignalFlowSource, /onSaveDeliveryBoard=\{onSaveDeliveryBoard\}/);
  assert.match(teamSignalFlowSource, /currentUserId=\{currentUserId\}/);
  assert.match(teamSignalFlowSource, /selectedProgramId=\{selectedProgramId\}/);
  assert.match(teamSignalFlowSource, /ActiveProgramMeetingIntelligenceCard/);
  assert.match(teamSignalFlowSource, /ActiveProgramSidebar/);
  assert.match(teamSignalFlowSource, /artifacts=\{artifacts\}/);
  assert.doesNotMatch(teamSignalFlowSource, /programSynthesis=/);
  assert.doesNotMatch(teamSignalFlowSource, /updateImpact=/);
  assert.match(teamUpdatesSource, /Focus role/);
  assert.match(teamUpdatesSource, /data-active-role-focus/);
  assert.match(teamUpdatesSource, /roleFocusStorageKey/);
  assert.match(teamUpdatesSource, /north-star:active-program:role-focus/);
  assert.match(teamUpdatesSource, /persistFocusedRole/);
  assert.match(teamUpdatesSource, /Role update workspace/);
  assert.match(teamUpdatesSource, /Adjacent role context/);
  assert.match(teamUpdatesSource, /showOwnership/);
  assert.match(teamUpdatesSource, /No update this cycle/);
  assert.match(teamUpdatesSource, /data-active-role-signal-card/);
  assert.match(teamUpdatesSource, /data-active-role-progress/);
  assert.match(teamUpdatesSource, /data-active-role-risks/);
  assert.match(teamUpdatesSource, /data-active-role-decisions/);
  assert.match(teamUpdatesSource, /data-active-role-attachments/);
  assert.match(teamUpdatesSource, /data-active-role-save/);
  assert.match(teamUpdatesSource, /data-active-program-save-confirmation/);
  assert.match(meetingInputSource, /Add context/);
  assert.match(meetingInputSource, /showDetails/);
  assert.match(statusArtifactsSource, /Attach the artifacts that should shape program progress/);
  assert.match(sidebarSource, /This week timeline/);
  assert.match(sidebarSource, /data-active-program-timeline/);
  assert.match(sidebarSource, /data-active-program-timeline-event/);
  assert.match(sidebarSource, /break-words text-sm/);
  assert.match(sidebarSource, /whitespace-pre-line break-words text-xs/);
  assert.doesNotMatch(sidebarSource, /line-clamp-2 text-sm font-medium leading-6 text-zinc-100/);
  assert.doesNotMatch(sidebarSource, /line-clamp-3 text-xs leading-5 text-zinc-400/);
  assert.match(deliveryBoardSource, /data-active-delivery-board/);
  assert.match(deliveryBoardSource, /data-delivery-board-lane/);
  assert.match(deliveryBoardSource, /data-delivery-board-column/);
  assert.match(deliveryBoardSource, /data-delivery-board-card-open/);
  assert.match(deliveryBoardSource, /data-delivery-board-detail-panel/);
  assert.match(deliveryBoardSource, /data-delivery-board-detail-workspace/);
  assert.match(deliveryBoardSource, /data-delivery-board-detail-close/);
  assert.match(deliveryBoardSource, /data-delivery-board-detail-status-chip/);
  assert.match(deliveryBoardSource, /Task workspace/);
  assert.match(deliveryBoardSource, /Operating details/);
  assert.match(deliveryBoardSource, /sm:w-\[min\(780px,calc\(100vw-2rem\)\)\]/);
  assert.match(deliveryBoardSource, /setSelectedItemId\(null\)/);
  assert.match(deliveryBoardSource, /data-delivery-board-open-add/);
  assert.match(deliveryBoardSource, /data-delivery-board-add-panel/);
  assert.match(deliveryBoardSource, /role="dialog"/);
  assert.match(deliveryBoardSource, /aria-modal="true"/);
  assert.match(deliveryBoardSource, /setIsAddCardOpen\(false\)/);
  assert.match(deliveryBoardSource, /data-delivery-board-status-rail/);
  assert.match(deliveryBoardSource, /data-delivery-board-drop-target/);
  assert.match(deliveryBoardSource, /draggable/);
  assert.match(deliveryBoardSource, /handleDrop/);
  assert.match(deliveryBoardSource, /sortDeliveryBoardItemsByCreatedAt/);
  assert.match(deliveryBoardSource, /draggingItemId && roleItems\.length/);
  assert.match(deliveryBoardSource, /Drop to move/);
  assert.match(deliveryBoardSource, /data-delivery-board-attachment/);
  assert.match(deliveryBoardSource, /md:grid-cols-2 2xl:grid-cols-3/);
  assert.match(deliveryBoardSource, /No delivery cards for this role yet/);
  assert.match(deliveryBoardSource, /deliveryBoardStatusLabel\(item\.status\)/);
  assert.doesNotMatch(deliveryBoardSource, /Drop here or use card chips/);
  assert.doesNotMatch(deliveryBoardSource, /data-delivery-board-status-chips/);
  assert.doesNotMatch(deliveryBoardSource, /data-delivery-board-status-chip/);
  assert.doesNotMatch(deliveryBoardSource, /Open details to add context/);
  assert.doesNotMatch(deliveryBoardSource, /Move card/);
  assert.doesNotMatch(deliveryBoardSource, /Open details/);
  assert.doesNotMatch(deliveryBoardSource, /min-h-16 rounded-lg border/);
  assert.doesNotMatch(deliveryBoardSource, /lg:grid-cols-\[180px_minmax\(0,1fr\)_160px_160px\]/);
  assert.doesNotMatch(deliveryBoardSource, /lg:grid-cols-\[minmax\(0,1fr\)_180px_180px\]/);
  assert.doesNotMatch(deliveryBoardSource, /data-delivery-board-status"/);
  assert.doesNotMatch(deliveryBoardSource, /No \{deliveryBoardStatusLabel\(status\.value\)\.toLowerCase\(\)\} cards/);
  assert.doesNotMatch(deliveryBoardSource, /min-w-\[1180px\] grid-cols-5/);
  assert.doesNotMatch(deliveryBoardSource, /Select a delivery card to update details and attach evidence/);
  assert.match(deliveryBoardSource, /Save delivery board/);
  assert.match(deliveryBoardSource, /Delivery Board/);
  assert.match(activeProgramTypesSource, /export type DeliveryBoardItem/);
  assert.match(activeProgramTypesSource, /export type DeliveryBoardStatus/);
  assert.match(programLoopSource, /deliveryBoardItems: Array\.isArray\(review\.deliveryBoardItems\)/);
  assert.match(guidedGeneratorSource, /Delivery board shaping this plan/);
  assert.match(guidedGeneratorSource, /Delivery board signal/);
  assert.match(guidedProviderSource, /Delivery Board cards and attachments/);
  assert.match(artifactSuggestionSource, /delivery board card/);
  assert.match(artifactSuggestionSource, /Use Delivery Board cards and attachments/);
  assert.match(artifactGeneratorSource, /delivery board card/);
  assert.match(artifactServiceSource, /Delivery Board cards and attachments/);
  assert.match(sidebarSource, /What changed across roles, delivery board, leadership, meetings, and artifacts/);
  assert.match(sidebarSource, /kind: "delivery-board"/);
  assert.match(sidebarSource, /buildTimelineEvents/);
  assert.match(sidebarSource, /kind: "meeting"/);
  assert.match(sidebarSource, /kind: "artifact"/);
  assert.doesNotMatch(sidebarSource, /Program synthesis/);
  assert.doesNotMatch(sidebarSource, /Review readiness/);
  assert.doesNotMatch(sidebarSource, /Update impact/);
  assert.match(packageSource, /smoke:active-program-save/);
  assert.match(packageSource, /smoke:client-portal/);
  assert.match(packageSource, /scripts\/smoke-client-portal\.mjs/);
  assert.match(activeProgramSaveSmokeSource, /data-active-role-signal-card/);
  assert.match(activeProgramSaveSmokeSource, /data-active-program-save-confirmation/);
  assert.match(activeProgramSaveSmokeSource, /populateExecutiveClientPortalFields/);
  assert.match(activeProgramSaveSmokeSource, /publishClientFacingUpdate/);
  assert.match(activeProgramSaveSmokeSource, /data-active-client-update-publish/);
  assert.match(activeProgramSaveSmokeSource, /\/client-updates/);
  assert.match(activeProgramSaveSmokeSource, /Client update published/);
  assert.match(activeProgramSaveSmokeSource, /verifyClientPortalExecutiveFields/);
  assert.match(activeProgramSaveSmokeSource, /data-active-executive-sponsor/);
  assert.match(activeProgramSaveSmokeSource, /data-active-client-status-note/);
  assert.match(activeProgramSaveSmokeSource, /smoke=client-portal-executive-fields/);
  assert.match(activeProgramSaveSmokeSource, /data-client-program-option/);
  assert.match(activeProgramSaveSmokeSource, /data-client-program-detail/);
  assert.match(activeProgramSaveSmokeSource, /verifyOperatingView/);
  assert.match(activeProgramSaveSmokeSource, /Program cockpit/);
  assert.match(activeProgramSaveSmokeSource, /Focus role/);
  assert.match(activeProgramSaveSmokeSource, /data-active-program-workspace-tab/);
  assert.match(activeProgramSaveSmokeSource, /This week timeline/);
  assert.match(activeProgramSaveSmokeSource, /data-active-delivery-board/);
  assert.match(activeProgramSaveSmokeSource, /data-delivery-board-open-add/);
  assert.match(activeProgramSaveSmokeSource, /data-delivery-board-add-panel/);
  assert.match(activeProgramSaveSmokeSource, /data-delivery-board-title/);
  assert.match(activeProgramSaveSmokeSource, /data-delivery-board-card-open/);
  assert.match(activeProgramSaveSmokeSource, /data-delivery-board-detail-panel/);
  assert.match(activeProgramSaveSmokeSource, /data-delivery-board-detail-close/);
  assert.match(activeProgramSaveSmokeSource, /data-delivery-board-detail-status-chip/);
  assert.match(activeProgramSaveSmokeSource, /data-delivery-board-drop-target/);
  assert.match(activeProgramSaveSmokeSource, /DragEvent/);
  assert.match(activeProgramSaveSmokeSource, /compact drag targets visible/);
  assert.doesNotMatch(activeProgramSaveSmokeSource, /data-delivery-board-status-chip/);
  assert.doesNotMatch(activeProgramSaveSmokeSource, /moved by status chip/);
  assert.match(activeProgramSaveSmokeSource, /data-delivery-board-attachment/);
  assert.match(activeProgramSaveSmokeSource, /deliveryBoardItems/);
  assert.match(activeProgramSaveSmokeSource, /roleFormOpen/);
  assert.match(activeProgramSaveSmokeSource, /NORTHSTAR_SMOKE_AUTH_MODE/);
  assert.match(activeProgramSaveSmokeSource, /authMode !== "site"/);
  assert.match(activeProgramSaveSmokeSource, /encodeURIComponent\(arguments\[0\]\)/);
  assert.match(activeProgramSaveSmokeSource, /NORTHSTAR_SMOKE_CLEANUP/);
  assert.match(activeProgramSaveSmokeSource, /method: "DELETE"/);
  assert.match(activeProgramSaveSmokeSource, /refreshGuidance/);
  assert.match(activeProgramSaveSmokeSource, /captureMobileRoleFocusScreenshot/);
  assert.match(activeProgramSaveSmokeSource, /NORTHSTAR_SMOKE_MOBILE_SCREENSHOT/);
  assert.match(activeProgramSaveSmokeSource, /NORTHSTAR_SMOKE_SCREENSHOT_DIR/);
  assert.match(activeProgramSaveSmokeSource, /setWindowRect/);
  assert.match(activeProgramSaveSmokeSource, /screenshot/);
  assert.match(browserWebdriverSource, /async setWindowRect/);
  assert.match(browserWebdriverSource, /async screenshot/);
  assert.match(browserWebdriverSource, /"\/screenshot"/);
  assert.match(clientPortalSmokeSource, /NORTHSTAR_TEST_USER_EMAIL/);
  assert.match(clientPortalSmokeSource, /\/api\/auth\/user\/login/);
  assert.match(clientPortalSmokeSource, /\/api\/programs/);
  assert.match(clientPortalSmokeSource, /\/client-updates/);
  assert.match(clientPortalSmokeSource, /method: "POST"/);
  assert.match(clientPortalSmokeSource, /Client Portal smoke status/);
  assert.match(clientPortalSmokeSource, /smoke=client-portal-seeded-update/);
  assert.match(clientPortalSmokeSource, /Portfolio Dashboard/);
  assert.match(clientPortalSmokeSource, /data-client-program-option/);
  assert.match(clientPortalSmokeSource, /data-client-program-detail/);
  assert.match(clientPortalSmokeSource, /NORTHSTAR_CLIENT_PORTAL_SCREENSHOT_SMOKE/);
  assert.match(clientPortalSmokeSource, /captureClientPortalScreenshots/);
  assert.match(clientPortalSmokeSource, /Client Portal desktop screenshot layout/);
  assert.match(clientPortalSmokeSource, /data-client-hero-metric='current-phase'/);
  assert.match(clientPortalSmokeSource, /metrics\.length === 2/);
  assert.match(clientPortalSmokeSource, /client-portal-desktop\.png/);
  assert.match(clientPortalSmokeSource, /client-portal-mobile\.png/);
  assert.match(clientPortalSmokeSource, /verifyClientPortalPdfExport/);
  assert.match(clientPortalSmokeSource, /PDF export is nonblank/);
  assert.match(clientPortalSmokeSource, /method: "DELETE"/);
  assert.match(clientPortalSmokeSource, /NORTHSTAR_CLIENT_PORTAL_SMOKE_CLEANUP/);
  assert.match(clientUpdateCardSource, /data-active-client-update-builder/);
  assert.match(clientUpdateCardSource, /data-active-client-update-overall-status/);
  assert.match(clientUpdateCardSource, /Governed client publication layer/);
  assert.match(clientUpdateCardSource, /Internal role updates, blockers, and working notes remain private/);
  assert.match(clientUpdateCardSource, /Client-safe copy rules block/);
  assert.match(clientUpdateCardSource, /data-active-client-update-confirmation/);
  assert.match(clientUpdateCardSource, /buildInitialClientUpdateDraft/);
  assert.match(clientUpdateCardSource, /data-active-client-update-overview[\s\S]*value=\{draft\.executiveOverview\}/);
  assert.match(clientUpdateCardSource, /data-active-client-update-overview[\s\S]*updateField\("executiveOverview"/);
  assert.match(clientUpdateCardSource, /data-active-client-update-narrative[\s\S]*value=\{draft\.clientStatusNote\}/);
  assert.match(clientUpdateCardSource, /Loaded latest published client update/);
  assert.match(clientUpdateCardSource, /This latest snapshot stays loaded for iteration/);
  assert.match(clientUpdateCardSource, /clientRoadmapItems: latestUpdate\?\.clientRoadmapItems/);
  assert.match(clientUpdatesRouteSource, /validateClientPortalUpdateInput/);
  assert.match(clientUpdatesRouteSource, /Client-facing update contains internal or tactical language/);
  assert.match(clientUpdatesRouteSource, /client\.update\.publish/);
  assert.match(clientUpdatesRouteSource, /client\.update\.delete/);
  assert.match(clientSafetySource, /commercial-private/);
  assert.match(clientPortalPageSource, /loadClientPortalData/);
  assert.match(clientPortalDataSource, /listClientPortalUpdates/);
  assert.match(clientPortalDataSource, /listClientDecisionRequests/);
  assert.doesNotMatch(clientPortalDataSource, /listProgramUpdates/);
  assert.match(clientPortalConsoleSource, /data-client-export-portfolio/);
  assert.doesNotMatch(clientPortalConsoleSource, /data-client-export-program/);
  assert.doesNotMatch(clientPortalConsoleSource, /metricId="percent-complete"/);
  assert.doesNotMatch(clientPortalConsoleSource, /Client-visible work/);
  assert.match(clientPortalConsoleSource, /Download PDF/);
  assert.match(clientPortalConsoleSource, /\/api\/client-portal\/export\/pdf/);
  assert.doesNotMatch(clientPortalConsoleSource, /\/client\/export\?scope=portfolio/);
  assert.match(clientPortalPdfRouteSource, /"content-type": "application\/pdf"/);
  assert.match(clientPortalPdfRouteSource, /"content-disposition": `attachment; filename="\$\{filename\}"/);
  assert.match(clientPortalPdfRouteSource, /after\(\(\) =>/);
  assert.match(clientPortalPdfRouteSource, /client\.portal\.export/);
  assert.match(clientPortalPdfSource, /%PDF-1\.4/);
  assert.match(clientPortalPdfSource, /clientRoadmapTitle/);
  assert.match(clientPortalPdfSource, /buildClientRoadmapMonths/);
  assert.match(clientPortalPdfSource, /roadmapStatusColors/);
  assert.match(clientPortalPdfSource, /WORK ITEM/);
  assert.match(clientPortalPdfSource, /roadmapStatusLabels\[item\.status\]\.toUpperCase\(\)/);
  assert.doesNotMatch(clientPortalPdfSource, /Client-visible work/);
  assert.match(clientPortalPdfSource, /Upcoming Work \(Next 2 Weeks\)/);
  assert.doesNotMatch(clientPortalPdfSource, /Report Basis/);
  assert.match(clientPortalExportPageSource, /loadClientPortalData/);
  assert.match(clientPortalExportPageSource, /client\.portal\.export/);
  assert.match(clientPortalExportPageSource, /Print \/ Save PDF/);
  assert.doesNotMatch(clientPortalExportPageSource, /Report Basis/);
  assert.doesNotMatch(clientPortalExportPageSource, /Internal working-team updates/);
  assert.doesNotMatch(clientPortalPageSource, /listProgramUpdates/);
  assert.match(productionSmokeSource, /active program save \+ client portal/);
  assert.match(productionSmokeSource, /client portal seeded update/);
  assert.match(productionSmokeSource, /client portal isolation/);
  assert.match(clientIsolationSmokeSource, /data-client-portfolio-option/);
  assert.match(clientIsolationSmokeSource, /leaked non-selected client portfolio name/);
  assert.match(clientIsolationSmokeSource, /NORTHSTAR_CLIENT_ISOLATION_FORBIDDEN_CLIENTS/);
  assert.match(productionSmokeSource, /team footprint propagation/);
  assert.match(packageSource, /smoke:client-isolation/);
  assert.match(packageSource, /smoke:team-footprint/);
});

test("chat guidance is disabled and client decisions still write audit events", () => {
  const assistantRouteSource = readFileSync(new URL("../src/app/api/assistant/route.ts", import.meta.url), "utf8");
  const clientDecisionSource = readFileSync(new URL("../src/app/api/programs/[id]/client-decisions/route.ts", import.meta.url), "utf8");
  const auditTypesSource = readFileSync(new URL("../src/lib/audit-event-types.ts", import.meta.url), "utf8");
  const auditHistorySource = readFileSync(new URL("../src/components/admin-audit-history-panel.tsx", import.meta.url), "utf8");
  const adminCostSource = readFileSync(new URL("../src/components/admin-operating-cost-center.tsx", import.meta.url), "utf8");
  const packageSource = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const smokeSource = readFileSync(new URL("../scripts/smoke-chat-disabled.mjs", import.meta.url), "utf8");
  const productionSmokeSource = readFileSync(new URL("../scripts/smoke-production.mjs", import.meta.url), "utf8");

  assert.match(auditTypesSource, /guide\.dialogue/);
  assert.match(auditTypesSource, /client\.decision\.create/);
  assert.match(auditTypesSource, /client\.portal\.export/);
  assert.match(auditHistorySource, /Client report exported/);
  assert.match(assistantRouteSource, /status: 410/);
  assert.match(assistantRouteSource, /chat guidance has been disabled/);
  assert.match(adminCostSource, /data-admin-cost-guardrail/);
  assert.match(adminCostSource, /Open-ended chat disabled/);
  assert.match(packageSource, /smoke:chat-disabled/);
  assert.match(packageSource, /smoke:production/);
  assert.match(smokeSource, /\/assistant/);
  assert.match(smokeSource, /\/api\/assistant/);
  assert.match(smokeSource, /response\.status !== 410/);
  assert.match(productionSmokeSource, /smoke-chat-disabled\.mjs/);
  assert.match(clientDecisionSource, /eventType: "client\.decision\.create"/);
});

test("production releases have one documented smoke verification path", () => {
  const readmeSource = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const deploymentSource = readFileSync(new URL("../DEPLOYMENT.md", import.meta.url), "utf8");
  const projectMapSource = readFileSync(new URL("../docs/northstar-project-map.md", import.meta.url), "utf8");
  const checklistSource = readFileSync(new URL("../docs/northstar-release-checklist.md", import.meta.url), "utf8");

  assert.match(readmeSource, /SMOKE_BASE_URL=https:\/\/www\.north-star\.live npm run smoke:production/);
  assert.match(readmeSource, /NorthStar release checklist/);
  assert.match(projectMapSource, /smoke:production/);
  assert.match(deploymentSource, /docs\/northstar-release-checklist\.md/);
  assert.match(deploymentSource, /guidedPlanProvider: openai/);
  assert.match(deploymentSource, /chatGuideEnabled: false/);
  assert.doesNotMatch(deploymentSource, /Ask the Assistant/);
  assert.doesNotMatch(deploymentSource, /assistantProvider/);
  assert.match(checklistSource, /npm run qa:ensure-user/);
  assert.match(checklistSource, /SMOKE_BASE_URL=https:\/\/www\.north-star\.live npm run smoke:production/);
  assert.match(checklistSource, /NORTHSTAR_TEST_USER_EMAIL/);
  assert.match(checklistSource, /NORTHSTAR_TEST_USER_PASSWORD/);
  assert.match(checklistSource, /\/api\/assistant/);
  assert.match(checklistSource, /410/);
  assert.match(checklistSource, /Admin Trust & Operations documentation freshness panel/);
  assert.match(checklistSource, /prune/);
});

test("legacy assistant program API and database surfaces are retired", () => {
  const repositoryTypesSource = readFileSync(new URL("../src/lib/program-repository-types.ts", import.meta.url), "utf8");
  const repositorySharedSource = readFileSync(new URL("../src/lib/program-repository-shared.ts", import.meta.url), "utf8");
  const prismaSource = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const rlsCheckSource = readFileSync(new URL("../scripts/check-supabase-rls.mjs", import.meta.url), "utf8");

  assert.equal(existsSync(new URL("../src/app/api/programs/[id]/assistant-briefing/route.ts", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/app/api/programs/[id]/assistant-conversations/route.ts", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/lib/assistant-conversation-types.ts", import.meta.url)), false);
  assert.doesNotMatch(repositoryTypesSource, /AssistantConversation/);
  assert.doesNotMatch(repositorySharedSource, /CREATE TABLE IF NOT EXISTS assistant_conversations/);
  assert.doesNotMatch(prismaSource, /model AssistantConversation/);
  assert.match(rlsCheckSource, /retiredAppTables = \["assistant_conversations"\]/);
});

test("Admin can manage OpenAI guidance model settings", () => {
  const adminSource = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
  const costCenterSource = readFileSync(new URL("../src/components/admin-operating-cost-center.tsx", import.meta.url), "utf8");
  const modelCardSource = readFileSync(new URL("../src/components/admin-guidance-model-settings-card.tsx", import.meta.url), "utf8");
  const routeSource = readFileSync(new URL("../src/app/api/admin/model-settings/route.ts", import.meta.url), "utf8");
  const routeAccessSource = readFileSync(new URL("../src/lib/api-route-access.ts", import.meta.url), "utf8");
  const adminUsersRouteSource = readFileSync(new URL("../src/app/api/admin/users/route.ts", import.meta.url), "utf8");
  const setupLinkRouteSource = readFileSync(new URL("../src/app/api/admin/users/setup-link/route.ts", import.meta.url), "utf8");
  const adminRolesRouteSource = readFileSync(new URL("../src/app/api/admin/programs/[id]/roles/route.ts", import.meta.url), "utf8");
  const vercelRouteSource = readFileSync(new URL("../src/app/api/admin/vercel-operations/route.ts", import.meta.url), "utf8");
  const billingRouteSource = readFileSync(new URL("../src/app/api/openai-billing/route.ts", import.meta.url), "utf8");
  const leadershipQueueRouteSource = readFileSync(new URL("../src/app/api/leadership/review-queue/route.ts", import.meta.url), "utf8");
  const leadershipFeedbackRouteSource = readFileSync(new URL("../src/app/api/programs/[id]/leadership-feedback/route.ts", import.meta.url), "utf8");
  const flagReviewRouteSource = readFileSync(new URL("../src/app/api/programs/[id]/guidance-feedback-flags/[flagId]/route.ts", import.meta.url), "utf8");
  const openAiUsageRouteSource = readFileSync(new URL("../src/app/api/programs/[id]/openai-usage/route.ts", import.meta.url), "utf8");
  const packageSource = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const smokeSource = readFileSync(new URL("../scripts/smoke-admin-model-settings.mjs", import.meta.url), "utf8");
  const auditSmokeSource = readFileSync(new URL("../scripts/smoke-admin-audit-export.mjs", import.meta.url), "utf8");
  const studioSmokeSource = readFileSync(new URL("../scripts/smoke-studio.mjs", import.meta.url), "utf8");
  const settingsSource = readFileSync(new URL("../src/lib/guidance-model-settings.ts", import.meta.url), "utf8");
  const guidedProviderSource = readFileSync(new URL("../src/lib/guided-plan-openai-provider.ts", import.meta.url), "utf8");
  const artifactProviderSource = readFileSync(new URL("../src/lib/role-artifact-service.ts", import.meta.url), "utf8");

  assert.match(adminSource, /getConfiguredGuidanceModelProfile/);
  assert.match(costCenterSource, /AdminGuidanceModelSettingsCard/);
  assert.match(modelCardSource, /Save model settings/);
  assert.match(modelCardSource, /\/api\/admin\/model-settings/);
  assert.match(modelCardSource, /data-admin-model-settings-confirmation/);
  assert.match(modelCardSource, /Model settings changed to/);
  assert.match(auditSmokeSource, /data-admin-documentation-freshness/);
  assert.match(auditSmokeSource, /Admin documentation freshness panel/);
  assert.match(auditSmokeSource, /Admin Trust & Operations verified/);
  assert.match(routeSource, /saveGuidanceModelSettings/);
  assert.match(routeSource, /model\.settings\.update/);
  assert.match(routeAccessSource, /requireAdminRouteAccess/);
  assert.match(routeAccessSource, /requireLeadershipRouteAccess/);
  assert.match(routeAccessSource, /requireSiteAccessRequest/);
  for (const source of [
    routeSource,
    adminUsersRouteSource,
    setupLinkRouteSource,
    adminRolesRouteSource,
    vercelRouteSource,
    billingRouteSource,
    leadershipQueueRouteSource,
    leadershipFeedbackRouteSource,
    flagReviewRouteSource,
    openAiUsageRouteSource
  ]) {
    assert.doesNotMatch(source, /async function requireAdminAccess/);
    assert.doesNotMatch(source, /async function requireLeadershipAccess/);
  }
  assert.match(routeSource, /requireAdminRouteAccess/);
  assert.match(adminUsersRouteSource, /requireAdminRouteAccess/);
  assert.match(setupLinkRouteSource, /requireAdminRouteAccess/);
  assert.match(adminRolesRouteSource, /requireAdminRouteAccess/);
  assert.match(vercelRouteSource, /requireAdminRouteAccess/);
  assert.match(billingRouteSource, /requireAdminRouteAccess/);
  assert.match(leadershipQueueRouteSource, /requireLeadershipRouteAccess/);
  assert.match(leadershipFeedbackRouteSource, /requireLeadershipRouteAccess/);
  assert.match(flagReviewRouteSource, /requireAdminRouteAccess/);
  assert.match(openAiUsageRouteSource, /requireAdminRouteAccess/);
  assert.match(packageSource, /smoke:admin-model/);
  assert.match(packageSource, /smoke:admin-audit/);
  assert.match(smokeSource, /reversibleSettings/);
  assert.match(smokeSource, /putSettings\(cookieHeader, testSettings\)/);
  assert.match(smokeSource, /reverted\.settings/);
  assert.match(auditSmokeSource, /verifyFilteredCsv/);
  assert.match(auditSmokeSource, /data-admin-audit-export/);
  assert.match(auditSmokeSource, /data-admin-audit-filter/);
  assert.match(studioSmokeSource, /NORTHSTAR_SMOKE_EXPORT_FORMAT \?\? "both"/);
  assert.match(studioSmokeSource, /data-studio-export-docx/);
  assert.match(studioSmokeSource, /data-studio-export-csv/);
  assert.match(settingsSource, /CREATE TABLE IF NOT EXISTS app_settings/);
  assert.match(guidedProviderSource, /getGuidanceModelSettings/);
  assert.match(artifactProviderSource, /getGuidanceModelSettings/);
});

test("Admin user removal is resilient and covered by production smoke", () => {
  const adminUsersRouteSource = readFileSync(new URL("../src/app/api/admin/users/route.ts", import.meta.url), "utf8");
  const adminUserManagementSource = readFileSync(new URL("../src/components/admin-user-management-card.tsx", import.meta.url), "utf8");
  const adminRemovalSmokeSource = readFileSync(new URL("../scripts/smoke-admin-user-removal.mjs", import.meta.url), "utf8");
  const productionSmokeSource = readFileSync(new URL("../scripts/smoke-production.mjs", import.meta.url), "utf8");
  const packageSource = readFileSync(new URL("../package.json", import.meta.url), "utf8");

  assert.match(adminUsersRouteSource, /const deletedUser = await deleteManagedUser\(userId\)/);
  assert.match(adminUsersRouteSource, /authDeletion = await deleteLinkedAuthUser\(user\)/);
  assert.match(adminUsersRouteSource, /authError: authDeletion\.error/);
  assert.match(adminUsersRouteSource, /auditError/);
  assert.match(adminUserManagementSource, /data-admin-user-management-status/);
  assert.match(adminUserManagementSource, /data-admin-user-row/);
  assert.match(adminUserManagementSource, /data-admin-user-remove/);
  assert.match(adminUserManagementSource, /credentials: "same-origin"/);
  assert.match(adminUserManagementSource, /item\.email\.trim\(\)\.toLowerCase\(\) !== removedUser\.email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(adminRemovalSmokeSource, /codex-remove-smoke-/);
  assert.match(adminRemovalSmokeSource, /data-admin-user-row/);
  assert.match(adminRemovalSmokeSource, /data-admin-user-remove/);
  assert.match(adminRemovalSmokeSource, /was removed from Admin/);
  assert.match(adminRemovalSmokeSource, /cleanupDisposableUsers/);
  assert.match(productionSmokeSource, /admin user removal/);
  assert.match(packageSource, /smoke:admin-user-removal/);
});

test("API routes use shared access helpers instead of one-off site checks", () => {
  const routeAccessSource = readFileSync(new URL("../src/lib/api-route-access.ts", import.meta.url), "utf8");
  const adminUserTypesSource = readFileSync(new URL("../src/lib/admin-user-types.ts", import.meta.url), "utf8");
  const clientDecisionsSource = readFileSync(
    new URL("../src/app/api/programs/[id]/client-decisions/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(routeAccessSource, /export async function requireProgramRouteAccess/);
  assert.match(routeAccessSource, /canAccessProgramScope\(currentUser, programId\)/);
  assert.match(routeAccessSource, /loadCurrentUser/);
  assert.match(adminUserTypesSource, /export function canAccessProgramScope/);
  assert.doesNotMatch(clientDecisionsSource, /function canAccessProgram/);

  const programScopedRoutes = [
    "bundle",
    "client-updates",
    "client-decisions",
    "guidance-feedback-flags",
    "guidance-justifications",
    "guided-plan",
    "leadership-signal",
    "meeting-inputs",
    "role-artifact-suggestions",
    "role-artifacts",
    "team-assignments",
    "updates"
  ];

  for (const route of programScopedRoutes) {
    const source = readFileSync(new URL(`../src/app/api/programs/[id]/${route}/route.ts`, import.meta.url), "utf8");
    assert.match(source, /requireProgramRouteAccess/);
    assert.doesNotMatch(source, /isSiteAccessRequestAuthorized/);
    assert.doesNotMatch(source, /createSiteAccessDeniedResponse/);
  }

  const siteScopedRoutes = [
    "src/app/api/artifacts/extract/route.ts",
    "src/app/api/artifacts/upload/route.ts",
    "src/app/api/assistant/route.ts",
    "src/app/api/audit-events/route.ts",
    "src/app/api/auth/leadership/login/route.ts",
    "src/app/api/auth/leadership/logout/route.ts",
    "src/app/api/auth/leadership/sso/route.ts",
    "src/app/api/health/route.ts",
    "src/app/api/me/route.ts",
    "src/app/api/programs/route.ts"
  ];

  for (const route of siteScopedRoutes) {
    const source = readFileSync(new URL(`../${route}`, import.meta.url), "utf8");
    assert.match(source, /requireSiteAccessRequest/);
    assert.doesNotMatch(source, /isSiteAccessRequestAuthorized/);
    assert.doesNotMatch(source, /createSiteAccessDeniedResponse/);
  }
});

test("Client Dashboard Contributor has a scoped publication lane", () => {
  const userTypesSource = readFileSync(new URL("../src/lib/admin-user-types.ts", import.meta.url), "utf8");
  const routeAccessSource = readFileSync(new URL("../src/lib/api-route-access.ts", import.meta.url), "utf8");
  const clientUpdatesRouteSource = readFileSync(
    new URL("../src/app/api/programs/[id]/client-updates/route.ts", import.meta.url),
    "utf8"
  );
  const clientDecisionsRouteSource = readFileSync(
    new URL("../src/app/api/programs/[id]/client-decisions/route.ts", import.meta.url),
    "utf8"
  );
  const clientPortalDataSource = readFileSync(new URL("../src/lib/client-portal-data.ts", import.meta.url), "utf8");
  const clientUpdatesPageSource = readFileSync(new URL("../src/app/client-updates/page.tsx", import.meta.url), "utf8");
  const appPageAccessSource = readFileSync(new URL("../src/lib/app-page-access.ts", import.meta.url), "utf8");
  const clientUpdatesConsoleSource = readFileSync(
    new URL("../src/components/client-dashboard-updates-console.tsx", import.meta.url),
    "utf8"
  );
  const navSource = readFileSync(new URL("../src/components/site-nav.tsx", import.meta.url), "utf8");
  const authLoginSource = readFileSync(new URL("../src/app/api/auth/user/login/route.ts", import.meta.url), "utf8");
  const programRouteSource = readFileSync(new URL("../src/app/api/programs/route.ts", import.meta.url), "utf8");
  const middlewareSource = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");
  const packageSource = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const productionSmokeSource = readFileSync(new URL("../scripts/smoke-production.mjs", import.meta.url), "utf8");
  const clientUpdatesSmokeSource = readFileSync(new URL("../scripts/smoke-client-dashboard-updates.mjs", import.meta.url), "utf8");

  assert.match(userTypesSource, /"client-dashboard-contributor"/);
  assert.match(userTypesSource, /canAccessClientDashboardScope/);
  assert.match(userTypesSource, /canAccessClientDashboardUpdateSurface/);
  assert.match(userTypesSource, /shouldScopeManagedUserPrograms/);
  assert.match(userTypesSource, /user\.userType === "admin"/);
  assert.match(routeAccessSource, /scope\?: "internal" \| "client-dashboard"/);
  assert.match(routeAccessSource, /isClientDashboardOnlyUserType/);
  assert.match(routeAccessSource, /canAccessProgramScope\(currentUser, programId\)/);
  assert.match(clientUpdatesRouteSource, /scope: "client-dashboard"/);
  assert.match(clientUpdatesRouteSource, /canAccessClientDashboardUpdateSurface/);
  assert.match(clientUpdatesRouteSource, /clientRoadmapItems/);
  assert.match(clientUpdatesRouteSource, /normalizeRoadmapStatus/);
  assert.match(clientDecisionsRouteSource, /scope: "client-dashboard"/);
  assert.match(clientUpdatesPageSource, /loadClientPortalData/);
  assert.match(clientUpdatesPageSource, /canAccessClientDashboardUpdateSurface/);
  assert.match(clientUpdatesPageSource, /shouldScopeManagedUserPrograms/);
  assert.match(clientUpdatesPageSource, /getAssignedProgramIdSet/);
  assert.match(clientPortalDataSource, /shouldScopeManagedUserPrograms/);
  assert.match(clientPortalDataSource, /getAssignedProgramIdSet/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-updates-console/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-overview[\s\S]*value=\{draft\.executiveOverview\}/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-overview[\s\S]*updateField\("executiveOverview"/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-roadmap-add/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-roadmap-row/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-roadmap-start/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-roadmap-end/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-roadmap-start-month/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-roadmap-start-year/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-roadmap-end-month/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-roadmap-end-year/);
  assert.match(clientUpdatesConsoleSource, /buildRoadmapYearOptions/);
  assert.match(clientUpdatesConsoleSource, /roadmapMonthOptions\.map/);
  assert.match(clientUpdatesConsoleSource, /roadmapYearOptions\.map/);
  assert.match(clientUpdatesConsoleSource, />Month</);
  assert.match(clientUpdatesConsoleSource, />Year</);
  assert.doesNotMatch(clientUpdatesConsoleSource, /type="month"/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-current-phase/);
  assert.match(clientUpdatesConsoleSource, /data-client-dashboard-overall-status/);
  assert.match(clientUpdatesConsoleSource, /buildClientDashboardDraft/);
  assert.match(clientUpdatesConsoleSource, /Loaded latest published update/);
  assert.match(clientUpdatesConsoleSource, /\/api\/programs\/\$\{encodeURIComponent\(selectedProgram\.id\)\}\/client-updates/);
  assert.match(clientUpdatesConsoleSource, /This latest snapshot stays loaded for iteration/);
  assert.match(clientUpdatesConsoleSource, /Publish to Client Portal/);
  assert.match(navSource, /Client Updates/);
  assert.match(navSource, /getVisibleNavItems/);
  assert.match(navSource, /pathname === "\/client-updates"/);
  assert.match(navSource, /const showAdminLink = currentUser\?\.userType === "admin"/);
  assert.match(authLoginSource, /\/client-updates/);
  assert.match(programRouteSource, /shouldScopeManagedUserPrograms/);
  assert.match(programRouteSource, /getAssignedProgramIdSet/);
  assert.match(programRouteSource, /isExternalOnlyUserType/);
  assert.match(middlewareSource, /pathname === "\/client-updates"/);
  assert.match(middlewareSource, /hasSupabaseAuthSession\(request\)/);
  assert.match(appPageAccessSource, /hasSupabaseAuthSession\(cookieStore\)/);
  assert.match(packageSource, /smoke:client-updates/);
  assert.match(productionSmokeSource, /smoke-client-dashboard-updates\.mjs/);
  assert.match(clientUpdatesSmokeSource, /data-client-dashboard-publish/);
  assert.match(clientUpdatesSmokeSource, /data-client-dashboard-overall-status/);
  assert.match(clientUpdatesSmokeSource, /verifyClientUpdateFormHydratesLatestSnapshot/);
  assert.match(clientUpdatesSmokeSource, /latest published snapshot reloads into the edit form/);
  assert.match(clientUpdatesSmokeSource, /client-updates/);
});

test("release checks are wired for local deployment hardening", () => {
  const packageSource = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const intakeSource = readFileSync(new URL("../src/components/program-intake-section.tsx", import.meta.url), "utf8");

  assert.match(packageSource, /"check:release": "npm run test && npm run lint && npm run build"/);
  assert.match(packageSource, /"lint": "node scripts\/lint\.mjs"/);
  assert.match(intakeSource, /Basis: required intake fields plus at least one uploaded artifact\./);
});
