import "server-only";

import { aiProducts, assistantFaqs, contentRegistry, experiments, frameworks, initiatives, profile } from "@/data";
import { getLatestGuidedPlan, listLeadershipFeedback, listPrograms, listProgramUpdates } from "@/lib/program-store";
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
  href?: string;
  status?: string;
};

type AssistantRetrievalOptions = {
  selectedProgramId?: string;
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
  "first",
  "should",
  "help"
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

function excerpt(value: string, limit = 220) {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, limit).trim()}...` : compacted;
}

async function contextualPrompts(selectedProgramId?: string) {
  if (!selectedProgramId) {
    return suggestedPrompts.slice(0, 4);
  }

  const programs = await listPrograms();
  const selectedProgram = programs.find((program) => program.id === selectedProgramId);
  const label = selectedProgram?.intake.programName || "this program";

  return [
    `What should I focus on for ${label}?`,
    `What are the top risks on ${label}?`,
    `What decisions are still needed for ${label}?`,
    `How should I guide Product, BA, UX, Engineering, Data, and Change on ${label}?`
  ];
}

async function buildProgramRecords(selectedProgramId?: string): Promise<RetrievalRecord[]> {
  const programs = await listPrograms();
  const scopedPrograms = selectedProgramId ? programs.filter((program) => program.id === selectedProgramId) : programs;

  const records = await Promise.all(
    scopedPrograms.map(async (program) => {
      const latestUpdate = (await listProgramUpdates(program.id))[0];
      const latestPlan = await getLatestGuidedPlan(program.id);
      const latestLeadershipFeedback = (await listLeadershipFeedback(program.id))[0];

      const title = program.intake.programName;
      const summary = program.intake.vision || program.intake.outcomes || program.intake.sowSummary || "Saved program context.";
      const leadershipText = latestLeadershipFeedback
        ? `${latestLeadershipFeedback.feedback.leadershipGuidance} ${latestLeadershipFeedback.feedback.feedbackToDeliveryLead} ${latestLeadershipFeedback.feedback.activeRisks}`
        : "";
      const planText = latestPlan
        ? `${latestPlan.summary} ${latestPlan.northStar} ${latestPlan.workPath.items.join(" ")} ${latestPlan.keyOutputs.items.join(" ")}`
        : "";
      const updateText = latestUpdate
        ? `${latestUpdate.review.progressSinceLastReview} ${latestUpdate.review.activeRisks} ${latestUpdate.review.decisionsPending} ${latestUpdate.review.supportNeeded}`
        : "";
      const reviewedContext = program.intake.reviewedContext
        ? `${program.intake.reviewedContext.outcomes} ${program.intake.reviewedContext.stakeholders} ${program.intake.reviewedContext.risks} ${program.intake.reviewedContext.requirements} ${program.intake.reviewedContext.outputs}`
        : "";

      return {
        id: program.id,
        type: "program" as const,
        title,
        summary: excerpt(summary, 180),
        body: [
          program.intake.programName,
          program.intake.vision,
          program.intake.sowSummary,
          program.intake.outcomes,
          program.intake.stakeholders,
          program.intake.risks,
          program.intake.constraints,
          program.intake.currentStatus,
          program.intake.decisionsNeeded,
          program.intake.blockers,
          reviewedContext,
          updateText,
          planText,
          leadershipText
        ]
          .filter(Boolean)
          .join(" "),
        tags: unique([
          "program",
          "saved-program",
          ...tokenize(program.intake.programName),
          ...tokenize(program.intake.vision),
          ...tokenize(program.intake.outcomes),
          ...tokenize(program.intake.stakeholders)
        ]),
        bullets: [
          `Program: ${program.intake.programName}`,
          `North star: ${program.intake.vision || program.intake.outcomes || "No north star captured yet."}`,
          `Current signal: ${
            latestUpdate?.review.progressSinceLastReview || program.intake.currentStatus || "No current program update captured yet."
          }`,
          `Risk posture: ${latestUpdate?.review.activeRisks || program.intake.risks || "No active risk captured yet."}`,
          `Latest plan: ${latestPlan?.summary || "No guided plan has been generated yet."}`
        ],
        href: "/active-program",
        status: latestUpdate?.review.currentPhase || program.intake.currentStatus || "Saved"
      };
    })
  );

  return records;
}

function buildStaticRetrievalRecords(): RetrievalRecord[] {
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
      ],
      href: `/systems/${initiative.id}`,
      status: initiative.status
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
      ],
      href: `/frameworks/${framework.id}`
    })),
    ...aiProducts.map((product) => ({
      id: product.id,
      type: "aiProduct" as const,
      title: product.name,
      summary: product.summary,
      body: `${product.name} ${product.status} ${product.summary} ${product.purpose} ${product.inputs.join(" ")} ${product.outputs.join(" ")} ${product.value}`,
      tags: ["AI", product.status, ...product.relatedInitiativeIds],
      bullets: [`Purpose: ${product.purpose}`, `Outputs: ${product.outputs.join(", ")}`, `Value: ${product.value}`],
      href: `/lab/${product.id}`,
      status: product.status
    })),
    ...experiments.map((experiment) => ({
      id: experiment.id,
      type: "experiment" as const,
      title: experiment.title,
      summary: experiment.description,
      body: `${experiment.title} ${experiment.status} ${experiment.description} ${experiment.tag ?? ""} ${experiment.relatedInitiativeIds.join(" ")}`,
      tags: [experiment.status, experiment.tag ?? "untagged", ...experiment.relatedInitiativeIds],
      bullets: [`Status: ${experiment.status}`, `Tag: ${experiment.tag ?? "unlabeled"}`],
      href: "/#signals",
      status: experiment.status
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

const staticRetrievalRecords = buildStaticRetrievalRecords();

async function getRetrievalRecords(options: AssistantRetrievalOptions = {}): Promise<RetrievalRecord[]> {
  const programRecords = await buildProgramRecords(options.selectedProgramId);
  if (options.selectedProgramId) {
    return programRecords;
  }
  return [...programRecords, ...staticRetrievalRecords];
}

function scoreRecord(record: RetrievalRecord, prompt: string, promptTokens: string[]) {
  const normalizedPrompt = normalize(prompt);
  const recordTokens = tokenize(`${record.title} ${record.body} ${record.tags.join(" ")}`);
  const normalizedTitle = normalize(record.title);
  const matchedKeywords = unique(
    promptTokens.filter((token) =>
      recordTokens.some((keyword) => keyword === token || keyword.includes(token) || token.includes(keyword))
    )
  );

  let score = matchedKeywords.reduce((total, token) => {
    const exact = recordTokens.filter((keyword) => keyword === token).length;
    const partial = recordTokens.some((keyword) => keyword.includes(token) || token.includes(keyword)) ? 1 : 0;
    const titleBoost = tokenize(record.title).includes(token) ? 3 : 0;
    return total + exact * 2 + partial + titleBoost;
  }, 0);

  if (normalizedPrompt.includes(normalizedTitle)) {
    score += record.type === "program" ? 20 : 8;
  }

  const tagPhraseBoost = record.tags.some((tag) => normalize(tag) && normalizedPrompt.includes(normalize(tag)));
  if (tagPhraseBoost) {
    score += record.type === "program" ? 12 : 4;
  }

  if (record.type === "program" && matchedKeywords.length) {
    score += 10;
  }

  return { score, matchedKeywords };
}

export async function getRelevantContent(
  prompt: string,
  options: AssistantRetrievalOptions = {},
  limit = 7
): Promise<MatchedContent[]> {
  const promptTokens = tokenize(prompt);

  if (!promptTokens.length) return [];

  const retrievalRecords = await getRetrievalRecords(options);

  return retrievalRecords
    .map((record) => {
      const { score, matchedKeywords } = scoreRecord(record, prompt, promptTokens);

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

async function getRecord(match: MatchedContent, options: AssistantRetrievalOptions = {}) {
  const retrievalRecords = await getRetrievalRecords(options);
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

async function getRecordByTypeAndId(type: AssistantContentType, id: string, options: AssistantRetrievalOptions = {}) {
  const retrievalRecords = await getRetrievalRecords(options);
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
      if (match.type === "program") {
        return [
          {
            id: match.id,
            type: "program" as const,
            title: match.title,
            href: "/active-program",
            summary: match.summary,
            status: "active context"
          }
        ];
      }
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
    ranking: matches,
    sections
  };
}

function sourceLabel(match: MatchedContent) {
  return `${match.type}: ${match.title}`;
}

async function directFaqMatches(
  prompt: string,
  existingMatches: MatchedContent[],
  options: AssistantRetrievalOptions = {}
) {
  if (options.selectedProgramId) {
    return null;
  }

  const directFaq = assistantFaqs.find((faq) => normalize(faq.question) === normalize(prompt));
  if (!directFaq) return null;

  const directRecord = await getRecordByTypeAndId("faq", directFaq.id, options);
  const matchedKeywords = tokenize(directFaq.question);
  const seededRecords = [
    directRecord ? toMatchedRecord(directRecord, 30, matchedKeywords) : null,
    ...(
      await Promise.all(
        (directFaq.relatedInitiativeIds ?? []).map(async (id, index) => {
          const record = await getRecordByTypeAndId("initiative", id);
          return record ? toMatchedRecord(record, 24 - index, matchedKeywords.slice(0, 4)) : null;
        })
      )
    ),
    ...(
      await Promise.all(
        (directFaq.relatedFrameworkIds ?? []).map(async (id, index) => {
          const record = await getRecordByTypeAndId("framework", id);
          return record ? toMatchedRecord(record, 18 - index, matchedKeywords.slice(0, 4)) : null;
        })
      )
    ),
    ...(
      await Promise.all(
        (directFaq.relatedProductIds ?? []).map(async (id, index) => {
          const record = await getRecordByTypeAndId("aiProduct", id);
          return record ? toMatchedRecord(record, 14 - index, matchedKeywords.slice(0, 4)) : null;
        })
      )
    ),
    ...(
      await Promise.all(
        (directFaq.relatedExperimentIds ?? []).map(async (id, index) => {
          const record = await getRecordByTypeAndId("experiment", id);
          return record ? toMatchedRecord(record, 10 - index, matchedKeywords.slice(0, 4)) : null;
        })
      )
    )
  ].filter(Boolean) as MatchedContent[];

  const combined = [...seededRecords, ...existingMatches]
    .filter(
      (match, index, all) =>
        all.findIndex((candidate) => candidate.type === match.type && candidate.id === match.id) === index
    )
    .slice(0, 8);

  return { faq: directFaq, matches: combined };
}

export async function composeGroundedAnswer(
  prompt: string,
  matches: MatchedContent[],
  options: AssistantRetrievalOptions = {}
): Promise<AssistantResponse> {
  const relatedPrompts = await contextualPrompts(options.selectedProgramId);
  const direct = await directFaqMatches(prompt, matches, options);

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
    const programs = await listPrograms();
    const scopeLabel = options.selectedProgramId
      ? "No strong program-grounded match inside the selected active program."
      : "No local record crossed the keyword threshold for this prompt.";
    const sections: AssistantSection[] = [
      {
        title: "No Strong Match",
        items: [
          scopeLabel,
          options.selectedProgramId
            ? "Add more program-specific language, or capture additional active updates, leadership feedback, or uploaded artifacts."
            : "Name the program, workstream, decision, role, or risk directly to improve grounding."
        ]
      },
      {
        title: "Indexed Local Surface",
        items: [
          `${programs.length} saved programs`,
          ...(options.selectedProgramId
            ? ["Scoped to the selected active program only."]
            : [
                `${contentRegistry.initiatives.length} initiatives`,
                `${contentRegistry.frameworks.length} frameworks`,
                `${contentRegistry.aiProducts.length} AI products`,
                `${contentRegistry.experiments.length} experiments`,
                `${contentRegistry.assistantFaqs.length} seeded assistant prompts`
              ])
        ]
      }
    ];

    return {
      answer:
        options.selectedProgramId
          ? "No strong match inside the selected program yet. Add more program-specific detail or capture fresh program inputs so the assistant can ground the guidance properly."
          : "No strong local match. Name the specific program, decision, role, or risk so the assistant can ground the response against the saved program context.",
      bullets: sections[0].items,
      sections,
      sources: ["Local content registry"],
      relatedPrompts,
      relatedContent: [],
      mode: "fallback",
      matches,
      debug: buildDebug(prompt, matches, sections)
    };
  }

  const records = (await Promise.all(matches.map((match) => getRecord(match, options)))).filter(isDefined);
  const primary = records[0];
  const primaryMatch = matches[0];
  const sections: AssistantSection[] = [
    {
      title: "Primary Match",
      items: [`${primary.title}: ${primary.summary}`]
    },
    {
      title: primaryMatch?.type === "program" ? "Program Context" : "Relevant Detail",
      items: records.flatMap((record) => record.bullets.slice(0, record.type === "program" ? 3 : 2)).slice(0, 6)
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
    relatedPrompts,
    relatedContent: relatedItemsFromMatches(matches),
    mode: "retrieval",
    matches,
    debug: buildDebug(prompt, matches, sections)
  };
}

export async function getAssistantResponse(prompt: string, options: AssistantRetrievalOptions = {}): Promise<AssistantResponse> {
  const matches = await getRelevantContent(prompt, options);
  return composeGroundedAnswer(prompt, matches, options);
}

export const getLocalAssistantResponse = getAssistantResponse;
