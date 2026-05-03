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

  for (const role of ["Application Development", "Data Engineering", "Change Management", "Scrum Master", "Delivery Lead"]) {
    assert.match(source, new RegExp(`role: "${role}"`));
  }
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

  assert.match(adminSource, /AdminTrustOperationsCard/);
  assert.match(trustSource, /Trust & Operations/);
  assert.match(trustSource, /Permission model/);
  assert.match(trustSource, /Reliability indicators/);
  assert.match(trustSource, /Audit coverage/);
  assert.match(trustSource, /AdminAuditHistoryPanel/);
  assert.match(trustSource, /DOCX export/);
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
  assert.match(auditPanelSource, /exportAuditEvents\(filteredEvents\)/);
  assert.match(auditPanelSource, /data-admin-audit-export/);
  assert.match(auditPanelSource, /data-admin-audit-filter/);
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
  const reviewModelSource = readFileSync(new URL("../src/components/active-program-review-model.ts", import.meta.url), "utf8");
  const stateFlowSource = readFileSync(new URL("../src/components/active-program-state-flow.tsx", import.meta.url), "utf8");
  const cockpitFlowSource = readFileSync(new URL("../src/components/active-program-cockpit-flow.tsx", import.meta.url), "utf8");
  const teamSignalFlowSource = readFileSync(new URL("../src/components/active-program-team-signal-flow.tsx", import.meta.url), "utf8");

  assert.match(reviewSectionSource, /ActiveProgramStateFlow/);
  assert.match(reviewSectionSource, /ActiveProgramCockpitFlow/);
  assert.match(reviewSectionSource, /ActiveProgramTeamSignalFlow/);
  assert.doesNotMatch(reviewSectionSource, /ActiveProgramStateCard/);
  assert.doesNotMatch(reviewSectionSource, /ActiveProgramTeamUpdatesCard/);
  assert.match(reviewModelSource, /export function normalizeReview/);
  assert.match(stateFlowSource, /ActiveProgramStateCard/);
  assert.match(cockpitFlowSource, /ActiveProgramCockpitCard/);
  assert.match(teamSignalFlowSource, /ActiveProgramTeamUpdatesCard/);
  assert.match(teamSignalFlowSource, /ActiveProgramMeetingIntelligenceCard/);
  assert.match(teamSignalFlowSource, /ActiveProgramSidebar/);
});

test("Guide dialogue and client decisions write audit events", () => {
  const assistantRouteSource = readFileSync(new URL("../src/app/api/assistant/route.ts", import.meta.url), "utf8");
  const clientDecisionSource = readFileSync(new URL("../src/app/api/programs/[id]/client-decisions/route.ts", import.meta.url), "utf8");
  const auditTypesSource = readFileSync(new URL("../src/lib/audit-event-types.ts", import.meta.url), "utf8");

  assert.match(auditTypesSource, /guide\.dialogue/);
  assert.match(auditTypesSource, /client\.decision\.create/);
  assert.match(assistantRouteSource, /eventType: "guide\.dialogue"/);
  assert.match(clientDecisionSource, /eventType: "client\.decision\.create"/);
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
  const guideProviderSource = readFileSync(new URL("../src/lib/assistant-openai-provider.ts", import.meta.url), "utf8");
  const artifactProviderSource = readFileSync(new URL("../src/lib/role-artifact-service.ts", import.meta.url), "utf8");

  assert.match(adminSource, /getConfiguredGuidanceModelProfile/);
  assert.match(costCenterSource, /AdminGuidanceModelSettingsCard/);
  assert.match(modelCardSource, /Save model settings/);
  assert.match(modelCardSource, /\/api\/admin\/model-settings/);
  assert.match(modelCardSource, /data-admin-model-settings-confirmation/);
  assert.match(modelCardSource, /Model settings changed to/);
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
  assert.match(guideProviderSource, /getGuidanceModelSettings/);
  assert.match(artifactProviderSource, /getGuidanceModelSettings/);
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
    "assistant-briefing",
    "assistant-conversations",
    "bundle",
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
