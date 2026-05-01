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
    role: input.role?.trim() || "All roles",
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
