import "server-only";

import { getLatestGuidedPlan, getProgram, listAssistantConversations, listLeadershipFeedback, listProgramUpdates } from "@/lib/program-store";

export type AssistantBriefing = {
  promptChips: string[];
  promptQueue: string[];
  understandingScore: number;
  understandingSummary: string;
  missingInputs: string[];
  model?: string;
};

type OpenAIBriefingPayload = {
  promptChips: string[];
  promptQueue: string[];
  understandingScore: number;
  understandingSummary: string;
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

function safeJsonParse(value: string): OpenAIBriefingPayload | null {
  try {
    return JSON.parse(value) as OpenAIBriefingPayload;
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1)) as OpenAIBriefingPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function firstMeaningful(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function scoreProgramUnderstanding(input: {
  hasVision: boolean;
  hasOutcomes: boolean;
  hasArtifacts: boolean;
  hasReviewedContext: boolean;
  hasGuidedPlan: boolean;
  hasUpdate: boolean;
  hasLeadership: boolean;
  hasAssistantDialogue: boolean;
}) {
  let score = 18;
  if (input.hasVision) score += 12;
  if (input.hasOutcomes) score += 10;
  if (input.hasArtifacts) score += 16;
  if (input.hasReviewedContext) score += 12;
  if (input.hasGuidedPlan) score += 14;
  if (input.hasUpdate) score += 8;
  if (input.hasLeadership) score += 5;
  if (input.hasAssistantDialogue) score += 5;
  return clampScore(score);
}

function buildLocalBriefing(input: {
  programName: string;
  northStar: string;
  riskFocus: string;
  decisionFocus: string;
  executionFocus: string;
  leadershipFocus: string;
  understandingScore: number;
}) {
  const label = input.programName;
  const riskLine = input.riskFocus || "delivery risk and mitigation posture";
  const decisionLine = input.decisionFocus || "open decisions and ownership gaps";
  const executionLine = input.executionFocus || "execution sequence and delivery momentum";
  const leadershipLine = input.leadershipFocus || "leadership signal and escalation posture";

  return {
    promptChips: [
      `What should I focus on right now to keep ${label} aligned to its north star?`,
      `Where is ${label} most exposed, and what should I mitigate first?`,
      `Which decision on ${label} needs to be forced next to protect execution?`,
      `How should I position Product, BA, UX, Engineering, Data, and Change to move ${label} cleanly?`
    ],
    promptQueue: [
      `Give me a visionary and execution-level read on ${label}: ${executionLine}.`,
      `Pressure-test the plan for ${label} against this risk posture: ${riskLine}.`,
      `Translate ${leadershipLine} into concrete changes the delivery lead should make now.`,
      `What evidence would raise confidence in ${label}, and what is still missing from the current operating picture?`
    ],
    understandingScore: input.understandingScore,
    understandingSummary:
      input.understandingScore >= 80
        ? "OpenAI has strong program context. Use Guide to sharpen decisions, role actions, and execution posture."
        : input.understandingScore >= 60
          ? "OpenAI has a workable understanding of the program, but more updates, dialogue, or leadership input would improve specificity."
          : "OpenAI needs more grounded program context. Add artifacts, active-program updates, or guide dialogue to improve guidance quality.",
    missingInputs: []
  } satisfies AssistantBriefing;
}

export async function getAssistantBriefing(programId: string): Promise<AssistantBriefing> {
  const program = await getProgram(programId);
  if (!program) {
    return {
      promptChips: [],
      promptQueue: [],
      understandingScore: 0,
      understandingSummary: "No saved program was found.",
      missingInputs: ["Select or save a program before using Guide."]
    };
  }

  const [latestPlan, updates, leadershipFeedback, assistantConversations] = await Promise.all([
    getLatestGuidedPlan(programId),
    listProgramUpdates(programId),
    listLeadershipFeedback(programId),
    listAssistantConversations(programId)
  ]);

  const latestUpdate = updates[0];
  const latestLeadershipFeedback = leadershipFeedback[0];
  const latestAssistantConversation = assistantConversations[0];
  const extractedArtifacts = program.intake.artifacts.filter(
    (artifact) => (artifact.extractionStatus === "extracted" || artifact.extractionStatus === "partial") && artifact.extractedText?.trim()
  );

  const understandingScore = scoreProgramUnderstanding({
    hasVision: Boolean(program.intake.vision.trim()),
    hasOutcomes: Boolean(program.intake.outcomes.trim()),
    hasArtifacts: extractedArtifacts.length > 0,
    hasReviewedContext: Boolean(program.intake.reviewedContext),
    hasGuidedPlan: Boolean(latestPlan),
    hasUpdate: Boolean(latestUpdate),
    hasLeadership: Boolean(latestLeadershipFeedback),
    hasAssistantDialogue: Boolean(latestAssistantConversation)
  });

  const localBriefing = buildLocalBriefing({
    programName: program.intake.programName,
    northStar: firstMeaningful(program.intake.vision, program.intake.outcomes, latestPlan?.northStar),
    riskFocus: firstMeaningful(
      latestUpdate?.review.activeRisks,
      latestPlan?.risksAndDecisions.items.join(" "),
      program.intake.risks,
      program.intake.blockers
    ),
    decisionFocus: firstMeaningful(latestUpdate?.review.decisionsPending, program.intake.decisionsNeeded),
    executionFocus: firstMeaningful(
      latestUpdate?.review.planChanges,
      latestUpdate?.review.progressSinceLastReview,
      latestPlan?.workPath.items.join(" "),
      program.intake.currentStatus
    ),
    leadershipFocus: firstMeaningful(
      latestLeadershipFeedback?.interpretation?.deliveryLeadMessage,
      latestLeadershipFeedback?.feedback.feedbackToDeliveryLead,
      latestLeadershipFeedback?.feedback.leadershipGuidance
    ),
    understandingScore
  });
  const missingInputs = [
    !program.intake.vision.trim() && !program.intake.outcomes.trim()
      ? "Add a clearer north star or outcome statement in program intake."
      : null,
    extractedArtifacts.length === 0 ? "Upload a source artifact with extracted text to ground the model." : null,
    !program.intake.reviewedContext ? "Review and confirm extracted context so the model has validated signals." : null,
    !latestPlan ? "Generate or refresh a guided plan so Guide can reason against the current operating path." : null,
    !latestUpdate ? "Save an active-program update so Guide can see current progress, risks, and decisions." : null,
    !latestLeadershipFeedback ? "Capture leadership feedback if sponsor direction should shape the guidance." : null,
    !latestAssistantConversation ? "Use Guide to add operator dialogue that can sharpen future recommendations." : null
  ].filter((value): value is string => Boolean(value));

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = getConfiguredModel();
  if (!apiKey || !model) {
    return { ...localBriefing, missingInputs, model: model || "unconfigured" };
  }

  const reasoningEffort = getConfiguredReasoningEffort();
  const verbosity = getConfiguredVerbosity();

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
          name: "assistant_briefing",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              promptChips: { type: "array", items: { type: "string" } },
              promptQueue: { type: "array", items: { type: "string" } },
              understandingScore: { type: "number" },
              understandingSummary: { type: "string" }
            },
            required: ["promptChips", "promptQueue", "understandingScore", "understandingSummary"]
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
                "You are generating briefing prompts for a delivery-lead assistant inside North Star.",
                "Produce two levels of prompts for the selected program only.",
                "Prompt chips should be leading questions: direct, specific, and grounded in the current program state.",
                "Prompt queue should be more visionary and execution-oriented: prompts that pressure-test the operating path, strategic posture, and evidence needed.",
                "Score understanding from 0-100 based only on grounded context quality. Higher scores require clear artifacts, updates, leadership signal, plans, and dialogue.",
                "Do not mention missing internet research. Stay grounded to the provided program inputs."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(
                {
                  program,
                  latestGuidedPlan: latestPlan,
                  latestUpdate,
                  latestLeadershipFeedback,
                  recentAssistantDialogue: assistantConversations.slice(0, 6).map((turn) => ({
                    prompt: turn.prompt,
                    answer: turn.response.answer
                  })),
                  localFallback: localBriefing
                },
                null,
                2
              )
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return { ...localBriefing, missingInputs, model };
  }

  const payload = safeJsonParse(extractOutputText((await response.json()) as ResponsesApiPayload));
  if (!payload) {
    return { ...localBriefing, missingInputs, model };
  }

  return {
    promptChips: payload.promptChips.slice(0, 4),
    promptQueue: payload.promptQueue.slice(0, 4),
    understandingScore: clampScore(payload.understandingScore),
    understandingSummary: payload.understandingSummary.trim() || localBriefing.understandingSummary,
    missingInputs,
    model
  };
}
