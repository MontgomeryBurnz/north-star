import assert from "node:assert/strict";
import test from "node:test";
import { buildClientPortalPortfolio, buildClientPortalProgram } from "../src/lib/client-portal.ts";
import type { StoredProgramUpdate } from "../src/lib/active-program-types.ts";
import type { GuidedPlan } from "../src/lib/guided-plan-types.ts";
import type { StoredProgram } from "../src/lib/program-intake-types.ts";

const program: StoredProgram = {
  id: "compliance-hub",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
  intake: {
    programName: "Compliance Hub",
    programOwner: "Delivery Lead",
    vision: "Make compliance review faster and safer.",
    sowSummary: "Build a compliance workflow for alpha launch.",
    outcomes: "Reduce manual review time\nImprove evidence quality",
    stakeholders: "",
    risks: "API dependency",
    constraints: "",
    currentStatus: "Execute",
    decisionsNeeded: "Approve alpha launch criteria",
    blockers: "",
    teamRoles: ["Product Management", "Engineering"],
    artifacts: []
  }
};

const update: StoredProgramUpdate = {
  id: "update-1",
  programId: "compliance-hub",
  programName: "Compliance Hub",
  createdAt: "2026-04-29T00:00:00.000Z",
  updatedAt: "2026-04-29T00:00:00.000Z",
  review: {
    programName: "Compliance Hub",
    executiveSponsor: "R. Thompson",
    programLead: "A. Miller",
    pmo: "Sandra Kowalski",
    originalNorthStar: "Launch compliant alpha workflows.",
    currentPhase: "Execute",
    programCompletionPercent: "78",
    completionDelta: "+6%",
    nextMilestoneName: "Scope baseline",
    nextMilestoneDate: "2026-05-08",
    nextMilestonePriority: "High",
    clientStatusNote: "Discovery remains stable and aligned to baseline.",
    progressSinceLastReview: "Intake rules are complete.",
    planChanges: "",
    activeRisks: "iTrade API timing could delay release.",
    stakeholderTemperature: "",
    decisionsPending: "Confirm launch readiness owner.",
    deliveryHealth: "At risk",
    supportNeeded: "",
    timelineScale: "year",
    timelineYear: "FY25",
    timelineMonth: "",
    timelineWeek: "",
    programMilestones: [
      {
        id: "program-intake",
        name: "Program intake captured",
        date: "2026-04-01",
        status: "complete",
        priority: "Low",
        note: "Initial program setup saved."
      },
      {
        id: "scope-baseline",
        name: "Scope baseline",
        date: "2026-05-08",
        status: "current",
        priority: "High",
        note: "Sponsor checkpoint for launch readiness."
      },
      {
        id: "pilot-readiness",
        name: "Pilot readiness",
        date: "2026-05-22",
        status: "next",
        priority: "Medium",
        note: "Validate rollout readiness."
      }
    ],
    teamRoleUpdates: [
      {
        role: "Engineering",
        updatedBy: "Tech Lead",
        progressUpdate: "Dependency remains open.",
        changesObserved: "",
        activeRisks: "API timing",
        blockers: "",
        decisionsNeeded: "",
        supportNeeded: "",
        status: "at-risk",
        needsLeadershipAttention: false
      }
    ],
    deliveryBoardItems: [
      {
        id: "board-1",
        role: "Engineering",
        title: "API readiness review",
        description: "Resolve API launch path.",
        owner: "Tech Lead",
        status: "needs-review",
        dueDate: "2026-05-08",
        latestNote: "Ready for sponsor confirmation.",
        attachments: []
      }
    ],
    artifacts: []
  }
};

const plan: GuidedPlan = {
  id: "plan-1",
  programId: "compliance-hub",
  programName: "Compliance Hub",
  createdAt: "2026-04-29T00:00:00.000Z",
  northStar: "Ship a controlled compliance alpha.",
  summary: "Compliance Hub is progressing, with API timing as the executive risk.",
  programGuide: {
    title: "Overall Program Guide",
    focus: "Engineering is clearing the API timing dependency while product validates launch readiness.",
    whyItMatters: "API timing controls whether the alpha release can safely proceed.",
    nextStep: "Confirm the launch readiness owner and lock the API timing path.",
    sponsorReadout: "Engineering is clearing the API dependency so the alpha release can proceed with controlled readiness."
  },
  sourceInputs: { title: "Inputs", items: [] },
  assistantDialogue: { title: "Guide", items: [] },
  signalFromNoise: { title: "Signal", items: [] },
  workPath: { title: "Path", items: ["Lock API timing", "Confirm launch readiness", "Prepare sponsor readout"] },
  planningApproach: { title: "Planning", items: [] },
  keyOutcomes: { title: "Outcomes", items: ["Alpha workflow ready for sponsor validation"] },
  criticalRequirements: { title: "Requirements", items: [] },
  keyOutputs: { title: "Outputs", items: [] },
  risksAndDecisions: { title: "Risks", items: ["API timing requires escalation"] },
  leadershipChanges: { title: "Leadership", items: [] },
  leadershipSignal: {
    status: "incorporated",
    summary: "Leadership input is incorporated.",
    highlights: []
  },
  followUpQuestions: [],
  sourceRecordIds: []
};

test("buildClientPortalProgram creates executive posture from program signals", () => {
  const portalProgram = buildClientPortalProgram({
    assignedRoles: ["Executive Sponsor"],
    latestPlan: plan,
    latestUpdate: update,
    program
  });

  assert.equal(portalProgram.posture, "at-risk");
  assert.equal(portalProgram.statusSignal, "AMBER");
  assert.equal(portalProgram.completionDelta, "+6%");
  assert.equal(portalProgram.programLead, "A. Miller");
  assert.equal(portalProgram.executiveSponsor, "R. Thompson");
  assert.equal(portalProgram.pmo, "Sandra Kowalski");
  assert.equal(portalProgram.statusNote, "Discovery remains stable and aligned to baseline.");
  assert.equal(portalProgram.executiveSummary, "Discovery remains stable and aligned to baseline.");
  assert.equal(portalProgram.metrics.risks, 1);
  assert.equal(portalProgram.metrics.decisions, 1);
  assert.equal(portalProgram.assignedRoles[0], "Executive Sponsor");
  assert.equal(portalProgram.primaryOutcome, "Alpha workflow ready for sponsor validation");
  assert.equal(portalProgram.metrics.phaseCompletionPercent, 75);
  assert.equal(portalProgram.metrics.programCompletionPercent, 78);
  assert.match(portalProgram.progressUpdates[0], /Focus:/);
  assert.match(portalProgram.progressUpdates.join(" "), /Engineering: Dependency remains open/);
  assert.match(portalProgram.progressUpdates.join(" "), /Risk:/);
  assert.match(portalProgram.progressUpdates.join(" "), /Decision:/);
  assert.ok(portalProgram.progressUpdates.every((signal) => signal.length <= 130));
  assert.ok(portalProgram.executiveOverview.length <= 260);
  assert.match(portalProgram.executiveOverview, /At risk in Execute/);
  assert.match(portalProgram.executiveOverview, /Discovery remains stable/);
  assert.match(portalProgram.executiveOverview, /Confirm the launch readiness owner/);
  assert.equal(portalProgram.domainSummaries[0]?.role, "Engineering");
  assert.equal(portalProgram.domainSummaries[0]?.pursuit, "Dependency remains open.");
  assert.equal(portalProgram.domainSummaries[0]?.risksOrBlockers, "API timing");
  assert.equal(portalProgram.domainSummaries[0]?.owner, "Tech Lead");
  assert.match(portalProgram.executiveStatusHighlights.join(" "), /Program complete 78%/);
  assert.match(portalProgram.recentAccomplishments.join(" "), /Intake rules are complete/);
  assert.match(portalProgram.upcomingWork.join(" "), /Confirm the launch readiness owner/);
  assert.equal(portalProgram.executiveRisks[0]?.severity, "High");
  assert.match(portalProgram.leadershipDecisions[0]?.title ?? "", /Confirm launch readiness owner/);
  assert.equal(portalProgram.workstreams[0]?.name, "Engineering");
  assert.equal(portalProgram.workstreams[0]?.percent, 52);
  assert.equal(portalProgram.nextMilestone.name, "Scope baseline");
  assert.equal(portalProgram.nextMilestone.dateLabel, "May 08");
  assert.equal(portalProgram.nextMilestone.priority, "High");
  assert.equal(portalProgram.milestones[1]?.name, "Scope baseline");
  assert.equal(portalProgram.milestones[1]?.status, "current");
  assert.equal(portalProgram.milestones.length, 3);
  assert.equal(portalProgram.timelineScale, "year");
  assert.equal(portalProgram.timelineScaleLabel, "Year");
  assert.equal(portalProgram.timelineWindowLabel, "FY25");
  assert.deepEqual(portalProgram.roadmapWindowLabels, ["Q1 FY25", "Q2 FY25", "Q3 FY25", "Q4 FY25", "Q1 FY26"]);
  assert.equal(portalProgram.roadmapCurrentWindowIndex, 2);
});

test("buildClientPortalPortfolio rolls program posture into portfolio metrics", () => {
  const portfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [{ latestPlan: plan, latestUpdate: update, program }]
  });

  assert.equal(portfolio.metrics.totalPrograms, 1);
  assert.equal(portfolio.metrics.atRisk, 1);
  assert.equal(portfolio.metrics.delayed, 0);
  assert.equal(portfolio.metrics.averageCompletionPercent, 78);
  assert.equal(portfolio.metrics.healthScore, 46);
  assert.equal(portfolio.upcomingMilestones[0]?.title, "Scope baseline");
  assert.equal(portfolio.keyRisks[0]?.trend, "Worse");
  assert.equal(portfolio.roadmap[0]?.segments.length, 5);
  assert.equal(portfolio.roadmap[0]?.windowMode, "year");
  assert.equal(portfolio.roadmap[0]?.timeframeLabel, "FY25");
  assert.deepEqual(portfolio.roadmap[0]?.windowLabels, ["Q1 FY25", "Q2 FY25", "Q3 FY25", "Q4 FY25", "Q1 FY26"]);
  assert.equal(portfolio.roadmap[0]?.currentWindowIndex, 2);
  assert.equal(portfolio.roadmap[0]?.markerPosition, 50);
  assert.deepEqual(portfolio.roadmap[0]?.segments.map((segment) => segment.state), [
    "complete",
    "complete",
    "current",
    "next",
    "next"
  ]);
});

test("Client Portal year roadmap marker follows the saved phase instead of stale completion percent", () => {
  const buildUpdate: StoredProgramUpdate = {
    ...update,
    review: {
      ...update.review,
      currentPhase: "Build update",
      programCompletionPercent: "8",
      programMilestones: [
        {
          id: "build-update",
          name: "Build update",
          date: "2026-06-24",
          status: "current",
          priority: "High",
          note: "Current execution checkpoint."
        }
      ],
      timelineScale: "year",
      timelineYear: ""
    }
  };
  const portfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [{ latestPlan: plan, latestUpdate: buildUpdate, program }]
  });

  assert.equal(portfolio.roadmap[0]?.timeframeLabel, "Program Year");
  assert.equal(portfolio.roadmap[0]?.currentWindowIndex, 2);
  assert.equal(portfolio.roadmap[0]?.markerPosition, 50);
  assert.equal(portfolio.roadmap[0]?.segments[2]?.label, "Execute");
  assert.equal(portfolio.roadmap[0]?.segments[2]?.state, "current");
});

test("Client Portal roadmap adapts to month and week timeline windows", () => {
  const monthUpdate: StoredProgramUpdate = {
    ...update,
    review: {
      ...update.review,
      timelineScale: "month",
      timelineMonth: "2026-05",
      timelineYear: "",
      timelineWeek: "",
      nextMilestoneDate: "2026-05-15",
      programMilestones: [
        {
          id: "may-build",
          name: "May build checkpoint",
          date: "2026-05-15",
          status: "current",
          priority: "High",
          note: "May checkpoint."
        }
      ]
    }
  };
  const weekUpdate: StoredProgramUpdate = {
    ...update,
    review: {
      ...update.review,
      timelineScale: "week",
      timelineMonth: "",
      timelineYear: "",
      timelineWeek: "2026-05-11",
      nextMilestoneDate: "2026-05-13",
      programMilestones: [
        {
          id: "week-build",
          name: "Midweek checkpoint",
          date: "2026-05-13",
          status: "current",
          priority: "Medium",
          note: "Week checkpoint."
        }
      ]
    }
  };

  const monthProgram = buildClientPortalProgram({ latestPlan: plan, latestUpdate: monthUpdate, program });
  const weekProgram = buildClientPortalProgram({ latestPlan: plan, latestUpdate: weekUpdate, program });

  assert.equal(monthProgram.timelineScale, "month");
  assert.equal(monthProgram.timelineScaleLabel, "Month");
  assert.equal(monthProgram.timelineWindowLabel, "May 2026");
  assert.deepEqual(monthProgram.roadmapWindowLabels, ["May 1", "May 8", "May 15", "May 22", "May 29"]);
  assert.equal(monthProgram.roadmapCurrentWindowIndex, 2);
  assert.equal(monthProgram.nextMilestone.name, "Scope baseline");
  assert.equal(monthProgram.nextMilestone.dateLabel, "May 15");
  assert.equal(monthProgram.milestones.some((milestone) => milestone.name === "Scope baseline"), true);

  assert.equal(weekProgram.timelineScale, "week");
  assert.equal(weekProgram.timelineScaleLabel, "Week");
  assert.equal(weekProgram.timelineWindowLabel, "Week of May 11");
  assert.deepEqual(weekProgram.roadmapWindowLabels, ["May 11", "May 12", "May 13", "May 14", "May 15"]);
  assert.equal(weekProgram.roadmapCurrentWindowIndex, 2);
  assert.equal(weekProgram.nextMilestone.name, "Scope baseline");
  assert.equal(weekProgram.nextMilestone.dateLabel, "May 13");

  const monthPortfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [{ latestPlan: plan, latestUpdate: monthUpdate, program }]
  });
  const weekPortfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [{ latestPlan: plan, latestUpdate: weekUpdate, program }]
  });

  assert.equal(monthPortfolio.roadmap[0]?.windowMode, "month");
  assert.deepEqual(monthPortfolio.roadmap[0]?.segments.map((segment) => segment.label), monthProgram.roadmapWindowLabels);
  assert.equal(weekPortfolio.roadmap[0]?.windowMode, "week");
  assert.deepEqual(weekPortfolio.roadmap[0]?.segments.map((segment) => segment.label), weekProgram.roadmapWindowLabels);
});

test("buildClientPortalProgram avoids fabricated client content without saved updates or guidance", () => {
  const minimalProgram: StoredProgram = {
    ...program,
    id: "minimal",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    intake: {
      ...program.intake,
      programName: "New Program",
      currentStatus: "",
      decisionsNeeded: "",
      outcomes: "",
      risks: "",
      sowSummary: "",
      teamRoles: []
    }
  };

  const portalProgram = buildClientPortalProgram({ program: minimalProgram });
  const serialized = JSON.stringify(portalProgram);

  assert.equal(portalProgram.metrics.programCompletionPercent, 0);
  assert.equal(portalProgram.completionDelta, "");
  assert.equal(portalProgram.nextMilestone.name, "No milestone captured");
  assert.deepEqual(portalProgram.recommendedPath, []);
  assert.deepEqual(portalProgram.executiveRisks, []);
  assert.deepEqual(portalProgram.leadershipDecisions, []);
  assert.doesNotMatch(serialized, /Pilot Readiness|Cutover Readiness|Go-Live/);
  assert.doesNotMatch(serialized, /Status unchanged from prior cycle|Core delivery transformation/);
});
