import type { RoleArtifactType } from "@/lib/role-artifact-types";

export type DeliveryAgentId =
  | "program-management"
  | "requirements-elicitation"
  | "product-management"
  | "user-experience"
  | "data-analysis"
  | "application-development"
  | "data-engineering";

export type DeliveryAgentDefinition = {
  id: DeliveryAgentId;
  title: string;
  shortTitle: string;
  roleLens: string;
  lifecycleStage: string;
  stageOrder: number;
  mission: string;
  receives: string[];
  produces: string[];
  suggestedArtifactTypes: RoleArtifactType[];
  handoffTo: DeliveryAgentId[];
  readinessSignals: string[];
  missingInputPrompts: string[];
};

export const deliveryAgentDefinitions: DeliveryAgentDefinition[] = [
  {
    id: "program-management",
    title: "Program Management Agent",
    shortTitle: "Program Mgmt",
    roleLens: "Delivery Lead",
    lifecycleStage: "Orchestrate",
    stageOrder: 1,
    mission: "Turns the program goal, delivery board, risks, decisions, and leadership signal into the operating cadence for the team.",
    receives: ["Program intake", "Delivery board movement", "Leadership feedback", "Role updates"],
    produces: ["Integrated delivery plan", "RAID posture", "Executive status brief"],
    suggestedArtifactTypes: ["delivery-integrated-plan", "delivery-raid-log", "delivery-executive-status-brief"],
    handoffTo: ["requirements-elicitation", "product-management"],
    readinessSignals: ["North Star outcome", "Milestones", "Risks and decisions", "Team role map"],
    missingInputPrompts: ["Confirm the next milestone owner.", "Clarify the highest-impact unresolved decision."]
  },
  {
    id: "requirements-elicitation",
    title: "Requirements Elicitation Agent",
    shortTitle: "Requirements",
    roleLens: "Business Analysis",
    lifecycleStage: "Discover",
    stageOrder: 2,
    mission: "Converts artifacts, stakeholder context, and program goals into requirements, stories, criteria, and traceability.",
    receives: ["BRDs and source artifacts", "Program scope", "Stakeholder decisions", "UX and product assumptions"],
    produces: ["Requirements matrix", "User stories", "Acceptance criteria", "Traceability map"],
    suggestedArtifactTypes: ["ba-requirements-matrix", "ba-user-stories", "ba-acceptance-criteria", "ba-traceability-matrix"],
    handoffTo: ["product-management", "user-experience", "application-development", "data-analysis"],
    readinessSignals: ["Source requirements", "Decision owners", "Known gaps", "Validation evidence"],
    missingInputPrompts: ["Identify ambiguous requirements.", "Confirm acceptance criteria for the next delivery slice."]
  },
  {
    id: "product-management",
    title: "Product Management Agent",
    shortTitle: "Product",
    roleLens: "Product Management",
    lifecycleStage: "Shape",
    stageOrder: 3,
    mission: "Shapes product scope, outcomes, sequencing, priority tradeoffs, and release readiness from current program signal.",
    receives: ["Requirements", "Leadership priorities", "Delivery constraints", "Risk posture"],
    produces: ["Roadmap", "Epic and feature breakdown", "Prioritization matrix", "MVP scope"],
    suggestedArtifactTypes: [
      "product-roadmap",
      "product-epic-feature-breakdown",
      "product-prioritization-matrix",
      "product-mvp-scope-definition"
    ],
    handoffTo: ["user-experience", "application-development", "data-engineering"],
    readinessSignals: ["Outcome priorities", "Release scope", "Dependencies", "Decision gates"],
    missingInputPrompts: ["Define what must be true for MVP.", "Confirm which scope item should be deferred."]
  },
  {
    id: "user-experience",
    title: "UX Agent",
    shortTitle: "UX",
    roleLens: "User Experience",
    lifecycleStage: "Design",
    stageOrder: 4,
    mission: "Translates requirements and product direction into journeys, flows, service moments, and usability risks.",
    receives: ["User goals", "Requirements", "Product scope", "Process and workflow assumptions"],
    produces: ["User journey", "Application flow", "Service blueprint", "Usability risk log"],
    suggestedArtifactTypes: ["ux-user-journey", "ux-app-flow", "ux-service-blueprint", "ux-usability-risk-log"],
    handoffTo: ["application-development", "requirements-elicitation"],
    readinessSignals: ["Primary user groups", "Workflow steps", "Friction points", "Validation plan"],
    missingInputPrompts: ["Clarify the primary user journey.", "Identify the workflow most likely to create adoption risk."]
  },
  {
    id: "data-analysis",
    title: "Data Analyst Agent",
    shortTitle: "Data Analyst",
    roleLens: "Data Analysis",
    lifecycleStage: "Measure",
    stageOrder: 5,
    mission: "Defines the metrics, reporting questions, business rules, and analytical evidence needed to guide decisions.",
    receives: ["Program outcomes", "Business rules", "Stakeholder questions", "Data availability"],
    produces: ["KPI definition matrix", "Reporting requirements", "Business rules inventory", "Insight questions log"],
    suggestedArtifactTypes: [
      "data-analysis-kpi-definition-matrix",
      "data-analysis-reporting-requirements",
      "data-analysis-business-rules-inventory",
      "data-analysis-insight-questions-log"
    ],
    handoffTo: ["data-engineering", "product-management", "program-management"],
    readinessSignals: ["Outcome metrics", "Reporting needs", "Known data sources", "Decision questions"],
    missingInputPrompts: ["Define the decision the metric must support.", "Confirm which data source is authoritative."]
  },
  {
    id: "application-development",
    title: "Application Development Agent",
    shortTitle: "App Dev",
    roleLens: "Application Development",
    lifecycleStage: "Build",
    stageOrder: 6,
    mission: "Turns product, UX, requirements, and technical constraints into build slices, dependencies, and release checks.",
    receives: ["Epics and features", "UX flows", "Acceptance criteria", "Technical dependencies"],
    produces: ["Technical delivery plan", "API dependency plan", "Release checklist", "Architecture decision log"],
    suggestedArtifactTypes: [
      "app-dev-technical-delivery-plan",
      "app-dev-api-dependency-plan",
      "app-dev-release-readiness-checklist",
      "app-dev-architecture-decision-log"
    ],
    handoffTo: ["data-engineering", "program-management"],
    readinessSignals: ["Build slices", "API dependencies", "Environment readiness", "Validation evidence"],
    missingInputPrompts: ["Identify the riskiest technical dependency.", "Confirm the release readiness gate."]
  },
  {
    id: "data-engineering",
    title: "Data Engineering Agent",
    shortTitle: "Data Eng",
    roleLens: "Data Engineering",
    lifecycleStage: "Integrate",
    stageOrder: 7,
    mission: "Converts data requirements and engineering dependencies into mappings, quality rules, lineage, and cutover validation.",
    receives: ["Data requirements", "Source systems", "Business rules", "Integration constraints"],
    produces: ["Source-to-target mapping", "Data quality rules", "Lineage traceability", "Cutover validation plan"],
    suggestedArtifactTypes: [
      "data-source-target-mapping",
      "data-quality-rules-matrix",
      "data-lineage-traceability-map",
      "data-cutover-validation-plan"
    ],
    handoffTo: ["application-development", "data-analysis", "program-management"],
    readinessSignals: ["Source inventory", "Target structures", "Validation rules", "Cutover conditions"],
    missingInputPrompts: ["Confirm transformation rules for critical fields.", "Define cutover reconciliation evidence."]
  }
];

export function getDeliveryAgentById(agentId: DeliveryAgentId) {
  return deliveryAgentDefinitions.find((agent) => agent.id === agentId) ?? deliveryAgentDefinitions[0];
}

export function getDeliveryAgentRoleLenses() {
  return Array.from(new Set(deliveryAgentDefinitions.map((agent) => agent.roleLens)));
}
