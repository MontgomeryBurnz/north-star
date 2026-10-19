import type { OpenAIUsageMetadata } from "@/lib/program-intelligence-types";
import type { ProgramArtifact } from "@/lib/program-intake-types";

export type DiscoveryGapSeverity = "blocking" | "important" | "optional";

export type DiscoveryGap = {
  id: string;
  title: string;
  description: string;
  severity: DiscoveryGapSeverity;
  question: string;
  sourceIds: string[];
};

export type DiscoveryRoadmapItem = {
  horizon: string;
  title: string;
  outcome: string;
  featureIds: string[];
  dependencies: string[];
};

export type DiscoveryEpic = {
  id: string;
  title: string;
  objective: string;
  featureIds: string[];
  sourceIds: string[];
};

export type DiscoveryFeature = {
  id: string;
  epicId: string;
  title: string;
  description: string;
  outcome: string;
  priority: "must" | "should" | "could";
  sourceIds: string[];
};

export type DiscoveryTestCase = {
  id: string;
  title: string;
  type: "happy-path" | "negative" | "edge";
  steps: string[];
  expectedResult: string;
};

export type DiscoveryUserStory = {
  id: string;
  epicId: string;
  featureId: string;
  title: string;
  story: string;
  acceptanceCriteria: string[];
  testCases: DiscoveryTestCase[];
  sourceIds: string[];
  readiness: "ready" | "needs-input";
};

export type DiscoverySynthesis = {
  executiveSummary: string;
  evidenceSummary: string;
  capabilities: string[];
  painPoints: string[];
  businessRules: string[];
  assumptions: string[];
  gaps: DiscoveryGap[];
  roadmap: DiscoveryRoadmapItem[];
  epics: DiscoveryEpic[];
  features: DiscoveryFeature[];
  stories: DiscoveryUserStory[];
  readinessScore: number;
  readinessNarrative: string;
  sourceCount: number;
  generatedAt: string;
  provider: "local" | "openai";
  modelUsage?: OpenAIUsageMetadata;
  quality?: {
    status: "reviewed" | "provisional";
    checks: string[];
    warnings: string[];
  };
  research?: {
    status: "not-requested" | "completed" | "unavailable";
    summary: string;
    sources: Array<{ title: string; url: string }>;
  };
  revision?: { number: number; summary: string; feedback?: string };
  sources?: Array<{ id: string; name: string; coverage: "complete" | "excerpt"; characters: number }>;
  /** A saved revision locator, never a bearer credential or an evidence checkpoint. */
  collaboration?: { packageId: string; revisionId: string; version: number; auditWarning?: boolean };
};

export type DiscoverySynthesisRequest = {
  paidGenerationConsent?: import("./studio-generation-consent").StudioGenerationConsent;
  phase?: "evidence" | "product";
  checkpoint?: string;
  workspaceName?: string;
  artifacts?: ProgramArtifact[];
  resolutionNotes?: string;
  feedback?: string;
  previousSynthesis?: DiscoverySynthesis;
  selectedOutputs?: Array<"roadmap" | "backlog" | "stories" | "tests" | "gaps" | "analysis">;
  externalResearch?: boolean;
  researchTopic?: string;
  studioPackageId?: string;
  studioParentRevisionId?: string;
};
