import { getEnvGuidanceModelSettings, getGuidanceModelSettings } from "@/lib/guidance-model-settings";
import type { GuidanceModelSettings, GuidanceProviderId } from "@/lib/guidance-model-settings-types";
import { getOpenAIModelPricing, type OpenAIModelPricing } from "@/lib/openai-pricing";

export type GuidanceModelPricing = OpenAIModelPricing;

export type GuidanceModelProfile = {
  provider: GuidanceProviderId;
  model: string;
  reasoningEffort: string;
  settingsUpdatedAt?: string;
  settingsUpdatedBy?: string;
  textVerbosity: string;
  cacheStrategy: {
    summary: string;
    detail: string;
    sourceUrl: string;
    sourceLabel: string;
  };
  pricing: GuidanceModelPricing | null;
};

export function buildGuidanceModelProfile(settings: GuidanceModelSettings): GuidanceModelProfile {
  return {
    provider: settings.provider,
    model: settings.model,
    reasoningEffort: settings.reasoningEffort,
    settingsUpdatedAt: settings.updatedAt,
    settingsUpdatedBy: settings.updatedBy,
    textVerbosity: settings.textVerbosity,
    cacheStrategy: {
      summary: "Program and workflow-scoped prompt cache keys are sent with OpenAI guidance calls.",
      detail:
        "Stable instructions and schemas stay at the front of each request, while program-specific context is sent after them so repeated guidance runs can benefit from cached input when eligible.",
      sourceUrl: "https://platform.openai.com/docs/guides/prompt-caching",
      sourceLabel: "OpenAI prompt caching"
    },
    pricing: getOpenAIModelPricing(settings.model)
  };
}

export function getGuidanceModelProfile(): GuidanceModelProfile {
  return buildGuidanceModelProfile(getEnvGuidanceModelSettings());
}

export async function getConfiguredGuidanceModelProfile(): Promise<GuidanceModelProfile> {
  return buildGuidanceModelProfile(await getGuidanceModelSettings());
}
