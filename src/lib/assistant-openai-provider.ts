import { composeGroundedAnswer, getRelevantContent } from "@/lib/assistant";
import type { AssistantProvider, AssistantRequest, AssistantServiceResponse } from "@/lib/assistant-types";
import { getNorthStarPromptCacheKey } from "@/lib/openai-prompt-cache";
import { asRecord, asStringArray, asTrimmedString, extractOutputText, parseStructuredModelOutput } from "@/lib/openai-structured-output";
import { extractOpenAIUsageMetadata } from "@/lib/openai-usage";
import type { OpenAIUsageMetadata } from "@/lib/program-intelligence-types";

type OpenAIComposedPayload = {
  answer: string;
  bullets: string[];
  sections: Array<{ title: string; items: string[] }>;
};

function getConfiguredModel() {
  return process.env.OPENAI_MODEL?.trim();
}

function getConfiguredReasoningEffort() {
  const value = process.env.OPENAI_REASONING_EFFORT?.trim();
  if (value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh") {
    return value;
  }
  return "medium";
}

function getConfiguredVerbosity() {
  const value = process.env.OPENAI_TEXT_VERBOSITY?.trim();
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "low";
}

function validateComposedPayload(value: unknown): OpenAIComposedPayload | null {
  const record = asRecord(value);
  if (!record) return null;

  const answer = asTrimmedString(record.answer);
  const bullets = asStringArray(record.bullets, { min: 1, max: 6 });
  const sectionsValue = Array.isArray(record.sections) ? record.sections : null;
  if (!answer || !bullets || !sectionsValue) return null;

  const sections = sectionsValue
    .map((section) => {
      const sectionRecord = asRecord(section);
      if (!sectionRecord) return null;
      const title = asTrimmedString(sectionRecord.title);
      const items = asStringArray(sectionRecord.items, { min: 1, max: 6 });
      if (!title || !items) return null;
      return { title, items };
    })
    .filter((section): section is OpenAIComposedPayload["sections"][number] => Boolean(section));

  if (!sections.length) return null;

  return { answer, bullets, sections };
}

function withModelProfile(
  response: AssistantServiceResponse,
  model: string,
  reasoningEffort: string,
  verbosity: string,
  usage?: OpenAIUsageMetadata
): AssistantServiceResponse {
  return {
    ...response,
    debug: {
      ...response.debug,
      modelProfile: {
        provider: "openai",
        model,
        reasoningEffort,
        verbosity,
        usage
      }
    }
  };
}

export const openaiAssistantProvider: AssistantProvider = {
  id: "openai",
  async getResponse(request: AssistantRequest): Promise<AssistantServiceResponse> {
    const retrievalOptions = { selectedProgramId: request.selectedProgramId };
    const matches = await getRelevantContent(request.prompt, retrievalOptions);
    const localGroundedResponse = await composeGroundedAnswer(request.prompt, matches, retrievalOptions);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const model = getConfiguredModel();
    const reasoningEffort = getConfiguredReasoningEffort();
    const verbosity = getConfiguredVerbosity();

    if (!apiKey || !model) {
      return withModelProfile({
        ...localGroundedResponse,
        sections: [
          ...localGroundedResponse.sections,
          {
            title: "Model Status",
            items: ["OpenAI integration is wired, but `OPENAI_API_KEY` or `OPENAI_MODEL` is still missing."]
          }
        ],
        sources: [...localGroundedResponse.sources, "provider: openai-fallback"],
        provider: "openai"
      }, model || "unconfigured", reasoningEffort, verbosity);
    }

    const groundingText = matches
      .map(
        (match, index) =>
          `${index + 1}. [${match.type}] ${match.title}\nSummary: ${match.summary}\nTags: ${match.tags.join(", ")}\nMatched keywords: ${match.matchedKeywords.join(", ")}`
      )
      .join("\n\n");

    const historyBlock = (request.history ?? [])
      .slice(-6)
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");
    const promptCacheKey = getNorthStarPromptCacheKey("guide", request.selectedProgramId);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        store: false,
        prompt_cache_key: promptCacheKey,
        reasoning: {
          effort: reasoningEffort
        },
        text: {
          verbosity,
          format: {
            type: "json_schema",
            name: "assistant_response",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                answer: { type: "string" },
                bullets: {
                  type: "array",
                  items: { type: "string" }
                },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      items: {
                        type: "array",
                        items: { type: "string" }
                      }
                    },
                    required: ["title", "items"]
                  }
                }
              },
              required: ["answer", "bullets", "sections"]
            }
          }
        },
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: [
                  "You are North Star, an operator-level delivery guidance assistant for complex programs.",
                  "Work outcome-first. Use only the grounded local records provided.",
                  request.selectedProgramId
                    ? "The user selected a specific active program. Stay strictly inside that program context. Ignore unrelated demo, lab, or seeded product ideas."
                    : "If no active program is selected, use the strongest grounded records available.",
                  "Your job is to help delivery leads find the clearest next move, structure the guided plan, and position delivery roles for success.",
                  "When relevant, translate guidance across these operating roles: Product Management, Business Analysis, User Experience, Application Development, Data Engineering, and Change Management.",
                  "When leadership direction is present, convert it into delivery-safe guidance and show how it changes planning, risk posture, outputs, and role-specific action.",
                  "Do not invent facts, program artifacts, or roles that are not grounded in the provided records.",
                  "Be concise, direct, and structured. Prefer concrete actions, checkpoints, outcomes, and mitigations over abstract advice."
                ].join(" ")
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Expected output contract:
- Return grounded guidance only.
- Keep the answer useful for a delivery lead operating one or more complex programs.
- Where appropriate, organize guidance around next moves, role action plans, risks, mitigations, outputs, and leadership translation.
- If grounding is weak, say what is missing and what context would improve the plan.

User prompt:
${request.prompt}

Selected program id:
${request.selectedProgramId || "None"}

Recent conversation:
${historyBlock || "None"}

Grounded local records:
${groundingText || "No direct matches."}

Local baseline answer:
${JSON.stringify(
                  {
                    answer: localGroundedResponse.answer,
                    bullets: localGroundedResponse.bullets,
                    sections: localGroundedResponse.sections
                  },
                  null,
                  2
                )}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      return withModelProfile({
        ...localGroundedResponse,
        sections: [
          ...localGroundedResponse.sections,
          {
            title: "Model Status",
            items: [`OpenAI request failed with status ${response.status}. Local grounding remained the response source.`]
          }
        ],
        sources: [...localGroundedResponse.sources, "provider: openai-error-fallback"],
        provider: "openai"
      }, model, reasoningEffort, verbosity);
    }

    const payload = await response.json();
    const modelUsage = extractOpenAIUsageMetadata({
      payload,
      workflow: "guide",
      model,
      reasoningEffort,
      cacheKey: promptCacheKey
    });
    const parsed = parseStructuredModelOutput(extractOutputText(payload), validateComposedPayload);

    if (!parsed) {
      return withModelProfile({
        ...localGroundedResponse,
        sections: [
          ...localGroundedResponse.sections,
          {
            title: "Model Status",
            items: ["OpenAI returned a response, but it was not valid JSON. Local grounding remained authoritative."]
          }
        ],
        sources: [...localGroundedResponse.sources, "provider: openai-parse-fallback"],
        provider: "openai"
      }, model, reasoningEffort, verbosity, modelUsage ?? undefined);
    }

    return withModelProfile({
      answer: parsed.answer,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : localGroundedResponse.bullets,
      sections: Array.isArray(parsed.sections) && parsed.sections.length ? parsed.sections : localGroundedResponse.sections,
      sources: [...localGroundedResponse.sources, "provider: openai-responses"],
      relatedPrompts: localGroundedResponse.relatedPrompts,
      relatedContent: localGroundedResponse.relatedContent,
      mode: localGroundedResponse.mode,
      matches,
      debug: localGroundedResponse.debug,
      provider: "openai"
    }, model, reasoningEffort, verbosity, modelUsage ?? undefined);
  }
};
