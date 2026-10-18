import "server-only";
import { randomUUID } from "node:crypto";
import { getGuidanceModelSettings } from "@/lib/guidance-model-settings";
import { getNorthStarPromptCacheKey } from "@/lib/openai-prompt-cache";
import { buildOpenAIRequestMetadata } from "@/lib/openai-request-metadata";
import { asRecord, asStringArray, asTrimmedString, extractOutputText, parseStructuredModelOutput } from "@/lib/openai-structured-output";
import { extractOpenAIUsageMetadata } from "@/lib/openai-usage";
import type {
  DiscoveryEpic,
  DiscoveryFeature,
  DiscoveryGap,
  DiscoveryRoadmapItem,
  DiscoverySynthesis,
  DiscoveryTestCase,
  DiscoveryUserStory
} from "@/lib/discovery-studio-types";
import type { StoredProgram } from "@/lib/program-intake-types";
import type { RoleArtifactDraft } from "@/lib/role-artifact-types";

function compact(value: string | undefined | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function excerpt(value: string | undefined | null, limit = 5000) {
  const normalized = compact(value);
  return normalized.length > limit ? `${normalized.slice(0, limit).trim()}...` : normalized;
}

function sourceIds(value: unknown) {
  return asStringArray(value, { max: 12 }) ?? [];
}

function validateGap(value: unknown): DiscoveryGap | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asTrimmedString(record.id);
  const title = asTrimmedString(record.title);
  const description = asTrimmedString(record.description);
  const question = asTrimmedString(record.question);
  const severity = record.severity;
  if (!id || !title || !description || !question || !["blocking", "important", "optional"].includes(String(severity))) return null;
  return { id, title, description, question, severity: severity as DiscoveryGap["severity"], sourceIds: sourceIds(record.sourceIds) };
}

function validateRoadmapItem(value: unknown): DiscoveryRoadmapItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const horizon = asTrimmedString(record.horizon);
  const title = asTrimmedString(record.title);
  const outcome = asTrimmedString(record.outcome);
  if (!horizon || !title || !outcome) return null;
  return {
    horizon,
    title,
    outcome,
    featureIds: asStringArray(record.featureIds, { max: 12 }) ?? [],
    dependencies: asStringArray(record.dependencies, { max: 10 }) ?? []
  };
}

function validateEpic(value: unknown): DiscoveryEpic | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asTrimmedString(record.id);
  const title = asTrimmedString(record.title);
  const objective = asTrimmedString(record.objective);
  if (!id || !title || !objective) return null;
  return {
    id,
    title,
    objective,
    featureIds: asStringArray(record.featureIds, { max: 16 }) ?? [],
    sourceIds: sourceIds(record.sourceIds)
  };
}

function validateFeature(value: unknown): DiscoveryFeature | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asTrimmedString(record.id);
  const epicId = asTrimmedString(record.epicId);
  const title = asTrimmedString(record.title);
  const description = asTrimmedString(record.description);
  const outcome = asTrimmedString(record.outcome);
  const priority = record.priority;
  if (!id || !epicId || !title || !description || !outcome || !["must", "should", "could"].includes(String(priority))) return null;
  return { id, epicId, title, description, outcome, priority: priority as DiscoveryFeature["priority"], sourceIds: sourceIds(record.sourceIds) };
}

function validateTestCase(value: unknown): DiscoveryTestCase | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asTrimmedString(record.id);
  const title = asTrimmedString(record.title);
  const type = record.type;
  const steps = asStringArray(record.steps, { min: 1, max: 8 });
  const expectedResult = asTrimmedString(record.expectedResult);
  if (!id || !title || !steps || !expectedResult || !["happy-path", "negative", "edge"].includes(String(type))) return null;
  return { id, title, type: type as DiscoveryTestCase["type"], steps, expectedResult };
}

function validateStory(value: unknown): DiscoveryUserStory | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asTrimmedString(record.id);
  const epicId = asTrimmedString(record.epicId);
  const featureId = asTrimmedString(record.featureId);
  const title = asTrimmedString(record.title);
  const story = asTrimmedString(record.story);
  const acceptanceCriteria = asStringArray(record.acceptanceCriteria, { min: 1, max: 10 });
  const readiness = record.readiness;
  const testCases = Array.isArray(record.testCases)
    ? record.testCases.map(validateTestCase).filter((item): item is DiscoveryTestCase => Boolean(item))
    : [];
  if (!id || !epicId || !featureId || !title || !story || !acceptanceCriteria || !testCases.length || !["ready", "needs-input"].includes(String(readiness))) return null;
  return {
    id,
    epicId,
    featureId,
    title,
    story,
    acceptanceCriteria,
    testCases,
    sourceIds: sourceIds(record.sourceIds),
    readiness: readiness as DiscoveryUserStory["readiness"]
  };
}

function validateSynthesis(value: unknown): Omit<DiscoverySynthesis, "generatedAt" | "provider" | "sourceCount" | "modelUsage"> | null {
  const record = asRecord(value);
  if (!record) return null;
  const executiveSummary = asTrimmedString(record.executiveSummary);
  const evidenceSummary = asTrimmedString(record.evidenceSummary);
  const capabilities = asStringArray(record.capabilities, { min: 1, max: 16 });
  const painPoints = asStringArray(record.painPoints, { min: 1, max: 16 });
  const businessRules = asStringArray(record.businessRules, { max: 20 }) ?? [];
  const assumptions = asStringArray(record.assumptions, { max: 20 }) ?? [];
  const readinessNarrative = asTrimmedString(record.readinessNarrative);
  const readinessScore = typeof record.readinessScore === "number" ? Math.max(0, Math.min(100, Math.round(record.readinessScore))) : NaN;
  const gaps = Array.isArray(record.gaps) ? record.gaps.map(validateGap).filter((item): item is DiscoveryGap => Boolean(item)) : [];
  const roadmap = Array.isArray(record.roadmap)
    ? record.roadmap.map(validateRoadmapItem).filter((item): item is DiscoveryRoadmapItem => Boolean(item))
    : [];
  const epics = Array.isArray(record.epics) ? record.epics.map(validateEpic).filter((item): item is DiscoveryEpic => Boolean(item)) : [];
  const features = Array.isArray(record.features)
    ? record.features.map(validateFeature).filter((item): item is DiscoveryFeature => Boolean(item))
    : [];
  const stories = Array.isArray(record.stories)
    ? record.stories.map(validateStory).filter((item): item is DiscoveryUserStory => Boolean(item))
    : [];
  if (!executiveSummary || !evidenceSummary || !capabilities || !painPoints || !readinessNarrative || !Number.isFinite(readinessScore)) return null;
  if (!roadmap.length || !epics.length || !features.length || !stories.length) return null;
  return {
    executiveSummary,
    evidenceSummary,
    capabilities,
    painPoints,
    businessRules,
    assumptions,
    gaps,
    roadmap,
    epics,
    features,
    stories,
    readinessScore,
    readinessNarrative
  };
}

function localSynthesis(program: StoredProgram, resolutionNotes: string): DiscoverySynthesis {
  const intake = program.intake;
  const sources = intake.artifacts.filter((artifact) => artifact.extractedText?.trim());
  const primaryOutcome = compact(intake.outcomes) || compact(intake.vision) || "Deliver the defined product outcome";
  const primaryPain = compact(intake.blockers) || compact(intake.risks) || "Discovery evidence requires validation before delivery begins";
  const epicId = "EPIC-1";
  const featureId = "FEAT-1";
  const sourceIdList = sources.slice(0, 6).map((artifact) => artifact.id);
  const unresolved = !resolutionNotes.trim() && (!intake.outcomes.trim() || !intake.stakeholders.trim() || !intake.constraints.trim());

  return {
    executiveSummary: `North Star organized ${sources.length} readable discovery source${sources.length === 1 ? "" : "s"} for ${intake.programName} into an initial delivery package.`,
    evidenceSummary: sources.length
      ? `The package includes ${sources.map((artifact) => artifact.name).slice(0, 5).join(", ")}. The baseline below is intentionally conservative until model synthesis is available.`
      : "No readable discovery sources were available. The baseline uses the saved program context and should be treated as provisional.",
    capabilities: [primaryOutcome],
    painPoints: [primaryPain],
    businessRules: compact(intake.sowSummary) ? [excerpt(intake.sowSummary, 300)] : [],
    assumptions: ["Generated output requires product-owner review before engineering commitment."],
    gaps: unresolved
      ? [
          {
            id: "GAP-1",
            title: "Delivery context is incomplete",
            description: "Outcomes, users, or constraints are not sufficiently explicit in the current evidence.",
            severity: "blocking",
            question: "What outcome, primary user, and non-negotiable constraint must the first release satisfy?",
            sourceIds: sourceIdList
          }
        ]
      : [],
    roadmap: [
      {
        horizon: "Now",
        title: "Validate and deliver the first product slice",
        outcome: primaryOutcome,
        featureIds: [featureId],
        dependencies: unresolved ? ["Resolve GAP-1"] : []
      }
    ],
    epics: [{ id: epicId, title: "Initial product foundation", objective: primaryOutcome, featureIds: [featureId], sourceIds: sourceIdList }],
    features: [
      {
        id: featureId,
        epicId,
        title: "Primary user workflow",
        description: "Enable the primary user to complete the core workflow described by the discovery evidence.",
        outcome: primaryOutcome,
        priority: "must",
        sourceIds: sourceIdList
      }
    ],
    stories: [
      {
        id: "STORY-1",
        epicId,
        featureId,
        title: "Complete the primary workflow",
        story: "As a primary user, I want to complete the core workflow so that I can achieve the intended product outcome.",
        acceptanceCriteria: ["The user can start, complete, and confirm the workflow.", "Invalid or incomplete input receives actionable guidance."],
        testCases: [
          {
            id: "TC-1",
            title: "Complete the primary workflow successfully",
            type: "happy-path",
            steps: ["Open the workflow", "Provide valid inputs", "Submit the workflow"],
            expectedResult: "The workflow completes and the result is clearly confirmed."
          },
          {
            id: "TC-2",
            title: "Reject incomplete workflow input",
            type: "negative",
            steps: ["Open the workflow", "Leave a required input empty", "Attempt to submit"],
            expectedResult: "Submission is prevented and the missing information is identified."
          }
        ],
        sourceIds: sourceIdList,
        readiness: unresolved ? "needs-input" : "ready"
      }
    ],
    readinessScore: unresolved ? 45 : 70,
    readinessNarrative: unresolved
      ? "The package has enough context for a provisional backlog, but blocking discovery gaps must be closed before engineering commitment."
      : "The package is suitable for product review and engineering refinement. Validate estimates, architecture, and non-functional requirements before commitment.",
    sourceCount: sources.length,
    generatedAt: new Date().toISOString(),
    provider: "local"
  };
}

function schema() {
  const stringArray = { type: "array", items: { type: "string" } } as const;
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      executiveSummary: { type: "string" },
      evidenceSummary: { type: "string" },
      capabilities: stringArray,
      painPoints: stringArray,
      businessRules: stringArray,
      assumptions: stringArray,
      gaps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { id: { type: "string" }, title: { type: "string" }, description: { type: "string" }, severity: { type: "string", enum: ["blocking", "important", "optional"] }, question: { type: "string" }, sourceIds: stringArray },
          required: ["id", "title", "description", "severity", "question", "sourceIds"]
        }
      },
      roadmap: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { horizon: { type: "string" }, title: { type: "string" }, outcome: { type: "string" }, featureIds: stringArray, dependencies: stringArray },
          required: ["horizon", "title", "outcome", "featureIds", "dependencies"]
        }
      },
      epics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { id: { type: "string" }, title: { type: "string" }, objective: { type: "string" }, featureIds: stringArray, sourceIds: stringArray },
          required: ["id", "title", "objective", "featureIds", "sourceIds"]
        }
      },
      features: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { id: { type: "string" }, epicId: { type: "string" }, title: { type: "string" }, description: { type: "string" }, outcome: { type: "string" }, priority: { type: "string", enum: ["must", "should", "could"] }, sourceIds: stringArray },
          required: ["id", "epicId", "title", "description", "outcome", "priority", "sourceIds"]
        }
      },
      stories: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" }, epicId: { type: "string" }, featureId: { type: "string" }, title: { type: "string" }, story: { type: "string" }, acceptanceCriteria: stringArray, sourceIds: stringArray, readiness: { type: "string", enum: ["ready", "needs-input"] },
            testCases: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: { id: { type: "string" }, title: { type: "string" }, type: { type: "string", enum: ["happy-path", "negative", "edge"] }, steps: stringArray, expectedResult: { type: "string" } },
                required: ["id", "title", "type", "steps", "expectedResult"]
              }
            }
          },
          required: ["id", "epicId", "featureId", "title", "story", "acceptanceCriteria", "testCases", "sourceIds", "readiness"]
        }
      },
      readinessScore: { type: "number", minimum: 0, maximum: 100 },
      readinessNarrative: { type: "string" }
    },
    required: ["executiveSummary", "evidenceSummary", "capabilities", "painPoints", "businessRules", "assumptions", "gaps", "roadmap", "epics", "features", "stories", "readinessScore", "readinessNarrative"]
  };
}

export async function generateDiscoverySynthesis(program: StoredProgram, resolutionNotes = ""): Promise<DiscoverySynthesis> {
  const baseline = localSynthesis(program, resolutionNotes);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const modelSettings = await getGuidanceModelSettings();
  if (!apiKey || !modelSettings.model || modelSettings.model === "unconfigured" || modelSettings.provider !== "openai") return baseline;

  const readableArtifacts = program.intake.artifacts.filter((artifact) => artifact.extractedText?.trim()).slice(0, 16);
  const context = {
    program: {
      id: program.id,
      name: program.intake.programName,
      clientName: program.intake.clientName,
      vision: program.intake.vision,
      outcomes: program.intake.outcomes,
      stakeholders: program.intake.stakeholders,
      risks: program.intake.risks,
      constraints: program.intake.constraints,
      decisionsNeeded: program.intake.decisionsNeeded,
      blockers: program.intake.blockers
    },
    resolutionNotes: resolutionNotes.trim() || null,
    sources: readableArtifacts.map((artifact) => ({
      id: artifact.id,
      name: artifact.name,
      format: artifact.fileFormat,
      classification: artifact.artifactType,
      text: excerpt(artifact.extractedText)
    }))
  };
  const promptCacheKey = getNorthStarPromptCacheKey("discovery-synthesis", program.id);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelSettings.model,
        store: false,
        prompt_cache_key: promptCacheKey,
        metadata: buildOpenAIRequestMetadata({ workflow: "discovery-synthesis", programId: program.id, programName: program.intake.programName }),
        reasoning: { effort: modelSettings.reasoningEffort },
        text: { verbosity: modelSettings.textVerbosity, format: { type: "json_schema", name: "northstar_discovery_synthesis", strict: true, schema: schema() } },
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: [
              "You are North Star Studio, a senior product discovery and delivery analyst.",
              "Synthesize the supplied discovery package into a traceable, build-oriented product definition.",
              "Use only supplied evidence. Never invent client facts, users, integrations, rules, or constraints.",
              "Mark unsupported but useful proposals as assumptions. Turn missing critical information into precise gap questions.",
              "Create a coherent hierarchy: roadmap items reference feature IDs; epics reference feature IDs; features reference epic IDs; stories reference both.",
              "Every epic, feature, and story must cite source IDs. Generate testable acceptance criteria and at least one happy-path and one negative or edge test case per story.",
              "Use stable readable identifiers such as EPIC-1, FEAT-1, STORY-1, TC-1, and GAP-1.",
              "Set readiness to needs-input when a blocking gap materially affects the story. Score overall readiness conservatively."
            ].join(" ") }]
          },
          { role: "user", content: [{ type: "input_text", text: `Analyze this discovery package and return the complete JSON build package.\n\n${JSON.stringify(context, null, 2)}` }] }
        ]
      })
    });
    if (!response.ok) return baseline;
    const payload = await response.json();
    const parsed = parseStructuredModelOutput(extractOutputText(payload), validateSynthesis);
    if (!parsed) return baseline;
    return {
      ...parsed,
      sourceCount: readableArtifacts.length,
      generatedAt: new Date().toISOString(),
      provider: "openai",
      modelUsage: extractOpenAIUsageMetadata({ payload, workflow: "discovery-synthesis", model: modelSettings.model, reasoningEffort: modelSettings.reasoningEffort, cacheKey: promptCacheKey }) ?? undefined
    };
  } catch {
    return baseline;
  }
}

export function synthesisToArtifact(program: StoredProgram, synthesis: DiscoverySynthesis, resolutionNotes = ""): RoleArtifactDraft {
  return {
    id: randomUUID(),
    artifactType: "studio-discovery-build-package",
    programId: program.id,
    programName: program.intake.programName,
    role: "Cross-functional product delivery",
    title: `${program.intake.programName} discovery build package`,
    summary: synthesis.executiveSummary,
    sourceSummary: synthesis.evidenceSummary,
    sections: [
      { title: "Capabilities", items: synthesis.capabilities },
      { title: "Pain points", items: synthesis.painPoints },
      { title: "Business rules", items: synthesis.businessRules },
      { title: "Assumptions", items: synthesis.assumptions },
      { title: "Readiness", items: [synthesis.readinessNarrative] }
    ],
    tables: [
      { title: "Roadmap", columns: ["Horizon", "Initiative", "Outcome", "Dependencies"], rows: synthesis.roadmap.map((item) => [item.horizon, item.title, item.outcome, item.dependencies.join("; ")]) },
      { title: "Features", columns: ["ID", "Epic", "Feature", "Priority", "Outcome"], rows: synthesis.features.map((item) => [item.id, item.epicId, item.title, item.priority, item.outcome]) },
      { title: "User stories", columns: ["ID", "Feature", "Story", "Readiness"], rows: synthesis.stories.map((item) => [item.id, item.featureId, item.story, item.readiness]) }
    ],
    iterationPrompts: synthesis.gaps.map((gap) => gap.question),
    provider: synthesis.provider,
    feedback: resolutionNotes.trim() || undefined,
    generatedAt: synthesis.generatedAt,
    modelUsage: synthesis.modelUsage,
    discoverySynthesis: synthesis
  };
}
