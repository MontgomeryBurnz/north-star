import { aiProducts, assistantFaqs, contentRegistry, experiments, frameworks, initiatives, profile } from "@/data";
import type {
  AssistantContentType,
  AssistantDebug,
  AssistantRelatedItem,
  AssistantResponse,
  AssistantSection,
  MatchedContent
} from "@/lib/assistant-types";

export type {
  AssistantContentType,
  AssistantDebug,
  AssistantMode,
  AssistantRelatedItem,
  AssistantResponse,
  AssistantSection,
  MatchedContent
} from "@/lib/assistant-types";

type RetrievalRecord = {
  id: string;
  type: AssistantContentType;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  bullets: string[];
};

const suggestedPrompts = assistantFaqs.map((faq) => faq.question);

const stopWords = new Set([
  "about",
  "active",
  "currently",
  "what",
  "which",
  "show",
  "examples",
  "example",
  "explain",
  "the",
  "and",
  "for",
  "are",
  "you",
  "your",
  "how",
  "does",
  "with",
  "work",
  "best",
  "kinds",
  "kind",
  "this",
  "that",
  "into",
  "from",
  "why",
  "start",
  "first"
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

function tokenize(value: string) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function buildRetrievalRecords(): RetrievalRecord[] {
  return [
    ...assistantFaqs.map((faq) => ({
      id: faq.id,
      type: "faq" as const,
      title: faq.question,
      summary: faq.answer,
      body: `${faq.question} ${faq.answer} ${(faq.bullets ?? []).join(" ")} ${faq.source}`,
      tags: [
        faq.source,
        ...(faq.relatedInitiativeIds ?? []),
        ...(faq.relatedFrameworkIds ?? []),
        ...(faq.relatedProductIds ?? []),
        ...(faq.relatedExperimentIds ?? [])
      ],
      bullets: faq.bullets ?? []
    })),
    ...initiatives.map((initiative) => ({
      id: initiative.id,
      type: "initiative" as const,
      title: initiative.title,
      summary: initiative.summary,
      body: `${initiative.title} ${initiative.type} ${initiative.status} ${initiative.summary} ${initiative.problemSpace} ${initiative.systemDesigned} ${initiative.howItWorks} ${initiative.valueCreated} ${initiative.strategicAngle} ${initiative.tags.join(" ")}`,
      tags: initiative.tags,
      bullets: [
        `Problem: ${initiative.problemSpace}`,
        `System: ${initiative.systemDesigned}`,
        `Value: ${initiative.valueCreated}`
      ]
    })),
    ...frameworks.map((framework) => ({
      id: framework.id,
      type: "framework" as const,
      title: framework.name,
      summary: framework.coreIdea,
      body: `${framework.name} ${framework.problemSolved} ${framework.coreIdea} ${framework.whereItApplies} ${framework.output}`,
      tags: ["framework", ...framework.relatedInitiativeIds],
      bullets: [
        `Problem solved: ${framework.problemSolved}`,
        `Applies to: ${framework.whereItApplies}`,
        `Output: ${framework.output}`
      ]
    })),
    ...aiProducts.map((product) => ({
      id: product.id,
      type: "aiProduct" as const,
      title: product.name,
      summary: product.summary,
      body: `${product.name} ${product.status} ${product.summary} ${product.purpose} ${product.inputs.join(" ")} ${product.outputs.join(" ")} ${product.value}`,
      tags: ["AI", product.status, ...product.relatedInitiativeIds],
      bullets: [`Purpose: ${product.purpose}`, `Outputs: ${product.outputs.join(", ")}`, `Value: ${product.value}`]
    })),
    ...experiments.map((experiment) => ({
      id: experiment.id,
      type: "experiment" as const,
      title: experiment.title,
      summary: experiment.description,
      body: `${experiment.title} ${experiment.status} ${experiment.description} ${experiment.tag ?? ""} ${experiment.relatedInitiativeIds.join(" ")}`,
      tags: [experiment.status, experiment.tag ?? "untagged", ...experiment.relatedInitiativeIds],
      bullets: [`Status: ${experiment.status}`, `Tag: ${experiment.tag ?? "unlabeled"}`]
    })),
    {
      id: profile.id,
      type: "profile" as const,
      title: "Operator Profile",
      summary: profile.positioning,
      body: `${profile.positioning} ${profile.operatingThesis} ${profile.focusAreas.join(" ")} ${profile.roleFit.join(" ")} ${profile.principles.join(" ")}`,
      tags: ["profile", "role fit", "operator"],
      bullets: [`Thesis: ${profile.operatingThesis}`, `Role fit: ${profile.roleFit.join(", ")}`]
    }
  ];
}

const retrievalRecords = buildRetrievalRecords();

function scoreRecord(record: RetrievalRecord, promptTokens: string[]) {
  const recordTokens = tokenize(`${record.title} ${record.body} ${record.tags.join(" ")}`);
  const matchedKeywords = unique(
    promptTokens.filter((token) =>
      recordTokens.some((keyword) => keyword === token || keyword.includes(token) || token.includes(keyword))
    )
  );

  const score = matchedKeywords.reduce((total, token) => {
    const exact = recordTokens.filter((keyword) => keyword === token).length;
    const partial = recordTokens.some((keyword) => keyword.includes(token) || token.includes(keyword)) ? 1 : 0;
    const titleBoost = tokenize(record.title).includes(token) ? 3 : 0;
    return total + exact * 2 + partial + titleBoost;
  }, 0);

  return { score, matchedKeywords };
}

export function getRelevantContent(prompt: string, limit = 7): MatchedContent[] {
  const promptTokens = tokenize(prompt);

  if (!promptTokens.length) return [];

  return retrievalRecords
    .map((record) => {
      const { score, matchedKeywords } = scoreRecord(record, promptTokens);

      return {
        id: record.id,
        type: record.type,
        title: record.title,
        score,
        summary: record.summary,
        tags: record.tags,
        matchedKeywords
      };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function getRecord(match: MatchedContent) {
  return retrievalRecords.find((record) => record.id === match.id && record.type === match.type);
}

function toMatchedRecord(record: RetrievalRecord, score = 12, matchedKeywords: string[] = []): MatchedContent {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    score,
    summary: record.summary,
    tags: record.tags,
    matchedKeywords
  };
}

function getRecordByTypeAndId(type: AssistantContentType, id: string) {
  return retrievalRecords.find((record) => record.type === type && record.id === id);
}

function relatedItemsForIds(
  initiativeIds: string[] = [],
  frameworkIds: string[] = [],
  productIds: string[] = [],
  experimentIds: string[] = []
): AssistantRelatedItem[] {
  const initiativeItems = initiativeIds
    .map((id) => initiatives.find((initiative) => initiative.id === id))
    .filter(isDefined)
    .map((initiative) => ({
      id: initiative.id,
      type: "initiative" as const,
      title: initiative.title,
      href: `/systems/${initiative.id}`,
      summary: initiative.summary,
      status: initiative.status
    }));

  const frameworkItems = frameworkIds
    .map((id) => frameworks.find((framework) => framework.id === id))
    .filter(isDefined)
    .map((framework) => ({
      id: framework.id,
      type: "framework" as const,
      title: framework.name,
      href: `/frameworks/${framework.id}`,
      summary: framework.coreIdea
    }));

  const productItems = productIds
    .map((id) => aiProducts.find((product) => product.id === id))
    .filter(isDefined)
    .map((product) => ({
      id: product.id,
      type: "aiProduct" as const,
      title: product.name,
      href: `/lab/${product.id}`,
      summary: product.summary,
      status: product.status
    }));

  const experimentItems = experimentIds
    .map((id) => experiments.find((experiment) => experiment.id === id))
    .filter(isDefined)
    .map((experiment) => ({
      id: experiment.id,
      type: "experiment" as const,
      title: experiment.title,
      href: "/#signals",
      summary: experiment.description,
      status: experiment.status
    }));

  return [...initiativeItems, ...frameworkItems, ...productItems, ...experimentItems];
}

function relatedItemsFromMatches(matches: MatchedContent[]): AssistantRelatedItem[] {
  return matches
    .flatMap((match) => {
      if (match.type === "initiative") return relatedItemsForIds([match.id]);
      if (match.type === "framework") return relatedItemsForIds([], [match.id]);
      if (match.type === "aiProduct") return relatedItemsForIds([], [], [match.id]);
      if (match.type === "experiment") return relatedItemsForIds([], [], [], [match.id]);
      return [];
    })
    .filter((item, index, all) => all.findIndex((candidate) => candidate.type === item.type && candidate.id === item.id) === index)
    .slice(0, 6);
}

function buildDebug(prompt: string, matches: MatchedContent[], sections: AssistantSection[]): AssistantDebug {
  return {
    normalizedPrompt: normalize(prompt),
    matchedKeywords: unique(matches.flatMap((match) => match.matchedKeywords)),
    matchedRecords: matches,
    ranking: matches.map((match, index) => ({ ...match, score: match.score + Math.max(0, 0 - index) })),
    sections
  };
}

function sourceLabel(match: MatchedContent) {
  return `${match.type}: ${match.title}`;
}

function directFaqMatches(prompt: string, existingMatches: MatchedContent[]) {
  const directFaq = assistantFaqs.find((faq) => normalize(faq.question) === normalize(prompt));
  if (!directFaq) return null;

  const directRecord = getRecordByTypeAndId("faq", directFaq.id);
  const matchedKeywords = tokenize(directFaq.question);
  const seededRecords = [
    directRecord ? toMatchedRecord(directRecord, 30, matchedKeywords) : null,
    ...(directFaq.relatedInitiativeIds ?? [])
      .map((id, index) => getRecordByTypeAndId("initiative", id))
      .filter(isDefined)
      .map((record, index) => toMatchedRecord(record, 24 - index, matchedKeywords.slice(0, 4))),
    ...(directFaq.relatedFrameworkIds ?? [])
      .map((id, index) => getRecordByTypeAndId("framework", id))
      .filter(isDefined)
      .map((record, index) => toMatchedRecord(record, 18 - index, matchedKeywords.slice(0, 4))),
    ...(directFaq.relatedProductIds ?? [])
      .map((id, index) => getRecordByTypeAndId("aiProduct", id))
      .filter(isDefined)
      .map((record, index) => toMatchedRecord(record, 14 - index, matchedKeywords.slice(0, 4))),
    ...(directFaq.relatedExperimentIds ?? [])
      .map((id, index) => getRecordByTypeAndId("experiment", id))
      .filter(isDefined)
      .map((record, index) => toMatchedRecord(record, 10 - index, matchedKeywords.slice(0, 4)))
  ].filter(Boolean) as MatchedContent[];

  const combined = [...seededRecords, ...existingMatches]
    .filter(
      (match, index, all) =>
        all.findIndex((candidate) => candidate.type === match.type && candidate.id === match.id) === index
    )
    .slice(0, 8);

  return { faq: directFaq, matches: combined };
}

export function composeGroundedAnswer(prompt: string, matches: MatchedContent[]): AssistantResponse {
  const direct = directFaqMatches(prompt, matches);

  if (direct) {
    const sections: AssistantSection[] = [
      { title: "Operating Answer", items: direct.faq.bullets ?? [] },
      {
        title: "Grounded Records",
        items: direct.matches
          .filter((match) => match.type !== "faq")
          .slice(0, 5)
          .map((match) => `${sourceLabel(match)} - ${match.summary}`)
      }
    ];

    return {
      answer: direct.faq.answer,
      bullets: direct.faq.bullets ?? [],
      sections,
      sources: direct.matches.map(sourceLabel),
      relatedPrompts: suggestedPrompts.filter((question) => question !== direct.faq.question).slice(0, 4),
      relatedContent: relatedItemsForIds(
        direct.faq.relatedInitiativeIds,
        direct.faq.relatedFrameworkIds,
        direct.faq.relatedProductIds,
        direct.faq.relatedExperimentIds
      ),
      mode: "direct",
      matches: direct.matches,
      debug: buildDebug(prompt, direct.matches, sections)
    };
  }

  if (!matches.length) {
    const sections: AssistantSection[] = [
      {
        title: "No Strong Match",
        items: [
          "No local record crossed the keyword threshold for this prompt.",
          "Try a seeded prompt about systems, Add / Change / Delete, Order Guide, Coolition, frameworks, or role fit."
        ]
      },
      {
        title: "Indexed Local Surface",
        items: [
          `${contentRegistry.initiatives.length} initiatives`,
          `${contentRegistry.frameworks.length} frameworks`,
          `${contentRegistry.aiProducts.length} AI products`,
          `${contentRegistry.experiments.length} experiments`,
          `${contentRegistry.assistantFaqs.length} seeded assistant prompts`
        ]
      }
    ];

    return {
      answer:
        "No strong local match. Use a seeded prompt or ask about systems, frameworks, AI products, experiments, Add / Change / Delete, Order Guide, Coolition, or role fit.",
      bullets: sections[0].items,
      sections,
      sources: ["Local content registry"],
      relatedPrompts: suggestedPrompts.slice(0, 4),
      relatedContent: [],
      mode: "fallback",
      matches,
      debug: buildDebug(prompt, matches, sections)
    };
  }

  const records = matches.map(getRecord).filter(Boolean) as RetrievalRecord[];
  const primary = records[0];
  const sections: AssistantSection[] = [
    {
      title: "Primary Match",
      items: [`${primary.title}: ${primary.summary}`]
    },
    {
      title: "Relevant Detail",
      items: records.flatMap((record) => record.bullets.slice(0, 2)).slice(0, 6)
    },
    {
      title: "Grounding",
      items: matches.slice(0, 5).map((match) => `${sourceLabel(match)} - matched on ${match.matchedKeywords.join(", ")}`)
    }
  ];

  return {
    answer: `${primary.title}: ${primary.summary}`,
    bullets: sections[1].items,
    sections,
    sources: unique(matches.map(sourceLabel)),
    relatedPrompts: suggestedPrompts.slice(0, 4),
    relatedContent: relatedItemsFromMatches(matches),
    mode: "retrieval",
    matches,
    debug: buildDebug(prompt, matches, sections)
  };
}

export async function getAssistantResponse(prompt: string): Promise<AssistantResponse> {
  const matches = getRelevantContent(prompt);
  return composeGroundedAnswer(prompt, matches);
}

export const getLocalAssistantResponse = getAssistantResponse;
