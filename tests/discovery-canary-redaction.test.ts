import assert from "node:assert/strict";
import test from "node:test";
import { reviewDiscoveryFidelity } from "../src/lib/discovery-fidelity.ts";
import type { DiscoverySynthesis } from "../src/lib/discovery-studio-types.ts";

const rule = "Dashboard summaries and notification subject lines must not expose resident personal details.";
const first = "ResidentPersonalDetail-ALPHA-123";
const second = "ResidentPersonalDetail-BETA-456";

function fixture(markers = [first]) {
  const setup = `Create a request containing resident personal details: ${markers.map((marker) => `'${marker}'`).join(" and ")}.`;
  const quoted = markers.map((marker) => `'${marker}'`).join(" and ");
  const value: DiscoverySynthesis = {
    executiveSummary: rule, evidenceSummary: rule,
    capabilities: ["Protect resident personal details."], painPoints: ["General summaries expose personal details."],
    businessRules: [rule], assumptions: [], gaps: [], readinessScore: 40, readinessNarrative: "Review privacy configuration before commitment.",
    sourceCount: 1, generatedAt: "2026-10-19T00:00:00Z", provider: "openai",
    roadmap: [{ horizon: "Now", title: "Privacy", outcome: "Apply source-backed redaction", featureIds: ["F1"], dependencies: [] }],
    epics: [{ id: "E1", title: "Privacy", objective: "Protect personal details", featureIds: ["F1"], sourceIds: ["S1"] }],
    features: [{ id: "F1", epicId: "E1", title: "Summary privacy", description: "Redact personal details", outcome: "No personal details in general summaries", priority: "must", sourceIds: ["S1"] }],
    stories: [{
      id: "U1", epicId: "E1", featureId: "F1", title: "Redact summary channels",
      story: "As a service coordinator, I want resident personal details excluded from general summaries so that resident information is protected.",
      acceptanceCriteria: ["Dashboard summaries omit resident personal details.", "Notification subject lines omit resident personal details."],
      sourceIds: ["S1"], readiness: "needs-input",
      testCases: [
        { id: "T1", title: "Render the dashboard without seeded personal details", type: "happy-path", steps: [setup, "Open the dashboard summary"], expectedResult: `The dashboard summary is rendered without ${quoted}; the token is absent from the summary.` },
        { id: "T2", title: "Render the notification subject without seeded personal details", type: "edge", steps: [setup, "Trigger a configured notification and inspect its subject line"], expectedResult: `The notification subject line is displayed without ${quoted}.` }
      ]
    }]
  };
  const ledger = [{ id: "PRIVACY", sourceId: "S1", quote: rule, statement: rule, kind: "requirement" as const }];
  const coverage = [{ evidenceId: "PRIVACY", disposition: "implemented", storyIds: ["U1"], testIds: ["T1", "T2"], gapIds: [] }];
  const review = () => reviewDiscoveryFidelity(value, ledger, coverage, [{ id: "S1", text: rule }]);
  return { value, review };
}

test("rendered, displayed and shown without a directly seeded canary assert channel redaction", () => {
  for (const predicate of ["is rendered", "is displayed", "is shown", "renders", "displays", "shows"]) {
    const { value, review } = fixture();
    value.stories[0].testCases[0].expectedResult = `The dashboard summary ${predicate} without '${first}'.`;
    assert.deepEqual(review().errors, [], predicate);
  }
});

test("all seeded canaries must be absent, including lists after without", () => {
  const { value, review } = fixture([first, second]);
  assert.deepEqual(review().errors, []);
  value.stories[0].testCases[0].expectedResult = `The dashboard summary is rendered without '${first}'.`;
  assert.ok(review().errors.some((error) => /dashboard personal-data redaction/.test(error)));
  value.stories[0].testCases[0].expectedResult = `The dashboard summary is rendered without '${first}' but '${second}' is displayed.`;
  assert.ok(review().errors.some((error) => /dashboard personal-data redaction/.test(error)));
});

test("a rendered-without list retains every quoted seeded personal value", () => {
  const markers = ["Jane Example", "555-0100", "jane.example@example.test"];
  const { value, review } = fixture(markers);
  for (const item of value.stories[0].testCases) {
    const channel = item.id === "T1" ? "dashboard summary" : "notification subject line";
    item.expectedResult = `The ${channel} is rendered without '${markers[0]}', '${markers[1]}', or '${markers[2]}'.`;
  }
  assert.deepEqual(review().errors, []);
});

test("negated rendering without a canary is not proof of absence", () => {
  for (const predicate of ["is not rendered", "is never displayed", "isn't shown", "cannot be rendered", "is not currently rendered"]) {
    const { value, review } = fixture();
    value.stories[0].testCases[0].expectedResult = `The dashboard summary ${predicate} without '${first}'.`;
    assert.ok(review().errors.some((error) => /dashboard personal-data redaction/.test(error)), predicate);
  }
});

test("an explicit positive leak cannot coexist with a without-canary assertion", () => {
  for (const expected of [
    `The dashboard summary is rendered without '${first}' but displays '${first}'.`,
    `The dashboard summary is rendered without '${first}' and renders '${first}'.`,
    `The dashboard summary is rendered without '${first}' and with '${first}'.`,
    `The dashboard summary is displayed without '${first}', with '${first}'.`,
    `The dashboard summary is rendered with '${first}'.`,
    `The dashboard summary is shown without '${first}', and '${first}' is displayed.`
  ]) {
    const { value, review } = fixture();
    value.stories[0].testCases[0].expectedResult = expected;
    assert.ok(review().errors.some((error) => /dashboard personal-data redaction/.test(error)), expected);
  }
});

test("elided with-phrases cannot reintroduce any seeded canary", () => {
  for (const included of [first, second]) {
    const { value, review } = fixture([first, second]);
    value.stories[0].testCases[0].expectedResult = `The dashboard summary is shown without '${first}' and '${second}', and with '${included}'.`;
    assert.ok(review().errors.some((error) => /dashboard personal-data redaction/.test(error)), included);
  }
  const { value, review } = fixture();
  value.stories[0].testCases[0].expectedResult = `The dashboard summary is rendered without '${first}' and not with '${first}'.`;
  assert.deepEqual(review().errors, []);
});

test("unseeded values and quoted UI labels do not prove personal-data redaction", () => {
  for (const setup of ["Create a request.", 'Open the saved view "Pilot Dashboard".']) {
    const { value, review } = fixture();
    value.stories[0].testCases[0].steps = [setup, "Open the dashboard summary"];
    assert.ok(review().errors.some((error) => /dashboard personal-data redaction/.test(error)), setup);
  }
  const { value, review } = fixture();
  value.stories[0].testCases[0].expectedResult = "The dashboard summary is rendered without 'Unseeded-OTHER-999'.";
  assert.ok(review().errors.some((error) => /dashboard personal-data redaction/.test(error)));
  value.stories[0].testCases[0].steps.push('Select the saved view "Pilot Dashboard".');
  value.stories[0].testCases[0].expectedResult = 'The dashboard summary is rendered without "Pilot Dashboard".';
  assert.ok(review().errors.some((error) => /dashboard personal-data redaction/.test(error)));
});

test("each source-named output channel must independently exclude its seeded canary", () => {
  const { value, review } = fixture();
  value.stories[0].testCases[1].expectedResult = `The notification subject line displays '${first}'.`;
  assert.ok(review().errors.some((error) => /notification personal-data redaction/.test(error)));
});
