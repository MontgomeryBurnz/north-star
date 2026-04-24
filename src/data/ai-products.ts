export type AIProduct = {
  id: string;
  name: string;
  status: "concept" | "prototype" | "beta" | "live";
  summary: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  value: string;
  relatedInitiativeIds: string[];
};

export const aiProducts: AIProduct[] = [
  {
    id: "work-context-assistant",
    name: "Work Context Assistant",
    status: "beta",
    summary: "Answers questions from local operating content, decisions, frameworks, and open risks.",
    purpose: "Provide a grounded intelligence layer over the operator console without external dependencies.",
    inputs: ["initiatives", "frameworks", "assistant FAQs", "experiments", "profile signals"],
    outputs: ["grounded answer", "source labels", "related prompts", "matched records"],
    value: "Makes the site inspectable, testable, and ready for later OpenAI-backed retrieval.",
    relatedInitiativeIds: ["coolition-decision-surface", "order-guide-transformation"]
  },
  {
    id: "ingredient-match-engine",
    name: "Ingredient Match Engine",
    status: "prototype",
    summary: "Scores ingredient and item matches using structured metadata, semantic similarity, and review gates.",
    purpose: "Improve item findability, substitution confidence, and compliance-sensitive matching.",
    inputs: ["item attributes", "ingredient terms", "customer constraints", "exception history"],
    outputs: ["candidate matches", "confidence score", "review queue", "data quality flags"],
    value: "Turns messy product language into a governed matching capability.",
    relatedInitiativeIds: ["ingredient-matching-system", "order-guide-transformation"]
  },
  {
    id: "compliance-hub",
    name: "Compliance Hub Copilot",
    status: "concept",
    summary: "Structures compliance questions into rules, evidence, exceptions, and approval paths.",
    purpose: "Reduce ambiguity in compliance-sensitive workflows before work reaches final review.",
    inputs: ["policy rules", "item metadata", "request context", "approval state"],
    outputs: ["evidence checklist", "risk flag", "approval route", "audit summary"],
    value: "Creates faster, cleaner compliance decisions with less manual interpretation.",
    relatedInitiativeIds: ["compliance-hub", "add-change-delete-modernization"]
  },
  {
    id: "strategy-memo-copilot",
    name: "Strategy Memo Copilot",
    status: "live",
    summary: "Turns rough decision context into briefs with assumptions, tradeoffs, risks, and asks.",
    purpose: "Standardize executive communication around decision quality instead of status reporting.",
    inputs: ["decision context", "evidence", "open risks", "owners", "timing constraints"],
    outputs: ["decision memo", "assumption ledger", "risk register", "owner commitments"],
    value: "Shortens executive alignment cycles and preserves decision rationale.",
    relatedInitiativeIds: ["capability-driven-design-system", "coolition-decision-surface"]
  },
  {
    id: "coolition",
    name: "Coolition",
    status: "concept",
    summary: "AI-native decision surface for operators managing fragmented context and cross-functional ambiguity.",
    purpose: "Convert scattered operating context into decision-ready structure.",
    inputs: ["meetings", "docs", "signals", "risks", "options", "constraints"],
    outputs: ["decision brief", "tradeoff map", "next moves", "open questions"],
    value: "Improves decision hygiene where product, operations, and AI strategy intersect.",
    relatedInitiativeIds: ["coolition-decision-surface"]
  }
];
