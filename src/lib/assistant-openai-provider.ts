import { composeGroundedAnswer, getRelevantContent } from "@/lib/assistant";
import type { AssistantProvider, AssistantRequest, AssistantServiceResponse } from "@/lib/assistant-types";

type OpenAIComposedPayload = {
  answer: string;
  bullets: string[];
  sections: Array<{ title: string; items: string[] }>;
};

type ResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
};

function getConfiguredModel() {
  return process.env.OPENAI_MODEL?.trim();
}

function safeJsonParse(value: string): OpenAIComposedPayload | null {
  try {
    return JSON.parse(value) as OpenAIComposedPayload;
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1)) as OpenAIComposedPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractOutputText(payload: ResponsesApiPayload) {
  if (payload.output_text?.trim()) return payload.output_text;

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text?.trim()) {
        return content.text;
      }
    }
  }

  return "";
}

export const openaiAssistantProvider: AssistantProvider = {
  id: "openai",
  async getResponse(request: AssistantRequest): Promise<AssistantServiceResponse> {
    const matches = getRelevantContent(request.prompt);
    const localGroundedResponse = composeGroundedAnswer(request.prompt, matches);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const model = getConfiguredModel();

    if (!apiKey || !model) {
      return {
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
      };
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

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        store: false,
        text: {
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
                text:
                  "You are an operator-level delivery guidance assistant. Use only the grounded local records provided. Be concise and practical."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `User prompt:\n${request.prompt}\n\nRecent conversation:\n${historyBlock || "None"}\n\nGrounded local records:\n${groundingText || "No direct matches."}\n\nLocal baseline answer:\n${JSON.stringify(
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
      return {
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
      };
    }

    const payload = (await response.json()) as ResponsesApiPayload;
    const parsed = safeJsonParse(extractOutputText(payload));

    if (!parsed) {
      return {
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
      };
    }

    return {
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
    };
  }
};
