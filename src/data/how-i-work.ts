export type WorkMethod = {
  id: string;
  title: string;
  trigger: string;
  operatingMove: string;
  output: string;
};

export const workMethods: WorkMethod[] = [
  {
    id: "discovery-approach",
    title: "Discovery approach",
    trigger: "The problem is visible. The constraint is not.",
    operatingMove: "Separate signal from symptom. Map customer, business, workflow, and decision friction.",
    output: "Problem frame, evidence set, priority logic, system boundary."
  },
  {
    id: "ambiguity-to-requirements",
    title: "Ambiguity into requirements",
    trigger: "Teams agree something matters. They do not agree what must change.",
    operatingMove: "Convert fuzzy goals into users, jobs, constraints, failure modes, thresholds, and decision rules.",
    output: "Requirements with behavior, ownership, instrumentation, acceptance criteria."
  },
  {
    id: "workflow-capability-mapping",
    title: "Workflow and capability mapping",
    trigger: "Execution is slowed by handoffs, capability gaps, or duplicated effort.",
    operatingMove: "Map the workflow, decision points, data inputs, tools, owners, and capability gaps across the system.",
    output: "Capability map: automate, redesign, resource, or retire."
  },
  {
    id: "product-delivery-alignment",
    title: "Product + delivery alignment",
    trigger: "Strategy, roadmap, and delivery define progress differently.",
    operatingMove: "Tie product bets to delivery slices, risk gates, measurable outcomes, and operating cadence.",
    output: "Delivery model with bets, milestones, dependencies, owners, learning loops."
  },
  {
    id: "executive-alignment",
    title: "Executive alignment and communication",
    trigger: "Leadership needs a decision, not a status readout.",
    operatingMove: "Package context into the ask, evidence, tradeoffs, risks, recommendation, and decision deadline.",
    output: "Executive brief with decision, tradeoffs, risks, consequences."
  },
  {
    id: "iteration-delivery-model",
    title: "Iteration and delivery model",
    trigger: "A system is live but not stable, trusted, or scaled.",
    operatingMove: "Run measured iteration cycles: observe usage, capture exceptions, adjust rules, tighten controls, and scale what holds.",
    output: "Delivery loop with instrumentation, feedback, governance, scale criteria."
  }
];
