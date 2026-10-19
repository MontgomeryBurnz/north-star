import { sampleDiscoverySources, sampleDiscoverySynthesis, sampleProgram } from "./sample-program.ts";
import { demoProgramId } from "../lib/demo-mode.ts";
import type { ProgramStoreFile } from "@/lib/program-repository-types";
import type { GuidedPlan } from "@/lib/guided-plan-types";

function date(offsetDays: number) {
  const value = new Date();
  value.setUTCHours(12, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString();
}

export function createDemoProgramStore(): ProgramStoreFile {
  const createdAt = date(-21);
  const updatedAt = date(-1);
  const programName = sampleProgram.name;
  const identity = { programId: demoProgramId, programName };
  const roles = [
    { role: "Product Management", owner: "Maya Chen", responsibility: "Pilot scope, measurable outcomes, and product sequencing." },
    { role: "Business Analysis", owner: "Jordan Rivera", responsibility: "Requirements, policy decisions, and traceability." },
    { role: "User Experience", owner: "Sam Patel", responsibility: "Accessible intake and coordinator journey validation." },
    { role: "Application Development", owner: "Taylor Brooks", responsibility: "Routing, identity, approvals, and audit implementation." },
    { role: "Data Engineering", owner: "Avery Morgan", responsibility: "Category mapping and service-level reporting." },
    { role: "Change Management", owner: "Casey Ellis", responsibility: "Regional readiness, training, and pilot adoption." }
  ];
  const program = {
    id: demoProgramId,
    createdAt,
    updatedAt,
    intake: {
      clientName: sampleProgram.client,
      programName,
      programOwner: "Maya Chen",
      vision: sampleProgram.vision,
      sowSummary: "Design and pilot a shared request intake, routing, approval, and reporting platform across three regional offices before expanding to twelve regions.",
      outcomes: sampleProgram.outcomes.join("\n"),
      stakeholders: "Executive sponsor: Morgan Hayes\nProgram lead: Maya Chen\nPMO: Riley Adams\nOperations council: regional service directors\nCompliance: Priya Shah",
      risks: sampleProgram.risks.map((risk) => `${risk.level} risk: ${risk.title}. ${risk.response}`).join("\n"),
      constraints: "Pilot three regions and four service categories. Reuse the existing identity provider. Retain approval audit history for seven years. Sensitive requests require role-based access.",
      currentStatus: "Design and planning",
      decisionsNeeded: sampleProgram.decisions.map((decision) => `${decision.owner}: ${decision.question}`).join("\n"),
      blockers: "Exception approval ownership and the final pilot category boundary require sponsor confirmation.",
      teamRoles: roles.map((role) => role.role),
      teamFootprint: roles.map((role, index) => ({ id: `demo-role-${index}`, ...role, active: true })),
      leadershipReviewCadence: "weekly" as const,
      artifacts: structuredClone(sampleDiscoverySources),
      reviewedContext: {
        outcomes: sampleProgram.outcomes.join("\n"),
        stakeholders: "Regional coordinators, resident requesters, compliance approvers, operations leaders.",
        risks: sampleDiscoverySynthesis.gaps.map((gap) => gap.description).join("\n"),
        requirements: sampleDiscoverySynthesis.capabilities.join("\n"),
        decisions: sampleDiscoverySynthesis.gaps.map((gap) => gap.question).join("\n"),
        outputs: "Product roadmap, features, epics, user stories, acceptance criteria, test cases, and gap analysis.",
        confidence: "high" as const,
        reviewedAt: updatedAt
      }
    }
  };
  const programMilestones = [
    { id: "demo-discovery", name: "Discovery package synthesized", date: date(-7).slice(0, 10), status: "complete" as const, priority: "High" as const, note: "Six sources translated into a traceable roadmap and backlog." },
    { id: "demo-policy", name: "Operating model decisions closed", date: date(3).slice(0, 10), status: "current" as const, priority: "High" as const, note: "Confirm approval ownership and four pilot categories." },
    { id: "demo-pilot", name: "Three-region intake pilot begins", date: date(24).slice(0, 10), status: "next" as const, priority: "High" as const, note: "Validate assignment within four hours and complete approval evidence." },
    { id: "demo-rollout", name: "Twelve-region rollout decision", date: date(66).slice(0, 10), status: "next" as const, priority: "Medium" as const, note: "Evaluate pilot outcomes and adoption before expanding." }
  ];
  const teamRoleUpdates = roles.map((role, index) => ({
    role: role.role,
    updatedBy: role.owner,
    progressUpdate: ["Pilot outcome measures and roadmap agreed with regional leads.", "Five capabilities mapped to requirements, stories, and policy evidence.", "Intake prototype validated with eight coordinators; duplicate entry removed.", "Identity spike complete; routing and immutable audit design in review.", "Top twenty categories mapped; baseline dashboard captures 3.8-day assignment time.", "Three pilot champions nominated; training outline ready for review."][index],
    changesObserved: "Discovery synthesis is reflected in the pilot backlog and team action plan.",
    activeRisks: index === 1 ? "Regional approval rules conflict; a common exception owner is needed." : index === 4 ? "Category definitions vary across regions." : "",
    blockers: index === 3 ? "Approval workflow configuration awaits sponsor policy decision." : "",
    decisionsNeeded: index === 1 || index === 3 ? sampleProgram.decisions[0].question : "",
    supportNeeded: index === 1 ? "Sponsor confirmation by the next checkpoint." : "",
    status: index === 1 || index === 3 ? "at-risk" as const : "on-track" as const,
    needsLeadershipAttention: index === 1 || index === 3,
    lastUpdatedAt: updatedAt
  }));
  const deliveryBoardItems = [
    { id: "demo-task-blueprint", role: "Business Analysis", sharedRoles: ["User Experience"], title: "Validate end-to-end service blueprint", description: "Confirm intake, assignment, approval, fulfillment, and notification handoffs with pilot coordinators.", owner: "Jordan Rivera", status: "done" as const, startDate: date(-14).slice(0, 10), dueDate: date(-4).slice(0, 10), latestNote: "Validated with three regions; evidence linked to the pilot stories.", attachments: [] },
    { id: "demo-task-intake", role: "Application Development", sharedRoles: ["Product Management", "User Experience"], title: "Implement guided request intake", description: "Capture category-specific fields, validate completeness, and produce an auditable request record.", owner: "Taylor Brooks", status: "in-progress" as const, startDate: date(-3).slice(0, 10), dueDate: date(10).slice(0, 10), latestNote: "Validation and accessibility cases in development.", attachments: [] },
    { id: "demo-task-policy", role: "Business Analysis", sharedRoles: ["Application Development"], title: "Confirm exception approval policy", description: "Obtain the accountable approval role and resolve regional policy differences.", owner: "Jordan Rivera", status: "blocked" as const, startDate: date(-5).slice(0, 10), dueDate: date(3).slice(0, 10), latestNote: "Sponsor decision requested; routing can proceed independently.", attachments: [] },
    { id: "demo-task-dashboard", role: "Data Engineering", sharedRoles: ["Product Management"], title: "Build pilot outcome dashboard", description: "Measure assignment time, reassignment, request aging, and service-level risk.", owner: "Avery Morgan", status: "needs-review" as const, startDate: date(-5).slice(0, 10), dueDate: date(7).slice(0, 10), latestNote: "Baseline measures available; review SLA definitions with operations.", attachments: [] },
    { id: "demo-task-training", role: "Change Management", sharedRoles: ["User Experience"], title: "Prepare regional champion onboarding", description: "Create role-based guidance and feedback checkpoints for the pilot.", owner: "Casey Ellis", status: "not-started" as const, startDate: date(8).slice(0, 10), dueDate: date(20).slice(0, 10), latestNote: "Training follows the validated request journey.", attachments: [] }
  ];
  const review = {
    programName,
    executiveSponsor: "Morgan Hayes",
    programLead: "Maya Chen",
    pmo: "Riley Adams",
    originalNorthStar: sampleProgram.vision,
    currentPhase: "Design and planning",
    programCompletionPercent: "42",
    completionDelta: "+12% since the last checkpoint",
    nextMilestoneName: "Operating model decisions closed",
    nextMilestoneDate: date(3).slice(0, 10),
    nextMilestonePriority: "High",
    programStartDate: createdAt.slice(0, 10),
    programTargetFinishDate: date(90).slice(0, 10),
    clientStatusNote: sampleProgram.clientUpdate.headline,
    progressSinceLastReview: "Six discovery sources synthesized. Five capabilities and the initial build package validated. Intake prototype and identity spike completed.",
    planChanges: "Prioritize a focused three-region pilot and defer offline entry until field demand is validated.",
    activeRisks: program.intake.risks,
    stakeholderTemperature: "Regional champions support the pilot; compliance needs one accountable exception approver.",
    decisionsPending: program.intake.decisionsNeeded,
    deliveryHealth: "Amber: definition is on track; two operating decisions gate approval configuration.",
    supportNeeded: "Executive sponsor to confirm the exception approval owner. Operations council to select four pilot categories.",
    updateCadence: "weekly" as const,
    timelineScale: "month" as const,
    timelineYear: date(0).slice(0, 4),
    timelineMonth: date(0).slice(0, 7),
    programMilestones,
    cycleLabel: "Pilot definition checkpoint",
    cycleStartedAt: date(-7),
    programSynthesisNote: sampleDiscoverySynthesis.executiveSummary,
    teamRoleUpdates,
    deliveryBoardItems,
    artifacts: structuredClone(sampleDiscoverySources)
  };
  const feedback = {
    id: "demo-leadership-review", ...identity, createdAt: date(-8),
    feedback: { programName, timelineSummary: "Pilot milestone remains achievable if policy decisions close this week.", progressHighlights: review.progressSinceLastReview, activeRisks: review.activeRisks, leadershipGuidance: "Keep the pilot limited to three regions. Preserve the audit requirement and close approval ownership before configuring exceptions.", supportRequests: review.supportNeeded, feedbackToDeliveryLead: "Proceed with intake and routing in parallel; bring a single decision brief to the sponsor checkpoint." },
    interpretation: { provider: "local" as const, generatedAt: date(-8), summary: "Leadership supports the pilot and requires a clear approval owner before exception workflow configuration.", deliveryLeadMessage: "Advance intake and routing; resolve policy as an explicit gate.", planImpacts: ["Sequence exception workflow after sponsor approval."], riskAdjustments: ["Escalate regional policy inconsistency to the executive sponsor."], roleImpacts: [{ role: "Business Analysis" as const, focus: "Close the approval ownership decision with cited policy evidence." }] }
  };
  const plan: GuidedPlan = {
    id: "demo-guided-plan", ...identity, createdAt: date(-1), northStar: sampleProgram.vision,
    summary: sampleDiscoverySynthesis.executiveSummary,
    programGuide: { title: "Deliver a trusted regional pilot", focus: "Close the operating decisions while intake and routing move forward.", whyItMatters: "Assignment currently takes 3.8 days and 27% of requests are reassigned.", nextStep: "Confirm approval ownership and the four-category pilot boundary.", sponsorReadout: sampleProgram.clientUpdate.headline },
    sourceInputs: { title: "Evidence and context", items: sampleDiscoverySources.map((source) => `${source.name}: ${source.extractionSummary}`) },
    assistantDialogue: { title: "Discovery interpretation", items: [sampleDiscoverySynthesis.evidenceSummary] },
    signalFromNoise: { title: "What matters now", items: ["Shared intake and visible ownership address the largest operating pain points.", "Approval policy and category scope are explicit decision gates.", "Pilot outcomes must compare assignment time, reassignment, and SLA risk against the baseline."] },
    workPath: { title: "Sequenced delivery path", items: sampleDiscoverySynthesis.roadmap.map((item) => `${item.horizon}: ${item.title}. ${item.outcome}`) },
    planningApproach: { title: "Planning approach", items: ["Validate the service blueprint with three pilot regions.", "Deliver intake and routing first; gate approval configuration on the policy decision.", "Review evidence and adoption at each weekly checkpoint."] },
    keyOutcomes: { title: "Measurable outcomes", items: [...sampleProgram.outcomes] },
    criticalRequirements: { title: "Critical requirements", items: [...sampleDiscoverySynthesis.businessRules] },
    keyOutputs: { title: "Product outputs", items: ["Roadmap and prioritized epic/feature backlog", "User stories with acceptance criteria and linked test cases", "Policy gap analysis and accountable decision brief", "Pilot readiness checklist and executive status update"] },
    risksAndDecisions: { title: "Risks and decisions", items: [...sampleProgram.risks.map((risk) => `Risk: ${risk.title}. ${risk.response}`), ...sampleProgram.decisions.map((decision) => `Decision needed: ${decision.question} Owner: ${decision.owner}.`)] },
    leadershipChanges: { title: "Leadership direction", items: [feedback.feedback.leadershipGuidance, feedback.feedback.feedbackToDeliveryLead] },
    rolePlans: { title: "Team action plans", roles: roles.map((role, index) => ({ role: role.role, actionPlan: [teamRoleUpdates[index].progressUpdate, role.responsibility], keyFocusAreas: [role.responsibility], keyOutcomes: [sampleProgram.outcomes[index % sampleProgram.outcomes.length]], risksAndMitigations: [teamRoleUpdates[index].activeRisks] })) },
    leadershipSignal: { status: "incorporated", summary: feedback.interpretation.summary, highlights: feedback.interpretation.planImpacts, updatedAt: feedback.createdAt, sourceFeedbackId: feedback.id },
    followUpQuestions: sampleDiscoverySynthesis.gaps.map((gap) => gap.question),
    sourceRecordIds: [...sampleDiscoverySources.map((source) => source.id), "demo-program-update", feedback.id]
  };
  const store: ProgramStoreFile = {
    programs: [program],
    updates: [{ id: "demo-program-update", ...identity, createdAt: updatedAt, updatedAt, review }],
    guidedPlans: [plan],
    leadershipFeedbacks: [feedback],
    meetingInputs: [{ id: "demo-discovery-checkpoint", ...identity, title: "Regional pilot discovery checkpoint", sourceType: "meeting-notes", sourceProvider: "manual", capturedAt: date(-2), summary: "Regional champions validated the primary journey and agreed to measure assignment within four hours. Approval ownership and category SLA definitions remain open.", transcriptExcerpt: "We can pilot intake and routing while the sponsor resolves the exception approver. The top four categories must have agreed SLA targets.", attachments: [], recommendedPlanAdjustments: ["Separate intake and routing delivery from the approval policy gate."], extractedSignals: ["Three regions ready for the pilot", "Approval ownership remains unresolved"], justificationStatus: "plan-refreshed", createdAt: date(-2), updatedAt: date(-2) }],
    roleArtifacts: [{ id: "demo-product-build-package", ...identity, artifactType: "discovery-synthesis", role: "Product Management", title: "Regional service pilot build package", summary: sampleDiscoverySynthesis.executiveSummary, sourceSummary: sampleDiscoverySynthesis.evidenceSummary, sections: [{ title: "Capabilities", items: sampleDiscoverySynthesis.capabilities }], tables: [{ title: "Roadmap", columns: ["Horizon", "Outcome", "Dependencies"], rows: sampleDiscoverySynthesis.roadmap.map((item) => [item.horizon, item.outcome, item.dependencies.join("; ")]) }], iterationPrompts: sampleDiscoverySynthesis.gaps.map((gap) => gap.question), provider: "local", version: 1, generatedAt: updatedAt, discoverySynthesis: structuredClone(sampleDiscoverySynthesis) }],
    clientDecisionRequests: sampleProgram.decisions.map((decision, index) => ({ id: `demo-client-decision-${index}`, ...identity, decisionText: `${decision.question} ${decision.impact}`, requestedBy: decision.owner, status: "open", createdAt: date(-2), updatedAt: date(-2) })),
    clientPortalUpdates: [{ id: "demo-client-publication", ...identity, createdAt: updatedAt, updatedAt, status: "published", activeRisks: review.activeRisks, clientStatusNote: sampleProgram.clientUpdate.headline, currentPhase: review.currentPhase, decisionsPending: review.decisionsPending, deliveryHealth: review.deliveryHealth, domainUpdates: teamRoleUpdates.map((update, index) => ({ role: update.role, owner: roles[index].owner, pursuit: update.progressUpdate, risksOrBlockers: update.activeRisks, decisionsOrOutcomes: update.decisionsNeeded || "Pilot work proceeds against the agreed journey.", status: update.status })), executiveOverview: sampleProgram.clientUpdate.narrative, executiveSponsor: review.executiveSponsor, programLead: review.programLead, pmo: review.pmo, nextMilestoneDate: review.nextMilestoneDate, nextMilestoneName: review.nextMilestoneName, nextMilestonePriority: "High", originalNorthStar: review.originalNorthStar, overallStatus: "amber", programCompletionPercent: "42", completionDelta: review.completionDelta, programMilestones, programStartDate: review.programStartDate, programTargetFinishDate: review.programTargetFinishDate, timelineScale: "month", timelineYear: review.timelineYear, timelineMonth: review.timelineMonth, progressSinceLastReview: review.progressSinceLastReview, upcomingWork: sampleProgram.clientUpdate.next, supportNeeded: review.supportNeeded, deliveryBoardItems, clientRoadmapItems: sampleDiscoverySynthesis.roadmap.map((item, index) => ({ id: `demo-roadmap-${index}`, title: item.title, category: "Service modernization", owner: "Maya Chen", startMonth: date(index * 30).slice(0, 7), endMonth: date((index + 1) * 30).slice(0, 7), status: index === 0 ? "in-progress" : "planned", note: item.outcome })), publicationNote: "Fictional demonstration update." }],
    guidanceJustifications: [{ id: "demo-rationale", ...identity, guidedPlanId: plan.id, summary: "Prioritize intake and routing because volume evidence shows slow assignment and repeated handoffs; gate approval configuration on the unresolved policy decision.", triggeredBy: ["artifact", "leadership-feedback", "active-update"], citations: [{ sourceType: "artifact", sourceId: "sample-volume-analysis", label: "Request volume and aging baseline", rationale: "3.8-day assignment time and 27% reassignment establish the value of shared intake and routing." }, { sourceType: "leadership-feedback", sourceId: feedback.id, label: "Sponsor direction", rationale: "Proceed in parallel while preserving the approval policy gate." }], createdAt: updatedAt }],
    guidanceFeedbackFlags: [], openAIUsageRecords: [], auditEvents: [], managedUsers: []
  };
  store.clientPortalUpdates[0].currentPhase = "Plan";
  return store;
}
