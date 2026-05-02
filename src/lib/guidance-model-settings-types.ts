export const guidanceProviderOptions = ["local", "openai"] as const;

export const guidanceModelOptions = [
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.2",
  "gpt-4.1",
  "gpt-4.1-mini"
] as const;

export const guidanceReasoningEffortOptions = ["minimal", "low", "medium", "high", "xhigh"] as const;

export const guidanceVerbosityOptions = ["low", "medium", "high"] as const;

export type GuidanceProviderId = (typeof guidanceProviderOptions)[number];

export type GuidanceReasoningEffort = (typeof guidanceReasoningEffortOptions)[number];

export type GuidanceTextVerbosity = (typeof guidanceVerbosityOptions)[number];

export type GuidanceModelSettings = {
  model: string;
  provider: GuidanceProviderId;
  reasoningEffort: GuidanceReasoningEffort;
  textVerbosity: GuidanceTextVerbosity;
  updatedAt?: string;
  updatedBy?: string;
};

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

export function normalizeGuidanceModelSettings(
  value: Partial<GuidanceModelSettings> | null | undefined,
  fallback: GuidanceModelSettings
): GuidanceModelSettings {
  const model = typeof value?.model === "string" && value.model.trim() ? value.model.trim() : fallback.model;
  const provider = isOneOf(value?.provider, guidanceProviderOptions) ? value.provider : fallback.provider;
  const reasoningEffort = isOneOf(value?.reasoningEffort, guidanceReasoningEffortOptions)
    ? value.reasoningEffort
    : fallback.reasoningEffort;
  const textVerbosity = isOneOf(value?.textVerbosity, guidanceVerbosityOptions)
    ? value.textVerbosity
    : fallback.textVerbosity;

  return {
    model,
    provider,
    reasoningEffort,
    textVerbosity,
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : fallback.updatedAt,
    updatedBy: typeof value?.updatedBy === "string" ? value.updatedBy : fallback.updatedBy
  };
}
