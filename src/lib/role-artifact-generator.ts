import { randomUUID } from "crypto";
import type { StoredProgramUpdate } from "./active-program-types.ts";
import type { AssistantConversationTurn } from "./assistant-conversation-types.ts";
import type { GuidedPlan, GuidedPlanRolePlan } from "./guided-plan-types.ts";
import type { LeadershipReviewRecord } from "./leadership-feedback-types.ts";
import type { ProgramMeetingInput } from "./program-intelligence-types.ts";
import type { StoredProgram } from "./program-intake-types.ts";
import {
  getRoleArtifactDefinition,
  type RoleArtifactDefinition,
  type RoleArtifactDraft,
  type RoleArtifactSection,
  type RoleArtifactTable,
  type RoleArtifactType
} from "./role-artifact-types.ts";

export type RoleArtifactGenerationContext = {
  artifactDefinition?: RoleArtifactDefinition;
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

function resolveRoleArtifactDefinition(context: RoleArtifactGenerationContext) {
  return getRoleArtifactDefinition(context.artifactType, context.artifactDefinition);
}

function getRolePlan(context: RoleArtifactGenerationContext): GuidedPlanRolePlan | null {
  const definition = resolveRoleArtifactDefinition(context);
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

function valueForColumn(input: {
  column: string;
  definition: RoleArtifactDefinition;
  index: number;
  rolePlan: GuidedPlanRolePlan | null;
  signals: ReturnType<typeof buildBaseSignals>;
}) {
  const { column, definition, index, rolePlan, signals } = input;
  const normalizedColumn = column.toLowerCase();
  const risks = splitSignals(signals.risk, ["Validate the highest-risk assumption before expanding scope."]);
  const decisions = splitSignals(signals.decisions, ["Confirm the next accountable decision owner."]);
  const requirements = splitSignals(signals.requirements, ["Clarify the next work item against source evidence."]);
  const outcomes = rolePlan?.keyOutcomes?.length ? rolePlan.keyOutcomes : splitSignals(signals.outcome, ["Advance the highest-value program outcome."]);
  const focusAreas = rolePlan?.keyFocusAreas?.length ? rolePlan.keyFocusAreas : splitSignals(signals.progress, ["Tighten the next execution checkpoint."]);
  const actions = rolePlan?.actionPlan?.length ? rolePlan.actionPlan : splitSignals(signals.outputs, ["Create the next decision-ready work product."]);

  if (normalizedColumn.includes("role") || normalizedColumn.includes("persona") || normalizedColumn.includes("user")) {
    return excerpt(definition.role, 130);
  }
  if (normalizedColumn.includes("risk") || normalizedColumn.includes("impact") || normalizedColumn.includes("gap")) {
    return excerpt(risks[index] ?? risks[0], 130);
  }
  if (normalizedColumn.includes("decision") || normalizedColumn.includes("owner") || normalizedColumn.includes("dependency")) {
    return excerpt(decisions[index] ?? decisions[0], 130);
  }
  if (normalizedColumn.includes("source") || normalizedColumn.includes("evidence") || normalizedColumn.includes("signal")) {
    return excerpt(index === 0 ? signals.outcome : signals.progress, 130);
  }
  if (normalizedColumn.includes("acceptance") || normalizedColumn.includes("validation") || normalizedColumn.includes("proof")) {
    return excerpt(outcomes[index] ?? outcomes[0], 130);
  }
  if (normalizedColumn.includes("action") || normalizedColumn.includes("recommendation") || normalizedColumn.includes("method")) {
    return excerpt(actions[index] ?? actions[0], 130);
  }
  if (normalizedColumn.includes("stage") || normalizedColumn.includes("horizon") || normalizedColumn.includes("step")) {
    return ["Now", "Next", "Validate"][index] ?? `Item ${index + 1}`;
  }
  if (normalizedColumn.includes("requirement") || normalizedColumn.includes("story") || normalizedColumn.includes("epic") || normalizedColumn.includes("feature") || normalizedColumn.includes("item")) {
    return excerpt(actions[index] ?? requirements[index] ?? focusAreas[index] ?? focusAreas[0], 130);
  }

  return excerpt(focusAreas[index] ?? outcomes[index] ?? requirements[index] ?? signals.progress, 130);
}

function genericArtifact(context: RoleArtifactGenerationContext): Pick<RoleArtifactDraft, "sections" | "summary" | "tables" | "iterationPrompts"> {
  const definition = resolveRoleArtifactDefinition(context);
  const signals = buildBaseSignals(context);
  const rolePlan = getRolePlan(context);
  const columns = definition.primaryColumns.length ? definition.primaryColumns : ["Work Item", "Source Signal", "Recommended Content", "Decision / Owner"];
  const rows = [0, 1, 2].map((index) =>
    columns.map((column) =>
      valueForColumn({
        column,
        definition,
        index,
        rolePlan,
        signals
      })
    )
  );
  const risks = splitSignals(signals.risk, ["Validate the top risk before the artifact is used as a decision input."]);
  const decisions = splitSignals(signals.decisions, ["Confirm who owns the next decision tied to this artifact."]);

  return {
    summary: `${definition.title} generated for ${definition.role} using the latest grounded context for ${context.program.intake.programName}.`,
    tables: [
      {
        title: definition.shortTitle,
        columns,
        rows
      }
    ],
    sections: [
      {
        title: "How To Use This Artifact",
        items: [
          `Use this as the working draft for ${definition.role}.`,
          `Anchor review to: ${excerpt(signals.outcome, 150)}`,
          `Validate before reuse: ${excerpt(risks[0], 150)}`
        ]
      },
      {
        title: "Iteration Focus",
        items: [
          signals.feedback ? `User direction to incorporate: ${excerpt(signals.feedback, 150)}` : `Next decision to clarify: ${excerpt(decisions[0], 150)}`,
          "Ask Guide to regenerate after new uploads, team updates, or leadership feedback materially changes the context."
        ]
      }
    ],
    iterationPrompts: [
      "Make this more executive-ready.",
      "Add more source traceability.",
      "Rework this around the top risk."
    ]
  };
}

export function generateLocalRoleArtifactDraft(context: RoleArtifactGenerationContext): RoleArtifactDraft {
  const definition = resolveRoleArtifactDefinition(context);
  const body =
    context.artifactType === "ba-requirements-matrix"
      ? requirementsMatrix(context)
      : context.artifactType === "product-roadmap"
        ? productRoadmap(context)
        : context.artifactType === "ux-user-journey"
          ? uxUserJourney(context)
          : genericArtifact(context);

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
