export type OpenAIModelPricing = {
  inputPerMillionTokens: string;
  cachedInputPerMillionTokens: string;
  outputPerMillionTokens: string;
  inputPerMillionTokensUsd: number;
  cachedInputPerMillionTokensUsd: number;
  outputPerMillionTokensUsd: number;
  sourceUrl: string;
  sourceLabel: string;
  asOf: string;
};

const pricingByModel: Record<string, OpenAIModelPricing> = {
  "gpt-5.5": {
    inputPerMillionTokens: "$5.00",
    cachedInputPerMillionTokens: "$0.50",
    outputPerMillionTokens: "$30.00",
    inputPerMillionTokensUsd: 5,
    cachedInputPerMillionTokensUsd: 0.5,
    outputPerMillionTokensUsd: 30,
    sourceUrl: "https://openai.com/api/pricing/",
    sourceLabel: "OpenAI API pricing",
    asOf: "April 29, 2026"
  }
};

export function getOpenAIModelPricing(model: string) {
  const normalizedModel = model.trim().toLowerCase();
  const directMatch = pricingByModel[normalizedModel];
  if (directMatch) return directMatch;

  const matchingBaseModel = Object.keys(pricingByModel).find((modelKey) => normalizedModel.startsWith(modelKey));
  return matchingBaseModel ? pricingByModel[matchingBaseModel] : null;
}
