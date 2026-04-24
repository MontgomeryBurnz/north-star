export type Initiative = {
  id: string;
  title: string;
  type: "Product" | "Data" | "CX" | "AI" | "Operating Model";
  status: "Active" | "Scaling" | "Concept" | "Delivered";
  summary: string;
  problemSpace: string;
  systemDesigned: string;
  howItWorks: string;
  valueCreated: string;
  strategicAngle: string;
  inputContext: string[];
  recommendedNextSteps: string[];
  deliveryOutputs: string[];
  riskSignals: string[];
  tags: string[];
  featured: boolean;
  relatedFrameworkIds: string[];
  relatedProductIds: string[];
};

export const initiatives: Initiative[] = [
  {
    id: "order-guide-transformation",
    title: "Work Path Guidance",
    type: "Product",
    status: "Active",
    summary: "Converts program vision, SoW context, risks, and outcomes into tailored work path guidance.",
    problemSpace:
      "The delivery lead has a broad program vision, multiple stakeholders, and uncertainty about where to start.",
    systemDesigned:
      "A sequenced work path that clarifies guidance, next steps, outcomes, ownership, and proof of progress.",
    howItWorks:
      "Reads the program context, identifies the highest-leverage constraint, ranks viable paths, and shapes the next practical sequence.",
    valueCreated:
      "Reduces ambiguity and gives the delivery lead clear guidance with evidence, owner logic, and follow-up outputs.",
    strategicAngle:
      "Turns broad vision into action without letting urgency, emotion, or stakeholder pressure define the work path.",
    inputContext: ["program vision", "SoW summary", "desired outcomes", "known constraints", "current blockers"],
    recommendedNextSteps: [
      "Confirm the outcome that defines a healthy first phase.",
      "Name the decision or dependency creating the most drag.",
      "Sequence the first two delivery moves and the evidence needed to proceed."
    ],
    deliveryOutputs: ["work path guidance", "phase-one plan", "owner map", "decision checkpoint"],
    riskSignals: ["unclear success criteria", "competing stakeholder priorities", "scope pressure before path clarity"],
    tags: ["order guide", "add-first", "workflow", "product", "governance"],
    featured: true,
    relatedFrameworkIds: ["signal-to-system", "capability-driven-design"],
    relatedProductIds: ["work-context-assistant", "ingredient-match-engine"]
  },
  {
    id: "add-change-delete-modernization",
    title: "Planning And Approach Guide",
    type: "Operating Model",
    status: "Scaling",
    summary: "Turns a plan or SoW into planning approach, deliverables, requirements, acceptance criteria, and execution checkpoints.",
    problemSpace:
      "The program has documented intent, but the delivery lead needs a practical structure for execution.",
    systemDesigned:
      "A delivery guidance package that translates scope into approach, workstreams, requirements, owners, deliverables, and gates.",
    howItWorks:
      "Classifies work by outcome, dependency, stakeholder, and risk, then maps it into an executable delivery structure.",
    valueCreated:
      "Prevents the delivery lead from managing from vague scope language and creates a concrete path for teams to follow.",
    strategicAngle:
      "Moves from stated intent to an executable planning approach before work begins to sprawl.",
    inputContext: ["SoW", "scope assumptions", "timeline", "deliverables", "stakeholder roles"],
    recommendedNextSteps: [
      "Break scope into workstreams and outputs.",
      "Define acceptance criteria for each deliverable.",
      "Flag decisions needed before execution can move cleanly."
    ],
    deliveryOutputs: ["planning approach", "requirements list", "acceptance criteria", "workstream map"],
    riskSignals: ["vague deliverables", "missing owners", "dependencies not tied to decisions"],
    tags: ["workflow", "governance", "data quality", "delivery"],
    featured: true,
    relatedFrameworkIds: ["capability-driven-design", "decision-briefing-stack"],
    relatedProductIds: ["compliance-hub"]
  },
  {
    id: "capability-driven-design-system",
    title: "Critical Requirements Clarifier",
    type: "Operating Model",
    status: "Active",
    summary: "Converts ambiguity, stakeholder language, and desired outcomes into critical requirements and capability gaps.",
    problemSpace:
      "The delivery lead is hearing needs, concerns, and requests, but the true requirements are not yet clear.",
    systemDesigned:
      "A critical requirements frame that separates outcomes, workflows, data needs, decisions, controls, and ownership gaps.",
    howItWorks:
      "Extracts signals from program context, groups them into capabilities, and identifies what must be true to deliver.",
    valueCreated:
      "Helps the delivery lead avoid solving the wrong problem and gives teams clearer requirements to execute against.",
    strategicAngle:
      "Creates work path clarity by translating ambiguity into the capabilities the program actually needs.",
    inputContext: ["stakeholder notes", "desired outcomes", "workflow pain", "constraints", "open questions"],
    recommendedNextSteps: [
      "Separate stated requests from underlying capabilities.",
      "Identify missing decisions, data, controls, and owners.",
      "Convert capability gaps into requirements and delivery sequence."
    ],
    deliveryOutputs: ["critical requirements brief", "capability map", "gap list", "dependency model"],
    riskSignals: ["solutioning before requirements", "misread stakeholder intent", "hidden capability gaps"],
    tags: ["capabilities", "product strategy", "delivery", "operating model"],
    featured: true,
    relatedFrameworkIds: ["capability-driven-design", "friction-economics"],
    relatedProductIds: ["strategy-memo-copilot"]
  },
  {
    id: "compliance-hub",
    title: "Risk And Decision Guidance",
    type: "Data",
    status: "Concept",
    summary: "Identifies program risks, unresolved decisions, evidence needs, mitigation paths, and escalation guidance.",
    problemSpace:
      "Risks are scattered across status updates, stakeholder concerns, assumptions, and emotional pressure.",
    systemDesigned:
      "A structured guidance view that separates risk, impact, owner, mitigation, decision needed, and timing.",
    howItWorks:
      "Reads program context, clusters risk signals, identifies the decisions behind them, and recommends mitigation steps.",
    valueCreated:
      "Gives the delivery lead a clean way to escalate what matters without amplifying noise.",
    strategicAngle:
      "Protects program health by turning concern and uncertainty into explicit action paths.",
    inputContext: ["risk notes", "blockers", "stakeholder concerns", "constraints", "decision history"],
    recommendedNextSteps: [
      "Rank risks by impact and timing.",
      "Assign each risk to an owner and mitigation path.",
      "Escalate only the decisions that require leadership action."
    ],
    deliveryOutputs: ["risk guidance", "decision log", "mitigation plan", "escalation brief"],
    riskSignals: ["emotional escalation", "unowned risks", "risks described without decisions"],
    tags: ["compliance", "data", "workflow", "risk"],
    featured: false,
    relatedFrameworkIds: ["signal-to-system", "decision-briefing-stack"],
    relatedProductIds: ["compliance-hub"]
  },
  {
    id: "coolition-decision-surface",
    title: "Stakeholder Alignment Guidance",
    type: "AI",
    status: "Concept",
    summary: "Creates alignment guidance around stakeholder context, tradeoffs, decisions, and next moves.",
    problemSpace:
      "The delivery lead needs to align people who see different risks, priorities, and paths forward.",
    systemDesigned:
      "An alignment guide that packages the ask, evidence, tradeoffs, risks, recommended posture, and owner commitments.",
    howItWorks:
      "Synthesizes meeting notes, program details, stakeholder positions, and risks into a decision-ready narrative.",
    valueCreated:
      "Reduces alignment drag and gives the delivery lead a clearer path for communication and decision-making.",
    strategicAngle:
      "Uses AI to make the work path visible before stakeholders push the program in competing directions.",
    inputContext: ["stakeholders", "decision needed", "meeting notes", "tradeoffs", "risks"],
    recommendedNextSteps: [
      "State the decision and the options under consideration.",
      "Summarize stakeholder positions and tradeoffs.",
      "Recommend the path and next checkpoint."
    ],
    deliveryOutputs: ["alignment guidance", "decision memo", "tradeoff map", "owner commitments"],
    riskSignals: ["misaligned incentives", "unclear decision rights", "too many competing narratives"],
    tags: ["Coolition", "AI", "decision intelligence", "product"],
    featured: true,
    relatedFrameworkIds: ["decision-briefing-stack", "ai-operating-model"],
    relatedProductIds: ["coolition", "work-context-assistant"]
  },
  {
    id: "ingredient-matching-system",
    title: "Key Next-Step Set",
    type: "AI",
    status: "Concept",
    summary: "Generates the immediate actions, follow-up questions, and key outputs needed after program context is analyzed.",
    problemSpace:
      "After reviewing program detail, the delivery lead needs a short, practical set of actions instead of another summary.",
    systemDesigned:
      "A next-step set that prioritizes actions by impact, urgency, dependency, and clarity gained.",
    howItWorks:
      "Scores next-step options against the program goal, risk profile, stakeholder map, and decision timeline.",
    valueCreated:
      "Keeps delivery momentum focused and prevents the lead from getting buried in analysis, conflict, or uncertainty.",
    strategicAngle:
      "Turns analysis into action by making the next few moves explicit, defensible, and sequenced.",
    inputContext: ["program status", "risks", "dependencies", "stakeholder asks", "open decisions"],
    recommendedNextSteps: [
      "Take the highest-confidence action now.",
      "Clarify the one decision that blocks the next action.",
      "Update the plan based on evidence from the first move."
    ],
    deliveryOutputs: ["next-step set", "priority rationale", "dependency callout", "follow-up prompt"],
    riskSignals: ["analysis paralysis", "too many parallel actions", "activity without decision progress"],
    tags: ["ingredient matching", "AI", "data quality", "search"],
    featured: false,
    relatedFrameworkIds: ["ai-operating-model", "signal-to-system"],
    relatedProductIds: ["ingredient-match-engine"]
  }
];
