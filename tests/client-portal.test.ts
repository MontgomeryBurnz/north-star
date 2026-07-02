import assert from "node:assert/strict";
import test from "node:test";
import { validateClientPortalUpdateInput } from "../src/lib/client-safe-copy.ts";
import { buildClientPortalPortfolio, buildClientPortalProgram } from "../src/lib/client-portal.ts";
import { buildClientPortalPdf, clientPortalPdfFilename } from "../src/lib/client-portal-pdf.ts";
import type { StoredProgramUpdate } from "../src/lib/active-program-types.ts";
import type { ClientPortalUpdateRecord } from "../src/lib/client-portal-update-types.ts";
import type { StoredProgram } from "../src/lib/program-intake-types.ts";

const program: StoredProgram = {
  id: "compliance-hub",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
  intake: {
    clientName: "Impower",
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
        sharedRoles: ["Business Analysis"],
        title: "API readiness review",
        description: "Resolve API launch path.",
        owner: "Tech Lead",
        status: "needs-review",
        startDate: "2026-04-29",
        dueDate: "2026-05-08",
        latestNote: "Ready for sponsor confirmation.",
        attachments: []
      }
    ],
    artifacts: []
  }
};

function clientPortalUpdateFromStoredUpdate(source: StoredProgramUpdate): ClientPortalUpdateRecord {
  const review = source.review;

  return {
    id: `client-${source.id}`,
    programId: source.programId,
    programName: source.programName,
    status: "published",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt ?? source.createdAt,
    activeRisks: review.activeRisks,
    clientStatusNote: review.clientStatusNote ?? "",
    clientRoadmapItems: [],
    completionDelta: review.completionDelta,
    currentPhase: review.currentPhase,
    decisionsPending: review.decisionsPending,
    deliveryBoardItems: review.deliveryBoardItems ?? [],
    deliveryHealth: review.deliveryHealth,
    domainUpdates: (review.teamRoleUpdates ?? []).map((roleUpdate) => ({
      attachments: roleUpdate.attachments?.length ?? 0,
      decisionsOrOutcomes: roleUpdate.decisionsNeeded,
      owner: roleUpdate.updatedBy,
      pursuit: roleUpdate.progressUpdate,
      risksOrBlockers: roleUpdate.activeRisks || roleUpdate.blockers,
      role: roleUpdate.role,
      status: roleUpdate.status
    })),
    executiveOverview: review.programSynthesisNote ?? "",
    executiveSponsor: review.executiveSponsor,
    nextMilestoneDate: review.nextMilestoneDate,
    nextMilestoneName: review.nextMilestoneName,
    nextMilestonePriority: review.nextMilestonePriority,
    originalNorthStar: review.originalNorthStar,
    pmo: review.pmo,
    programCompletionPercent: review.programCompletionPercent,
    programLead: review.programLead,
    programMilestones: review.programMilestones ?? [],
    programStartDate: review.programStartDate,
    programTargetFinishDate: review.programTargetFinishDate,
    progressSinceLastReview: review.progressSinceLastReview,
    supportNeeded: review.supportNeeded,
    timelineMonth: review.timelineMonth,
    timelineScale: review.timelineScale,
    timelineWeek: review.timelineWeek,
    timelineYear: review.timelineYear,
    upcomingWork: review.planChanges
  };
}

const clientUpdate = clientPortalUpdateFromStoredUpdate(update);

test("buildClientPortalProgram creates executive posture from program signals", () => {
  const portalProgram = buildClientPortalProgram({
    assignedRoles: ["Executive Sponsor"],
    latestClientUpdate: clientUpdate,
    program
  });

  assert.equal(portalProgram.posture, "at-risk");
  assert.equal(portalProgram.clientName, "Impower");
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
  assert.equal(portalProgram.primaryOutcome, "Intake rules are complete.");
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
  assert.match(portalProgram.executiveOverview, /Confirm launch readiness owner/);
  assert.equal(portalProgram.domainSummaries[0]?.role, "Engineering");
  assert.equal(portalProgram.domainSummaries[0]?.pursuit, "Dependency remains open.");
  assert.equal(portalProgram.domainSummaries[0]?.risksOrBlockers, "API timing");
  assert.equal(portalProgram.domainSummaries[0]?.owner, "Tech Lead");
  assert.match(portalProgram.executiveStatusHighlights.join(" "), /Program complete 78%/);
  assert.match(portalProgram.recentAccomplishments.join(" "), /Intake rules are complete/);
  assert.match(portalProgram.upcomingWork.join(" "), /Confirm launch readiness owner/);
  assert.equal(portalProgram.executiveRisks[0]?.severity, "High");
  assert.match(portalProgram.leadershipDecisions[0]?.title ?? "", /Confirm launch readiness owner/);
  assert.equal(portalProgram.workstreams[0]?.name, "Engineering");
  assert.equal(portalProgram.workstreams[0]?.percent, 90);
  assert.equal(portalProgram.workstreams[0]?.percentBasis, "0/1 tasks done");
  assert.equal(portalProgram.workstreams[0]?.scheduleLabel, "Apr 29 -> May 08");
  assert.equal(portalProgram.workstreams[0]?.taskCount, 1);
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

test("buildClientPortalProgram uses explicit client-facing overall status when published", () => {
  const portalProgram = buildClientPortalProgram({
    latestClientUpdate: {
      ...clientUpdate,
      activeRisks: "",
      deliveryHealth: "",
      domainUpdates: [],
      overallStatus: "red"
    },
    program
  });

  assert.equal(portalProgram.posture, "blocked");
  assert.equal(portalProgram.postureLabel, "Blocked");
  assert.equal(portalProgram.statusSignal, "RED");
});

test("Client Portal preserves the published executive overview verbatim", () => {
  const executiveOverview =
    "Executive overview entered by the program lead: component refinement is progressing through feature-level decomposition and sponsor alignment remains the current focus.";
  const portalProgram = buildClientPortalProgram({
    latestClientUpdate: {
      ...clientUpdate,
      clientStatusNote: "Short status note should not replace the executive overview.",
      executiveOverview
    },
    program
  });

  assert.equal(portalProgram.executiveOverview, executiveOverview);
  assert.equal(portalProgram.executiveSummary, executiveOverview);
  assert.doesNotMatch(portalProgram.executiveOverview, /At risk in Execute/);
});

test("Client Portal exposes client-update roadmap rows from Client Updates", () => {
  const roadmapUpdate: ClientPortalUpdateRecord = {
    ...clientUpdate,
    clientRoadmapItems: [
      {
        category: "Components",
        endMonth: "2026-09",
        id: "product-requests",
        note: "Mass Add request intake through readiness validation.",
        owner: "Product Lead",
        startMonth: "2026-06",
        status: "in-progress",
        title: "Product Requests"
      },
      {
        category: "Reporting & Insights",
        endMonth: "2026-12",
        id: "hub-reporting",
        note: "Dashboards and compliance insight reporting.",
        owner: "Data Lead",
        startMonth: "2026-09",
        status: "planned",
        title: "Hub Insights / Reporting"
      }
    ]
  };

  const portalProgram = buildClientPortalProgram({
    latestClientUpdate: roadmapUpdate,
    program
  });

  assert.equal(portalProgram.clientRoadmapItems.length, 2);
  assert.equal(portalProgram.clientRoadmapItems[0]?.category, "Components");
  assert.equal(portalProgram.clientRoadmapItems[0]?.startLabel, "June 2026");
  assert.equal(portalProgram.clientRoadmapItems[0]?.endLabel, "September 2026");
  assert.equal(portalProgram.clientRoadmapItems[1]?.status, "planned");
});

test("Client Portal completion prefers client roadmap values over schedule and manual percent", () => {
  const roadmapUpdate: ClientPortalUpdateRecord = {
    ...clientUpdate,
    clientRoadmapItems: [
      {
        category: "Components",
        endMonth: "2026-06",
        id: "product-requests",
        note: "Mass Add request intake through readiness validation.",
        owner: "Product Lead",
        startMonth: "2026-05",
        status: "complete",
        title: "Product Requests"
      },
      {
        category: "Reporting & Insights",
        endMonth: "2026-12",
        id: "hub-reporting",
        note: "Dashboards and compliance insight reporting.",
        owner: "Data Lead",
        startMonth: "2026-09",
        status: "planned",
        title: "Hub Insights / Reporting"
      }
    ],
    programCompletionPercent: "99",
    programStartDate: "2026-04-01",
    programTargetFinishDate: "2026-04-21"
  };

  const portalProgram = buildClientPortalProgram({
    generatedAt: "2026-04-11T00:00:00.000Z",
    latestClientUpdate: roadmapUpdate,
    program
  });

  assert.equal(portalProgram.metrics.programCompletionPercent, 50);
  assert.equal(portalProgram.metrics.completionBasis, "Roadmap items");
  assert.equal(portalProgram.metrics.completionScheduleLabel, "1/2 complete");
});

test("buildClientPortalProgram uses team footprint owner and responsibility for domain summaries", () => {
  const portalProgram = buildClientPortalProgram({
    program: {
      ...program,
      intake: {
        ...program.intake,
        teamFootprint: [
          {
            active: true,
            id: "product-management",
            owner: "Abi Ledesma",
            responsibility: "Shape roadmap scope, release tradeoffs, and product decisions.",
            role: "Product Management"
          }
        ],
        teamRoles: ["Legacy Role"]
      }
    }
  });

  assert.equal(portalProgram.domainSummaries[0]?.role, "Product Management");
  assert.equal(portalProgram.domainSummaries[0]?.owner, "Abi Ledesma");
  assert.equal(
    portalProgram.domainSummaries[0]?.pursuit,
    "Shape roadmap scope, release tradeoffs, and product decisions."
  );
  assert.equal(portalProgram.metrics.teamRoles, 1);
});

test("Client Portal does not expose internal updates without a published client update", () => {
  const internalOnlyProgram = buildClientPortalProgram({
    program: {
      ...program,
      intake: {
        ...program.intake,
        risks: "INTERNAL ONLY: client stakeholder is escalating in a sensitive way.",
        decisionsNeeded: "INTERNAL ONLY: protect consulting team relationship."
      }
    }
  });
  const serialized = JSON.stringify(internalOnlyProgram);

  assert.doesNotMatch(serialized, /INTERNAL ONLY/);
  assert.equal(internalOnlyProgram.topRisk, "No active executive risk has been captured yet.");
  assert.equal(internalOnlyProgram.nextDecision, "No published executive decision is currently pending.");
  assert.equal(internalOnlyProgram.statusNote, "Publish a reviewed client update to show current program posture.");
  assert.equal(internalOnlyProgram.executiveSummary, "Publish a reviewed client update to show the executive summary.");
  assert.equal(internalOnlyProgram.primaryOutcome, "No client-facing outcome has been published yet.");
  assert.equal(internalOnlyProgram.northStar, "Publish a reviewed client update to show the north star.");
});

test("Client Portal does not fall back to internal phase after a client update is published", () => {
  const portalProgram = buildClientPortalProgram({
    latestClientUpdate: {
      ...clientUpdate,
      clientStatusNote: "Client-ready roadmap update is published.",
      currentPhase: ""
    },
    program: {
      ...program,
      intake: {
        ...program.intake,
        currentStatus: "Our team internally is working through tactical blockers."
      }
    }
  });
  const serialized = JSON.stringify(portalProgram);

  assert.equal(portalProgram.phase, "Phase not set");
  assert.doesNotMatch(serialized, /internally|tactical blockers/i);
});

test("Client Portal blocks and scrubs unsafe client-facing copy", () => {
  const unsafeClientUpdate: ClientPortalUpdateRecord = {
    ...clientUpdate,
    activeRisks: "INTERNAL ONLY: client behavior is unreasonable and frustrating.",
    clientStatusNote: "Client-ready checkpoint remains on track.",
    decisionsPending: "Confirm milestone date.",
    deliveryBoardItems: [
      {
        attachments: [],
        description: "Tactical working note about behind the scenes escalation.",
        dueDate: "2026-05-08",
        id: "unsafe-board-item",
        latestNote: "Keep this internal only.",
        owner: "Delivery Lead",
        role: "Engineering",
        sharedRoles: [],
        startDate: "2026-04-29",
        status: "needs-review",
        title: "Client-safe dependency review"
      }
    ],
    domainUpdates: [
      {
        attachments: 0,
        decisionsOrOutcomes: "Confirm milestone date.",
        owner: "Tech Lead",
        pursuit: "Resolve readiness path.",
        risksOrBlockers: "Do not share: difficult sponsor alignment.",
        role: "Engineering",
        status: "at-risk"
      }
    ],
    executiveOverview: "Our team internally is triaging client frustration.",
    clientRoadmapItems: [
      {
        category: "Internal only roadmap",
        endMonth: "2026-08",
        id: "unsafe-roadmap",
        note: "Behind the scenes client frustration should not be visible.",
        owner: "Internal team",
        startMonth: "2026-06",
        status: "at-risk",
        title: "Do not share roadmap"
      }
    ],
    progressSinceLastReview: "Architecture review moved forward.",
    upcomingWork: "Prepare sponsor readout."
  };
  const validation = validateClientPortalUpdateInput(unsafeClientUpdate);
  const portalProgram = buildClientPortalProgram({
    latestClientUpdate: unsafeClientUpdate,
    program
  });
  const serialized = JSON.stringify(portalProgram);

  assert.equal(validation.ok, false);
  assert.match(validation.issues.map((issue) => issue.ruleId).join(" "), /internal-markers/);
  assert.match(validation.issues.map((issue) => issue.ruleId).join(" "), /relationship-sensitive/);
  assert.doesNotMatch(serialized, /INTERNAL ONLY|unreasonable|frustrating|Our team internally|Do not share|difficult sponsor|behind the scenes/i);
  assert.match(serialized, /Client-ready checkpoint remains on track/);
  assert.match(serialized, /Architecture review moved forward/);
  assert.match(serialized, /Client-safe dependency review/);
});

test("Client Portal does not generate portfolio milestones or risk metadata from inferred inputs", () => {
  const minimalClientUpdate: ClientPortalUpdateRecord = {
    ...clientUpdate,
    activeRisks: "Client-visible dependency needs date confirmation.",
    clientStatusNote: "Client-ready summary only.",
    deliveryBoardItems: [],
    domainUpdates: [],
    nextMilestoneDate: "",
    nextMilestoneName: "",
    nextMilestonePriority: "",
    programMilestones: [],
    timelineMonth: "",
    timelineScale: "year",
    timelineWeek: "",
    timelineYear: ""
  };
  const portfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [{ latestClientUpdate: minimalClientUpdate, program }]
  });

  assert.equal(portfolio.upcomingMilestones.length, 0);
  assert.equal(portfolio.roadmap.length, 0);
  assert.equal(portfolio.keyRisks[0]?.description, "Client-visible dependency needs date confirmation.");
  assert.equal("severity" in (portfolio.keyRisks[0] ?? {}), false);
  assert.equal("trend" in (portfolio.keyRisks[0] ?? {}), false);
  assert.equal("mitigationOwner" in (portfolio.keyRisks[0] ?? {}), false);
});

test("Client Portal risk cards only come from explicit client-update risk input", () => {
  const updateWithoutExecutiveRisks: ClientPortalUpdateRecord = {
    ...clientUpdate,
    activeRisks: "",
    clientStatusNote: "Client-ready summary only.",
    deliveryHealth: "At risk",
    domainUpdates: [
      {
        attachments: 0,
        decisionsOrOutcomes: "Confirm readiness path.",
        owner: "Tech Lead",
        pursuit: "Complete readiness validation.",
        risksOrBlockers: "API timing remains under internal review.",
        role: "Engineering",
        status: "at-risk"
      }
    ]
  };
  const placeholderRiskUpdate: ClientPortalUpdateRecord = {
    ...updateWithoutExecutiveRisks,
    activeRisks: "N/A"
  };

  const portalProgram = buildClientPortalProgram({
    latestClientUpdate: updateWithoutExecutiveRisks,
    program
  });
  const placeholderProgram = buildClientPortalProgram({
    latestClientUpdate: placeholderRiskUpdate,
    program
  });
  const portfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [{ latestClientUpdate: updateWithoutExecutiveRisks, program }]
  });

  assert.equal(portalProgram.posture, "at-risk");
  assert.equal(portalProgram.domainSummaries[0]?.risksOrBlockers, "API timing remains under internal review.");
  assert.deepEqual(portalProgram.risks, []);
  assert.equal(portalProgram.metrics.risks, 0);
  assert.deepEqual(portalProgram.executiveRisks, []);
  assert.equal(portalProgram.topRisk, "No active executive risk has been captured yet.");
  assert.deepEqual(portfolio.keyRisks, []);
  assert.deepEqual(placeholderProgram.risks, []);
  assert.equal(placeholderProgram.metrics.risks, 0);
});

test("buildClientPortalPortfolio rolls program posture into portfolio metrics", () => {
  const portfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [{ latestClientUpdate: clientUpdate, program }]
  });

  assert.equal(portfolio.metrics.totalPrograms, 1);
  assert.equal(portfolio.metrics.atRisk, 1);
  assert.equal(portfolio.metrics.delayed, 0);
  assert.equal(portfolio.metrics.averageCompletionPercent, 78);
  assert.equal(portfolio.metrics.healthScore, 46);
  assert.equal(portfolio.clients.length, 1);
  assert.equal(portfolio.clients[0]?.clientName, "Impower");
  assert.deepEqual(portfolio.clients[0]?.programIds, ["compliance-hub"]);
  assert.equal(portfolio.clients[0]?.metrics.totalPrograms, 1);
  assert.equal(portfolio.upcomingMilestones[0]?.title, "Scope baseline");
  assert.equal(portfolio.keyRisks[0]?.description, "iTrade API timing could delay release.");
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

test("Client Portal PDF builder returns a downloadable PDF buffer", () => {
  const portfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [{ latestClientUpdate: clientUpdate, program }]
  });
  const pdf = buildClientPortalPdf({
    clientName: "Impower",
    generatedAt: portfolio.generatedAt,
    portfolio,
    programs: portfolio.programs,
    scope: "program",
    selectedProgram: portfolio.programs[0],
    viewerLabel: "Codex QA"
  });

  assert.equal(pdf.subarray(0, 5).toString("utf8"), "%PDF-");
  const pdfSource = pdf.toString("latin1");
  assert.match(pdfSource, /EXECUTIVE SUMMARY/);
  assert.match(pdfSource, /Compliance Hub Roadmap/);
  assert.match(pdfSource, /Recent Accomplishments/);
  assert.match(pdfSource, /Upcoming Work/);
  assert.doesNotMatch(pdfSource, /Report Basis/i);
  assert.doesNotMatch(pdfSource, /Internal role updates/i);
  assert.doesNotMatch(pdfSource, /tactical notes/i);
  const colorCommands = [...pdfSource.matchAll(/\b(\d*\.?\d+)\s+(\d*\.?\d+)\s+(\d*\.?\d+)\s+(?:rg|RG)\b/g)];
  assert.ok(colorCommands.length > 0);
  for (const command of colorCommands) {
    const values = command.slice(1, 4).map(Number);
    assert.ok(
      values.every((value) => value >= 0 && value <= 1),
      `PDF color command must use normalized RGB values: ${command[0]}`
    );
  }
  assert.equal(
    clientPortalPdfFilename({ clientName: "Impower", scope: "portfolio" }),
    "impower-portfolio.pdf"
  );
});

test("buildClientPortalPortfolio separates programs into client portfolios", () => {
  const secondProgram: StoredProgram = {
    ...program,
    id: "data-platform",
    intake: {
      ...program.intake,
      clientName: "Acme",
      programName: "Data Platform",
      programOwner: "Data Lead"
    }
  };
  const secondUpdate: StoredProgramUpdate = {
    ...update,
    id: "update-2",
    programId: "data-platform",
    programName: "Data Platform",
    review: {
      ...update.review,
      programName: "Data Platform",
      deliveryHealth: "On track",
      activeRisks: "",
      decisionsPending: "",
      programCompletionPercent: "40"
    }
  };

  const portfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [
      { latestClientUpdate: clientUpdate, program },
      { latestClientUpdate: clientPortalUpdateFromStoredUpdate(secondUpdate), program: secondProgram }
    ]
  });

  assert.deepEqual(portfolio.clients.map((client) => client.clientName), ["Acme", "Impower"]);
  assert.deepEqual(portfolio.clients.find((client) => client.clientName === "Acme")?.programIds, ["data-platform"]);
  assert.deepEqual(portfolio.clients.find((client) => client.clientName === "Impower")?.programIds, ["compliance-hub"]);
  assert.equal(portfolio.clients.find((client) => client.clientName === "Acme")?.metrics.totalPrograms, 1);
  assert.equal(portfolio.clients.find((client) => client.clientName === "Impower")?.metrics.atRisk, 1);
});

test("Client Portal completion prefers program schedule over manual percent when client roadmap is absent", () => {
  const scheduledUpdate: StoredProgramUpdate = {
    ...update,
    updatedAt: "2026-04-11T00:00:00.000Z",
    review: {
      ...update.review,
      programCompletionPercent: "99",
      programStartDate: "2026-04-01",
      programTargetFinishDate: "2026-04-21"
    }
  };

  const portalProgram = buildClientPortalProgram({
    generatedAt: "2026-04-11T00:00:00.000Z",
    latestClientUpdate: clientPortalUpdateFromStoredUpdate(scheduledUpdate),
    program
  });
  const portfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-11T00:00:00.000Z",
    programs: [{ latestClientUpdate: clientPortalUpdateFromStoredUpdate(scheduledUpdate), program }]
  });

  assert.equal(portalProgram.metrics.programCompletionPercent, 50);
  assert.equal(portalProgram.metrics.completionBasis, "Schedule");
  assert.equal(portalProgram.metrics.completionScheduleLabel, "Apr 01 -> Apr 21");
  assert.equal(portfolio.metrics.averageCompletionPercent, 50);
});

test("Client Portal completion falls back to phase estimate when schedule and manual percent are missing", () => {
  const phaseOnlyUpdate: StoredProgramUpdate = {
    ...update,
    review: {
      ...update.review,
      currentPhase: "Build update",
      programCompletionPercent: "",
      programStartDate: "",
      programTargetFinishDate: ""
    }
  };

  const portalProgram = buildClientPortalProgram({
    latestClientUpdate: clientPortalUpdateFromStoredUpdate(phaseOnlyUpdate),
    program
  });

  assert.equal(portalProgram.metrics.completionBasis, "Phase estimate");
  assert.equal(portalProgram.metrics.programCompletionPercent, 66);
  assert.equal(portalProgram.metrics.completionScheduleLabel, "Add start and target finish dates");
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
    programs: [{ latestClientUpdate: clientPortalUpdateFromStoredUpdate(buildUpdate), program }]
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

  const monthProgram = buildClientPortalProgram({
    latestClientUpdate: clientPortalUpdateFromStoredUpdate(monthUpdate),
    program
  });
  const weekProgram = buildClientPortalProgram({
    latestClientUpdate: clientPortalUpdateFromStoredUpdate(weekUpdate),
    program
  });

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
    programs: [{ latestClientUpdate: clientPortalUpdateFromStoredUpdate(monthUpdate), program }]
  });
  const weekPortfolio = buildClientPortalPortfolio({
    generatedAt: "2026-04-30T00:00:00.000Z",
    programs: [{ latestClientUpdate: clientPortalUpdateFromStoredUpdate(weekUpdate), program }]
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
