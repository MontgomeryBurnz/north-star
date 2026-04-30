import { randomUUID } from "crypto";
import type { StoredProgramUpdate } from "./active-program-types.ts";
import type { AssistantConversationTurn } from "./assistant-conversation-types.ts";
import type { GuidedPlan, GuidedPlanRolePlan } from "./guided-plan-types.ts";
import type { LeadershipReviewRecord } from "./leadership-feedback-types.ts";
import type { ProgramMeetingInput } from "./program-intelligence-types.ts";
import type { StoredProgram } from "./program-intake-types.ts";
import {
  getRoleArtifactDefinition,
  type RoleArtifactDraft,
  type RoleArtifactSection,
  type RoleArtifactTable,
  type RoleArtifactType
} from "./role-artifact-types.ts";

export type RoleArtifactGenerationContext = {
  artifactType: RoleArtifactType;
  program: StoredProgram;
  latestPlan: GuidedPlan | null;
  updates: StoredProgramUpdate[];
  leadershipFeedbacks: LeadershipReviewRecord[];
  assistantConversations: AssistantConversationTurn[];
  meetingInputs: ProgramMeetingInput[];
  feedback?: string;
};

function compact(value: string | undefined | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function excerpt(value: string | undefined | null, limit = 170) {
  const normalized = compact(value);
  return normalized.length > limit ? `${normalized.slice(0, limit).trim()}...` : normalized;
}

function firstAvailable(...values: Array<string | undefined | null>) {
  return values.map(compact).find(Boolean) ?? "";
}

function splitSignals(value: string | undefined | null, fallback: string[]) {
  const items = compact(value)
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  return items.length ? items : fallback;
}

function getRolePlan(context: RoleArtifactGenerationContext): GuidedPlanRolePlan | null {
  const definition = getRoleArtifactDefinition(context.artifactType);
  const targetRole = definition.role.toLowerCase();

  return (
    context.latestPlan?.rolePlans?.roles.find((rolePlan) => rolePlan.role.toLowerCase() === targetRole) ??
    context.latestPlan?.rolePlans?.roles.find((rolePlan) => rolePlan.role.toLowerCase().includes(targetRole.split(" ")[0] ?? "")) ??
    null
  );
}

function buildSourceSummary(context: RoleArtifactGenerationContext) {
  const artifactCount = context.program.intake.artifacts.length;
  const latestUpdate = context.updates[0];
  const latestLeadership = context.leadershipFeedbacks[0];
  const latestGuide = context.assistantConversations[0];
  const latestMeeting = context.meetingInputs[0];
  const sourceParts = [
    `${artifactCount} uploaded artifact${artifactCount === 1 ? "" : "s"}`,
    latestUpdate ? "latest active-program update" : "",
    latestLeadership ? "latest leadership feedback" : "",
    latestGuide ? "latest Guide dialogue" : "",
    latestMeeting ? "latest meeting input" : ""
  ].filter(Boolean);

  return sourceParts.length
    ? `Generated from ${sourceParts.join(", ")}.`
    : "Generated from the saved program intake and the latest guided plan available.";
}

function buildBaseSignals(context: RoleArtifactGenerationContext) {
  const intake = context.program.intake;
  const review = context.updates[0]?.review;
  const plan = context.latestPlan;

  return {
    outcome: firstAvailable(plan?.northStar, intake.outcomes, intake.vision, intake.sowSummary, "Align delivery to the clearest program outcome."),
    progress: firstAvailable(review?.progressSinceLastReview, intake.currentStatus, plan?.summary, "Current progress needs sharper role-level detail."),
    requirements: firstAvailable(intake.reviewedContext?.requirements, intake.constraints, plan?.criticalRequirements?.items.join("; ")),
    risk: firstAvailable(review?.activeRisks, review?.planChanges, intake.reviewedContext?.risks, intake.risks, plan?.risksAndDecisions?.items.join("; ")),
    decisions: firstAvailable(review?.decisionsPending, intake.reviewedContext?.decisions, intake.decisionsNeeded, plan?.risksAndDecisions?.items.join("; ")),
    stakeholders: firstAvailable(review?.stakeholderTemperature, intake.reviewedContext?.stakeholders, intake.stakeholders),
    outputs: firstAvailable(intake.reviewedContext?.outputs, plan?.keyOutputs?.items.join("; "), "Working outputs, decisions, and delivery evidence."),
    feedback: compact(context.feedback)
  };
}

function requirementsMatrix(context: RoleArtifactGenerationContext): Pick<RoleArtifactDraft, "sections" | "summary" | "tables" | "iterationPrompts"> {
  const signals = buildBaseSignals(context);
  const rolePlan = getRolePlan(context);
  const requirements = splitSignals(signals.requirements, [
    "Confirm core eligibility, workflow, and data capture requirements.",
    "Define acceptance logic for the next delivery slice.",
    "Trace unresolved decisions to accountable owners."
  ]);
  const decisions = splitSignals(signals.decisions, ["Decision owner and acceptance authority need to be confirmed."]);

  return {
    summary: `BA output focused on requirements clarity, traceability, and decision-ready acceptance for ${context.program.intake.programName}.`,
    tables: [
      {
        title: "Requirements Matrix",
        columns: getRoleArtifactDefinition(context.artifactType).primaryColumns,
        rows: requirements.map((requirement, index) => [
          excerpt(requirement, 120),
          excerpt(index === 0 ? signals.outcome : signals.progress, 120),
          excerpt(rolePlan?.keyOutcomes[index] ?? "Define acceptance criteria and evidence needed for review.", 120),
          excerpt(decisions[index] ?? decisions[0], 120)
        ])
      }
    ],
    sections: [
      {
        title: "BA Focus",
        items: rolePlan?.keyFocusAreas?.length ? rolePlan.keyFocusAreas.slice(0, 4) : ["Trace requirements to source inputs.", "Clarify assumptions and decision ownership."]
      },
      {
        title: "Open Analysis Questions",
        items: [
          `What acceptance evidence proves this requirement is complete: ${excerpt(requirements[0], 110)}`,
          `Which decision needs the fastest owner confirmation: ${excerpt(decisions[0], 110)}`,
          signals.feedback ? `Iteration input to address: ${excerpt(signals.feedback, 140)}` : "What source artifact should become the requirement baseline?"
        ]
      }
    ],
    iterationPrompts: [
      "Add missing acceptance criteria and regenerate.",
      "Convert this into user stories.",
      "Tighten traceability against the uploaded BRD or SoW."
    ]
  };
}

function productRoadmap(context: RoleArtifactGenerationContext): Pick<RoleArtifactDraft, "sections" | "summary" | "tables" | "iterationPrompts"> {
  const signals = buildBaseSignals(context);
  const rolePlan = getRolePlan(context);
  const outcomes = rolePlan?.keyOutcomes?.length ? rolePlan.keyOutcomes : splitSignals(signals.outcome, ["Deliver the highest-value program outcome first."]);
  const risks = splitSignals(signals.risk, ["Delivery risk should be reviewed before widening scope."]);

  return {
    summary: `Product output focused on epics, feature sequencing, and decision gates for ${context.program.intake.programName}.`,
    tables: [
      {
        title: "Roadmap Slice",
        columns: getRoleArtifactDefinition(context.artifactType).primaryColumns,
        rows: ["Now", "Next", "Later"].map((horizon, index) => [
          horizon,
          excerpt(rolePlan?.actionPlan[index] ?? outcomes[index] ?? outcomes[0], 130),
          excerpt(outcomes[index] ?? signals.outcome, 130),
          excerpt(index === 0 ? signals.decisions || risks[0] : risks[index] ?? risks[0], 130)
        ])
      }
    ],
    sections: [
      {
        title: "Product Prioritization Logic",
        items: [
          `Anchor sequencing to: ${excerpt(signals.outcome, 150)}`,
          `Protect scope against: ${excerpt(risks[0], 150)}`,
          signals.feedback ? `Iteration input to address: ${excerpt(signals.feedback, 140)}` : "Use the next leadership decision as the roadmap checkpoint."
        ]
      },
      {
        title: "Decision Gates",
        items: splitSignals(signals.decisions, ["Confirm what must be true before the next roadmap slice expands."])
      }
    ],
    iterationPrompts: [
      "Split the roadmap into epics and features.",
      "Make this more executive-ready.",
      "Re-sequence around the top risk."
    ]
  };
}

function uxUserJourney(context: RoleArtifactGenerationContext): Pick<RoleArtifactDraft, "sections" | "summary" | "tables" | "iterationPrompts"> {
  const signals = buildBaseSignals(context);
  const rolePlan = getRolePlan(context);
  const focusAreas = rolePlan?.keyFocusAreas?.length ? rolePlan.keyFocusAreas : ["Workflow clarity", "Experience validation", "Handoff readiness"];
  const risk = splitSignals(signals.risk, ["Experience friction may remain hidden until users test the workflow."]);

  return {
    summary: `UX output focused on journey stages, user intent, experience risk, and validation needs for ${context.program.intake.programName}.`,
    tables: [
      {
        title: "User Journey Draft",
        columns: getRoleArtifactDefinition(context.artifactType).primaryColumns,
        rows: ["Discover", "Act", "Resolve"].map((stage, index) => [
          stage,
          excerpt(focusAreas[index] ?? focusAreas[0], 130),
          excerpt(risk[index] ?? risk[0], 130),
          excerpt(rolePlan?.actionPlan[index] ?? "Validate workflow assumptions with users and delivery stakeholders.", 130)
        ])
      }
    ],
    sections: [
      {
        title: "UX Outputs To Create",
        items: [
          "Current-state and target-state user flow.",
          "Journey risk map with validation checkpoints.",
          "Usability questions tied to delivery decisions."
        ]
      },
      {
        title: "Validation Questions",
        items: [
          `Where could the user lose clarity around: ${excerpt(signals.outcome, 120)}`,
          `Which workflow risk needs evidence first: ${excerpt(risk[0], 120)}`,
          signals.feedback ? `Iteration input to address: ${excerpt(signals.feedback, 140)}` : "What user group or stakeholder should validate the journey first?"
        ]
      }
    ],
    iterationPrompts: [
      "Turn this into a user flow.",
      "Add user emotions and friction points.",
      "Make the journey more detailed for a design review."
    ]
  };
}

export function generateLocalRoleArtifactDraft(context: RoleArtifactGenerationContext): RoleArtifactDraft {
  const definition = getRoleArtifactDefinition(context.artifactType);
  const body =
    context.artifactType === "ba-requirements-matrix"
      ? requirementsMatrix(context)
      : context.artifactType === "product-roadmap"
        ? productRoadmap(context)
        : uxUserJourney(context);

  const sections: RoleArtifactSection[] = body.sections.map((section) => ({
    title: section.title,
    items: section.items.filter(Boolean).slice(0, 5)
  }));
  const tables: RoleArtifactTable[] = body.tables.map((table) => ({
    title: table.title,
    columns: table.columns,
    rows: table.rows.filter((row) => row.some(Boolean)).slice(0, 6)
  }));

  return {
    id: randomUUID(),
    artifactType: context.artifactType,
    role: definition.role,
    title: definition.title,
    summary: body.summary,
    sourceSummary: buildSourceSummary(context),
    sections,
    tables,
    iterationPrompts: body.iterationPrompts,
    provider: "local",
    generatedAt: new Date().toISOString()
  };
}
