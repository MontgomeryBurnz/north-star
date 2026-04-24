export type AssistantFAQ = {
  id: string;
  question: string;
  answer: string;
  source: string;
  bullets?: string[];
  relatedInitiativeIds?: string[];
  relatedFrameworkIds?: string[];
  relatedProductIds?: string[];
  relatedExperimentIds?: string[];
};

export const assistantFaqs: AssistantFAQ[] = [
  {
    id: "current-systems",
    question: "What should I focus on in this program?",
    answer:
      "Start with the highest-leverage program constraint: outcome clarity, stakeholder alignment, delivery risk, or decision ownership.",
    source: "Active systems",
    bullets: [
      "Confirm the outcome and what would make the program healthy.",
      "Identify the decision, owner, and risk that are creating the most drag.",
      "Separate the signal from the noise around the next action the program actually needs."
    ],
    relatedInitiativeIds: [
      "order-guide-transformation",
      "add-change-delete-modernization",
      "capability-driven-design-system",
      "coolition-decision-surface"
    ],
    relatedFrameworkIds: ["signal-to-system", "capability-driven-design", "ai-operating-model"],
    relatedProductIds: ["work-context-assistant", "coolition"]
  },
  {
    id: "add-change-delete",
    question: "How should I structure this delivery plan?",
    answer:
      "Structure the plan around request types, owners, validation points, delivery gates, and measurable outputs.",
    source: "Add / Change / Delete Modernization",
    bullets: [
      "Define workstreams, milestones, owners, dependencies, and required decisions.",
      "Convert SoW language into deliverables, acceptance criteria, and delivery gates.",
      "Track risks by impact, owner, mitigation, and decision deadline."
    ],
    relatedInitiativeIds: ["add-change-delete-modernization", "compliance-hub"],
    relatedFrameworkIds: ["capability-driven-design", "decision-briefing-stack"],
    relatedProductIds: ["compliance-hub"]
  },
  {
    id: "add-first",
    question: "What is the best first move?",
    answer:
      "The best first move is the smallest action that creates useful value and produces a signal for the next decision.",
    source: "Add-First Value Delivery",
    bullets: [
      "Choose the move that reduces uncertainty without creating avoidable churn.",
      "Prefer action that validates value, ownership, or feasibility quickly.",
      "Use the result as evidence for the next delivery gate."
    ],
    relatedInitiativeIds: ["order-guide-transformation", "add-change-delete-modernization"],
    relatedFrameworkIds: ["add-first-value-delivery", "signal-to-system"],
    relatedProductIds: ["work-context-assistant"]
  },
  {
    id: "order-guide-system",
    question: "What outputs should this program produce?",
    answer:
      "A strong program output set includes a recommended plan, delivery approach, requirements, risks, owners, and next-step sequence.",
    source: "Order Guide Transformation",
    bullets: [
      "Recommended plan and delivery approach.",
      "Requirements, deliverables, owners, and acceptance criteria.",
      "Risk register, stakeholder moves, decision log, and next-step sequence."
    ],
    relatedInitiativeIds: ["order-guide-transformation", "ingredient-matching-system"],
    relatedFrameworkIds: ["signal-to-system", "add-first-value-delivery", "capability-driven-design"],
    relatedProductIds: ["ingredient-match-engine", "work-context-assistant"]
  },
  {
    id: "ambiguity-to-capabilities",
    question: "How do I turn ambiguity into requirements?",
    answer:
      "Ambiguity is translated by separating signals, decisions, workflows, data, controls, and ownership before delivery is sequenced.",
    source: "Capability-Driven Design",
    bullets: [
      "Name the recurring signal and the decision it should trigger.",
      "Map the workflow, data inputs, control points, owners, and missing capabilities.",
      "Sequence the smallest useful system, then instrument adoption and dependency risk."
    ],
    relatedInitiativeIds: ["capability-driven-design-system", "add-change-delete-modernization"],
    relatedFrameworkIds: ["capability-driven-design", "signal-to-system", "friction-economics"],
    relatedProductIds: ["strategy-memo-copilot"]
  },
  {
    id: "coolition",
    question: "How can AI help with this program?",
    answer:
      "AI should synthesize the program context, expose tradeoffs, recommend next steps, and keep the delivery lead oriented to the work path.",
    source: "AI lab",
    bullets: [
      "Summarize plans, SoWs, risks, stakeholder context, and open decisions.",
      "Recommend the best-fit delivery path with assumptions and tradeoffs.",
      "Convert scattered context into outputs the delivery lead can act on."
    ],
    relatedInitiativeIds: ["coolition-decision-surface"],
    relatedFrameworkIds: ["decision-briefing-stack", "ai-operating-model"],
    relatedProductIds: ["coolition", "strategy-memo-copilot"]
  },
  {
    id: "strategic-frameworks",
    question: "How do I separate the signal from the noise?",
    answer:
      "Separate the signal from the noise by naming pressure, extracting the decision, and grounding the next move in evidence.",
    source: "Frameworks",
    bullets: [
      "Write down pressure and conflict as context, not direction.",
      "Name the decision, evidence, owner, and deadline.",
      "Move toward the path that protects outcomes, trust, and program health."
    ],
    relatedInitiativeIds: ["capability-driven-design-system", "order-guide-transformation", "coolition-decision-surface"],
    relatedFrameworkIds: [
      "capability-driven-design",
      "add-first-value-delivery",
      "ai-operating-model",
      "decision-briefing-stack"
    ],
    relatedProductIds: ["strategy-memo-copilot", "coolition"]
  },
  {
    id: "roles-and-problems",
    question: "What information should I provide?",
    answer:
      "Provide the plan, SoW, desired outcomes, stakeholders, risks, constraints, current status, decisions needed, and known blockers.",
    source: "Operator profile",
    bullets: [
      "Plan, SoW, scope, assumptions, timeline, and key outcomes.",
      "Stakeholders, roles, decision rights, risks, constraints, and blockers.",
      "Current status, emotional load, conflict points, and the next output needed."
    ],
    relatedInitiativeIds: [
      "order-guide-transformation",
      "add-change-delete-modernization",
      "capability-driven-design-system",
      "coolition-decision-surface"
    ],
    relatedFrameworkIds: ["capability-driven-design", "friction-economics", "ai-operating-model"],
    relatedProductIds: ["work-context-assistant", "coolition", "strategy-memo-copilot"]
  }
];
