export type Experiment = {
  id: string;
  title: string;
  description: string;
  status: "concept" | "testing" | "evolving";
  tag?: "AI" | "product" | "workflow" | "CX" | "data" | "operating model";
  relatedInitiativeIds: string[];
};

export const experiments: Experiment[] = [
  {
    id: "order-guide-adoption-signals",
    title: "Order Guide Adoption Signals",
    description: "Tests which guide behaviors indicate durable value: add rate, exception rate, substitution confidence, repeat usage.",
    status: "testing",
    tag: "product",
    relatedInitiativeIds: ["order-guide-transformation"]
  },
  {
    id: "agentic-research-desk",
    title: "Agentic Research Desk",
    description: "Scores confidence, source quality, and missing evidence before synthesis reaches a decision brief.",
    status: "testing",
    tag: "AI",
    relatedInitiativeIds: ["coolition-decision-surface"]
  },
  {
    id: "voice-of-customer-radar",
    title: "Voice of Customer Radar",
    description: "Detects language drift before it appears in contact volume, escalation metrics, or policy exceptions.",
    status: "evolving",
    tag: "CX",
    relatedInitiativeIds: ["order-guide-transformation", "compliance-hub"]
  },
  {
    id: "workflow-capability-map",
    title: "Workflow Capability Map",
    description: "Exposes handoffs, capability gaps, automation candidates, ownership breaks, and control points.",
    status: "concept",
    tag: "workflow",
    relatedInitiativeIds: ["add-change-delete-modernization", "capability-driven-design-system"]
  },
  {
    id: "ai-operating-review",
    title: "AI Operating Review",
    description: "Reviews AI surfaces through adoption quality, override patterns, drift, risk posture, and rollout gates.",
    status: "evolving",
    tag: "operating model",
    relatedInitiativeIds: ["coolition-decision-surface", "ingredient-matching-system"]
  }
];
