import type { OpenAIUsageMetadata } from "@/lib/program-intelligence-types";

export type RoleArtifactType = "ba-requirements-matrix" | "product-roadmap" | "ux-user-journey";

export type RoleArtifactDefinition = {
  type: RoleArtifactType;
  role: string;
  title: string;
  shortTitle: string;
  description: string;
  outputLabel: string;
  primaryColumns: string[];
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
  role: string;
  title: string;
  summary: string;
  sourceSummary: string;
  sections: RoleArtifactSection[];
  tables: RoleArtifactTable[];
  iterationPrompts: string[];
  provider: "local" | "openai";
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
    type: "product-roadmap",
    role: "Product Management",
    title: "Product Roadmap",
    shortTitle: "Roadmap",
    description: "Frames epics, features, sequencing, outcomes, dependencies, and decision gates for product leadership.",
    outputLabel: "Product-ready output",
    primaryColumns: ["Horizon", "Epic / Feature", "Outcome", "Dependency / Decision"]
  },
  {
    type: "ux-user-journey",
    role: "User Experience",
    title: "UX User Journey",
    shortTitle: "User Journey",
    description: "Converts the guided plan into journey stages, user intent, friction, validation needs, and UX outputs.",
    outputLabel: "UX-ready output",
    primaryColumns: ["Stage", "User Intent", "Experience Risk", "Validation Need"]
  }
];

export function getRoleArtifactDefinition(type: RoleArtifactType) {
  return roleArtifactDefinitions.find((definition) => definition.type === type) ?? roleArtifactDefinitions[0];
}

export function isRoleArtifactType(value: string): value is RoleArtifactType {
  return roleArtifactDefinitions.some((definition) => definition.type === value);
}
