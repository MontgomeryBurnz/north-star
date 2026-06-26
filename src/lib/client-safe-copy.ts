import type { DeliveryBoardItem, ProgramTimelineMilestone } from "./active-program-types.ts";
import type { ClientPortalUpdateInput, ClientPortalUpdateRecord } from "./client-portal-update-types.ts";
import { normalizeWhitespace } from "./text-signals.ts";

export type ClientSafeCopyIssue = {
  excerpt: string;
  field: string;
  message: string;
  ruleId: string;
};

export type ClientSafeCopyValidation = {
  issues: ClientSafeCopyIssue[];
  ok: boolean;
};

export const clientSafeCopyFallback = "Client-facing detail is under review before publication.";

const clientUnsafeCopyRules = [
  {
    id: "internal-markers",
    message: "Remove internal-only, private, or tactical working-note language.",
    pattern:
      /\b(?:internal\s+only|do\s+not\s+share|not\s+for\s+clients?|not\s+client[-\s]?facing|private\s+notes?|working\s+notes?|tactical\s+working\s+notes?|internal\s+blockers?|our\s+team\s+internally|behind\s+the\s+scenes)\b/i
  },
  {
    id: "relationship-sensitive",
    message: "Rewrite relationship-sensitive language into factual, client-ready phrasing.",
    pattern:
      /\b(?:difficult|unreasonable|inappropriate|frustrat(?:ed|ing|ion)|hostile|toxic|personality|politics|political|blame|fault)\b/i
  },
  {
    id: "commercial-private",
    message: "Remove commercial or delivery-margin language that should stay internal.",
    pattern:
      /\b(?:margin|profitability|rate\s+card|write[-\s]?off|non[-\s]?billable|over[-\s]?servicing|staffing\s+cost|burn\s+rate)\b/i
  }
] as const;

function clean(value: unknown) {
  return typeof value === "string" ? normalizeWhitespace(value) : "";
}

function excerpt(value: string) {
  const cleaned = clean(value);
  if (cleaned.length <= 120) return cleaned;
  return `${cleaned.slice(0, 120).replace(/\s+\S*$/, "").trim()}...`;
}

function inspectClientVisibleText(field: string, value: unknown): ClientSafeCopyIssue[] {
  const cleaned = clean(value);
  if (!cleaned) return [];

  return clientUnsafeCopyRules
    .filter((rule) => rule.pattern.test(cleaned))
    .map((rule) => ({
      excerpt: excerpt(cleaned),
      field,
      message: rule.message,
      ruleId: rule.id
    }));
}

function inspectDeliveryBoardItem(item: DeliveryBoardItem, index: number) {
  return [
    ...inspectClientVisibleText(`deliveryBoardItems[${index}].title`, item.title),
    ...inspectClientVisibleText(`deliveryBoardItems[${index}].description`, item.description),
    ...inspectClientVisibleText(`deliveryBoardItems[${index}].latestNote`, item.latestNote)
  ];
}

function inspectMilestone(milestone: ProgramTimelineMilestone, index: number) {
  return [
    ...inspectClientVisibleText(`programMilestones[${index}].name`, milestone.name),
    ...inspectClientVisibleText(`programMilestones[${index}].note`, milestone.note)
  ];
}

export function validateClientPortalUpdateInput(input: ClientPortalUpdateInput): ClientSafeCopyValidation {
  const issues: ClientSafeCopyIssue[] = [
    ...inspectClientVisibleText("activeRisks", input.activeRisks),
    ...inspectClientVisibleText("clientStatusNote", input.clientStatusNote),
    ...inspectClientVisibleText("currentPhase", input.currentPhase),
    ...inspectClientVisibleText("decisionsPending", input.decisionsPending),
    ...inspectClientVisibleText("deliveryHealth", input.deliveryHealth),
    ...inspectClientVisibleText("executiveOverview", input.executiveOverview),
    ...inspectClientVisibleText("originalNorthStar", input.originalNorthStar),
    ...inspectClientVisibleText("progressSinceLastReview", input.progressSinceLastReview),
    ...inspectClientVisibleText("publicationNote", input.publicationNote),
    ...inspectClientVisibleText("supportNeeded", input.supportNeeded),
    ...inspectClientVisibleText("upcomingWork", input.upcomingWork),
    ...(input.domainUpdates ?? []).flatMap((domain, index) => [
      ...inspectClientVisibleText(`domainUpdates[${index}].pursuit`, domain.pursuit),
      ...inspectClientVisibleText(`domainUpdates[${index}].risksOrBlockers`, domain.risksOrBlockers),
      ...inspectClientVisibleText(`domainUpdates[${index}].decisionsOrOutcomes`, domain.decisionsOrOutcomes)
    ]),
    ...(input.deliveryBoardItems ?? []).flatMap(inspectDeliveryBoardItem),
    ...(input.programMilestones ?? []).flatMap(inspectMilestone)
  ];

  return { issues, ok: issues.length === 0 };
}

export function sanitizeClientVisibleText(value: string | undefined | null, fallback = "") {
  const cleaned = clean(value);
  if (!cleaned) return "";
  return inspectClientVisibleText("value", cleaned).length ? fallback : cleaned;
}

export function sanitizeClientPortalUpdateForDisplay(update: ClientPortalUpdateRecord): ClientPortalUpdateRecord {
  const sanitizedDomainUpdates = update.domainUpdates.map((domain) => ({
    ...domain,
    decisionsOrOutcomes: sanitizeClientVisibleText(domain.decisionsOrOutcomes),
    pursuit: sanitizeClientVisibleText(domain.pursuit),
    risksOrBlockers: sanitizeClientVisibleText(domain.risksOrBlockers)
  }));
  const sanitizedDeliveryBoardItems = (update.deliveryBoardItems ?? []).map((item) => ({
    ...item,
    description: sanitizeClientVisibleText(item.description),
    latestNote: sanitizeClientVisibleText(item.latestNote),
    title: sanitizeClientVisibleText(item.title, "Client-visible delivery item")
  }));
  const sanitizedMilestones = (update.programMilestones ?? []).map((milestone) => ({
    ...milestone,
    name: sanitizeClientVisibleText(milestone.name, "Client-visible milestone"),
    note: sanitizeClientVisibleText(milestone.note)
  }));

  return {
    ...update,
    activeRisks: sanitizeClientVisibleText(update.activeRisks),
    clientStatusNote: sanitizeClientVisibleText(update.clientStatusNote),
    currentPhase: sanitizeClientVisibleText(update.currentPhase, "Phase not set"),
    decisionsPending: sanitizeClientVisibleText(update.decisionsPending),
    deliveryBoardItems: sanitizedDeliveryBoardItems,
    deliveryHealth: sanitizeClientVisibleText(update.deliveryHealth),
    domainUpdates: sanitizedDomainUpdates,
    executiveOverview: sanitizeClientVisibleText(update.executiveOverview),
    originalNorthStar: sanitizeClientVisibleText(update.originalNorthStar),
    programMilestones: sanitizedMilestones,
    progressSinceLastReview: sanitizeClientVisibleText(update.progressSinceLastReview),
    publicationNote: sanitizeClientVisibleText(update.publicationNote),
    supportNeeded: sanitizeClientVisibleText(update.supportNeeded),
    upcomingWork: sanitizeClientVisibleText(update.upcomingWork)
  };
}
