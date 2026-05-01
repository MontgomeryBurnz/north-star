import "server-only";
import { getNorthStarPromptCacheKey } from "@/lib/openai-prompt-cache";
import { buildOpenAIRequestMetadata } from "@/lib/openai-request-metadata";
import { asRecord, asStringArray, asTrimmedString, extractOutputText, parseStructuredModelOutput } from "@/lib/openai-structured-output";
import { extractOpenAIUsageMetadata } from "@/lib/openai-usage";
import { generateLocalRoleArtifactDraft, type RoleArtifactGenerationContext } from "@/lib/role-artifact-generator";
import {
  getRoleArtifactDefinition,
  type RoleArtifactDraft,
  type RoleArtifactSection,
  type RoleArtifactTable
} from "@/lib/role-artifact-types";

type OpenAIRoleArtifactPayload = {
  title: string;
  summary: string;
  sourceSummary: string;
  sections: RoleArtifactSection[];
  tables: RoleArtifactTable[];
  iterationPrompts: string[];
};

function getConfiguredModel() {
  return process.env.OPENAI_MODEL?.trim();
}

function getConfiguredReasoningEffort() {
  const value = process.env.OPENAI_REASONING_EFFORT?.trim();
  if (value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh") {
    return value;
  }
  return "medium";
}

function getConfiguredVerbosity() {
  const value = process.env.OPENAI_TEXT_VERBOSITY?.trim();
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "low";
}

function getConfiguredRoleArtifactProvider() {
  return (
    process.env.ROLE_ARTIFACT_PROVIDER?.trim() ||
    process.env.GUIDED_PLAN_PROVIDER?.trim() ||
    process.env.ASSISTANT_PROVIDER?.trim()
  );
}

function compact(value: string | undefined | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function excerpt(value: string | undefined | null, limit = 900) {
  const normalized = compact(value);
  return normalized.length > limit ? `${normalized.slice(0, limit).trim()}...` : normalized;
}

function sanitizeStringArray(value: unknown, fallback: string[], max = 6) {
  return asStringArray(value, { min: 1, max }) ?? fallback;
}

function validateRoleArtifactPayload(value: unknown): OpenAIRoleArtifactPayload | null {
  const record = asRecord(value);
  if (!record) return null;

  const title = asTrimmedString(record.title);
  const summary = asTrimmedString(record.summary);
  const sourceSummary = asTrimmedString(record.sourceSummary);
  const rawSections = Array.isArray(record.sections) ? record.sections : null;
  const rawTables = Array.isArray(record.tables) ? record.tables : null;
  const iterationPrompts = asStringArray(record.iterationPrompts, { min: 1, max: 5 });
  if (!title || !summary || !sourceSummary || !rawSections || !rawTables || !iterationPrompts) return null;

  const sections = rawSections
    .map((section) => {
      const sectionRecord = asRecord(section);
      const sectionTitle = sectionRecord ? asTrimmedString(sectionRecord.title) : null;
      const items = sectionRecord ? asStringArray(sectionRecord.items, { min: 1, max: 6 }) : null;
      return sectionTitle && items ? { title: sectionTitle, items } : null;
    })
    .filter((section): section is RoleArtifactSection => Boolean(section));

  const tables = rawTables
    .map((table) => {
      const tableRecord = asRecord(table);
      const tableTitle = tableRecord ? asTrimmedString(tableRecord.title) : null;
      const columns = tableRecord ? asStringArray(tableRecord.columns, { min: 2, max: 6 }) : null;
      const rawRows = tableRecord && Array.isArray(tableRecord.rows) ? tableRecord.rows : null;
      const rows = rawRows
        ?.map((row) => asStringArray(row, { min: 1, max: columns?.length ?? 6 }) ?? [])
        .filter((row) => row.length);
      return tableTitle && columns && rows?.length ? { title: tableTitle, columns, rows } : null;
    })
    .filter((table): table is RoleArtifactTable => Boolean(table));

  if (!sections.length || !tables.length) return null;

  return {
    title,
    summary,
    sourceSummary,
    sections,
    tables,
    iterationPrompts
  };
}

function mergeOpenAIPayload(
  payload: OpenAIRoleArtifactPayload,
  baseline: RoleArtifactDraft,
  modelUsage: RoleArtifactDraft["modelUsage"]
): RoleArtifactDraft {
  return {
    ...baseline,
    title: compact(payload.title) || baseline.title,
    summary: compact(payload.summary) || baseline.summary,
    sourceSummary: compact(payload.sourceSummary) || baseline.sourceSummary,
    sections: payload.sections.length ? payload.sections : baseline.sections,
    tables: payload.tables.length ? payload.tables : baseline.tables,
    iterationPrompts: sanitizeStringArray(payload.iterationPrompts, baseline.iterationPrompts, 5),
    provider: "openai",
    modelUsage
  };
}

function buildPromptContext(context: RoleArtifactGenerationContext, baseline: RoleArtifactDraft) {
  const latestUpdate = context.updates[0];
  const latestLeadershipFeedback = context.leadershipFeedbacks[0];
  const latestMeetingInput = context.meetingInputs[0];
  const recentAssistantConversations = context.assistantConversations.slice(0, 4).map((turn) => ({
    prompt: excerpt(turn.prompt, 400),
    answer: excerpt(turn.response.answer, 700)
  }));
  const artifacts = context.program.intake.artifacts.slice(0, 5).map((artifact) => ({
    id: artifact.id,
    name: artifact.name,
    artifactType: artifact.artifactType,
    extractionStatus: artifact.extractionStatus,
    extractedText: excerpt(artifact.extractedText, 1400)
  }));

  return JSON.stringify(
    {
      artifactRequest: {
        definition: getRoleArtifactDefinition(context.artifactType, context.artifactDefinition),
        feedback: context.feedback?.trim() || null
      },
      program: {
        id: context.program.id,
        intake: {
          ...context.program.intake,
          artifacts
        }
      },
      latestPlan: context.latestPlan
        ? {
            northStar: context.latestPlan.northStar,
            summary: context.latestPlan.summary,
            signalFromNoise: context.latestPlan.signalFromNoise,
            workPath: context.latestPlan.workPath,
            risksAndDecisions: context.latestPlan.risksAndDecisions,
            rolePlans: context.latestPlan.rolePlans,
            followUpQuestions: context.latestPlan.followUpQuestions
          }
        : null,
      latestUpdate: latestUpdate ?? null,
      latestLeadershipFeedback: latestLeadershipFeedback ?? null,
      latestMeetingInput: latestMeetingInput ?? null,
      recentAssistantConversations,
      localBaselineArtifact: baseline
    },
    null,
    2
  );
}

export async function generateRoleArtifactDraft(context: RoleArtifactGenerationContext): Promise<RoleArtifactDraft> {
  const baseline = generateLocalRoleArtifactDraft(context);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = getConfiguredModel();
  const reasoningEffort = getConfiguredReasoningEffort();
  const verbosity = getConfiguredVerbosity();

  if (!apiKey || !model || getConfiguredRoleArtifactProvider() !== "openai") {
    return baseline;
  }

  const promptCacheKey = getNorthStarPromptCacheKey("role-artifact", `${context.program.id}:${context.artifactType}`);
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
          name: "role_artifact_response",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              sourceSummary: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                }
              },
              tables: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    columns: { type: "array", items: { type: "string" } },
                    rows: {
                      type: "array",
                      items: {
                        type: "array",
                        items: { type: "string" }
                      }
                    }
                  },
                  required: ["title", "columns", "rows"]
                }
              },
              iterationPrompts: { type: "array", items: { type: "string" } }
            },
            required: ["title", "summary", "sourceSummary", "sections", "tables", "iterationPrompts"]
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
                "You are North Star generating role-ready delivery artifacts from grounded program context.",
                "Use only the provided program inputs, uploaded artifact excerpts, active updates, leadership feedback, Guide dialogue, meeting inputs, and guided plan.",
                "Do not invent client facts. If information is missing, call it out as a gap or validation need.",
                "Make the output practical for the named role to iterate against immediately.",
                "Keep content concise, structured, and specific to the selected artifact type."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Generate the requested role-based artifact as JSON matching the schema.

Grounded context:
${buildPromptContext(context, baseline)}`
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return baseline;
  }

  const responsePayload = await response.json();
  const modelUsage = extractOpenAIUsageMetadata({
    payload: responsePayload,
    workflow: "role-artifact",
    model,
    reasoningEffort,
    cacheKey: promptCacheKey
  });
  const payload = parseStructuredModelOutput(extractOutputText(responsePayload), validateRoleArtifactPayload);

  if (!payload) {
    return { ...baseline, modelUsage: modelUsage ?? undefined };
  }

  return mergeOpenAIPayload(payload, baseline, modelUsage ?? undefined);
}
