import "server-only";
import type { StoredProgramUpdate } from "@/lib/active-program-types";
import type { AssistantConversationTurn } from "@/lib/assistant-conversation-types";
import { getGuidanceModelSettings } from "@/lib/guidance-model-settings";
import type { GuidedPlan } from "@/lib/guided-plan-types";
import type { LeadershipReviewRecord } from "@/lib/leadership-feedback-types";
import { getNorthStarPromptCacheKey } from "@/lib/openai-prompt-cache";
import { buildOpenAIRequestMetadata } from "@/lib/openai-request-metadata";
import { asRecord, asStringArray, asTrimmedString, extractOutputText, parseStructuredModelOutput } from "@/lib/openai-structured-output";
import { extractOpenAIUsageMetadata } from "@/lib/openai-usage";
import type { ProgramMeetingInput, OpenAIUsageMetadata } from "@/lib/program-intelligence-types";
import type { StoredProgram } from "@/lib/program-intake-types";
import {
  buildCustomRoleArtifactDefinition,
  getRoleArtifactDefinition,
  isRoleArtifactType,
  roleArtifactDefinitions,
  type RoleArtifactDefinition,
  type RoleArtifactSuggestion
} from "@/lib/role-artifact-types";

export type RoleArtifactSuggestionContext = {
  assistantConversations: AssistantConversationTurn[];
  latestPlan: GuidedPlan | null;
  leadershipFeedbacks: LeadershipReviewRecord[];
  meetingInputs: ProgramMeetingInput[];
  program: StoredProgram;
  roleFocus?: string;
  updates: StoredProgramUpdate[];
};

type OpenAIRoleArtifactSuggestionPayload = {
  suggestions: Array<{
    artifactType?: string;
    businessValue: string;
    description?: string;
    expectedOutput: string;
    generationBrief: string;
    primaryColumns?: string[];
    recommendedFormat: string;
    role: string;
    sourceSignals: string[];
    title: string;
    whyItMatters: string;
  }>;
};

type RoleArtifactSuggestionResult = {
  modelUsage?: OpenAIUsageMetadata;
  provider: "local" | "openai";
  suggestions: RoleArtifactSuggestion[];
};

const allRolesOption = "__all_roles__";

function compact(value: string | undefined | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function excerpt(value: string | undefined | null, limit = 260) {
  const normalized = compact(value);
  return normalized.length > limit ? `${normalized.slice(0, limit).trim()}...` : normalized;
}

function roleMatches(definition: RoleArtifactDefinition, roleFocus: string | undefined) {
  const role = compact(roleFocus).toLowerCase();
  if (!role || role === allRolesOption) return true;

  return roleTextMatches(definition.role, roleFocus);
}

function roleTextMatches(value: string | undefined, roleFocus: string | undefined) {
  const role = compact(roleFocus).toLowerCase();
  if (!role || role === allRolesOption) return true;

  const candidate = compact(value).toLowerCase();
  if (!candidate || candidate === "all roles") return false;

  return candidate === role || candidate.includes(role) || role.includes(candidate);
}

function suggestionMatchesRole(suggestion: RoleArtifactSuggestion, roleFocus: string | undefined) {
  const role = compact(roleFocus).toLowerCase();
  if (!role || role === allRolesOption) return true;

  return roleTextMatches(suggestion.role, roleFocus) || roleTextMatches(suggestion.definition.role, roleFocus);
}

function filterSuggestionsByRole(suggestions: RoleArtifactSuggestion[], roleFocus: string | undefined) {
  return suggestions.filter((suggestion) => suggestionMatchesRole(suggestion, roleFocus));
}

function mergeRoleSuggestions(primary: RoleArtifactSuggestion[], fallback: RoleArtifactSuggestion[]) {
  const seen = new Set<string>();

  return [...primary, ...fallback].filter((suggestion) => {
    const key = `${suggestion.artifactType}:${suggestion.role}:${suggestion.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSourceSignals(context: RoleArtifactSuggestionContext) {
  const signals = [
    context.program.intake.artifacts.length
      ? `${context.program.intake.artifacts.length} uploaded artifact${context.program.intake.artifacts.length === 1 ? "" : "s"} available`
      : "",
    context.latestPlan ? "current guided plan available" : "",
    context.updates.length ? "active-program updates captured" : "",
    context.leadershipFeedbacks.length ? "leadership feedback is influencing the program" : "",
    context.assistantConversations.length ? "Guide dialogue exists for this program" : "",
    context.meetingInputs.length ? "meeting intelligence is attached" : "",
    context.program.intake.risks ? `risk context: ${excerpt(context.program.intake.risks, 120)}` : "",
    context.program.intake.decisionsNeeded ? `decision context: ${excerpt(context.program.intake.decisionsNeeded, 120)}` : ""
  ].filter(Boolean);

  return signals.length ? signals.slice(0, 5) : ["saved program intake", "role composition", "program outcomes"];
}

function suggestionForDefinition(
  definition: RoleArtifactDefinition,
  context: RoleArtifactSuggestionContext,
  sourceSignals: string[]
): RoleArtifactSuggestion {
  return {
    artifactType: definition.type,
    businessValue: `Helps ${definition.role} turn current program signal into a reusable work product instead of another status narrative.`,
    definition,
    expectedOutput: definition.outputLabel,
    generationBrief: `Generate ${definition.title} for ${definition.role}. Use the latest guided plan, source artifacts, team updates, leadership feedback, Guide dialogue, risks, decisions, timeline, and role composition for ${context.program.intake.programName}.`,
    id: `${definition.type}-${definition.role}`,
    recommendedFormat: definition.primaryColumns.join(" / "),
    role: definition.role,
    sourceSignals,
    title: definition.title,
    whyItMatters: definition.description
  };
}

function getFallbackSuggestions(context: RoleArtifactSuggestionContext) {
  const sourceSignals = buildSourceSignals(context);
  const matchingDefinitions = roleArtifactDefinitions.filter((definition) => roleMatches(definition, context.roleFocus));
  const rankedDefinitions = matchingDefinitions.length ? matchingDefinitions : roleArtifactDefinitions;
  const preferredTypes = new Set([
    "product-roadmap",
    "product-epic-feature-breakdown",
    "product-prioritization-matrix",
    "ba-requirements-matrix",
    "ba-user-stories",
    "ba-traceability-matrix",
    "ux-user-journey",
    "ux-app-flow",
    "ux-service-blueprint",
    "app-dev-technical-delivery-plan",
    "app-dev-api-dependency-plan",
    "data-source-target-mapping",
    "data-quality-rules-matrix",
    "change-stakeholder-impact-plan",
    "change-communications-plan",
    "scrum-sprint-execution-plan",
    "scrum-impediment-register",
    "delivery-integrated-plan",
    "delivery-raid-log"
  ]);

  return [...rankedDefinitions]
    .sort((left, right) => Number(preferredTypes.has(right.type)) - Number(preferredTypes.has(left.type)))
    .slice(0, 6)
    .map((definition) => suggestionForDefinition(definition, context, sourceSignals));
}

function validateSuggestionPayload(value: unknown): OpenAIRoleArtifactSuggestionPayload | null {
  const record = asRecord(value);
  const rawSuggestions = record && Array.isArray(record.suggestions) ? record.suggestions : null;
  if (!rawSuggestions) return null;

  const suggestions = rawSuggestions
    .flatMap((item) => {
      const suggestion = asRecord(item);
      if (!suggestion) return [];

      const title = asTrimmedString(suggestion.title);
      const role = asTrimmedString(suggestion.role);
      const whyItMatters = asTrimmedString(suggestion.whyItMatters);
      const recommendedFormat = asTrimmedString(suggestion.recommendedFormat);
      const expectedOutput = asTrimmedString(suggestion.expectedOutput);
      const businessValue = asTrimmedString(suggestion.businessValue);
      const generationBrief = asTrimmedString(suggestion.generationBrief);
      const sourceSignals = asStringArray(suggestion.sourceSignals, { min: 1, max: 5 });
      if (!title || !role || !whyItMatters || !recommendedFormat || !expectedOutput || !businessValue || !generationBrief || !sourceSignals) {
        return [];
      }

      const parsedSuggestion: OpenAIRoleArtifactSuggestionPayload["suggestions"][number] = {
        businessValue,
        expectedOutput,
        generationBrief,
        recommendedFormat,
        role,
        sourceSignals,
        title,
        whyItMatters
      };

      const artifactType = asTrimmedString(suggestion.artifactType);
      const description = asTrimmedString(suggestion.description);
      const primaryColumns = asStringArray(suggestion.primaryColumns, { min: 2, max: 5 });

      if (artifactType) parsedSuggestion.artifactType = artifactType;
      if (description) parsedSuggestion.description = description;
      if (primaryColumns) parsedSuggestion.primaryColumns = primaryColumns;

      return [parsedSuggestion];
    })
    .slice(0, 6);

  return suggestions.length ? { suggestions } : null;
}

function normalizeOpenAISuggestions(payload: OpenAIRoleArtifactSuggestionPayload): RoleArtifactSuggestion[] {
  return payload.suggestions.map((suggestion, index) => {
    const requestedType = suggestion.artifactType && isRoleArtifactType(suggestion.artifactType) ? suggestion.artifactType : undefined;
    const existingDefinition = requestedType ? getRoleArtifactDefinition(requestedType) : undefined;
    const definition =
      existingDefinition && existingDefinition.type === requestedType
        ? existingDefinition
        : buildCustomRoleArtifactDefinition({
            description: suggestion.description || suggestion.whyItMatters,
            primaryColumns: suggestion.primaryColumns,
            role: suggestion.role,
            title: suggestion.title,
            type: requestedType || `custom-${suggestion.title}`
          });

    return {
      artifactType: definition.type,
      businessValue: suggestion.businessValue,
      definition,
      expectedOutput: suggestion.expectedOutput,
      generationBrief: suggestion.generationBrief,
      id: `${definition.type}-${index}`,
      recommendedFormat: suggestion.recommendedFormat,
      role: definition.role,
      sourceSignals: suggestion.sourceSignals,
      title: definition.title,
      whyItMatters: suggestion.whyItMatters
    };
  });
}

function buildPromptContext(context: RoleArtifactSuggestionContext) {
  return JSON.stringify(
    {
      roleFocus: context.roleFocus || allRolesOption,
      artifactCatalog: roleArtifactDefinitions,
      program: {
        id: context.program.id,
        intake: {
          ...context.program.intake,
          artifacts: context.program.intake.artifacts.slice(0, 6).map((artifact) => ({
            name: artifact.name,
            artifactType: artifact.artifactType,
            extractionSummary: artifact.extractionSummary,
            extractedText: excerpt(artifact.extractedText, 1000)
          }))
        }
      },
      latestGuidedPlan: context.latestPlan
        ? {
            northStar: context.latestPlan.northStar,
            summary: context.latestPlan.summary,
            signalFromNoise: context.latestPlan.signalFromNoise,
            workPath: context.latestPlan.workPath,
            risksAndDecisions: context.latestPlan.risksAndDecisions,
            rolePlans: context.latestPlan.rolePlans
          }
        : null,
      latestUpdates: context.updates.slice(0, 3),
      latestLeadershipFeedback: context.leadershipFeedbacks.slice(0, 2),
      latestGuideDialogue: context.assistantConversations.slice(0, 3).map((turn) => ({
        prompt: excerpt(turn.prompt, 350),
        answer: excerpt(turn.response.answer, 500)
      })),
      latestMeetingInputs: context.meetingInputs.slice(0, 2)
    },
    null,
    2
  );
}

export async function suggestRoleArtifacts(context: RoleArtifactSuggestionContext): Promise<RoleArtifactSuggestionResult> {
  const fallbackSuggestions = getFallbackSuggestions(context);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const modelSettings = await getGuidanceModelSettings();
  const model = modelSettings.model;
  const reasoningEffort = modelSettings.reasoningEffort;
  const verbosity = modelSettings.textVerbosity;

  if (!apiKey || !model || model === "unconfigured" || modelSettings.provider !== "openai") {
    return { provider: "local", suggestions: fallbackSuggestions };
  }

  const promptCacheKey = getNorthStarPromptCacheKey("role-artifact", `${context.program.id}:suggestions:${context.roleFocus || allRolesOption}`);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      store: false,
      prompt_cache_key: promptCacheKey,
      metadata: buildOpenAIRequestMetadata({
        workflow: "role-artifact",
        programId: context.program.id,
        programName: context.program.intake.programName
      }),
      reasoning: {
        effort: reasoningEffort
      },
      text: {
        verbosity,
        format: {
          type: "json_schema",
          name: "role_artifact_suggestions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    artifactType: { type: "string" },
                    title: { type: "string" },
                    role: { type: "string" },
                    description: { type: "string" },
                    primaryColumns: { type: "array", items: { type: "string" } },
                    whyItMatters: { type: "string" },
                    sourceSignals: { type: "array", items: { type: "string" } },
                    recommendedFormat: { type: "string" },
                    expectedOutput: { type: "string" },
                    businessValue: { type: "string" },
                    generationBrief: { type: "string" }
                  },
                  required: [
                    "artifactType",
                    "title",
                    "role",
                    "description",
                    "primaryColumns",
                    "whyItMatters",
                    "sourceSignals",
                    "recommendedFormat",
                    "expectedOutput",
                    "businessValue",
                    "generationBrief"
                  ]
                }
              }
            },
            required: ["suggestions"]
          }
        }
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are North Star recommending role-based work products for a complex program.",
                "Use the provided grounded program context only.",
                "Recommend artifacts that would help the selected role or cross-functional team move work forward.",
                "When roleFocus is a specific role, every suggestion must be directly tailored to that role only.",
                "Prefer the provided artifact catalog when it fits, but you may suggest a custom artifact when the context justifies it.",
                "Explain why each artifact matters, what source signals justify it, the recommended format, and expected business value."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Suggest high-value artifacts as JSON matching the schema.

Grounded context:
${buildPromptContext(context)}`
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return { provider: "local", suggestions: fallbackSuggestions };
  }

  const responsePayload = await response.json();
  const modelUsage = extractOpenAIUsageMetadata({
    payload: responsePayload,
    workflow: "role-artifact",
    model,
    reasoningEffort,
    cacheKey: promptCacheKey
  });
  const payload = parseStructuredModelOutput(extractOutputText(responsePayload), validateSuggestionPayload);

  if (!payload) {
    return { modelUsage: modelUsage ?? undefined, provider: "local", suggestions: fallbackSuggestions };
  }

  const roleFilteredSuggestions = filterSuggestionsByRole(normalizeOpenAISuggestions(payload), context.roleFocus);

  if (!roleFilteredSuggestions.length) {
    return { modelUsage: modelUsage ?? undefined, provider: "local", suggestions: fallbackSuggestions };
  }

  return {
    modelUsage: modelUsage ?? undefined,
    provider: "openai",
    suggestions: mergeRoleSuggestions(roleFilteredSuggestions, fallbackSuggestions).slice(0, 6)
  };
}
