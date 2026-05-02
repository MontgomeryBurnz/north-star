import type { OpenAIUsageMetadata } from "@/lib/program-intelligence-types";

export type RoleArtifactType = string;

export type RoleArtifactDefinition = {
  type: RoleArtifactType;
  role: string;
  title: string;
  shortTitle: string;
  description: string;
  outputLabel: string;
  primaryColumns: string[];
};

export type RoleArtifactSuggestion = {
  artifactType: RoleArtifactType;
  businessValue: string;
  definition: RoleArtifactDefinition;
  expectedOutput: string;
  generationBrief: string;
  id: string;
  recommendedFormat: string;
  role: string;
  sourceSignals: string[];
  title: string;
  whyItMatters: string;
};

export type RoleArtifactSection = {
  title: string;
  items: string[];
};

export type RoleArtifactTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

export type RoleArtifactDraft = {
  id: string;
  artifactType: RoleArtifactType;
  programId?: string;
  programName?: string;
  role: string;
  title: string;
  summary: string;
  sourceSummary: string;
  sections: RoleArtifactSection[];
  tables: RoleArtifactTable[];
  iterationPrompts: string[];
  provider: "local" | "openai";
  version?: number;
  feedback?: string;
  generatedAt: string;
  modelUsage?: OpenAIUsageMetadata;
};

export const roleArtifactDefinitions: RoleArtifactDefinition[] = [
  {
    type: "ba-requirements-matrix",
    role: "Business Analysis",
    title: "Business Analysis Requirements Matrix",
    shortTitle: "Requirements Matrix",
    description: "Turns program context into requirement themes, source evidence, acceptance direction, and open decisions.",
    outputLabel: "BA-ready output",
    primaryColumns: ["Requirement", "Source Signal", "Acceptance Direction", "Owner / Decision"]
  },
  {
    type: "ba-user-stories",
    role: "Business Analysis",
    title: "Business Analysis User Stories",
    shortTitle: "User Stories",
    description: "Turns program context into user stories, acceptance criteria, dependency notes, and validation questions.",
    outputLabel: "Story-ready output",
    primaryColumns: ["User Story", "Acceptance Criteria", "Source Signal", "Dependency / Decision"]
  },
  {
    type: "ba-acceptance-criteria",
    role: "Business Analysis",
    title: "Acceptance Criteria Pack",
    shortTitle: "Acceptance Criteria",
    description: "Creates testable acceptance criteria for high-priority requirements and unresolved decisions.",
    outputLabel: "QA-ready output",
    primaryColumns: ["Requirement / Story", "Acceptance Criteria", "Evidence Needed", "Decision Owner"]
  },
  {
    type: "ba-process-flow-inventory",
    role: "Business Analysis",
    title: "Process Flow Inventory",
    shortTitle: "Process Flow",
    description: "Frames current-state and target-state process areas that need analysis, validation, or decision support.",
    outputLabel: "Process output",
    primaryColumns: ["Process Area", "Current Signal", "Target Direction", "Gap / Decision"]
  },
  {
    type: "ba-traceability-matrix",
    role: "Business Analysis",
    title: "Traceability Matrix",
    shortTitle: "Traceability",
    description: "Connects requirements, sources, decisions, owners, and validation evidence.",
    outputLabel: "Trace output",
    primaryColumns: ["Requirement", "Source", "Decision / Owner", "Validation Evidence"]
  },
  {
    type: "ba-gap-analysis",
    role: "Business Analysis",
    title: "Gap Analysis",
    shortTitle: "Gap Analysis",
    description: "Identifies where current context, requirements, or decision ownership are not yet sufficient for execution.",
    outputLabel: "Gap output",
    primaryColumns: ["Gap", "Impact", "Evidence", "Recommended Action"]
  },
  {
    type: "product-roadmap",
    role: "Product Management",
    title: "Product Roadmap",
    shortTitle: "Roadmap",
    description: "Frames epics, features, sequencing, outcomes, dependencies, and decision gates for product leadership.",
    outputLabel: "Product-ready output",
    primaryColumns: ["Horizon", "Epic / Feature", "Outcome", "Dependency / Decision"]
  },
  {
    type: "product-epic-feature-breakdown",
    role: "Product Management",
    title: "Epic and Feature Breakdown",
    shortTitle: "Epics / Features",
    description: "Converts the work path into epics, feature slices, outcome links, and sequencing dependencies.",
    outputLabel: "Product output",
    primaryColumns: ["Epic", "Feature Slice", "Outcome", "Dependency / Decision"]
  },
  {
    type: "product-prioritization-matrix",
    role: "Product Management",
    title: "Prioritization Matrix",
    shortTitle: "Prioritization",
    description: "Ranks work by value, urgency, risk reduction, and decision readiness.",
    outputLabel: "Priority output",
    primaryColumns: ["Item", "Value", "Risk / Urgency", "Recommendation"]
  },
  {
    type: "product-mvp-scope-definition",
    role: "Product Management",
    title: "MVP Scope Definition",
    shortTitle: "MVP Scope",
    description: "Defines what belongs in the next viable delivery slice and what should wait.",
    outputLabel: "Scope output",
    primaryColumns: ["Scope Item", "Include / Defer", "Rationale", "Decision Needed"]
  },
  {
    type: "product-release-readiness-checklist",
    role: "Product Management",
    title: "Release Readiness Checklist",
    shortTitle: "Release Readiness",
    description: "Turns program risks, decisions, and outputs into a readiness checklist for launch or checkpoint review.",
    outputLabel: "Readiness output",
    primaryColumns: ["Readiness Area", "Current Signal", "Owner", "Next Check"]
  },
  {
    type: "product-stakeholder-decision-log",
    role: "Product Management",
    title: "Stakeholder Decision Log",
    shortTitle: "Decision Log",
    description: "Organizes open decisions, accountable stakeholders, context, and expected business impact.",
    outputLabel: "Decision output",
    primaryColumns: ["Decision", "Stakeholder / Owner", "Context", "Impact"]
  },
  {
    type: "product-risk-register",
    role: "Product Management",
    title: "Product Risk Register",
    shortTitle: "Risk Register",
    description: "Frames product-level risks, mitigations, owners, and decision gates from current program signal.",
    outputLabel: "Risk output",
    primaryColumns: ["Risk", "Impact", "Mitigation", "Owner / Gate"]
  },
  {
    type: "product-outcome-feature-traceability",
    role: "Product Management",
    title: "Outcome-to-Feature Traceability Map",
    shortTitle: "Outcome Trace",
    description: "Connects desired outcomes to feature slices, proof points, and delivery dependencies.",
    outputLabel: "Trace output",
    primaryColumns: ["Outcome", "Feature / Work Item", "Proof Point", "Dependency"]
  },
  {
    type: "ux-user-journey",
    role: "User Experience",
    title: "UX User Journey",
    shortTitle: "User Journey",
    description: "Converts the guided plan into journey stages, user intent, friction, validation needs, and UX outputs.",
    outputLabel: "UX-ready output",
    primaryColumns: ["Stage", "User Intent", "Experience Risk", "Validation Need"]
  },
  {
    type: "ux-app-flow",
    role: "User Experience",
    title: "Application Flow",
    shortTitle: "App Flow",
    description: "Creates a role-ready application flow outline with screens, user intent, handoffs, and validation needs.",
    outputLabel: "Flow output",
    primaryColumns: ["Step / Screen", "User Intent", "System Response", "Validation Need"]
  },
  {
    type: "ux-service-blueprint",
    role: "User Experience",
    title: "Service Blueprint",
    shortTitle: "Blueprint",
    description: "Maps user actions, frontstage experience, backstage support, and operational risk.",
    outputLabel: "Blueprint output",
    primaryColumns: ["Journey Moment", "User Action", "Backstage Support", "Risk / Evidence"]
  },
  {
    type: "ux-usability-risk-log",
    role: "User Experience",
    title: "Usability Risk Log",
    shortTitle: "UX Risk Log",
    description: "Turns delivery and stakeholder signal into experience risks and validation actions.",
    outputLabel: "Risk output",
    primaryColumns: ["Experience Risk", "Affected User", "Evidence", "Validation Action"]
  },
  {
    type: "ux-research-plan",
    role: "User Experience",
    title: "UX Research Plan",
    shortTitle: "Research Plan",
    description: "Creates a focused research plan for the highest-risk workflow assumptions and user questions.",
    outputLabel: "Research output",
    primaryColumns: ["Research Question", "Target Participant", "Method", "Decision Supported"]
  },
  {
    type: "ux-persona-workflow-summary",
    role: "User Experience",
    title: "Persona and Workflow Summary",
    shortTitle: "Persona / Workflow",
    description: "Summarizes likely user groups, workflows, pain points, and assumptions that require validation.",
    outputLabel: "UX summary",
    primaryColumns: ["User / Persona", "Workflow Need", "Pain Point", "Validation Need"]
  },
  {
    type: "app-dev-technical-delivery-plan",
    role: "Application Development",
    title: "Technical Delivery Plan",
    shortTitle: "Tech Delivery",
    description: "Frames build slices, engineering dependencies, integration needs, and readiness gates for the development team.",
    outputLabel: "Engineering output",
    primaryColumns: ["Build Slice", "Technical Scope", "Dependency", "Readiness Gate"]
  },
  {
    type: "app-dev-api-dependency-plan",
    role: "Application Development",
    title: "API Dependency Plan",
    shortTitle: "API Dependencies",
    description: "Turns integration risks into owners, fallback paths, test needs, and delivery checkpoints.",
    outputLabel: "Dependency output",
    primaryColumns: ["Dependency", "Impact", "Owner / Team", "Mitigation"]
  },
  {
    type: "app-dev-release-readiness-checklist",
    role: "Application Development",
    title: "Engineering Release Readiness Checklist",
    shortTitle: "Release Checklist",
    description: "Creates a release readiness view across code, environments, testing, integrations, and operational handoff.",
    outputLabel: "Release output",
    primaryColumns: ["Readiness Area", "Current Signal", "Evidence Needed", "Next Action"]
  },
  {
    type: "app-dev-architecture-decision-log",
    role: "Application Development",
    title: "Architecture Decision Log",
    shortTitle: "Architecture Log",
    description: "Captures technical decisions, tradeoffs, affected components, and follow-up validation needs.",
    outputLabel: "Architecture output",
    primaryColumns: ["Decision", "Tradeoff", "Affected Component", "Validation Need"]
  },
  {
    type: "data-source-target-mapping",
    role: "Data Engineering",
    title: "Source-to-Target Mapping",
    shortTitle: "Source Mapping",
    description: "Connects source fields, target structures, transformation logic, and unresolved data decisions.",
    outputLabel: "Data output",
    primaryColumns: ["Source Field", "Target Field", "Transform / Rule", "Decision / Owner"]
  },
  {
    type: "data-quality-rules-matrix",
    role: "Data Engineering",
    title: "Data Quality Rules Matrix",
    shortTitle: "Quality Rules",
    description: "Defines validation rules, exception handling, evidence needs, and ownership for data quality.",
    outputLabel: "Quality output",
    primaryColumns: ["Data Rule", "Failure Condition", "Evidence", "Owner / Action"]
  },
  {
    type: "data-lineage-traceability-map",
    role: "Data Engineering",
    title: "Data Lineage Traceability Map",
    shortTitle: "Lineage Map",
    description: "Shows how critical data moves through sources, transformations, outputs, and controls.",
    outputLabel: "Lineage output",
    primaryColumns: ["Data Element", "Source", "Transformation", "Output / Control"]
  },
  {
    type: "data-cutover-validation-plan",
    role: "Data Engineering",
    title: "Cutover Validation Plan",
    shortTitle: "Cutover Plan",
    description: "Organizes migration, reconciliation, validation, and fallback checks for data readiness.",
    outputLabel: "Cutover output",
    primaryColumns: ["Cutover Check", "Validation Method", "Owner", "Exit Criteria"]
  },
  {
    type: "change-stakeholder-impact-plan",
    role: "Change Management",
    title: "Stakeholder Impact Plan",
    shortTitle: "Impact Plan",
    description: "Maps who is affected, how their work changes, expected friction, and support actions.",
    outputLabel: "Change output",
    primaryColumns: ["Audience", "Impact", "Risk / Concern", "Support Action"]
  },
  {
    type: "change-communications-plan",
    role: "Change Management",
    title: "Communications Plan",
    shortTitle: "Comms Plan",
    description: "Creates a message plan by audience, timing, channel, and decision or behavior needed.",
    outputLabel: "Comms output",
    primaryColumns: ["Audience", "Message", "Channel / Timing", "Desired Response"]
  },
  {
    type: "change-training-readiness-checklist",
    role: "Change Management",
    title: "Training Readiness Checklist",
    shortTitle: "Training Readiness",
    description: "Tracks training needs, materials, impacted users, enablement gaps, and readiness evidence.",
    outputLabel: "Training output",
    primaryColumns: ["Training Need", "Audience", "Material / Support", "Readiness Evidence"]
  },
  {
    type: "change-adoption-risk-log",
    role: "Change Management",
    title: "Adoption Risk Log",
    shortTitle: "Adoption Risks",
    description: "Captures adoption risks, stakeholder resistance, mitigation actions, and measurement signals.",
    outputLabel: "Adoption output",
    primaryColumns: ["Adoption Risk", "Affected Group", "Mitigation", "Success Signal"]
  },
  {
    type: "scrum-sprint-execution-plan",
    role: "Scrum Master",
    title: "Sprint Execution Plan",
    shortTitle: "Sprint Plan",
    description: "Turns program priorities into sprint goals, delivery checks, impediments, and facilitation actions.",
    outputLabel: "Sprint output",
    primaryColumns: ["Sprint Focus", "Goal", "Impediment", "Facilitation Action"]
  },
  {
    type: "scrum-impediment-register",
    role: "Scrum Master",
    title: "Impediment Register",
    shortTitle: "Impediments",
    description: "Organizes blockers, aging, owners, escalation paths, and next unblock actions.",
    outputLabel: "Impediment output",
    primaryColumns: ["Impediment", "Impact", "Owner", "Next Unblock Action"]
  },
  {
    type: "scrum-ceremony-plan",
    role: "Scrum Master",
    title: "Ceremony Facilitation Plan",
    shortTitle: "Ceremony Plan",
    description: "Frames standups, planning, reviews, and retros around the current program signal and decisions needed.",
    outputLabel: "Facilitation output",
    primaryColumns: ["Ceremony", "Focus", "Input Needed", "Expected Output"]
  },
  {
    type: "scrum-dependency-board",
    role: "Scrum Master",
    title: "Dependency Board",
    shortTitle: "Dependency Board",
    description: "Tracks cross-role dependencies, timing, risk, owner, and coordination actions.",
    outputLabel: "Dependency output",
    primaryColumns: ["Dependency", "Team / Role", "Timing Risk", "Coordination Action"]
  },
  {
    type: "delivery-integrated-plan",
    role: "Delivery Lead",
    title: "Integrated Delivery Plan",
    shortTitle: "Delivery Plan",
    description: "Combines milestones, role actions, dependencies, risks, and decisions into one delivery management view.",
    outputLabel: "Delivery output",
    primaryColumns: ["Workstream", "Milestone", "Risk / Dependency", "Next Action"]
  },
  {
    type: "delivery-raid-log",
    role: "Delivery Lead",
    title: "RAID Log",
    shortTitle: "RAID Log",
    description: "Structures risks, assumptions, issues, and decisions with owners and escalation timing.",
    outputLabel: "RAID output",
    primaryColumns: ["Type", "Item", "Owner", "Action / Decision"]
  },
  {
    type: "delivery-executive-status-brief",
    role: "Delivery Lead",
    title: "Executive Status Brief",
    shortTitle: "Status Brief",
    description: "Creates a concise leadership-ready brief covering progress, risk, decisions, and recommended path.",
    outputLabel: "Exec output",
    primaryColumns: ["Signal", "Current Position", "Leadership Need", "Recommended Message"]
  },
  {
    type: "delivery-cross-workstream-dependency-map",
    role: "Delivery Lead",
    title: "Cross-Workstream Dependency Map",
    shortTitle: "Dependency Map",
    description: "Maps dependencies across roles, teams, dates, and decisions so the delivery lead can manage sequencing.",
    outputLabel: "Dependency output",
    primaryColumns: ["Dependency", "From / To", "Timing", "Management Action"]
  }
];

export function normalizeRoleArtifactType(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildCustomRoleArtifactDefinition(input: {
  description?: string;
  primaryColumns?: string[];
  role?: string;
  title: string;
  type?: string;
}): RoleArtifactDefinition {
  const title = input.title.trim() || "Custom Artifact";
  const type = normalizeRoleArtifactType(input.type || `custom-${title}`) || "custom-artifact";
  const primaryColumns = input.primaryColumns?.map((column) => column.trim()).filter(Boolean).slice(0, 5);

  return {
    type,
    role: input.role?.trim() || "Role-specific",
    title,
    shortTitle: title.length > 26 ? `${title.slice(0, 23).trim()}...` : title,
    description:
      input.description?.trim() ||
      "A custom role-based work product generated from the selected program context and user direction.",
    outputLabel: "Custom output",
    primaryColumns: primaryColumns?.length ? primaryColumns : ["Work Item", "Source Signal", "Recommended Content", "Decision / Owner"]
  };
}

export function getRoleArtifactDefinition(type: RoleArtifactType, fallback?: RoleArtifactDefinition) {
  return roleArtifactDefinitions.find((definition) => definition.type === type) ?? fallback ?? roleArtifactDefinitions[0];
}

export function isRoleArtifactType(value: string): value is RoleArtifactType {
  const normalized = normalizeRoleArtifactType(value);
  return normalized.length >= 3 && normalized.length <= 80;
}
