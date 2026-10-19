import type { DiscoverySynthesis, DiscoveryTestCase } from "./discovery-studio-types.ts";

type FidelityDefinition = Omit<DiscoverySynthesis, "sourceCount" | "generatedAt" | "provider">;

export const discoveryEvidenceFidelityInstructions = [
  "Build evidenceLedger as atomic, source-backed assertions covering every material fact, requirement, proposal, exclusion and unresolved decision. Give each a stable id, sourceId, exact contiguous source quote, kind (fact, requirement, proposal, open-question), and faithful statement. The quote may include a complete table row or extra context; the statement remains one atomic assertion. Two assertions may share one context quote. Every statement measurement must be supported by that quote, and every source measurement must survive across the combined statements, not merely appear inside quotes. Preserve the original actor, action, object, condition, exception and approval status; do not broaden a narrow prohibition to adjacent actions or all objects.",
  "Inventory EVERY quantitative baseline, baseline observation period, target, retention period, planning horizon and operational threshold, including proposed metrics. Preserve the number, comparison operator, unit, statistic (median is not mean), business/calendar basis, denominator, period, target-versus-achieved status and proposal/confirmation status. Exact quotes must include defining qualifiers, not just a convenient number. For mixed table rows use separate atomic baseline and target quotes; do not label a baseline as proposed because its target is proposed.",
  "Treat the previous generated package as an unverified draft, never source truth. Re-evaluate prior claims against raw sources and remove unsupported inherited claims. Explicit user-confirmed new context may clarify a decision; feedback or a proposed correction alone is not evidence of approval. Identify any conflict rather than silently choosing a policy.",
  "Identify risk-based verification obligations from the actual sources: permitted decision outcomes and missing-rationale validation, authorization/self-decision boundaries, complete immutable audit fields, privacy access/redaction, quantitative threshold boundaries, business calendars/pause rules, keyboard/screen-reader journeys, integration failures/retries, retention/deletion/legal holds. Unknown rules need precise owner-facing gaps; do not invent standards, retry counts, retention/deletion behavior, calendars or service levels. Return analytical findings and the ledger, not private reasoning."
].join(" ");

export const discoverySynthesisFidelityInstructions = [
  "The independent evidenceLedger is a coverage checklist, not permission to change source facts. Return evidenceCoverage with exactly one row per evidence id: evidenceId, disposition (implemented, context, proposal, gap), storyIds, testIds and gapIds. References must resolve to the actual final package. Requirements need relevant mapped stories and tests or a precise gap; unresolved questions need gaps, and proposals stay explicitly proposed with dependent stories needs-input. A claimed coverage row never substitutes for the actual visible content or test behavior.",
  "Carry every quantitative ledger assertion into the visible analysis, rules, outcomes or assumptions with its original value/comparator, unit, statistic, calendar basis, observation period and confirmation status. Do not omit secondary KPIs or proposed targets. Preserve measured baselines separately from proposed targets and achieved outcomes. Repeat qualifiers where an otherwise ambiguous assertion could change meaning. Prior generated content, including apparent business rules, must be corrected whenever unsupported by raw evidence.",
  "Do not broaden policy: a prohibition on approving one's own specific exception does not prohibit rejecting it or all own requests unless separately sourced. Cover a permitted rejection with rationale and a rejection attempt with empty rationale when those decision rules are stated. Test every source-required immutable audit field and tamper prevention, unauthorized sensitive-content access, and personal-data redaction in each stated output channel.",
  "Use risk-based scenarios, not a generic negative test merely to satisfy a count. For any service-level percentage intervention threshold include explicit below/equal/above cases and missing/unconfirmed configuration behavior. Calendar boundaries and pause/resume, keyboard and screen-reader journeys, retries/failure handling, retention/deletion/privacy must each have relevant test behavior or, for an unknown policy, a precise discovery gap. Use parameterized/configuration-dependent tests and mark affected stories needs-input rather than inventing thresholds, accessibility standards, retry policy or legal behavior. Expected results must assert observable behavior and required fields, not merely say success, an audit exists, or follow policy."
].join(" ");

export type DiscoveryEvidenceSource = { id: string; text: string };
export type DiscoveryEvidenceLedgerItem = {
  id: string; sourceId: string; quote: string;
  kind: "fact" | "requirement" | "proposal" | "open-question";
  statement: string;
};
type Coverage = {
  evidenceId: string; disposition: "implemented" | "context" | "proposal" | "gap";
  storyIds: string[]; testIds: string[]; gapIds: string[];
};

const strings = { type: "array", items: { type: "string" } };
const ledgerSchema = { type: "array", items: {
  type: "object", additionalProperties: false,
  properties: { id: { type: "string" }, sourceId: { type: "string" }, quote: { type: "string" }, kind: { type: "string", enum: ["fact", "requirement", "proposal", "open-question"] }, statement: { type: "string" } },
  required: ["id", "sourceId", "quote", "kind", "statement"]
} };
const coverageSchema = { type: "array", items: {
  type: "object", additionalProperties: false,
  properties: { evidenceId: { type: "string" }, disposition: { type: "string", enum: ["implemented", "context", "proposal", "gap"] }, storyIds: strings, testIds: strings, gapIds: strings },
  required: ["evidenceId", "disposition", "storyIds", "testIds", "gapIds"]
} };

export function withDiscoveryLedgerSchema<T extends { properties: Record<string, unknown>; required: readonly string[] }>(schema: T) {
  return { ...schema, properties: { ...schema.properties, evidenceLedger: ledgerSchema }, required: [...schema.required, "evidenceLedger"] };
}

export function withDiscoveryCoverageSchema<T extends { properties: Record<string, unknown>; required: readonly string[] }>(schema: T) {
  return { ...schema, properties: { ...schema.properties, evidenceCoverage: coverageSchema }, required: [...schema.required, "evidenceCoverage"] };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function nonempty(value: unknown): value is string { return typeof value === "string" && Boolean(value.trim()); }
function stringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every(nonempty) && new Set(value).size === value.length; }
function literal(value: string) { return value.replace(/\s+/g, " ").trim(); }
const numberWords: Record<string, string> = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", twenty: "20", thirty: "30", sixty: "60", eighty: "80", hundred: "100" };
function normalized(value: string) {
  return value.toLowerCase().replace(/[–—-]/g, " ").replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|sixty|eighty|hundred)\b/g, (word) => numberWords[word])
    .replace(/\bpercent\b/g, "%").replace(/\bworking\b/g, "business").replace(/[ \t\r]+/g, " ").replace(/ *\n */g, "\n").trim();
}
type Metric = { value: number; unit: string; comparator: string; index: number; text: string };
function metrics(text: string): Metric[] {
  const value = normalized(text);
  const pattern = /(?:(less than|under|below|at most|no more than|more than|over|above|at least|[<>]=?)\s*)?(\d+(?:\.\d+)?)\s*(%|(?:(?:business|calendar)\s+)?(?:hours?|days?|weeks?|months?|years?|minutes?|seconds?|regions?|offices?))(?=$|[\s,;:.|)])/g;
  return [...value.matchAll(pattern)].map((match) => ({
    value: Number(match[2]), unit: match[3].replace(/s$/, ""),
    comparator: /^(less than|under|below|<)$/.test(match[1] ?? "") ? "<" : /^(at most|no more than|<=)$/.test(match[1] ?? "") ? "<=" : /^(more than|over|above|>)$/.test(match[1] ?? "") ? ">" : /^(at least|>=)$/.test(match[1] ?? "") ? ">=" : "",
    index: match.index!, text: match[0]
  }));
}
function unitBase(unit: string) { return unit.replace(/^(?:business|calendar) /, ""); }
function metricMatches(expected: Metric, actual: Metric) {
  return expected.value === actual.value && unitBase(expected.unit) === unitBase(actual.unit)
    && (!/^(?:business|calendar) /.test(expected.unit) || expected.unit === actual.unit)
    && (!expected.comparator || expected.comparator === actual.comparator);
}
function metricContext(text: string, metric: Metric) {
  const value = normalized(text);
  const boundaries = [...value.matchAll(/[.;|]/g)].filter((match) => !(value[match.index! - 1]?.match(/\d/) && value[match.index! + 1]?.match(/\d/))).map((match) => match.index!);
  const start = boundaries.filter((index) => index < metric.index).at(-1) ?? -1;
  const end = boundaries.find((index) => index >= metric.index + metric.text.length) ?? value.length;
  return value.slice(start + 1, end);
}
function measurementRelated(reference: string, actual: string) {
  const ignored = new Set(["median", "average", "calendar", "business", "working", "baseline", "current", "target", "proposed", "confirmed", "hours", "weeks", "months", "years", "minutes", "seconds", "request", "requests", "requires", "require", "before", "after", "initial", "under", "below", "above"]);
  const stem = (word: string) => word.replace(/(?:ments?|ing|ed|s)$/, "").replace(/^approv(?:al|e)$/, "approv");
  const terms = normalized(reference).match(/[a-z]{5,}/g)?.filter((word) => !ignored.has(word)).map(stem) ?? [];
  const actualTerms = new Set(normalized(actual).match(/[a-z]{5,}/g)?.map(stem) ?? []);
  return !terms.length || terms.some((word) => actualTerms.has(word));
}
function sourceMetricStatistic(text: string, metric: Metric) {
  const value = normalized(text);
  const prefix = value.slice(0, metric.index);
  const suffix = value.slice(metric.index + metric.text.length, metric.index + metric.text.length + 45);
  // An observation window qualifies the measured statistic; it is not another median.
  // "Median delay is 3.8 days during the eight-week baseline" has one median measure.
  if (/\b(?:during|over|throughout|across|in|per|for)\s+(?:(?:the|an?|our|this|last|previous|preceding|current)\s+){0,2}$/.test(prefix)
    && /^\s*(?:long\s+)?(?:baseline|observation|reporting|sample|study|measurement)\b/.test(suffix)) return undefined;
  const line = prefix.slice(Math.max(prefix.lastIndexOf("\n"), prefix.lastIndexOf(". "), prefix.lastIndexOf(";")) + 1);
  const cells = line.split("|");
  // A bare table value inherits its measure label, but a target cell does not inherit
  // the baseline cell's modality/statistic merely because they share one row.
  const context = cells.at(-1)?.trim() ? cells.at(-1)! : cells.at(-2) ?? "";
  return context.match(/\b(median|average|mean)\b/g)?.at(-1);
}
const proposal = /\b(?:propos(?:al|ed)|candidate|indicative|unconfirmed|not (?:yet )?(?:approved|confirmed)|pending decision|pending (?:policy|scope|owner|sponsor|governance) (?:approval|confirmation|decision))\b/i;
const unknown = /\b(?:unconfirmed|unknown|not (?:yet )?(?:confirmed|documented|approved|defined)|open (?:technical )?(?:decisions?|questions?)|pending decision)\b/i;

function metricIsProposed(text: string, metric: Metric) {
  const value = normalized(text);
  const boundaries = [...value.matchAll(/[.;|\n]/g)].filter((match) => !(value[match.index! - 1]?.match(/\d/) && value[match.index! + 1]?.match(/\d/))).map((match) => match.index!);
  const start = boundaries.filter((index) => index < metric.index).at(-1) ?? -1;
  const end = boundaries.find((index) => index >= metric.index + metric.text.length) ?? value.length;
  const cell = value.slice(start + 1, end);
  const localIndex = metric.index - start - 1;
  const cellMetrics = metrics(cell);
  const prior = cellMetrics.filter((item) => item.index < localIndex).at(-1);
  const prefix = cell.slice(prior ? prior.index + prior.text.length : 0, localIndex);
  if (proposal.test(prefix)) return true;
  const following = cellMetrics.find((item) => item.index > localIndex);
  if (!following && proposal.test(cell.slice(localIndex + metric.text.length))) return true;
  // A bare table value can inherit a column/measure label, not an unrelated target
  // later in the row (e.g. 27% baseline | proposed target below 10%).
  if (!cell.slice(0, localIndex).trim() && value[start] === "|") {
    const previousStart = Math.max(value.lastIndexOf("|", start - 1), value.lastIndexOf("\n", start - 1));
    return proposal.test(value.slice(previousStart + 1, start));
  }
  return false;
}

// Exact quotations and source-wide quantitative coverage prevent a self-reported ledger from
// silently dropping measurable evidence. This supplements, rather than proves, semantic fidelity.
export function reviewDiscoveryEvidenceLedger(value: unknown, sources: DiscoveryEvidenceSource[]) {
  const errors: string[] = [];
  const ledger: DiscoveryEvidenceLedgerItem[] = [];
  if (!Array.isArray(value) || !value.length) return { ledger, errors: ["An atomic evidence ledger is required."] };
  const sourceMap = new Map(sources.map((source) => [source.id, source.text]));
  for (const input of value) {
    const item = record(input);
    if (!item || ![item.id, item.sourceId, item.quote, item.statement].every(nonempty) || !["fact", "requirement", "proposal", "open-question"].includes(String(item.kind))) {
      errors.push("An evidence ledger item is invalid."); continue;
    }
    const entry = item as unknown as DiscoveryEvidenceLedgerItem;
    const source = sourceMap.get(entry.sourceId);
    if (!source || !literal(source).includes(literal(entry.quote))) errors.push(`${entry.id} has an unverifiable source quotation.`);
    if (ledger.some((existing) => existing.id === entry.id)) errors.push("Evidence identifiers must be unique.");
    const quotedMetrics = metrics(entry.quote);
    const statementMetrics = metrics(entry.statement);
    for (const metric of statementMetrics) {
      const supported = quotedMetrics.filter((quoted) => metricMatches(quoted, metric));
      if (!supported.length) errors.push(`${entry.id} changes or invents a source measurement.`);
      const statistic = sourceMetricStatistic(entry.statement, metric);
      const quotedStatistics = supported.map((quoted) => sourceMetricStatistic(entry.quote, quoted)).filter(Boolean);
      if ((statistic && !quotedStatistics.includes(statistic)) || (quotedStatistics.length && !statistic)) errors.push(`${entry.id} changes or omits a source measurement statistic.`);
      if (supported.length && supported.every((quoted) => metricIsProposed(entry.quote, quoted)) && !["proposal", "open-question"].includes(entry.kind)) errors.push(`${entry.id} treats a proposed measurement as confirmed.`);
    }
    if (proposal.test(entry.statement) && !["proposal", "open-question"].includes(entry.kind)) errors.push(`${entry.id} treats proposed evidence as confirmed.`);
    ledger.push(entry);
  }
  for (const source of sources) {
    const items = ledger.filter((item) => item.sourceId === source.id);
    if (!items.length) errors.push(`${source.id} is missing from the atomic evidence ledger.`);
    const statementMetrics = items.flatMap((item) => metrics(item.statement));
    for (const metric of metrics(source.text)) {
      if (!statementMetrics.some((actual) => metricMatches(metric, actual))) errors.push(`${source.id} has a quantitative fact or target missing from the atomic evidence statements.`);
      const statistic = sourceMetricStatistic(source.text, metric);
      if (statistic && !items.some((item) => metrics(item.statement).some((actual) => metricMatches(metric, actual)) && new RegExp(`\\b${statistic}\\b`, "i").test(item.statement))) errors.push(`${source.id} has an atomic statement that strips a measurement's source statistic.`);
    }
  }
  return { ledger, errors: [...new Set(errors)] };
}

function visibleFields(synthesis: FidelityDefinition) {
  return [
    synthesis.executiveSummary, synthesis.evidenceSummary, ...synthesis.capabilities, ...synthesis.painPoints,
    ...synthesis.businessRules, ...synthesis.assumptions, synthesis.readinessNarrative,
    ...synthesis.roadmap.flatMap((item) => [item.horizon, item.title, item.outcome, ...item.dependencies]),
    ...synthesis.epics.flatMap((item) => [item.title, item.objective]),
    ...synthesis.features.flatMap((item) => [item.title, item.description, item.outcome]),
    ...synthesis.stories.flatMap((item) => [item.title, item.story, ...item.acceptanceCriteria]),
    ...synthesis.gaps.flatMap((item) => [item.title, item.description, item.question])
  ];
}
function testText(test: DiscoveryTestCase) { return [test.title, ...test.steps, test.expectedResult].join(" "); }
function actions(text: string) {
  const result = new Set<string>();
  for (const [action, pattern] of Object.entries({ approve: /\bapprov(?:e|es|ed|al|als|ing)\b/, reject: /\breject(?:s|ed|ion|ions|ing)?\b/, delete: /\bdelet(?:e|es|ed|ion|ing)\b/, publish: /\bpublish(?:es|ed|ing)?\b/, cancel: /\bcancel(?:s|led|ing)?\b/, edit: /\bedit(?:s|ed|ing)?\b/, assign: /\bassign(?:s|ed|ment|ing)?\b/ })) if (pattern.test(text)) result.add(action);
  return result;
}
function restrictiveSelfClauses(text: string) {
  return normalized(text).split(/[.;\n]/).map((part) => part.split(/\b(?:but|however|whereas)\b/)[0]).filter((part) => /\b(?:own|self)\b/.test(part) && /\b(?:cannot|can not|must not|may not|shall not|not allowed|prevent(?:s|ed)?|block(?:s|ed)?|den(?:y|ies|ied)|prohibit(?:s|ed)?|forbid(?:s|den)?)\b/.test(part));
}

export function reviewDiscoveryFidelity(synthesis: FidelityDefinition, ledger: DiscoveryEvidenceLedgerItem[], value: unknown, sources: DiscoveryEvidenceSource[]) {
  const errors = [...reviewDiscoveryEvidenceLedger(ledger, sources).errors];
  const warnings: string[] = [];
  const coverage: Coverage[] = [];
  if (!Array.isArray(value)) return { errors: [...errors, "Evidence-to-output coverage is required."], warnings };
  const stories = new Map(synthesis.stories.map((story) => [story.id, story]));
  const tests = new Map(synthesis.stories.flatMap((story) => story.testCases.map((test) => [test.id, { test, story }] as const)));
  const gaps = new Map(synthesis.gaps.map((gap) => [gap.id, gap]));
  for (const input of value) {
    const item = record(input);
    if (!item || !nonempty(item.evidenceId) || !["implemented", "context", "proposal", "gap"].includes(String(item.disposition)) || !stringArray(item.storyIds) || !stringArray(item.testIds) || !stringArray(item.gapIds)) {
      errors.push("An evidence coverage row is invalid."); continue;
    }
    const row = item as unknown as Coverage;
    if (!ledger.some((entry) => entry.id === row.evidenceId) || coverage.some((entry) => entry.evidenceId === row.evidenceId)) errors.push("Evidence coverage identifiers are unknown or duplicated.");
    if (row.storyIds.some((id) => !stories.has(id)) || row.testIds.some((id) => !tests.has(id)) || row.gapIds.some((id) => !gaps.has(id))) errors.push(`${row.evidenceId} has unresolved output references.`);
    if (row.testIds.some((id) => !row.storyIds.includes(tests.get(id)?.story.id ?? ""))) errors.push(`${row.evidenceId} cites tests outside its mapped stories.`);
    coverage.push(row);
  }
  const fields = visibleFields(synthesis);
  const allMetrics = fields.flatMap((text) => metrics(text));
  for (const item of ledger) {
    const row = coverage.find((entry) => entry.evidenceId === item.id);
    if (!row) { errors.push(`${item.id} has no evidence-to-output coverage.`); continue; }
    if (item.kind === "requirement" && row.disposition !== "gap" && (!row.storyIds.length || !row.testIds.length)) errors.push(`${item.id} needs mapped stories and relevant tests.`);
    if ((item.kind === "open-question" || row.disposition === "gap") && !row.gapIds.length) errors.push(`${item.id} needs a precise unresolved discovery gap.`);
    if (item.kind === "proposal" && !["proposal", "gap"].includes(row.disposition)) errors.push(`${item.id} promotes a proposal to a confirmed obligation.`);
    if (["proposal", "open-question"].includes(item.kind) && row.storyIds.some((id) => stories.get(id)?.readiness !== "needs-input")) errors.push(`${item.id} has unresolved evidence but marks a dependent story ready.`);
    for (const expected of metrics(item.statement)) {
      const expectedStatistic = sourceMetricStatistic(item.statement, expected);
      if (!allMetrics.some((actual) => metricMatches(expected, actual))) errors.push(`${item.id} omits or changes a quantified source fact, target, unit or comparator.`);
      for (const field of fields) {
        const candidates = metrics(field).filter((actual) => actual.value === expected.value && unitBase(actual.unit) === unitBase(expected.unit) && measurementRelated(item.statement, metricContext(field, actual)));
        if (candidates.some((actual) => /^(?:business|calendar) /.test(expected.unit) && /^(?:business|calendar) /.test(actual.unit) && actual.unit !== expected.unit)) errors.push(`${item.id} changes the measurement calendar or unit basis.`);
        if (candidates.some((actual) => expectedStatistic === "median" && /\b(?:average|mean)\b/i.test(metricContext(field, actual)))) errors.push(`${item.id} changes a median into a mean/average.`);
        if (candidates.some((actual) => ["average", "mean"].includes(expectedStatistic ?? "") && /\bmedian\b/i.test(metricContext(field, actual)))) errors.push(`${item.id} changes a mean/average into a median.`);
        if (candidates.some((actual) => item.kind === "proposal" && /\b(?:achieved|approved|confirmed|committed)\b/i.test(metricContext(field, actual)) && !proposal.test(metricContext(field, actual)))) errors.push(`${item.id} presents a proposed target as approved or achieved.`);
      }
    }
    const sourceRestrictions = restrictiveSelfClauses(item.statement);
    if (sourceRestrictions.length) {
      const allowedActions = actions(sourceRestrictions.join(" "));
      const mappedTests = row.testIds.flatMap((id) => tests.has(id) ? [tests.get(id)!.test] : []);
      if (!mappedTests.some((test) => test.type !== "happy-path" && /\b(?:self|own|same (?:user|actor|approver))\b/i.test(normalized(testText(test))) && [...allowedActions].some((action) => actions(normalized(testText(test))).has(action)) && (/\b(?:block(?:s|ed)?|prevent(?:s|ed)?|den(?:y|ies|ied)|forbid(?:s|den)?|cannot|not permitted|not allowed|remain(?:s)? pending)\b/i.test(test.expectedResult) || /\b(?:attempt|operation|command|submission)\b.{0,30}\brejected\b/i.test(test.expectedResult)))) errors.push(`${item.id} lacks a relevant self-decision authorization test.`);
    }
  }
  // Compare against all source-supported policies for the same object, not against every
  // unrelated rule individually (e.g. self-approval and self-publication may both be forbidden).
  const policies = sources.flatMap((source) => restrictiveSelfClauses(source.text).map((clause) => ({
    actions: actions(clause), scope: normalized(clause).match(/\bown\s+(.+?)(?:[.;]|$)/)?.[1]
  })));
  if (policies.length) {
    // A test title is not a grammatical prefix for all steps/results: "Block self-
    // approval" + "the attempt is rejected" must not become a ban on rejecting an exception.
    for (const clause of [...fields, ...[...tests.values()].flatMap(({ test }) => [test.title, ...test.steps, test.expectedResult])].flatMap(restrictiveSelfClauses)) {
      const objectPolicies = policies.filter((policy) => !policy.scope || clause.includes(policy.scope));
      const supportedActions = new Set(objectPolicies.flatMap((policy) => [...policy.actions]));
      if (!objectPolicies.length || [...actions(clause)].some((action) => !supportedActions.has(action))) errors.push("A self-decision restriction changes its source-supported action or object scope.");
    }
  }

  // These are conditional, source-driven risk checks, not universal product requirements.
  // Unknown policy is a gap, never a reason to invent calendar, retry or privacy behavior.
  // A behavior may reconcile several sources, so do not require duplicate tests merely
  // because an overview and a detailed policy both mention the same concern.
  const scopedTests = synthesis.stories.flatMap((story) => story.testCases);
  const sourceGaps = synthesis.gaps.map((gap) => [gap.title, gap.description, gap.question].join(" "));
  for (const source of sources) {
    const text = normalized(source.text);
    const hasTest = (pattern: RegExp, extra?: (test: DiscoveryTestCase) => boolean) => scopedTests.some((test) => pattern.test(normalized(testText(test))) && (!extra || extra(test)));
    const hasGap = (pattern: RegExp) => sourceGaps.some((gap) => pattern.test(normalized(gap)));
    const requireTestOrGap = (applicable: boolean, label: string, pattern: RegExp, gapAllowed = false) => {
      if (applicable && !hasTest(pattern) && !(gapAllowed && hasGap(pattern))) errors.push(`${source.id} needs risk-based coverage for ${label}.`);
    };
    if (/\breject(?:ion)?\b/.test(text) && /\b(?:non empty|approval and rejection|approve or reject)\b/.test(text)) {
      if (!hasTest(/\breject/, (test) => test.type === "happy-path" && /\b(?:record|persist|audit|success|rejected|reject)/i.test(test.expectedResult))) errors.push(`${source.id} needs a permitted rejection outcome test.`);
      if (/\b(?:non empty|required|requires?).{0,35}(?:explanation|rationale)|(?:explanation|rationale).{0,35}(?:non empty|required|requires?)/.test(text)
        && !hasTest(/\breject/, (test) => test.type !== "happy-path" && /\b(?:empty|blank|missing|without)\b/i.test(testText(test)) && /\b(?:explanation|rationale|reason)\b/i.test(testText(test)))) errors.push(`${source.id} needs rejection-without-rationale validation coverage.`);
    }
    for (const label of ["keyboard", "screen reader"] as const) requireTestOrGap(text.includes(label), label, new RegExp(`\\b${label}\\b`));
    requireTestOrGap(/\b(?:retry|retries)\b/.test(text), "integration retries", /\b(?:retry|retries)\b/, true);
    requireTestOrGap(/\b(?:retention|retained)\b/.test(text), "retention/deletion boundaries", /\b(?:retention|retain|retained|legal hold|deletion)\b/, true);
    for (const sentence of source.text.split(/(?<=[.!?])\s+|\n/).filter((part) => /\b(?:retention|retained)\b/i.test(part))) {
      for (const period of metrics(sentence).filter((metric) => /\b(?:year|month|day|week)$/.test(metric.unit))) {
        if (!scopedTests.some((test) => metrics(testText(test)).some((actual) => metricMatches(period, actual)) && /\b(?:before|until|boundary|expiry|expires|at least|minimum)\b/i.test(testText(test)) && /\b(?:retain|retained|preserve|preserved|available|unchanged)\b/i.test(test.expectedResult))) errors.push(`${source.id} needs a source-duration retention boundary test.`);
      }
    }
    if (/\b(?:sensitive|privacy)\b/.test(text) && /\b(?:only|restricted|restrict|protected)\b/.test(text)) {
      if (!hasTest(/\b(?:unassigned|unauthorized|not assigned|without (?:permission|access)|different (?:role|user))\b/, (test) => test.type !== "happy-path" && /\b(?:denied|blocked|not (?:disclosed|visible|exposed)|no (?:sensitive|personal|request) (?:content|details))\b/i.test(test.expectedResult))) errors.push(`${source.id} needs an unauthorized sensitive-content access test.`);
    }
    if (/\b(?:personal details|personal data|pii)\b/.test(text) && /\b(?:must not|not expose|redact)\b/.test(text)) {
      for (const channel of ["dashboard", "notification"] as const) {
        if (text.includes(channel) && !hasTest(new RegExp(`\\b${channel}\\b`), (test) => /\b(?:personal|sensitive|pii)\b/i.test(testText(test)) && /\b(?:not expose|not (?:visible|disclosed|included)|redact|masked|no (?:personal|sensitive)|omit)\b/i.test(test.expectedResult))) errors.push(`${source.id} needs a ${channel} personal-data redaction test.`);
      }
    }
    if (/\bimmutable audit\b/.test(text)) {
      const requiredFields = [
        ["actor", /\b(?:actor|who performed|user identity)\b/], ["timestamp", /\b(?:timestamp|time stamp|event time)\b/],
        ["prior state", /\b(?:prior|previous|old|before) state\b/], ["new state", /\b(?:new|next|after) state\b/], ["rationale", /\b(?:rationale|reason|explanation)\b/]
      ] as const;
      const expectedFields = requiredFields.filter(([, pattern]) => pattern.test(text));
      if (expectedFields.length && !scopedTests.some((test) => /\baudit\b/i.test(testText(test)) && expectedFields.every(([, pattern]) => pattern.test(normalized(test.expectedResult))))) errors.push(`${source.id} needs an audit test asserting every required event field.`);
      if (!hasTest(/\baudit\b/, (test) => test.type !== "happy-path" && /\b(?:edit|modify|modification|delete|tamper)\b/i.test(testText(test)) && /\b(?:denied|blocked|unchanged|immutable|prevent)\b/i.test(test.expectedResult))) errors.push(`${source.id} needs an immutable-audit tamper test.`);
    }
    requireTestOrGap(/\b(?:business|working day) calendar|\bpause.{0,10}(?:resume|rule|behavior)/.test(text), "calendar and pause/resume decisions", /\b(?:calendar|pause|resume)\b/, true);
    const threshold = [...text.matchAll(/\b(?:alert|intervention|flag|warn|reach)\w*\b[^.;\n]{0,120}?(\d+(?:\.\d+)?)\s*%[^.;\n]{0,100}/g)].find((match) => /\b(?:sla|service level|threshold)\b/.test(match[0]));
    if (threshold && /\b(?:alert|intervention|flag|reach|warning)\b/.test(text)) {
      const point = Number(threshold[1]);
      for (const [label, compare] of [["below", (value: number) => value < point], ["at", (value: number) => value === point], ["above", (value: number) => value > point]] as const) {
        if (!scopedTests.some((test) => {
          const input = normalized([test.title, ...test.steps].join(" "));
          return [...input.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].some((match) => {
            const prefix = input.slice(Math.max(0, match.index! - 24), match.index);
            if (/\b(?:below|under|less than)\s*$/.test(prefix)) return label === "below" && Number(match[1]) === point;
            if (/\b(?:above|over|more than)\s*$/.test(prefix)) return label === "above" && Number(match[1]) === point;
            return compare(Number(match[1]));
          });
        })) errors.push(`${source.id} needs an explicit ${label}-threshold service-level test.`);
      }
      if (/\b(?:not configured|missing|unconfirmed|require decisions|needs confirmation)\b/.test(text) && !hasTest(/\b(?:missing|not configured|without|unconfigured)\b/, (test) => /\b(?:sla|service level|configuration|target)\b/i.test(testText(test)) && /\b(?:gap|not invent|no (?:sla|target|percentage)|not (?:assume|calculate))\b/i.test(test.expectedResult)) && !hasGap(/\b(?:sla|service level).{0,80}(?:configuration|target|definition|confirm)|(?:configuration|target|confirm).{0,80}(?:sla|service level)\b/)) errors.push(`${source.id} needs missing-SLA configuration coverage or a precise decision gap.`);
    }
    const unresolvedFamilies = [
      ["content deletion", /\b(?:deletion|delete|request content)\b/], ["legal holds", /\blegal holds?\b/],
      ["encryption", /\bencryption\b/], ["access review", /\baccess review\b/],
      ["retry policy", /\b(?:retry|retries)\b/], ["business calendar", /\bcalendar\b/],
      ["pause/resume", /\b(?:pause|resume)\b/], ["accessibility standard", /\baccessibility (?:acceptance )?standard\b/]
    ] as const;
    for (const sentence of source.text.split(/(?<=[.!?])\s+|\n/).filter((part) => unknown.test(part))) {
      for (const [label, pattern] of unresolvedFamilies) if (pattern.test(normalized(sentence)) && !hasGap(pattern)) errors.push(`${source.id} needs a precise gap for unresolved ${label}.`);
    }
  }
  return { errors: [...new Set(errors)], warnings };
}
