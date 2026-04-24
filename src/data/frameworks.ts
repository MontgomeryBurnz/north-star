export type Framework = {
  id: string;
  name: string;
  problemSolved: string;
  coreIdea: string;
  whereItApplies: string;
  output: string;
  relatedInitiativeIds: string[];
};

export const frameworks: Framework[] = [
  {
    id: "signal-to-system",
    name: "Signal to System",
    problemSolved: "Recurring signals are visible but not owned, measured, or converted into decisions.",
    coreIdea:
      "Repeated noise points to a missing mechanism. Name the signal, set thresholds, assign ownership, and create cadence.",
    whereItApplies: "Order guide adoption, compliance exceptions, customer friction, AI quality drift.",
    output: "Signal taxonomy, owner map, threshold logic, review cadence, decision rule.",
    relatedInitiativeIds: ["order-guide-transformation", "compliance-hub", "ingredient-matching-system"]
  },
  {
    id: "capability-driven-design",
    name: "Capability-Driven Design",
    problemSolved: "Teams commit to features before understanding the capabilities required to operate them.",
    coreIdea:
      "Map the workflow, data, controls, decision points, and ownership model before sequencing product delivery.",
    whereItApplies: "Workflow modernization, roadmap shaping, operating model design, cross-functional delivery.",
    output: "Capability map, dependency model, delivery sequence, ownership gaps.",
    relatedInitiativeIds: ["capability-driven-design-system", "order-guide-transformation"]
  },
  {
    id: "friction-economics",
    name: "Friction Economics",
    problemSolved: "Teams prioritize visible pain without quantifying operational drag or customer trust impact.",
    coreIdea:
      "Score friction by repeat contact, delay, rework, policy exceptions, trust loss, and cost-to-serve.",
    whereItApplies: "CX transformation, order workflows, support operations, service recovery.",
    output: "Ranked intervention map tied to business drag, confidence, and effort.",
    relatedInitiativeIds: ["capability-driven-design-system", "order-guide-transformation"]
  },
  {
    id: "add-first-value-delivery",
    name: "Add-First Value Delivery",
    problemSolved: "Transformation efforts stall when teams optimize change management before proving user value.",
    coreIdea:
      "Deliver the additive value path first, instrument adoption, then use signal quality to guide workflow change.",
    whereItApplies: "Order guide transformation, item onboarding, workflow modernization, customer-facing adoption.",
    output: "Add-first delivery sequence, adoption signals, rollout gates, change backlog.",
    relatedInitiativeIds: ["order-guide-transformation", "add-change-delete-modernization"]
  },
  {
    id: "ai-operating-model",
    name: "AI Operating Model",
    problemSolved: "AI concepts scale as demos instead of controlled product surfaces.",
    coreIdea:
      "Every AI surface needs use case definition, evaluation, human control, adoption signal, and governance.",
    whereItApplies: "Coolition, ingredient matching, work context assistants, decision support.",
    output: "AI use-case brief, evaluation rubric, guardrails, rollout gate, override loop.",
    relatedInitiativeIds: ["coolition-decision-surface", "ingredient-matching-system"]
  },
  {
    id: "decision-briefing-stack",
    name: "Decision Briefing Stack",
    problemSolved: "Leadership decisions slow down when context, evidence, and risk are scattered.",
    coreIdea:
      "Package decisions into context, signal, options, tradeoffs, recommendation, owner, and next checkpoint.",
    whereItApplies: "Executive alignment, compliance escalation, roadmap calls, product governance.",
    output: "Decision brief with ask, evidence, tradeoffs, risks, owner commitments.",
    relatedInitiativeIds: ["coolition-decision-surface", "compliance-hub", "add-change-delete-modernization"]
  }
];
