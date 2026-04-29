import { getConfiguredGuidedPlanProvider, type GuidedPlanProviderId } from "@/lib/guided-plan-service";
import { getOpenAIModelPricing, type OpenAIModelPricing } from "@/lib/openai-pricing";

export type GuidanceModelPricing = OpenAIModelPricing;

export type GuidanceModelProfile = {
  provider: GuidedPlanProviderId;
  model: string;
  reasoningEffort: string;
  textVerbosity: string;
  cacheStrategy: {
    summary: string;
    detail: string;
    sourceUrl: string;
    sourceLabel: string;
  };
  pricing: GuidanceModelPricing | null;
};

export function getGuidanceModelProfile(): GuidanceModelProfile {
  const model = process.env.OPENAI_MODEL?.trim() || "unconfigured";

  return {
    provider: getConfiguredGuidedPlanProvider(),
    model,
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT?.trim() || "medium",
    textVerbosity: process.env.OPENAI_TEXT_VERBOSITY?.trim() || "low",
    cacheStrategy: {
      summary: "Program and workflow-scoped prompt cache keys are sent with OpenAI guidance calls.",
      detail:
        "Stable instructions and schemas stay at the front of each request, while program-specific context is sent after them so repeated guidance runs can benefit from cached input when eligible.",
      sourceUrl: "https://platform.openai.com/docs/guides/prompt-caching",
      sourceLabel: "OpenAI prompt caching"
    },
    pricing: getOpenAIModelPricing(model)
  };
}
