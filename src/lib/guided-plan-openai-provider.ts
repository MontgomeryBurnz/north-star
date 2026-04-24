import { randomUUID } from "crypto";
import { generateLocalGuidedPlan } from "@/lib/guided-plan-generator";
import type { GuidedPlan, GuidedPlanRolePlan, GuidedPlanSection } from "@/lib/guided-plan-types";
import type { GuidedPlanGenerationContext, GuidedPlanProvider } from "@/lib/guided-plan-service";

type OpenAIGuidedPlanPayload = {
  northStar: string;
  summary: string;
  sourceInputs: GuidedPlanSection;
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

type ResponsesApiPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
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

function extractOutputText(payload: ResponsesApiPayload) {
  if (payload.output_text?.trim()) return payload.output_text;

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text?.trim()) {
        return content.text;
      }
    }
  }

  return "";
}

function safeJsonParse(value: string): OpenAIGuidedPlanPayload | null {
  try {
    return JSON.parse(value) as OpenAIGuidedPlanPayload;
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1)) as OpenAIGuidedPlanPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
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

  const roles = rolePlans.roles
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

  return roles.length
    ? {
        title: typeof rolePlans.title === "string" && rolePlans.title.trim() ? rolePlans.title.trim() : fallback.title,
        roles
      }
    : fallback;
}

function toPromptContext(context: GuidedPlanGenerationContext, baselinePlan: GuidedPlan) {
  const latestUpdate = context.updates[0];
  const latestLeadershipFeedback = context.leadershipFeedbacks[0];

  return JSON.stringify(
    {
      program: context.program,
      latestUpdate: latestUpdate ?? null,
      latestLeadershipFeedback: latestLeadershipFeedback ?? null,
      currentGroundedBaselinePlan: {
        northStar: baselinePlan.northStar,
        summary: baselinePlan.summary,
        sourceInputs: baselinePlan.sourceInputs,
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
    const baselinePlan = generateLocalGuidedPlan(context.program, context.updates, context.leadershipFeedbacks);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const model = getConfiguredModel();
    const reasoningEffort = getConfiguredReasoningEffort();
    const verbosity = getConfiguredVerbosity();

    if (!apiKey || !model) {
      return baselinePlan;
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        store: false,
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
                  "Every plan must be directly shaped by the freshest grounded inputs available: uploaded artifacts and extracted text, active-program updates, and leadership feedback.",
                  "Treat these inputs as the authoritative evidence base. Do not ignore them when they are present.",
                  "Use only the grounded context provided. Do not invent research, external facts, or missing program details.",
                  "When a leadership feedback interpretation is present, treat it as the delivery-safe translation of leadership intent and use it to refine the plan.",
                  "Translate leadership input into delivery-safe guidance, concrete plan changes, and role-level action.",
                  "Position these roles for success where grounded context supports it: Product Management, Business Analysis, User Experience, Application Development, Data Engineering, and Change Management.",
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
- Make the direct influence of uploads, active-program updates, and leadership feedback visible in the plan.
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

    const payload = safeJsonParse(extractOutputText((await response.json()) as ResponsesApiPayload));
    if (!payload) {
      return baselinePlan;
    }

    return mergeWithBaseline(payload, baselinePlan);
  }
};
