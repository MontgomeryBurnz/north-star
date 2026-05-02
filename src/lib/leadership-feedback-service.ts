import type {
  LeadershipFeedbackInterpretation,
  LeadershipReviewInput,
  LeadershipRoleImpact
} from "@/lib/leadership-feedback-types";
import { getGuidanceModelSettings } from "@/lib/guidance-model-settings";
import { getNorthStarPromptCacheKey } from "@/lib/openai-prompt-cache";
import { buildOpenAIRequestMetadata } from "@/lib/openai-request-metadata";
import { asRecord, asStringArray, asTrimmedString, extractOutputText, parseStructuredModelOutput } from "@/lib/openai-structured-output";
import { extractOpenAIUsageMetadata } from "@/lib/openai-usage";
import type { OpenAIUsageMetadata } from "@/lib/program-intelligence-types";
import { firstSignal, normalizeWhitespace } from "@/lib/text-signals";

type OpenAIInterpretationPayload = {
  summary: string;
  deliveryLeadMessage: string;
  planImpacts: string[];
  riskAdjustments: string[];
  roleImpacts: LeadershipRoleImpact[];
};

const deliveryRoles: LeadershipRoleImpact["role"][] = [
  "Product Management",
  "Business Analysis",
  "User Experience",
  "Application Development",
  "Data Engineering",
  "Change Management"
];

function clean(value: string) {
  return normalizeWhitespace(value);
}

function validateInterpretationPayload(value: unknown): OpenAIInterpretationPayload | null {
  const record = asRecord(value);
  if (!record) return null;

  const summary = asTrimmedString(record.summary);
  const deliveryLeadMessage = asTrimmedString(record.deliveryLeadMessage);
  const planImpacts = asStringArray(record.planImpacts, { min: 1, max: 6 });
  const riskAdjustments = asStringArray(record.riskAdjustments, { min: 1, max: 6 });
  const roleImpactsValue = Array.isArray(record.roleImpacts) ? record.roleImpacts : null;
  if (!summary || !deliveryLeadMessage || !planImpacts || !riskAdjustments || !roleImpactsValue) return null;

  const roleImpacts = roleImpactsValue
    .map((item) => {
      const itemRecord = asRecord(item);
      if (!itemRecord) return null;
      const role = asTrimmedString(itemRecord.role);
      const focus = asTrimmedString(itemRecord.focus);
      if (!role || !focus || !deliveryRoles.includes(role as LeadershipRoleImpact["role"])) return null;
      return { role: role as LeadershipRoleImpact["role"], focus };
    })
    .filter((item): item is LeadershipRoleImpact => Boolean(item));

  if (!roleImpacts.length) return null;

  return { summary, deliveryLeadMessage, planImpacts, riskAdjustments, roleImpacts };
}

function sanitizeStringArray(items: unknown, fallback: string[]) {
  if (!Array.isArray(items)) return fallback;
  const values = items
    .map((item) => (typeof item === "string" ? clean(item) : ""))
    .filter(Boolean)
    .slice(0, 6);
  return values.length ? values : fallback;
}

function buildLocalInterpretation(feedback: LeadershipReviewInput): LeadershipFeedbackInterpretation {
  const summary = clean(
    firstSignal(
      feedback.leadershipGuidance || feedback.feedbackToDeliveryLead,
      "Leadership direction is available and should shape the next delivery checkpoint."
    )
  );
  const deliveryLeadMessage = clean(
    feedback.feedbackToDeliveryLead ||
      feedback.leadershipGuidance ||
      "Translate the latest leadership review into narrower checkpoints, clearer ownership, and a cleaner next-step path."
  );
  const planImpacts = sanitizeStringArray(
    [
      `Reframe the next checkpoint around: ${firstSignal(feedback.timelineSummary, "current timing pressure and milestone posture")}.`,
      `Make this guidance explicit in the plan: ${summary}.`,
      `Reflect support needed from leadership: ${firstSignal(feedback.supportRequests, "clarify support, decisions, and escalation ownership")}.`
    ],
    ["Leadership input should tighten the next checkpoint, ownership model, and decision path."]
  );
  const riskAdjustments = sanitizeStringArray(
    [
      `Risk posture to elevate: ${firstSignal(feedback.activeRisks, "no specific leadership risk was supplied")}.`,
      `Delivery signal to protect: ${firstSignal(feedback.progressHighlights, "visible progress evidence must stay credible")}.`
    ],
    ["Leadership input requires tighter attention to risk posture and execution proof."]
  );

  const roleImpacts: LeadershipRoleImpact[] = [
    {
      role: "Product Management",
      focus: `Refine scope and checkpoints around ${firstSignal(feedback.leadershipGuidance || feedback.timelineSummary, "the updated leadership direction")}.`
    },
    {
      role: "Business Analysis",
      focus: `Translate the new direction into explicit requirements, assumptions, and decision support around ${firstSignal(feedback.supportRequests || feedback.feedbackToDeliveryLead, "the next planning cycle")}.`
    },
    {
      role: "User Experience",
      focus: `Keep workflow and review experience aligned to ${firstSignal(feedback.progressHighlights || feedback.timelineSummary, "the visible program posture")}.`
    },
    {
      role: "Application Development",
      focus: `Sequence delivery around ${firstSignal(feedback.activeRisks || feedback.leadershipGuidance, "the most urgent execution constraint")}.`
    },
    {
      role: "Data Engineering",
      focus: `Expose data dependencies and evidence needed to support ${firstSignal(feedback.progressHighlights || feedback.timelineSummary, "the next visible milestone")}.`
    },
    {
      role: "Change Management",
      focus: `Shape delivery messaging and stakeholder readiness around ${firstSignal(feedback.feedbackToDeliveryLead || feedback.leadershipGuidance, "the updated leadership message")}.`
    }
  ];

  return {
    provider: "local",
    generatedAt: new Date().toISOString(),
    summary,
    deliveryLeadMessage,
    planImpacts,
    riskAdjustments,
    roleImpacts
  };
}

function mergeOpenAIInterpretation(
  payload: OpenAIInterpretationPayload | null,
  fallback: LeadershipFeedbackInterpretation,
  model: string,
  modelUsage?: OpenAIUsageMetadata
): LeadershipFeedbackInterpretation {
  if (!payload) {
    return {
      ...fallback,
      provider: "openai",
      model,
      modelUsage
    };
  }

  const roleImpacts = Array.isArray(payload.roleImpacts)
    ? payload.roleImpacts
        .map((item) => {
          if (!item || typeof item !== "object" || typeof item.role !== "string" || typeof item.focus !== "string") {
            return null;
          }
          if (!deliveryRoles.includes(item.role as LeadershipRoleImpact["role"])) {
            return null;
          }
          return {
            role: item.role as LeadershipRoleImpact["role"],
            focus: clean(item.focus)
          };
        })
        .filter((item): item is LeadershipRoleImpact => Boolean(item))
    : [];

  return {
    provider: "openai",
    model,
    generatedAt: new Date().toISOString(),
    summary: clean(payload.summary || fallback.summary),
    deliveryLeadMessage: clean(payload.deliveryLeadMessage || fallback.deliveryLeadMessage),
    planImpacts: sanitizeStringArray(payload.planImpacts, fallback.planImpacts),
    riskAdjustments: sanitizeStringArray(payload.riskAdjustments, fallback.riskAdjustments),
    roleImpacts: roleImpacts.length ? roleImpacts : fallback.roleImpacts,
    modelUsage
  };
}

export async function enhanceLeadershipFeedback(
  feedback: LeadershipReviewInput,
  options: { programId?: string } = {}
): Promise<LeadershipFeedbackInterpretation> {
  const fallback = buildLocalInterpretation(feedback);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const modelSettings = await getGuidanceModelSettings();
  const model = modelSettings.model;

  if (!apiKey || !model || model === "unconfigured" || modelSettings.provider !== "openai") {
    return fallback;
  }
  const reasoningEffort = modelSettings.reasoningEffort;
  const verbosity = modelSettings.textVerbosity;
  const promptCacheKey = getNorthStarPromptCacheKey("leadership-feedback", options.programId ?? feedback.programName);

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
        workflow: "leadership-feedback",
        programId: options.programId,
        programName: feedback.programName
      }),
      reasoning: {
        effort: reasoningEffort
      },
      text: {
        verbosity,
        format: {
          type: "json_schema",
          name: "leadership_feedback_interpretation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              deliveryLeadMessage: { type: "string" },
              planImpacts: { type: "array", items: { type: "string" } },
              riskAdjustments: { type: "array", items: { type: "string" } },
              roleImpacts: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    role: { type: "string", enum: deliveryRoles },
                    focus: { type: "string" }
                  },
                  required: ["role", "focus"]
                }
              }
            },
            required: ["summary", "deliveryLeadMessage", "planImpacts", "riskAdjustments", "roleImpacts"]
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
                "You convert leadership review input into delivery-safe guidance for a complex program.",
                "Interpret the leadership review, strengthen it, and translate it into clear planning implications.",
                "Do not repeat raw executive wording when it can be made more actionable.",
                "Focus on delivery clarity, risk posture, execution path, and how cross-functional roles should adapt.",
                "Keep the tone direct, concise, and operator-level."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Interpret this leadership review for delivery planning.\n\n${JSON.stringify(feedback, null, 2)}`
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return fallback;
  }

  const responsePayload = await response.json();
  const modelUsage = extractOpenAIUsageMetadata({
    payload: responsePayload,
    workflow: "leadership-feedback",
    model,
    reasoningEffort,
    cacheKey: promptCacheKey
  });
  const payload = parseStructuredModelOutput(extractOutputText(responsePayload), validateInterpretationPayload);
  return mergeOpenAIInterpretation(payload, fallback, model, modelUsage ?? undefined);
}
