import { randomUUID } from "crypto";
import { generateLocalGuidedPlan } from "@/lib/guided-plan-generator";
import type { GuidedPlan, GuidedPlanRolePlan, GuidedPlanSection } from "@/lib/guided-plan-types";
import type { GuidedPlanGenerationContext, GuidedPlanProvider } from "@/lib/guided-plan-service";
import { getNorthStarPromptCacheKey } from "@/lib/openai-prompt-cache";
import { buildOpenAIRequestMetadata } from "@/lib/openai-request-metadata";
import { asRecord, asStringArray, asTrimmedString, extractOutputText, parseStructuredModelOutput } from "@/lib/openai-structured-output";
import { extractOpenAIUsageMetadata } from "@/lib/openai-usage";

type OpenAIGuidedPlanPayload = {
  northStar: string;
  summary: string;
  sourceInputs: GuidedPlanSection;
  assistantDialogue: GuidedPlanSection;
  signalFromNoise: GuidedPlanSection;
  workPath: GuidedPlanSection;
  planningApproach: GuidedPlanSection;
  keyOutcomes: GuidedPlanSection;
  criticalRequirements: GuidedPlanSection;
  keyOutputs: GuidedPlanSection;
  risksAndDecisions: GuidedPlanSection;
  leadershipChanges: GuidedPlanSection;
  rolePlans: {
    title: string;
    roles: GuidedPlanRolePlan[];
  };
  followUpQuestions: string[];
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

function validateGuidedPlanPayload(value: unknown): OpenAIGuidedPlanPayload | null {
  const record = asRecord(value);
  if (!record) return null;

  const northStar = asTrimmedString(record.northStar);
  const summary = asTrimmedString(record.summary);
  const followUpQuestions = asStringArray(record.followUpQuestions, { min: 1, max: 4 });
  const rolePlansRecord = asRecord(record.rolePlans);
  const rolePlansTitle = rolePlansRecord ? asTrimmedString(rolePlansRecord.title) : null;
  const rolePlanEntries = rolePlansRecord && Array.isArray(rolePlansRecord.roles) ? rolePlansRecord.roles : null;
  if (!northStar || !summary || !followUpQuestions || !rolePlansRecord || !rolePlansTitle || !rolePlanEntries) return null;

  const sectionKeys = [
    "sourceInputs",
    "assistantDialogue",
    "signalFromNoise",
    "workPath",
    "planningApproach",
    "keyOutcomes",
    "criticalRequirements",
    "keyOutputs",
    "risksAndDecisions",
    "leadershipChanges"
  ] as const;

  const sections = Object.fromEntries(
    sectionKeys.map((key) => {
      const sectionRecord = asRecord(record[key]);
      const title = sectionRecord ? asTrimmedString(sectionRecord.title) : null;
      const items = sectionRecord ? asStringArray(sectionRecord.items, { min: 1, max: 6 }) : null;
      return [key, title && items ? { title, items } : null];
    })
  ) as Record<(typeof sectionKeys)[number], GuidedPlanSection | null>;

  if (sectionKeys.some((key) => !sections[key])) return null;

  const roles = rolePlanEntries
    .map((role) => {
      const roleRecord = asRecord(role);
      if (!roleRecord) return null;
      const roleName = asTrimmedString(roleRecord.role);
      const actionPlan = asStringArray(roleRecord.actionPlan, { min: 1, max: 6 });
      const keyFocusAreas = asStringArray(roleRecord.keyFocusAreas, { min: 1, max: 6 });
      const keyOutcomes = asStringArray(roleRecord.keyOutcomes, { min: 1, max: 6 });
      const risksAndMitigations = asStringArray(roleRecord.risksAndMitigations, { min: 1, max: 6 });
      if (!roleName || !actionPlan || !keyFocusAreas || !keyOutcomes || !risksAndMitigations) return null;
      return { role: roleName, actionPlan, keyFocusAreas, keyOutcomes, risksAndMitigations };
    })
    .filter((role): role is GuidedPlanRolePlan => Boolean(role));

  if (!roles.length) return null;

  return {
    northStar,
    summary,
    sourceInputs: sections.sourceInputs!,
    assistantDialogue: sections.assistantDialogue!,
    signalFromNoise: sections.signalFromNoise!,
    workPath: sections.workPath!,
    planningApproach: sections.planningApproach!,
    keyOutcomes: sections.keyOutcomes!,
    criticalRequirements: sections.criticalRequirements!,
    keyOutputs: sections.keyOutputs!,
    risksAndDecisions: sections.risksAndDecisions!,
    leadershipChanges: sections.leadershipChanges!,
    rolePlans: {
      title: rolePlansTitle,
      roles
    },
    followUpQuestions
  };
}

function sanitizeItems(items: unknown, fallback: string[]) {
  if (!Array.isArray(items)) return fallback;

  const sanitized = items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);

  return sanitized.length ? sanitized : fallback;
}

function sanitizeSection(section: OpenAIGuidedPlanPayload[keyof OpenAIGuidedPlanPayload], fallback: GuidedPlanSection): GuidedPlanSection {
  if (!section || typeof section !== "object" || !("title" in section) || !("items" in section)) {
    return fallback;
  }

  return {
    title: typeof section.title === "string" && section.title.trim() ? section.title.trim() : fallback.title,
    items: sanitizeItems(section.items, fallback.items)
  };
}

function sanitizeRolePlans(
  rolePlans: OpenAIGuidedPlanPayload["rolePlans"] | undefined,
  fallback: GuidedPlan["rolePlans"]
): GuidedPlan["rolePlans"] {
  if (!fallback) return fallback;
  if (!rolePlans || typeof rolePlans !== "object" || !Array.isArray(rolePlans.roles)) {
    return fallback;
  }

  const generatedRoles = rolePlans.roles
    .map((role) => {
      if (!role || typeof role !== "object" || typeof role.role !== "string") return null;
      return {
        role: role.role as GuidedPlanRolePlan["role"],
        actionPlan: sanitizeItems(role.actionPlan, []),
        keyFocusAreas: sanitizeItems(role.keyFocusAreas, []),
        keyOutcomes: sanitizeItems(role.keyOutcomes, []),
        risksAndMitigations: sanitizeItems(role.risksAndMitigations, [])
      } satisfies GuidedPlanRolePlan;
    })
    .filter((role): role is GuidedPlanRolePlan => Boolean(role && role.actionPlan.length && role.keyFocusAreas.length));

  if (!generatedRoles.length) {
    return fallback;
  }

  const generatedByRole = new Map(generatedRoles.map((role) => [role.role.toLowerCase(), role]));
  const fallbackRoleKeys = new Set(fallback.roles.map((role) => role.role.toLowerCase()));
  const mergedRoles = fallback.roles.map((role) => generatedByRole.get(role.role.toLowerCase()) ?? role);
  const extraGeneratedRoles = generatedRoles.filter((role) => !fallbackRoleKeys.has(role.role.toLowerCase()));

  return {
    title: typeof rolePlans.title === "string" && rolePlans.title.trim() ? rolePlans.title.trim() : fallback.title,
    roles: [...mergedRoles, ...extraGeneratedRoles]
  };
}

function toPromptContext(context: GuidedPlanGenerationContext, baselinePlan: GuidedPlan) {
  const latestUpdate = context.updates[0];
  const latestLeadershipFeedback = context.leadershipFeedbacks[0];
  const latestMeetingInput = context.meetingInputs[0];
  const recentAssistantConversations = context.assistantConversations.slice(0, 6).map((turn) => ({
    prompt: turn.prompt,
    answer: turn.response.answer
  }));

  return JSON.stringify(
    {
      program: context.program,
      latestUpdate: latestUpdate ?? null,
      latestLeadershipFeedback: latestLeadershipFeedback ?? null,
      latestMeetingInput: latestMeetingInput ?? null,
      recentAssistantConversations,
      currentGroundedBaselinePlan: {
        northStar: baselinePlan.northStar,
        summary: baselinePlan.summary,
        sourceInputs: baselinePlan.sourceInputs,
        assistantDialogue: baselinePlan.assistantDialogue,
        signalFromNoise: baselinePlan.signalFromNoise,
        workPath: baselinePlan.workPath,
        planningApproach: baselinePlan.planningApproach,
        keyOutcomes: baselinePlan.keyOutcomes,
        criticalRequirements: baselinePlan.criticalRequirements,
        keyOutputs: baselinePlan.keyOutputs,
        risksAndDecisions: baselinePlan.risksAndDecisions,
        leadershipChanges: baselinePlan.leadershipChanges,
        rolePlans: baselinePlan.rolePlans,
        followUpQuestions: baselinePlan.followUpQuestions
      }
    },
    null,
    2
  );
}

function mergeWithBaseline(payload: OpenAIGuidedPlanPayload, baselinePlan: GuidedPlan): GuidedPlan {
  return {
    ...baselinePlan,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    northStar: typeof payload.northStar === "string" && payload.northStar.trim() ? payload.northStar.trim() : baselinePlan.northStar,
    summary: typeof payload.summary === "string" && payload.summary.trim() ? payload.summary.trim() : baselinePlan.summary,
    sourceInputs: sanitizeSection(payload.sourceInputs, baselinePlan.sourceInputs),
    assistantDialogue: sanitizeSection(payload.assistantDialogue, baselinePlan.assistantDialogue),
    signalFromNoise: sanitizeSection(payload.signalFromNoise, baselinePlan.signalFromNoise),
    workPath: sanitizeSection(payload.workPath, baselinePlan.workPath),
    planningApproach: sanitizeSection(payload.planningApproach, baselinePlan.planningApproach),
    keyOutcomes: sanitizeSection(payload.keyOutcomes, baselinePlan.keyOutcomes),
    criticalRequirements: sanitizeSection(payload.criticalRequirements, baselinePlan.criticalRequirements),
    keyOutputs: sanitizeSection(payload.keyOutputs, baselinePlan.keyOutputs),
    risksAndDecisions: sanitizeSection(payload.risksAndDecisions, baselinePlan.risksAndDecisions),
    leadershipChanges: sanitizeSection(payload.leadershipChanges, baselinePlan.leadershipChanges),
    rolePlans: sanitizeRolePlans(payload.rolePlans, baselinePlan.rolePlans),
    followUpQuestions: sanitizeItems(payload.followUpQuestions, baselinePlan.followUpQuestions).slice(0, 4)
  };
}

export const openaiGuidedPlanProvider: GuidedPlanProvider = {
  id: "openai",
  async generatePlan(context) {
    const baselinePlan = generateLocalGuidedPlan(
      context.program,
      context.updates,
      context.leadershipFeedbacks,
      context.assistantConversations,
      context.meetingInputs
    );
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const model = getConfiguredModel();
    const reasoningEffort = getConfiguredReasoningEffort();
    const verbosity = getConfiguredVerbosity();

    if (!apiKey || !model) {
      return baselinePlan;
    }
    const promptCacheKey = getNorthStarPromptCacheKey("guided-plan", context.program.id);

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
          workflow: "guided-plan",
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
            name: "guided_plan_response",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                northStar: { type: "string" },
                summary: { type: "string" },
                sourceInputs: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                },
                assistantDialogue: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                },
                signalFromNoise: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                },
                workPath: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                },
                planningApproach: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                },
                keyOutcomes: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                },
                criticalRequirements: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                },
                keyOutputs: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                },
                risksAndDecisions: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                },
                leadershipChanges: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } }
                  },
                  required: ["title", "items"]
                },
                rolePlans: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    roles: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          role: { type: "string" },
                          actionPlan: { type: "array", items: { type: "string" } },
                          keyFocusAreas: { type: "array", items: { type: "string" } },
                          keyOutcomes: { type: "array", items: { type: "string" } },
                          risksAndMitigations: { type: "array", items: { type: "string" } }
                        },
                        required: ["role", "actionPlan", "keyFocusAreas", "keyOutcomes", "risksAndMitigations"]
                      }
                    }
                  },
                  required: ["title", "roles"]
                },
                followUpQuestions: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: [
                "northStar",
                "summary",
                "sourceInputs",
                "assistantDialogue",
                "signalFromNoise",
                "workPath",
                "planningApproach",
                "keyOutcomes",
                "criticalRequirements",
                "keyOutputs",
                "risksAndDecisions",
                "leadershipChanges",
                "rolePlans",
                "followUpQuestions"
              ]
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
                  "You are North Star, generating guided plans for complex delivery programs.",
                  "Every plan must be directly shaped by the freshest grounded inputs available: uploaded artifacts and extracted text, active-program updates, role-based team submissions, and leadership feedback.",
                  "Treat these inputs as the authoritative evidence base. Do not ignore them when they are present.",
                  "Role-level statuses (On track, At risk, Blocked) and any needsLeadershipAttention flags are part of the authoritative operating posture. Reflect them explicitly in role guidance, risk posture, and escalation language.",
                  "Use only the grounded context provided. Do not invent research, external facts, or missing program details.",
                  "When a leadership feedback interpretation is present, treat it as the delivery-safe translation of leadership intent and use it to refine the plan.",
                  "Translate leadership input into delivery-safe guidance, concrete plan changes, and role-level action.",
                  "Position the actual stored team roles for success where grounded context supports it. Use the program's current team-role list when present, including any custom roles added by the operator.",
                  "Every stored team role must appear in rolePlans.roles exactly once. Do not drop custom roles just because they were added later.",
                  "Prefer concrete actions, outcomes, risks, mitigations, dependencies, and outputs."
                ].join(" ")
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Build a guided plan from the grounded program context below.

Requirements:
- Keep the guided plan evergreen and adaptable.
- Make the direct influence of uploads, active-program updates, role-based team submissions, and leadership feedback visible in the plan.
- Make role-level status posture explicit when it exists, especially blocked or at-risk roles and any leadership-attention flags.
- If one of those sources is missing, say so plainly in the relevant section.
- Keep the plan concise, structured, and operator-level.
- Return valid JSON matching the schema exactly.

Grounded program context:
${toPromptContext(context, baselinePlan)}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      return baselinePlan;
    }

    const responsePayload = await response.json();
    const modelUsage = extractOpenAIUsageMetadata({
      payload: responsePayload,
      workflow: "guided-plan",
      model,
      reasoningEffort,
      cacheKey: promptCacheKey
    });
    const payload = parseStructuredModelOutput(extractOutputText(responsePayload), validateGuidedPlanPayload);
    if (!payload) {
      return { ...baselinePlan, modelUsage: modelUsage ?? undefined };
    }

    return { ...mergeWithBaseline(payload, baselinePlan), modelUsage: modelUsage ?? undefined };
  }
};
