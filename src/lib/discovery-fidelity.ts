import type { DiscoverySynthesis, DiscoveryTestCase } from "./discovery-studio-types.ts";

type FidelityDefinition = Omit<DiscoverySynthesis, "sourceCount" | "generatedAt" | "provider">;

export const discoveryEvidenceFidelityInstructions = [
  "Build evidenceLedger as atomic, source-backed assertions covering every material fact, requirement, proposal, exclusion and unresolved decision. Give each a stable id, sourceId, exact contiguous source quote, kind (fact, requirement, proposal, open-question), and faithful statement. The quote may include a complete table row or extra context; the statement remains one atomic assertion. Two assertions may share one context quote. Every statement measurement must be supported by that quote, and every source measurement must survive across the combined statements, not merely appear inside quotes. Preserve the original actor, action, object, condition, exception and approval status; do not broaden a narrow prohibition to adjacent actions or all objects.",
  "Inventory EVERY quantitative baseline, baseline observation period, target, retention period, planning horizon and operational threshold, including proposed metrics. Preserve the number, comparison operator, unit, statistic (median is not mean), business/calendar basis, denominator, period, target-versus-achieved status and proposal/confirmation status. Exact quotes must include defining qualifiers, not just a convenient number. For mixed table rows use separate atomic baseline and target quotes; do not label a baseline as proposed because its target is proposed.",
  "When a verified table's Measure label defines a statistic shared by its baseline and target, retain that statistic explicitly in BOTH atomic assertions. For example, a Median assignment time row defines a median baseline and a median target; each value cell still keeps its own calendar/business unit and approval status. Do not borrow a statistic stated only inside a baseline value cell for a different target, or borrow a label from another row or table. An explicit target-cell statistic remains distinct.",
  "Treat the previous generated package as an unverified draft, never source truth. Re-evaluate prior claims against raw sources and remove unsupported inherited claims. Explicit user-confirmed new context may clarify a decision; feedback or a proposed correction alone is not evidence of approval. Identify any conflict rather than silently choosing a policy.",
  "Identify risk-based verification obligations from the actual sources: permitted decision outcomes and missing-rationale validation, authorization/self-decision boundaries, complete immutable audit fields, privacy access/redaction, quantitative threshold boundaries, business calendars/pause rules, keyboard/screen-reader journeys, integration failures/retries, retention/deletion/legal holds. Unknown rules need precise owner-facing gaps; do not invent standards, retry counts, retention/deletion behavior, calendars or service levels. Return analytical findings and the ledger, not private reasoning."
].join(" ");

export const discoverySynthesisFidelityInstructions = [
  "The independent evidenceLedger is a coverage checklist, not permission to change source facts. Return evidenceCoverage with exactly one row per evidence id: evidenceId, disposition (implemented, context, proposal, gap), storyIds, testIds and gapIds. References must resolve to the actual final package. Requirements need relevant mapped stories and tests or a precise gap; unresolved questions need gaps, and proposals stay explicitly proposed with dependent stories needs-input. A claimed coverage row never substitutes for the actual visible content or test behavior.",
  "Non-implementation target-status metadata may use context only without story/test links and with visible explicit unconfirmed or target-not-achieved wording. Do not use context to commit proposed implementation scope, and do not call a proposed target achieved or approved. An approval prerequisite for an operating decision does not itself approve the dependent delivery proposal.",
  "Carry every quantitative ledger assertion into the visible analysis, rules, outcomes or assumptions with its original value/comparator, unit, statistic, calendar basis, observation period and confirmation status. Do not omit secondary KPIs or proposed targets. Preserve measured baselines separately from proposed targets and achieved outcomes. Repeat qualifiers where an otherwise ambiguous assertion could change meaning. Prior generated content, including apparent business rules, must be corrected whenever unsupported by raw evidence.",
  "Preserve a source table's shared Measure statistic in both the visible baseline and target definition, without copying a baseline cell's unit or approval status into the target. A median KPI must not silently become a mean or an all-requests service-level guarantee.",
  "Do not broaden policy: a prohibition on approving one's own specific exception does not prohibit rejecting it or all own requests unless separately sourced. Cover a permitted rejection with rationale and a rejection attempt with empty rationale when those decision rules are stated. Test every source-required immutable audit field and tamper prevention, unauthorized sensitive-content access, and personal-data redaction in each stated output channel.",
  "For source-required redaction, seed recognizable synthetic personal details using source-supported fields, inspect EACH source-named output channel, and explicitly assert in the expected result that those details are absent or redacted there. Generic role denial or saying privacy is applied does not verify channel redaction. Do not invent client fields, privacy policies or policy values; ask a precise gap question where required details are unknown.",
  "For a confirmed retention duration, put that exact source period in the test title or steps when testing the relative boundary (for example, immediately before or at the minimum period). Assert that the record remains accessible, queryable, retrievable or not deleted through the required period. Do not invent deletion after the minimum retention period unless the source separately requires it.",
  "Use risk-based scenarios, not a generic negative test merely to satisfy a count. For any service-level percentage intervention threshold include explicit below/equal/above cases and missing/unconfirmed configuration behavior. Calendar boundaries and pause/resume, keyboard and screen-reader journeys, retries/failure handling, retention/deletion/privacy must each have relevant test behavior or, for an unknown policy, a precise discovery gap. Use parameterized/configuration-dependent tests and mark affected stories needs-input rather than inventing thresholds, accessibility standards, retry policy or legal behavior. Expected results must assert observable behavior and required fields, not merely say success, an audit exists, or follow policy."
].join(" ");

export type DiscoveryEvidenceSource = { id: string; text: string };
export type DiscoveryFidelityReviewIssue = { evidenceId: string; sourceId: string; message: string };
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
type Metric = { value: number; unit: string; comparator: string; index: number; text: string; countScope?: "baseline" | "pilot" };
function countScope(value: string, index: number, end: number, unit: string): Metric["countScope"] {
  if (!/\b(?:region|office)s?$/.test(unit)) return undefined;
  if (/^pilot\s/.test(unit)) return "pilot";
  const prefix = (value.slice(0, index).split(/[.;|\n,]/).at(-1) ?? "").slice(-100);
  const after = value.slice(end, end + 100).split(/[.;|\n,]/)[0];
  if (/^\s+(?:(?:are|is|included|used|covered|participating)\s+){0,3}(?:(?:in|for|during|within)\s+(?:the\s+)?)?pilot\b/.test(after)) return "pilot";
  // Only grammatical attachment to this count is a scope assertion. A distant
  // mention of a pilot, or another count's noun phrase, is not enough.
  if (/\bpilot\s+(?:scope\s+)?(?:(?:will|would|may|must|shall|can|should|initially|currently|only|cover|covers|include|includes|encompass|encompasses|involve|involves|has|have|in|across|with|the|all|of|our|these|those)\s+){0,6}$/.test(prefix)) return "pilot";
  if (/\b(?:baseline|total|overall)\s+(?:(?:is|was|has|have|of|at|includes|currently|remains|count|stands)\s+){0,4}$/.test(prefix)
    || /\ball\s+(?:(?:the|our|these|those)\s+)?$/.test(prefix)) return "baseline";
  return undefined;
}
function baselineCountColumn(context: string, row: string) {
  const lines = normalized(context).split("\n");
  const matches = lines.flatMap((line, index) => line === row || line.startsWith(row) && /^ *(?:\||$)/.test(line.slice(row.length)) ? [index] : []);
  return matches.length > 0 && matches.every((index) => {
    for (let previous = index - 1; previous >= 0 && lines[previous].includes("|"); previous--) {
      if (/^measure *\|/.test(lines[previous])) return /^measure *\| *current baseline *(?:\||$)/.test(lines[previous]);
    }
    return false;
  });
}
function metrics(text: string, tableSource?: string): Metric[] {
  const value = normalized(text);
  const pattern = /(?:(\b(?:less than|under|below|at most|no more than|more than|over|above|at least)(?![a-z])|[<>]=?)\s*)?(\d+(?:\.\d+)?)\s*(%|(?:(?:business|calendar)\s+)?(?:hours?|days?|weeks?|months?|years?|minutes?|seconds?)|(?:(?:pilot|selected|named)\s+)?(?:regions?|offices?)|regional\s+offices?)(?=$|[\s,;:.|)])/g;
  const found: Metric[] = [...value.matchAll(pattern)].map((match) => ({
    value: Number(match[2]), unit: match[3].replace(/^(?:pilot|selected|named|regional)\s+/, "").replace(/s$/, ""),
    comparator: /^(less than|under|below|<)$/.test(match[1] ?? "") ? "<" : /^(at most|no more than|<=)$/.test(match[1] ?? "") ? "<=" : /^(more than|over|above|>)$/.test(match[1] ?? "") ? ">" : /^(at least|>=)$/.test(match[1] ?? "") ? ">=" : "",
    index: match.index!, text: match[0], countScope: countScope(value, match.index!, match.index! + match[0].length, match[3])
  }));
  // Only the first bare count cell inherits this exact row label. A decision cell
  // such as "Pilot 3 before scale-up" does not establish an office/region unit.
  for (const match of value.matchAll(/^(regional +offices?|offices?|regions?) *\| *(\d+) *(?=\||$)/gm)) {
    const row = value.slice(match.index!, value.indexOf("\n", match.index!) < 0 ? undefined : value.indexOf("\n", match.index!)).trimEnd();
    if (!baselineCountColumn(tableSource ?? value, row)) continue;
    const index = match.index! + match[0].lastIndexOf(match[2]);
    found.push({ value: Number(match[2]), unit: /offices?/.test(match[1]) ? "office" : "region", comparator: "", index, text: match[2], countScope: "baseline" });
  }
  return found.sort((left, right) => left.index - right.index);
}
function unitBase(unit: string) { return unit.replace(/^(?:business|calendar) /, ""); }
function metricMatches(expected: Metric, actual: Metric) {
  return expected.value === actual.value && unitBase(expected.unit) === unitBase(actual.unit)
    && (!/^(?:business|calendar) /.test(expected.unit) || expected.unit === actual.unit)
    && (!/^(?:office|region)$/.test(expected.unit) || expected.comparator === actual.comparator)
    && (!expected.countScope || !actual.countScope || expected.countScope === actual.countScope)
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
function assertsOpposingStatistic(context: string, expected: string) {
  const value = normalized(context);
  const opposing = expected === "median" ? /^(?:mean|average)$/ : /^median$/;
  const qualified = value.replace(/\bnot\s+(?:(?:a|an|the)\s+)?(?:median|mean|average)(?:\s*(?:or|\/)\s*(?:(?:a|an|the)\s+)?(?:median|mean|average))*/g, (match, offset: number) => {
    const terms = match.match(/\b(?:median|mean|average)\b/g) ?? [];
    return /(?:\b(?:not|never|cannot)|\b\w+n['’]t)\s+$/.test(value.slice(0, offset)) || !terms.every(term => opposing.test(term)) ? match : "";
  });
  return (qualified.match(/\b(?:median|mean|average)\b/g) ?? []).some(term => opposing.test(term));
}
function sourceMetricStatistic(text: string, metric: Metric, tableSource?: string) {
  const value = normalized(text);
  const prefix = value.slice(0, metric.index);
  const suffix = value.slice(metric.index + metric.text.length, metric.index + metric.text.length + 45);
  // An observation window qualifies the measured statistic; it is not another median.
  // "Median delay is 3.8 days during the eight-week baseline" has one median measure.
  if (/\b(?:during|over|throughout|across|in|per|for)\s+(?:(?:the|an?|our|this|last|previous|preceding|current)\s+){0,2}$/.test(prefix)
    && /^\s*(?:long\s+)?(?:baseline|observation|reporting|sample|study|measurement)\b/.test(suffix)) return undefined;
  const rowStart = prefix.lastIndexOf("\n") + 1;
  const rowEnd = value.indexOf("\n", metric.index);
  const row = value.slice(rowStart, rowEnd < 0 ? undefined : rowEnd);
  if (row.includes("|")) {
    const cells = row.split("|");
    const rowPrefix = prefix.slice(rowStart);
    const column = (rowPrefix.match(/\|/g) ?? []).length;
    const cellPrefix = rowPrefix.slice(rowPrefix.lastIndexOf("|") + 1);
    const explicit = cellPrefix.match(/\b(median|average|mean)\b/g)?.at(-1)
      ?? suffix.match(/^\s*\(\s*(median|average|mean)\s*\)/)?.[1];
    if (explicit) return explicit;
    const measureStatistic = cells[0].match(/\b(median|average|mean)\b/g)?.at(-1);
    // Retain direct measure-label support for the first bare value. A later
    // target may inherit that label only from the same verified source table,
    // never from another value cell's statistic or approval/proposal modality.
    if (column === 1 && !cellPrefix.trim()) return measureStatistic;
    if (!measureStatistic || (column !== 1 && column !== 2)) return undefined;
    const lines = normalized(tableSource ?? text).split("\n");
    const matches = lines.flatMap((line, index) => line === row ? [index] : []);
    const verified = matches.length > 0 && matches.every((index) => {
      for (let previous = index - 1; previous >= 0 && lines[previous].includes("|"); previous--) {
        if (/^measure *\|/.test(lines[previous])) return /^measure *\| *current baseline *\| *target or decision *$/.test(lines[previous]);
      }
      return false;
    });
    return verified ? measureStatistic : undefined;
  }
  const line = prefix.slice(Math.max(prefix.lastIndexOf("\n"), prefix.lastIndexOf(". "), prefix.lastIndexOf(";")) + 1);
  return line.match(/\b(median|average|mean)\b/g)?.at(-1);
}
// Producer-side completeness aid only. This is not a ledger, a source quotation,
// or an approval decision; the uncapped evidence checks below remain authoritative.
export function buildDiscoveryMeasurementInventory(sources: DiscoveryEvidenceSource[]) {
  const perSourceLimit = Math.floor(128 / Math.max(1, sources.length));
  return sources.map((source) => {
    const text = normalized(source.text);
    const lines = text.split("\n");
    const measured = metrics(source.text);
    return {
      sourceId: source.id,
      totalMeasurements: measured.length,
      truncated: measured.length > perSourceLimit,
      measurements: measured.slice(0, perSourceLimit).map((metric) => {
        const rowIndex = text.slice(0, metric.index).split("\n").length - 1;
        let firstRow = rowIndex;
        if (lines[rowIndex].includes("|")) {
          for (let previous = rowIndex - 1; previous >= 0 && lines[previous].includes("|"); previous--) {
            if (/^measure *\|/.test(lines[previous])) { firstRow = previous; break; }
          }
        }
        const fullContext = lines.slice(firstRow, rowIndex + 1).join("\n");
        const rowStart = text.lastIndexOf("\n", metric.index) + 1;
        const rowEnd = text.indexOf("\n", metric.index);
        const context = fullContext.length <= 320 ? fullContext : text.slice(Math.max(rowStart, metric.index - 120), Math.min(rowEnd < 0 ? text.length : rowEnd, metric.index + metric.text.length + 120));
        return {
          value: metric.value, unit: metric.unit, comparator: metric.comparator,
          countScope: metric.countScope, statistic: sourceMetricStatistic(source.text, metric),
          normalizedSourceContext: context.slice(0, 320),
          contextTruncated: fullContext.length > 320 || context.length > 320
        };
      })
    };
  });
}
const unknown = /\b(?:unconfirmed|unknown|not (?:yet )?(?:confirmed|documented|approved|defined)|open (?:technical )?(?:decisions?|questions?)|pending decision)\b/i;

function unconfirmedKind(text: string): "proposal" | "open-question" | undefined {
  const value = normalized(text);
  // Business entities and confirmed procedural obligations are not proposal status.
  if (/\b(?:must|shall|required|requires?|reject|block|prevent)\b/.test(value) && /\b(?:unconfirmed|unapproved|pending) (?:requests?|applications?|submissions?|records?|transactions?)\b/.test(value)) return undefined;
  if (/\b(?:is|are|was|were|has been|have been|now|already)\s+(?:(?:formally|explicitly|an?|the)\s+)?(?:approved|confirmed|authorized|adopted|ratified|settled|achieved)\b/.test(value)) return undefined;
  if (/\b(?:proposed|indicative)\b|\bnot\s+(?:(?:a|an|the)\s+)?(?:committed|achieved(?:\s+(?:results?|outcomes?))?)\b|\b(?:is|are|was|were|remains)\s+(?:(?:a|an|the)\s+)?proposal\b|\bproposal (?:for|to)\b|\b(?:later|future|unapproved) proposal\b|\bcandidate (?:dependenc(?:y|ies)|integrations?|solutions?|designs?|approaches?|scope|categor(?:y|ies)|vendors?|platforms?|systems?|options?|targets?|features?)\b/.test(value)) return "proposal";
  if (/\b(?:unconfirmed|unresolved|unknown|open (?:technical )?(?:decisions?|questions?)|pending decision|not (?:yet )?(?:been )?(?:approved|confirmed|defined|decided|settled|determined))\b/.test(value)) return "open-question";
  return undefined;
}

function sameAtomicClaim(statement: string, clause: string) {
  if (literal(normalized(statement)) === literal(normalized(clause))) return true;
  const ignored = new Set(["source", "states", "statement", "proposed", "proposal", "unconfirmed", "confirmed", "approved", "requires", "require", "must", "shall", "would", "should", "could", "before", "after", "their", "these", "those", "there", "which", "across"]);
  const terms = (text: string) => new Set((normalized(text).match(/[a-z]{4,}/g) ?? []).filter((word) => !ignored.has(word)).map((word) => word.replace(/(?:ments?|ing|ed|s)$/, "")));
  const claim = terms(statement);
  const context = terms(clause);
  return claim.size > 0 && [...claim].filter((word) => context.has(word)).length >= Math.min(2, claim.size);
}

function sourceUnconfirmedKind(clause: string) {
  const explicit = unconfirmedKind(clause);
  if (explicit) return explicit;
  // A decision about configuration is unresolved; requiring a customer's confirmation
  // as a defined workflow step is not. Keep this restricted to policy/configuration subjects.
  if (/\b(?:sla|service level|calendar|pause|resume|escalation|authority|interfaces?|integration|roles?|scope|categor(?:y|ies)|targets?|standard|retention policy|deletion policy|retry strategy|data model)\b.{0,120}\b(?:require(?:s)? decisions?|need(?:s)? confirmation)\b/i.test(normalized(clause))) return "open-question" as const;
  return undefined;
}

function confirmationPrerequisite(statement: string) {
  return /\b(?:must|shall|needs? to|required to)\s+(?:be\s+)?(?:confirm(?:ed)?|decid(?:e|ed)|resolv(?:e|ed)|approv(?:e|ed))\b|\b(?:confirmation|decision|approval)\s+(?:is\s+)?required\s+(?:before|prior to)\b/i.test(normalized(statement));
}

function contextualSourceMetrics(statement: string, metric: Metric, quote: string, source: string) {
  const observation = /\b(?:baseline|observation|sampling|sample|reporting|study|measurement)\b/;
  if (!/\b(?:hour|day|week|month|year)$/.test(metric.unit) || !observation.test(metricContext(statement, metric))) return [];
  const primaryMeasurement = metrics(statement).some((other) => other.index !== metric.index && metrics(quote).some((quoted) => metricMatches(quoted, other)));
  if (!primaryMeasurement) return [];
  return metrics(source).filter((actual) => metricMatches(actual, metric) && observation.test(metricContext(source, actual)));
}

function explicitSettlement(statement: string) {
  return /\b(?:is|are|was|were|has|have|had|has been|have been|had been|now|already)\s+(?:(?:formally|explicitly|already)\s+)?(?:approved|confirmed|authorized|adopted|ratified|settled|committed|achieved)\b/i.test(normalized(statement));
}

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
  if (unconfirmedKind(prefix) === "proposal") return true;
  const following = cellMetrics.find((item) => item.index > localIndex);
  if (!following && unconfirmedKind(cell.slice(localIndex + metric.text.length)) === "proposal") return true;
  // A bare table value can inherit a column/measure label, not an unrelated target
  // later in the row (e.g. 27% baseline | proposed target below 10%).
  if (!cell.slice(0, localIndex).trim() && value[start] === "|") {
    const previousStart = Math.max(value.lastIndexOf("|", start - 1), value.lastIndexOf("\n", start - 1));
    return unconfirmedKind(value.slice(previousStart + 1, start)) === "proposal";
  }
  return false;
}

// Exact quotations and source-wide quantitative coverage prevent a self-reported ledger from
// silently dropping measurable evidence. This supplements, rather than proves, semantic fidelity.
export function reviewDiscoveryEvidenceLedger(value: unknown, sources: DiscoveryEvidenceSource[]) {
  const errors: string[] = [];
  const ledger: DiscoveryEvidenceLedgerItem[] = [];
  const reviewIssues: DiscoveryFidelityReviewIssue[] = [];
  const normalizations: Array<{ evidenceId: string; from: DiscoveryEvidenceLedgerItem["kind"]; to: DiscoveryEvidenceLedgerItem["kind"]; reason: "source-backed-unconfirmed-status" }> = [];
  if (!Array.isArray(value) || !value.length) return { ledger, normalizations, reviewIssues, errors: ["An atomic evidence ledger is required."] };
  const sourceMap = new Map(sources.map((source) => [source.id, source.text]));
  for (const input of value) {
    const item = record(input);
    if (!item || ![item.id, item.sourceId, item.quote, item.statement].every(nonempty) || !["fact", "requirement", "proposal", "open-question"].includes(String(item.kind))) {
      errors.push("An evidence ledger item is invalid."); continue;
    }
    const entry = { ...item } as unknown as DiscoveryEvidenceLedgerItem;
    const flagReview = (message: string) => reviewIssues.push({ evidenceId: entry.id, sourceId: entry.sourceId, message });
    const source = sourceMap.get(entry.sourceId);
    if (!source || !literal(source).includes(literal(entry.quote))) errors.push(`${entry.id} has an unverifiable source quotation.`);
    if (ledger.some((existing) => existing.id === entry.id)) errors.push("Evidence identifiers must be unique.");
    const quotedMetrics = metrics(entry.quote, source);
    const statementMetrics = metrics(entry.statement);
    let statementStatus = sourceUnconfirmedKind(entry.statement);
    let sourceStatus: "proposal" | "open-question" | undefined;
    for (const metric of statementMetrics) {
      let supportText = entry.quote;
      let supported = quotedMetrics.filter((quoted) => metricMatches(quoted, metric));
      if (!supported.length && source) {
        supported = contextualSourceMetrics(entry.statement, metric, entry.quote, source);
        supportText = source;
      }
      if (!supported.length) errors.push(`${entry.id} changes or invents a source measurement.`);
      const statistic = sourceMetricStatistic(entry.statement, metric);
      const quotedStatistics = supported.map((quoted) => sourceMetricStatistic(supportText, quoted, source)).filter(Boolean);
      if ((statistic && !quotedStatistics.includes(statistic)) || (quotedStatistics.length && !statistic)) errors.push(`${entry.id} changes or omits a source measurement statistic.`);
      if (supported.length && supported.every((quoted) => metricIsProposed(supportText, quoted))) sourceStatus = "proposal";
    }
    const matchedClauses = entry.quote.split(/(?<=[.!?])\s+|[\n;|]/).filter((clause) => {
      if (!sameAtomicClaim(entry.statement, clause)) return false;
      const clauseMetrics = metrics(clause);
      return !statementMetrics.length || !clauseMetrics.length || statementMetrics.some((claim) => clauseMetrics.some((quoted) => metricMatches(quoted, claim)));
    });
    const states = matchedClauses.map(sourceUnconfirmedKind);
    sourceStatus = states.includes("open-question") ? "open-question" : sourceStatus ?? (states.includes("proposal") ? "proposal" : undefined);
    // "The sponsor must confirm authority before configuration" preserves uncertainty
    // only when the same verified source claim actually says that authority is unresolved.
    if (sourceStatus && confirmationPrerequisite(entry.statement)) statementStatus = "open-question";
    if (sourceStatus && !statementStatus) {
      if (explicitSettlement(entry.statement)) errors.push(`${entry.id} removes a source-backed proposal or unresolved-decision qualification.`);
      else flagReview("The source and atomic statement need an owner review of proposal or decision status; do not treat this claim as confirmed implementation scope.");
    }
    if (statementStatus && sourceStatus && !["proposal", "open-question"].includes(entry.kind)) {
      const kind = statementStatus === "open-question" || sourceStatus === "open-question" ? "open-question" : "proposal";
      normalizations.push({ evidenceId: entry.id, from: entry.kind, to: kind, reason: "source-backed-unconfirmed-status" });
      entry.kind = kind;
    } else if (statementStatus && !["proposal", "open-question"].includes(entry.kind)) flagReview("The internal evidence classification and statement modality need owner review before commitment.");
    if (statementStatus && !sourceStatus) {
      if (matchedClauses.some((clause) => /\b(?:must|shall|required|requires?|mandatory)\b/i.test(clause) && !sourceUnconfirmedKind(clause))) errors.push(`${entry.id} weakens a confirmed source obligation into an unsupported proposal.`);
      else flagReview("The statement's unconfirmed status is not unambiguously aligned to its quoted source claim and needs owner review.");
    }
    ledger.push(entry);
  }
  for (const source of sources) {
    const items = ledger.filter((item) => item.sourceId === source.id);
    if (!items.length) errors.push(`${source.id} is missing from the atomic evidence ledger.`);
    const statementMetrics = items.flatMap((item) => metrics(item.statement));
    for (const metric of metrics(source.text)) {
      if (!statementMetrics.some((actual) => metricMatches(metric, actual))) {
        const value = normalized(source.text);
        const rowStart = value.lastIndexOf("\n", metric.index) + 1;
        const rowEnd = value.indexOf("\n", metric.index);
        const context = literal(value.slice(rowStart, rowEnd < 0 ? undefined : rowEnd));
        errors.push(`${source.id} has a quantitative fact or target missing from the atomic evidence statements. Missing measurement: value=${metric.value}; unit=${metric.unit}; comparator=${metric.comparator || "="}. Measure context: ${context.slice(0, 220)}${context.length > 220 ? "..." : ""}`);
      }
      const statistic = sourceMetricStatistic(source.text, metric);
      if (statistic && !items.some((item) => metrics(item.statement).some((actual) => metricMatches(metric, actual)) && new RegExp(`\\b${statistic}\\b`, "i").test(item.statement))) errors.push(`${source.id} has an atomic statement that strips a measurement's source statistic.`);
    }
  }
  return { ledger, normalizations, reviewIssues: [...new Map(reviewIssues.map((issue) => [`${issue.evidenceId}:${issue.message}`, issue])).values()], errors: [...new Set(errors)] };
}

function visibleFields(synthesis: FidelityDefinition, reviewGapIds: ReadonlySet<string>) {
  return [
    synthesis.executiveSummary, synthesis.evidenceSummary, ...synthesis.capabilities, ...synthesis.painPoints,
    ...synthesis.businessRules, ...synthesis.assumptions, synthesis.readinessNarrative,
    ...synthesis.roadmap.flatMap((item) => [item.horizon, item.title, item.outcome, ...item.dependencies]),
    ...synthesis.epics.flatMap((item) => [item.title, item.objective]),
    ...synthesis.features.flatMap((item) => [item.title, item.description, item.outcome]),
    ...synthesis.stories.flatMap((item) => [item.title, item.story, ...item.acceptanceCriteria]),
    ...synthesis.gaps.filter((item) => !reviewGapIds.has(item.id)).flatMap((item) => [item.title, item.description, item.question])
  ];
}
function testText(test: DiscoveryTestCase) { return [test.title, ...test.steps, test.expectedResult].join(" "); }
function actions(text: string) {
  const result = new Set<string>();
  for (const [action, pattern] of Object.entries({ approve: /\bapprov(?:e|es|ed|al|als|ing)\b/, reject: /\breject(?:s|ed|ion|ions|ing)?\b/, delete: /\bdelet(?:e|es|ed|ion|ing)\b/, publish: /\bpublish(?:es|ed|ing)?\b/, cancel: /\bcancel(?:s|led|ing)?\b/, edit: /\bedit(?:s|ed|ing)?\b/, assign: /\bassign(?:s|ed|ment|ing)?\b/ })) if (pattern.test(text)) result.add(action);
  return result;
}
function restrictiveSelfClauses(text: string) {
  return normalized(text).split(/[.;\n]/).flatMap((part) => part.split(/\b(?:but|however|whereas)\b/)).flatMap((part) => {
    const self = part.search(/\b(?:own|self)\b/);
    const cues = [...part.matchAll(/\b(?:cannot|can not|must not|may not|shall not|not allowed|prevent(?:s|ed)?|block(?:s|ed)?|den(?:y|ies|ied)|prohibit(?:s|ed)?|forbid(?:s|den)?)\b/g)];
    const cue = cues.filter((match) => match.index! <= self).at(-1) ?? cues[0];
    if (self < 0 || !cue) return [];
    let start = cue.index! <= self ? cue.index! : part.lastIndexOf(",", self) + 1;
    const precedingNegation = part.slice(0, start).match(/\bnot(?:\s+\w+){0,2}\s*$/);
    if (precedingNegation) start = precedingNegation.index!;
    let clause = part.slice(start).trim();
    const own = clause.search(/\bown\b/);
    const comma = own < 0 ? -1 : clause.indexOf(",", own);
    // A compound product summary may list permitted approval/rejection before the
    // prohibition and unrelated audit work afterward. Neither is a new prohibited action.
    if (comma >= 0 && !/^,\s*(?:(?:and|or)\s+)?(?:approv\w*|reject\w*|delet\w*|publish\w*|cancel\w*|edit\w*|assign\w*|unless|except|only if|if|when)\b/.test(clause.slice(comma))) clause = clause.slice(0, comma);
    return [clause];
  });
}

function ownObjectScope(clause: string) {
  return normalized(clause).match(/\bown\s+(.+?)(?:[.;]|$)/)?.[1];
}
function ruleQualifiedRejectionNonProhibition(clause: string) {
  // A narrowly attributed non-prohibition is not a new rejection ban or proof of
  // rejection authority. In particular, "it" must not acquire a resolved object.
  return /^not (?:blocked|prevented) from rejecting (?:it|(?:their|his|her|one's|the user's) own policy exception|(?:the|that|this|the same) policy exception) solely (?:by|under) (?:the )?self approval rule$/.test(normalized(clause));
}
function scopeHead(scope: string | undefined) {
  const nounPhrase = scope?.split(/\b(?:during|when|unless|without|before|after|raised|created|submitted|that|which|because|for|to|by|if)\b/)[0].trim();
  return nounPhrase?.match(/[a-z]+/g)?.at(-1)?.replace(/s$/, "");
}
function proposalPromotion(item: DiscoveryEvidenceLedgerItem, context: string, measure?: Metric): "hard" | "review" | undefined {
  const value = normalized(context)
    .replace(/(\b(?:(?:do|does|did|must|shall|should|can|may|will|would)\s+not|cannot|never)\s+(?:treat|regard|classify|present|report|count|describe|represent)\s+[^,.;\n]{1,160}?\s+as\s+)achieved(\s+(?:results?|outcomes?)\b)/g, "$1unconfirmed$2")
    .replace(/\bnot\s+(?:(?:an?|the)\s+)?achieved(?:\s+(?:results?|outcomes?))?\b/g, "unconfirmed outcome");
  if (!/\b(?:achieved|approved|confirmed|committed|agreed)\b/.test(value)) return undefined;
  const clauses = value.split(",").map((clause) => clause.trim());
  // A negated first clause must not hide an independently affirmative claim
  // later in the same field. Re-check only other clauses bound to this claim.
  if (clauses.slice(1).some((clause) => (measure ? metrics(clause).some((actual) => metricMatches(measure, actual)) : sameAtomicClaim(item.statement, clause))
    && proposalPromotion(item, clause, measure) === "hard")) return "hard";
  const primary = measure
    ? clauses.find((clause) => metrics(clause).some((actual) => metricMatches(measure, actual))) ?? value
    : clauses.find((clause) => sameAtomicClaim(item.statement, clause)) ?? value;
  const localMetric = measure ? metrics(primary).find((actual) => metricMatches(measure, actual)) : undefined;
  const suffix = localMetric ? primary.slice(localMetric.index + localMetric.text.length) : primary;
  const settlement = suffix.match(/\b(?:is|are|was|were|has|have|had|has been|have been|had been|now|already)\s+(?:(?:formally|explicitly|already|an?|the)\s+)?(approved|confirmed|committed|achieved)\b/);
  const conditional = /\b(?:after|before|until|if|when|once|unless|pending|awaits|subject to|depends? on)\b/.test(suffix.slice(0, settlement?.index ?? suffix.length));
  const claimWords = new Set((normalized(item.statement).match(/[a-z]{4,}/g) ?? []).filter((word) => !/^(?:proposed|proposal|confirmed|approved|achieved|committed|business|calendar|hours?|days?|weeks?|months?|years?|regions?|offices?|after|before|under|below|above|their|these|those|would|should)$/.test(word)).map((word) => word.replace(/s$/, "")));
  const bindingPrefix = suffix.slice(0, settlement?.index ?? 0).trim();
  const directlyBound = !bindingPrefix || (bindingPrefix.match(/[a-z]{4,}/g) ?? []).every((word) => claimWords.has(word.replace(/s$/, "")) || !measure && word === "business");
  // A shared adjective is not necessarily the proposed entity: "category-aware
  // intake" does not propose a category, and an "approved resident portal"
  // modifies the portal rather than the resident. Bound the visible noun phrase
  // before comparing its head; uncertain modifier scope still creates a review hold.
  const entityWords = new Set((normalized(item.statement.replace(/\b(?:[a-z]+[-–—])+([a-z]+)\b/gi, "$1")).match(/[a-z]{4,}/g) ?? []).map((word) => word.replace(/s$/, "")));
  const sourceWords = new Set((normalized(item.statement).match(/[a-z]+/g) ?? []).map((word) => word.replace(/s$/, "")));
  const directAdjective = [...primary.matchAll(/\b(?:approved|confirmed|committed|achieved)\s+(?=[a-z])/g)].some((match) => {
    const prefix = primary.slice(0, match.index);
    const prerequisite = /\b(?:after|before|until|if|when|once|pending|awaiting|subject to|depends? on)\s+(?:(?:the|an?|already|formally)\s+){0,2}$/.test(prefix)
      || localMetric && match.index! > localMetric.index + localMetric.text.length && /\b(?:after|before|until|if|when|once|pending|awaiting|subject to|depends? on)\b/.test(prefix.slice(localMetric.index + localMetric.text.length));
    const phrase = primary.slice(match.index! + match[0].length).split(/[,.;\n]|\b(?:is|are|was|were|has|have|had|can|could|will|would|should|must|may|shall|to|of|for|in|on|at|with|without|from|after|before|until|if|when|once|unless|under|below|above|because|so|that|which|and|or|but|as|approved|confirmed|committed|achieved|agreed|covers?|enables?|implements?|supports?|provides?|requires?|depends?|informs?|improves?)\b/)[0];
    const phraseWords = phrase.match(/[a-z]+/g) ?? [];
    const head = phraseWords.at(-1)?.replace(/s$/, "");
    const sourceBound = phraseWords.every((word) => sourceWords.has(word.replace(/s$/, "")));
    return Boolean(head && sourceBound && claimWords.has(head) && entityWords.has(head)) && !/\bnot\s*$/.test(prefix.slice(-12)) && !prerequisite;
  });
  const bareSettledOutcome = /,\s*(?:(?:an?|the)\s+)?(?:achieved\s+(?:results?|outcomes?)|committed release dates?)\s*$/.test(value);
  if (bareSettledOutcome || directAdjective || settlement && directlyBound && !conditional) return "hard";
  if (unconfirmedKind(primary)) return undefined;
  return "review";
}
function explicitUnconfirmedContext(statement: string, fields: string[]) {
  return fields.some((field) => sameAtomicClaim(statement, field) && /\bunconfirmed\b|\bnot\s+(?:yet\s+)?(?:(?:an?|the)\s+)?(?:approved|confirmed|committed|achieved)\b/i.test(field));
}
function pureNoncommittalPlanningStatus(text: string) {
  const value = literal(normalized(text)).replace(/[.!]$/, "");
  return /\bindicative\b/.test(value)
    && /^(?:the )?(?:indicative )?planning (?:windows|horizons) (?:are|remain) (?:(?:indicative )?planning horizons|indicative),? (?:and )?not (?:yet )?committed release dates$/.test(value);
}
function directPlanningSettlement(text: string) {
  const patterns = [
    /\bplanning (?:windows?|horizons?)\s+(?:is|are|was|were|has been|have been|had been)\s+(?:(?:formally|explicitly|already|now)\s+)?(?:approved|confirmed|committed|achieved)\b/g,
    /\b(?:approved|confirmed|committed|achieved)\s+planning (?:windows?|horizons?)\b/g
  ];
  return normalized(text).split(/(?<=[.!?])\s+|[;\n]|,\s+(?:and|or)\s+|\b(?:but|however|whereas)\b/).some((clause) => patterns.some((pattern) =>
    [...clause.matchAll(pattern)].some((match) => {
      const prefix = clause.slice(0, match.index);
      // Negation on an earlier independent predicate cannot negate this subject.
      // Keep actual conditional coordination intact rather than reading its second
      // planning subject as an asserted achievement.
      const localPrefix = prefix.split(/\b(?:and|or)\b/).at(-1) ?? "";
      const negated = /\bnot\b/.test(localPrefix) || /\bnot\s+(?:true|the case)\s+that\b/.test(prefix);
      const conditional = /\b(?:if|when|once|until|unless|before|after|pending|awaiting|subject to|depends? on|requires?|needs?)\b/.test(prefix);
      return !negated && !conditional;
    })));
}
function explicitPlanningNoncommitmentContext(item: DiscoveryEvidenceLedgerItem, fields: string[]) {
  // Only the non-commitment status is metadata. The dated windows and delivery
  // scope in the same source still require their own proposal/requirement coverage.
  const quote = literal(normalized(item.quote));
  return pureNoncommittalPlanningStatus(item.statement)
    && !fields.some(directPlanningSettlement)
    && /\bindicative planning (?:windows|horizons)\b/.test(quote)
    && /\b(?:these|those|they|(?:the )?(?:indicative )?planning (?:windows|horizons)) (?:are|remain) (?:(?:indicative )?planning horizons|indicative),? (?:and )?not (?:yet )?committed release dates\b/.test(quote)
    && fields.some((field) => field.split(/(?<=[.!?])\s+|\n/).some(pureNoncommittalPlanningStatus));
}
function proposalSubjectHead(statement: string) {
  const subject = normalized(statement).split(/\b(?:is|are|was|were|remain|remains|has|have|will|would|should)\b/)[0];
  return subject.match(/[a-z]+/g)?.at(-1)?.replace(/s$/, "");
}
function sameProposalSubject(statement: string, context: string) {
  const head = proposalSubjectHead(statement);
  return sameAtomicClaim(statement, context) && Boolean(head && (normalized(context).match(/[a-z]+/g) ?? []).some((word) => word.replace(/s$/, "") === head));
}
function assertsSeededPersonalDataRedaction(test: DiscoveryTestCase) {
  const seeded = [test.title, ...test.steps].join(" ");
  if (!/\b(?:personal|sensitive|pii)\b/i.test(seeded)) return false;
  // Quoted UI labels are not personal canaries: take values only from explicit
  // data-setup steps naming personal content or identity fields.
  const setup = test.steps.filter((step) => /\b(?:seed|enter|populate|set|create|submit|provide|fill)\w*\b/i.test(step) && /\b(?:personal|sensitive|pii|name|phone|email|address)\b/i.test(step)).join(" ");
  const markers = [...setup.matchAll(/"([^"\n]{3,100})"|(?<!\w)'([^'\n]{3,100})'/g)].map((match) => normalized(match[1] ?? match[2])).filter((marker) => marker.length >= 3 && /[a-z0-9]/.test(marker));
  const expected = normalized(test.expectedResult);
  const seededMarkers = [...new Set(markers)];
  if (!seededMarkers.length || seededMarkers.some((marker) => !expected.includes(marker))) return false;
  const clauses = expected.split(/(?<=[.!?])\s+|[;\n]|\b(?:but|however|whereas|while)\b/);
  const markerAlternatives = seededMarkers.map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const precedingMarker = `(?:"(?:${markerAlternatives})"|'(?:${markerAlternatives})'|(?:${markerAlternatives}))`;
  const withoutMarkerList = new RegExp(`^\\s*(?:${precedingMarker}\\s*(?:,\\s*(?:(?:and|or|nor)\\s+)?|(?:and|or|nor)\\s+))*["']?$`);
  return seededMarkers.every((marker) => clauses.filter((clause) => clause.includes(marker)).every((clause) => {
    const position = clause.indexOf(marker);
    const before = clause.slice(0, position);
    const after = clause.slice(position + marker.length);
    // "Rendered without TOKEN" asserts absence only for the directly governed
    // canary/list. A negated rendering or a separate positive leak is not redaction.
    const withoutPredicates = [...before.matchAll(/\b(?:renders?|rendered|displays?|displayed|shows?|shown)\s+without\b/g)].filter((match) => {
      const prefix = before.slice(0, match.index);
      const negated = /(?:\b(?:not|never|cannot|unable to|no longer)|\b\w+n['’]t)\s+(?:\w+\s+){0,3}$/.test(prefix);
      return !negated && withoutMarkerList.test(before.slice(match.index! + match[0].length));
    });
    const positiveExposure = [...clause.matchAll(/\b(?:contains?|includes?|displays?|displayed|shows?|shown|renders?|rendered|exposes?|reveals?)\b/g)].some((match) => !withoutPredicates.some((predicate) => predicate.index === match.index) && !/\bnot\s*$/.test(clause.slice(Math.max(0, match.index! - 12), match.index)));
    // An elided rendering verb does not make "without TOKEN and with TOKEN"
    // consistent: reject an affirmative with-phrase directly governing a canary.
    const positiveWithCanary = withoutPredicates.length > 0 && [...clause.matchAll(/\bwith\b/g)].some((match) => {
      if (/\b(?:not|never)\s*$/.test(clause.slice(0, match.index))) return false;
      const start = match.index! + match[0].length;
      const occurrence = clause.indexOf(marker, start);
      return occurrence >= 0 && withoutMarkerList.test(clause.slice(start, occurrence));
    });
    if (positiveExposure || positiveWithCanary || /\b(?:is|are|remain(?:s)?)\s+(?:visible|shown|displayed|included|exposed|present)\b/.test(after)) return false;
    return withoutPredicates.length > 0 || /\bnot\s+(?:contain|expose|display|show|include|disclose|reveal|render|send|deliver|leak)\b/.test(before)
      || /\b(?:absent|redacted|masked|omitted|excluded|removed|hidden)\b/.test(after) && !/\bnot\b/.test(after)
      || /\bnot\s+(?:visible|shown|displayed|included|exposed|present)\b/.test(after);
  }));
}
function assertsPersonalDataRedaction(test: DiscoveryTestCase) {
  const value = normalized(test.expectedResult);
  if (!/\b(?:personal|sensitive|pii)\b/.test(value)) return assertsSeededPersonalDataRedaction(test);
  if (/\bnot\s+(?:expose|display|show|include|disclose|reveal|contain|render|send|deliver|leak)\b[^.;]{0,90}\b(?:personal|sensitive|pii)\b/.test(value)) return true;
  if (/\bno\s+(?:(?:residents?|users?|customers?|clients?|requesters?|applicants?|employees?)(?:['’]s?)?\s+)?(?:personal|sensitive|pii)\b/.test(value)) return true;
  if (/\b(?:personal|sensitive|pii)\b[^.;]{0,75}\bnot\s+(?:visible|disclosed|included|displayed|shown|exposed|present|sent|rendered)\b/.test(value)) return true;
  if (/\b(?:personal|sensitive|pii)\b(?:(?!\b(?:not|never|cannot)\b)[^.;]){0,75}\b(?:redacted|masked|omitted|excluded|absent|removed|hidden)\b/.test(value)) return true;
  return [...value.matchAll(/\b(?:redact(?:s|ed|ing)?|mask(?:s|ed|ing)?|omit(?:s|ted|ting)?|exclude(?:s|d|ing)?|remove(?:s|d|ing)?|hide(?:s)?)\b[^.;]{0,75}\b(?:personal|sensitive|pii)\b/g)]
    .some((match) => !/\b(?:not|never|without|cannot|unable to)\s*(?:be\s*)?$/.test(value.slice(Math.max(0, match.index! - 24), match.index))) || assertsSeededPersonalDataRedaction(test);
}
function redactionFailureDetails(channel: "dashboard" | "notification", tests: DiscoveryTestCase[]) {
  const channelPattern = new RegExp(`\\b${channel}s?\\b`);
  const closest = tests.filter((test) => channelPattern.test(normalized(testText(test))))
    .sort((left, right) => Number(/\b(?:personal|sensitive|pii)\b/i.test(right.expectedResult)) - Number(/\b(?:personal|sensitive|pii)\b/i.test(left.expectedResult)))
    .slice(0, 2);
  // Only returned to the authenticated caller through the existing validation error;
  // never log generated test content or source material.
  return closest.length ? ` Closest channel tests: ${closest.map((test) => `title=${literal(test.title).slice(0, 45)}; expectedResult=${literal(test.expectedResult).slice(0, 95)}`).join(" | ")}` : " No matching channel test was supplied.";
}
function retainsRequiredHistory(expectedResult: string) {
  const value = normalized(expectedResult);
  if (/\bnot\s+(?:been\s+)?deleted\b/.test(value)) return true;
  return [...value.matchAll(/\b(?:retain|retained|preserve|preserved|available|unchanged|accessible|queryable|retrievable)\b/g)]
    .some((match) => !/\b(?:not|never)\s*(?:be\s*)?$/.test(value.slice(Math.max(0, match.index! - 16), match.index)));
}
function retentionFailureDetails(period: Metric, tests: DiscoveryTestCase[]) {
  const score = (test: DiscoveryTestCase) => Number(metrics([test.title, ...test.steps].join(" ")).some((actual) => metricMatches(period, actual))) * 2 + Number(/\b(?:retention|retain|retained|boundary|expiry)\b/i.test(testText(test)));
  const closest = tests.filter((test) => /\b(?:retention|retain|retained|audit|history|archive)\b/i.test(testText(test))).sort((left, right) => score(right) - score(left)).slice(0, 2);
  return closest.length ? ` Closest retention tests: ${closest.map((test) => `title=${literal(test.title).slice(0, 30)}; input=${literal(test.steps.join(" ")).slice(0, 55)}; expectedResult=${literal(test.expectedResult).slice(0, 55)}`).join(" | ")}` : " No matching retention test was supplied.";
}

export function reviewDiscoveryFidelity(synthesis: FidelityDefinition, inputLedger: DiscoveryEvidenceLedgerItem[], value: unknown, sources: DiscoveryEvidenceSource[], reviewGapIds: ReadonlySet<string> = new Set()) {
  const reviewed = reviewDiscoveryEvidenceLedger(inputLedger, sources);
  const ledger = reviewed.ledger;
  const errors = [...reviewed.errors];
  const reviewIssues = reviewed.reviewIssues;
  const warnings: string[] = [];
  const coverage: Coverage[] = [];
  if (!Array.isArray(value)) return { errors: [...errors, "Evidence-to-output coverage is required."], warnings, reviewIssues };
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
  const fields = visibleFields(synthesis, reviewGapIds);
  const allMetrics = fields.flatMap((text) => metrics(text));
  for (const item of ledger) {
    const row = coverage.find((entry) => entry.evidenceId === item.id);
    if (!row) { errors.push(`${item.id} has no evidence-to-output coverage.`); continue; }
    if (item.kind === "requirement" && row.disposition !== "gap" && (!row.storyIds.length || !row.testIds.length)) errors.push(`${item.id} needs mapped stories and relevant tests.`);
    if ((item.kind === "open-question" || row.disposition === "gap") && !row.gapIds.length) errors.push(`${item.id} needs a precise unresolved discovery gap.`);
    const noncommittalContext = row.disposition === "context" && !row.storyIds.length && !row.testIds.length && !metrics(item.statement).length
      && (/^(?:target|outcome|result)$/.test(proposalSubjectHead(item.statement) ?? "") && explicitUnconfirmedContext(item.statement, fields)
        || explicitPlanningNoncommitmentContext(item, fields));
    if (item.kind === "proposal" && !["proposal", "gap"].includes(row.disposition) && !noncommittalContext) errors.push(`${item.id} promotes a proposal to a confirmed obligation.`);
    if (["proposal", "open-question"].includes(item.kind) && row.storyIds.some((id) => stories.get(id)?.readiness !== "needs-input")) errors.push(`${item.id} has unresolved evidence but marks a dependent story ready.`);
    for (const expected of metrics(item.statement)) {
      const expectedStatistic = sourceMetricStatistic(item.statement, expected);
      if (!allMetrics.some((actual) => metricMatches(expected, actual))) errors.push(`${item.id} omits or changes a quantified source fact, target, unit or comparator.`);
      for (const field of fields) {
        const candidates = metrics(field).filter((actual) => actual.value === expected.value && unitBase(actual.unit) === unitBase(expected.unit) && measurementRelated(item.statement, metricContext(field, actual)));
        if (candidates.some((actual) => expected.countScope && actual.countScope && expected.countScope !== actual.countScope
          && !ledger.some((other) => metrics(other.statement).some((supported) => supported.countScope === actual.countScope && metricMatches(supported, actual))))) errors.push(`${item.id} changes a source count's baseline or pilot scope.`);
        if (candidates.some((actual) => /^(?:business|calendar) /.test(expected.unit) && /^(?:business|calendar) /.test(actual.unit) && actual.unit !== expected.unit)) errors.push(`${item.id} changes the measurement calendar or unit basis.`);
        if (candidates.some((actual) => expectedStatistic === "median" && assertsOpposingStatistic(metricContext(field, actual), expectedStatistic))) errors.push(`${item.id} changes a median into a mean/average. Offending output context: ${literal(field).slice(0, 500)}`);
        if (candidates.some((actual) => ["average", "mean"].includes(expectedStatistic ?? "") && assertsOpposingStatistic(metricContext(field, actual), expectedStatistic!))) errors.push(`${item.id} changes a mean/average into a median. Offending output context: ${literal(field).slice(0, 500)}`);
        if (item.kind === "proposal") for (const actual of candidates) {
          const context = metricContext(field, actual);
          const promotion = proposalPromotion(item, context, actual);
          const diagnosticContext = literal(field).length <= 400 ? literal(field) : context.slice(0, 400);
          if (promotion === "hard") errors.push(`${item.id} presents a proposed target as approved or achieved. Offending metric context: ${diagnosticContext}`);
          else if (promotion === "review") reviewIssues.push({ evidenceId: item.id, sourceId: item.sourceId, message: `Proposal approval or modifier scope requires owner review before commitment. Offending metric context: ${diagnosticContext}` });
        }
      }
    }
    if (item.kind === "proposal" && !metrics(item.statement).length) for (const field of fields.filter((value) => sameProposalSubject(item.statement, value))) {
      const promotion = proposalPromotion(item, field);
      if (promotion === "hard") errors.push(`${item.id} presents proposed outcomes as approved or achieved. Offending output context: ${literal(field).slice(0, 400)}`);
      else if (promotion === "review") reviewIssues.push({ evidenceId: item.id, sourceId: item.sourceId, message: `Proposal outcome status requires owner review before commitment. Offending output context: ${literal(field).slice(0, 400)}` });
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
    sourceId: source.id, clause, actions: actions(clause), scope: ownObjectScope(clause)
  })));
  if (policies.length) {
    // A test title is not a grammatical prefix for all steps/results: "Block self-
    // approval" + "the attempt is rejected" must not become a ban on rejecting an exception.
    for (const clause of [...fields, ...[...tests.values()].flatMap(({ test }) => [test.title, ...test.steps, test.expectedResult])].flatMap(restrictiveSelfClauses)) {
      if (ruleQualifiedRejectionNonProhibition(clause)) {
        const policy = policies.find((item) => item.scope === "policy exception" && item.actions.size === 1 && item.actions.has("approve"));
        const anchor = policy && ledger.find((item) => {
          if (item.sourceId !== policy.sourceId) return false;
          const restrictions = restrictiveSelfClauses(item.statement);
          return restrictions.length === 1 && restrictions.every((restriction) => {
            const restrictedActions = actions(restriction);
            return ownObjectScope(restriction) === policy.scope && restrictedActions.size === 1 && restrictedActions.has("approve") && sameAtomicClaim(restriction, policy.clause);
          });
        });
        if (anchor) {
          reviewIssues.push({ evidenceId: anchor.id, sourceId: anchor.sourceId, message: `Rule-qualified rejection wording needs owner review for object and authority. This qualifier does not establish permitted rejection or resolve a pronoun. Reviewed clause: ${clause.slice(0, 700)}. Source-supported restriction: approve own policy exception.` });
          continue;
        }
      }
      const objectPolicies = policies.filter((policy) => !policy.scope || clause.includes(policy.scope));
      const supportedActions = new Set(objectPolicies.flatMap((policy) => [...policy.actions]));
      const clauseActions = actions(clause);
      const ambiguousNegation = /\bnot\b.{0,24}\b(?:blocked|prevented|denied|prohibited|forbidden)\b|\b(?:unless|except|only if)\b/.test(clause);
      if (objectPolicies.length && [...clauseActions].every((action) => supportedActions.has(action)) && !ambiguousNegation) continue;
      const ownScope = ownObjectScope(clause);
      const head = scopeHead(ownScope);
      const omittedSelfObject = !ownScope && /\bself\b/.test(clause) && clauseActions.size > 0;
      const related = objectPolicies.length ? objectPolicies : policies.filter((policy) => (head && scopeHead(policy.scope) === head)
        || (omittedSelfObject && [...clauseActions].every((action) => policy.actions.has(action))));
      const relatedActions = new Set(related.flatMap((policy) => [...policy.actions]));
      const newAction = [...clauseActions].some((action) => !relatedActions.has(action));
      // Same-head shorthand cannot establish equivalent scope by itself. Hold it for
      // human review, but do not turn a clearly different object or added ban into a warning.
      const explicitAdditionalBan = /\b(?:cannot|can not|must not|may not|shall not|not allowed)\b/.test(clause);
      const anchor = related.flatMap((policy) => ledger.filter((item) => item.sourceId === policy.sourceId && sameAtomicClaim(item.statement, policy.clause) && [...actions(item.statement)].some((action) => policy.actions.has(action)))).at(0);
      if (anchor && related.length && (!newAction || (ambiguousNegation && !explicitAdditionalBan))) {
        reviewIssues.push({ evidenceId: anchor.id, sourceId: anchor.sourceId, message: `Self-decision wording needs owner review for scope or negation before commitment. Reviewed clause: ${clause.slice(0, 700)}. Source-supported scope: ${related.map((policy) => policy.scope ?? "self-decision").join("; ").slice(0, 700)}.` });
      } else {
        const support = (related.length ? related : policies).map((policy) => `${policy.sourceId}: ${[...policy.actions].join("/")} own ${policy.scope ?? "self-decision"}`).join("; ").slice(0, 300);
        errors.push(`A self-decision restriction changes its source-supported action or object scope. Offending clause: ${clause.slice(0, 240)}. Source-supported restrictions: ${support}.`);
      }
    }
  }

  // These are conditional, source-driven risk checks, not universal product requirements.
  // Unknown policy is a gap, never a reason to invent calendar, retry or privacy behavior.
  // A behavior may reconcile several sources, so do not require duplicate tests merely
  // because an overview and a detailed policy both mention the same concern.
  const scopedTests = synthesis.stories.flatMap((story) => story.testCases);
  const sourceGaps = synthesis.gaps.filter((gap) => !reviewGapIds.has(gap.id)).map((gap) => [gap.title, gap.description, gap.question].join(" "));
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
        if (!scopedTests.some((test) => metrics([test.title, ...test.steps].join(" ")).some((actual) => metricMatches(period, actual)) && /\b(?:before|until|boundary|expiry|expires|at least|minimum)\b/i.test([test.title, ...test.steps].join(" ")) && retainsRequiredHistory(test.expectedResult))) errors.push(`${source.id} needs a source-duration retention boundary test.${retentionFailureDetails(period, scopedTests)}`);
      }
    }
    if (/\b(?:sensitive|privacy)\b/.test(text) && /\b(?:only|restricted|restrict|protected)\b/.test(text)) {
      if (!hasTest(/\b(?:unassigned|unauthorized|not assigned|without (?:permission|access)|different (?:role|user))\b/, (test) => test.type !== "happy-path" && /\b(?:denied|blocked|not (?:disclosed|visible|exposed)|no (?:sensitive|personal|request) (?:content|details))\b/i.test(test.expectedResult))) errors.push(`${source.id} needs an unauthorized sensitive-content access test.`);
    }
    if (/\b(?:personal details|personal data|pii)\b/.test(text) && /\b(?:must not|not expose|redact)\b/.test(text)) {
      for (const channel of ["dashboard", "notification"] as const) {
        if (text.includes(channel) && !hasTest(new RegExp(`\\b${channel}s?\\b`), (test) => assertsPersonalDataRedaction(test))) errors.push(`${source.id} needs a ${channel} personal-data redaction test.${redactionFailureDetails(channel, scopedTests)}`);
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
  return { errors: [...new Set(errors)], warnings, reviewIssues };
}
