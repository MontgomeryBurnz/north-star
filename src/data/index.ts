export { assistantFaqs, type AssistantFAQ } from "@/data/assistant-faqs";
export { aiProducts, type AIProduct } from "@/data/ai-products";
export { experiments, type Experiment } from "@/data/experiments";
export { frameworks, type Framework } from "@/data/frameworks";
export { initiatives, type Initiative } from "@/data/initiatives";
export { profile, type Profile } from "@/data/profile";
export { workMethods, type WorkMethod } from "@/data/how-i-work";

import { assistantFaqs } from "@/data/assistant-faqs";
import { aiProducts } from "@/data/ai-products";
import { experiments } from "@/data/experiments";
import { frameworks } from "@/data/frameworks";
import { initiatives } from "@/data/initiatives";
import { profile } from "@/data/profile";

export const contentRegistry = {
  initiatives,
  frameworks,
  aiProducts,
  experiments,
  assistantFaqs,
  profile
};

export type ContentRegistry = typeof contentRegistry;
