import type { DiscoverySynthesis } from "@/lib/discovery-studio-types";
import type { ProgramArtifact } from "@/lib/program-intake-types";

export const sampleProgramSlug = "regional-service-modernization";

export const sampleProgram = {
  name: "Regional Service Request Modernization",
  client: "Civic Services Network",
  phase: "Definition and pilot planning",
  health: "Needs decision",
  progress: 42,
  vision:
    "Give regional service teams one trusted way to receive, route, approve, and measure resident requests without spreadsheets or email handoffs.",
  outcomes: [
    "Reduce request-to-assignment time from 3.8 days to under 4 hours",
    "Create one auditable approval path across 12 regional offices",
    "Give leaders a live view of demand, aging, and service-level risk"
  ],
  metrics: [
    { label: "Discovery sources", value: "06", detail: "Word, Excel, PowerPoint, PDF, CSV, notes" },
    { label: "Capabilities", value: "05", detail: "Synthesized from the evidence package" },
    { label: "Build-ready stories", value: "02", detail: "With acceptance criteria and tests" },
    { label: "Open decisions", value: "02", detail: "Routed to accountable leaders" }
  ],
  milestones: [
    { date: "May 04", title: "Discovery package synthesized", status: "complete" },
    { date: "May 11", title: "Operating model decisions closed", status: "current" },
    { date: "Jun 01", title: "Regional intake pilot begins", status: "next" },
    { date: "Jul 13", title: "Twelve-region rollout decision", status: "next" }
  ],
  risks: [
    {
      level: "High",
      title: "Approval ownership varies by region",
      response: "Sponsor decision requested on the common approval policy before pilot configuration."
    },
    {
      level: "Medium",
      title: "Historical request categories are inconsistent",
      response: "Map the top 20 categories first; retain a governed ‘other’ path for the pilot."
    }
  ],
  decisions: [
    {
      owner: "Executive sponsor",
      due: "May 11",
      question: "Can one compliance administrator approve exceptions for all pilot regions?",
      impact: "Unblocks workflow configuration and three stories."
    },
    {
      owner: "Operations council",
      due: "May 14",
      question: "Which four service categories belong in the first pilot?",
      impact: "Confirms the first release boundary and success measures."
    }
  ],
  clientUpdate: {
    headline: "Pilot definition is on track; two operating decisions remain.",
    narrative:
      "The team converted six discovery sources into a sequenced product plan and validated the primary request journey. Pilot scope, measurable outcomes, and the initial backlog are ready. Leadership decisions on approval ownership and service-category scope are the only material gates to configuration.",
    next: "Close the two operating decisions, confirm pilot regions, and begin workflow configuration."
  }
} as const;

export const sampleDiscoverySources: ProgramArtifact[] = [
  {
    id: "sample-capability-assessment",
    name: "Current-State-Capability-Assessment.docx",
    size: 182400,
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    lastModified: Date.UTC(2026, 3, 28),
    fileFormat: "docx",
    artifactType: "requirements",
    sourceQuality: "narrative",
    analysisPriority: "high",
    sourceKind: "text",
    extractionStatus: "extracted",
    extractionMethod: "server-parser",
    extractionSummary: "Current-state capabilities, handoffs, and regional variation extracted.",
    extractedText: "Regional service intake is split across email, shared inboxes, and local spreadsheets."
  },
  {
    id: "sample-volume-analysis",
    name: "Request-Volume-and-Aging.xlsx",
    size: 96400,
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    lastModified: Date.UTC(2026, 3, 29),
    fileFormat: "xlsx",
    artifactType: "status-report",
    sourceQuality: "structured",
    analysisPriority: "high",
    sourceKind: "text",
    extractionStatus: "extracted",
    extractionMethod: "server-parser",
    extractionSummary: "Volume, aging, reassignment, and SLA data extracted across 12 regions.",
    extractedText: "Median assignment time is 3.8 days. Twenty-seven percent of requests are reassigned."
  },
  {
    id: "sample-vision-deck",
    name: "Service-Modernization-Vision.pptx",
    size: 1462000,
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    lastModified: Date.UTC(2026, 3, 30),
    fileFormat: "pptx",
    artifactType: "strategy-deck",
    sourceQuality: "presentation",
    analysisPriority: "high",
    sourceKind: "text",
    extractionStatus: "extracted",
    extractionMethod: "server-parser",
    extractionSummary: "Target experience, business outcomes, and executive success measures extracted.",
    extractedText: "Create one transparent service-request journey with measurable ownership and outcomes."
  },
  {
    id: "sample-policy",
    name: "Approval-and-Privacy-Rules.pdf",
    size: 384000,
    type: "application/pdf",
    lastModified: Date.UTC(2026, 4, 1),
    fileFormat: "pdf",
    artifactType: "requirements",
    sourceQuality: "narrative",
    analysisPriority: "high",
    sourceKind: "text",
    extractionStatus: "extracted",
    extractionMethod: "server-parser",
    extractionSummary: "Approval thresholds, privacy controls, and retention rules extracted.",
    extractedText: "Sensitive requests require role-based access, an approval event, and seven-year audit retention."
  },
  {
    id: "sample-pain-points",
    name: "Frontline-Pain-Points.csv",
    size: 28900,
    type: "text/csv",
    lastModified: Date.UTC(2026, 4, 1),
    fileFormat: "csv",
    artifactType: "requirements",
    sourceQuality: "structured",
    analysisPriority: "medium",
    sourceKind: "text",
    extractionStatus: "extracted",
    extractionMethod: "server-parser",
    extractionSummary: "Frequency and impact of 34 frontline pain points extracted.",
    extractedText: "Top pain points are duplicate entry, unclear ownership, missing status, and inconsistent categories."
  },
  {
    id: "sample-workshop-notes",
    name: "Discovery-Workshop-Notes.md",
    size: 18400,
    type: "text/markdown",
    lastModified: Date.UTC(2026, 4, 2),
    fileFormat: "md",
    artifactType: "meeting-notes",
    sourceQuality: "raw-notes",
    analysisPriority: "medium",
    sourceKind: "text",
    extractionStatus: "extracted",
    extractionMethod: "browser-text",
    extractionSummary: "Stakeholder assumptions, unresolved questions, and candidate pilot scope extracted.",
    extractedText: "Pilot four categories in three regions. Approval ownership and offline needs remain open."
  }
];

export const sampleDiscoverySynthesis: DiscoverySynthesis = {
  executiveSummary:
    "Civic Services Network needs a single service-request operating layer that standardizes intake, routes work by region and category, preserves approval evidence, and exposes aging before service levels are missed. The evidence strongly supports a focused three-region pilot, while two policy decisions should be closed before engineering commits to the final workflow.",
  evidenceSummary:
    "Six sources were reconciled across operating model, volume, target-state, policy, frontline experience, and workshop evidence. Quantitative signals support the prioritization: assignment averages 3.8 days, 27% of requests are reassigned, and leaders cannot compare aging consistently across regions.",
  capabilities: [
    "Guided request intake with required information by service category",
    "Rules-based routing by region, category, urgency, and workload",
    "Role-based approval with immutable decision history",
    "Status notifications and clear ownership for requesters and teams",
    "Portfolio reporting for volume, aging, reassignment, and SLA risk"
  ],
  painPoints: [
    "Request data is re-entered between email, spreadsheets, and local trackers",
    "Ownership is unclear until a regional coordinator manually triages each request",
    "Requesters cannot see status without contacting the service team",
    "Regional category differences prevent comparable performance reporting"
  ],
  businessRules: [
    "Sensitive requests must be visible only to assigned staff and compliance approvers",
    "Every approval, rejection, reassignment, and exception requires a timestamped audit event",
    "Requests approaching 80% of the service-level target must be flagged for intervention",
    "Audit history must be retained for seven years"
  ],
  assumptions: [
    "The pilot will cover three regions and four high-volume service categories",
    "Existing identity and notification services can support the pilot",
    "Offline request entry is out of scope until field demand is validated"
  ],
  gaps: [
    {
      id: "GAP-01",
      title: "Exception approval owner",
      description: "The sources describe different regional approvers but do not identify one accountable pilot role.",
      severity: "blocking",
      question: "Can one compliance administrator approve exceptions for all pilot regions?",
      sourceIds: ["sample-capability-assessment", "sample-policy", "sample-workshop-notes"]
    },
    {
      id: "GAP-02",
      title: "Pilot category boundary",
      description: "Four categories are proposed, but the selected categories and their individual SLA targets are not confirmed.",
      severity: "important",
      question: "Which four service categories belong in the pilot, and what SLA applies to each?",
      sourceIds: ["sample-volume-analysis", "sample-workshop-notes"]
    }
  ],
  roadmap: [
    {
      horizon: "Now · 0–30 days",
      title: "Close policy gaps and validate the service blueprint",
      outcome: "Confirmed pilot boundary, accountable approval model, and signed-off end-to-end journey.",
      featureIds: ["FEAT-01", "FEAT-02"],
      dependencies: ["GAP-01", "GAP-02"]
    },
    {
      horizon: "Next · 31–60 days",
      title: "Configure and prove the regional pilot",
      outcome: "Three regions can submit, route, approve, and track the selected request types.",
      featureIds: ["FEAT-03", "FEAT-04"],
      dependencies: ["Identity integration", "Notification service"]
    },
    {
      horizon: "Later · 61–120 days",
      title: "Scale the operating model and insight layer",
      outcome: "Twelve regions use governed categories and leaders can intervene before service levels fail.",
      featureIds: ["FEAT-05"],
      dependencies: ["Pilot outcome review"]
    }
  ],
  epics: [
    {
      id: "EPIC-01",
      title: "Trusted request intake",
      objective: "Capture complete, consistent demand without duplicate entry.",
      featureIds: ["FEAT-01", "FEAT-02"],
      sourceIds: ["sample-capability-assessment", "sample-pain-points", "sample-policy"]
    },
    {
      id: "EPIC-02",
      title: "Accountable fulfillment",
      objective: "Route, approve, and track every request through a visible owner.",
      featureIds: ["FEAT-03", "FEAT-04"],
      sourceIds: ["sample-capability-assessment", "sample-policy", "sample-workshop-notes"]
    },
    {
      id: "EPIC-03",
      title: "Operational intelligence",
      objective: "Expose aging, service-level risk, and systemic bottlenecks across regions.",
      featureIds: ["FEAT-05"],
      sourceIds: ["sample-volume-analysis", "sample-vision-deck"]
    }
  ],
  features: [
    {
      id: "FEAT-01",
      epicId: "EPIC-01",
      title: "Category-aware intake",
      description: "Show the required questions and evidence for the selected service category.",
      outcome: "Requests arrive complete enough to route without follow-up.",
      priority: "must",
      sourceIds: ["sample-pain-points", "sample-policy"]
    },
    {
      id: "FEAT-02",
      epicId: "EPIC-01",
      title: "Privacy classification",
      description: "Classify sensitivity at submission and restrict access automatically.",
      outcome: "Sensitive information is protected from the first interaction.",
      priority: "must",
      sourceIds: ["sample-policy"]
    },
    {
      id: "FEAT-03",
      epicId: "EPIC-02",
      title: "Rules-based assignment",
      description: "Assign work using region, category, urgency, and available capacity.",
      outcome: "Most requests reach an accountable owner without coordinator triage.",
      priority: "must",
      sourceIds: ["sample-capability-assessment", "sample-volume-analysis"]
    },
    {
      id: "FEAT-04",
      epicId: "EPIC-02",
      title: "Governed approvals",
      description: "Route exceptions to an authorized approver and preserve the decision trail.",
      outcome: "Teams can prove who approved what and why.",
      priority: "must",
      sourceIds: ["sample-policy", "sample-workshop-notes"]
    },
    {
      id: "FEAT-05",
      epicId: "EPIC-03",
      title: "Service-level intervention view",
      description: "Highlight aging requests and forecast service-level misses by region.",
      outcome: "Leaders intervene before commitments fail.",
      priority: "should",
      sourceIds: ["sample-volume-analysis", "sample-vision-deck"]
    }
  ],
  stories: [
    {
      id: "US-01",
      epicId: "EPIC-01",
      featureId: "FEAT-01",
      title: "Collect category-specific request details",
      story: "As a resident service coordinator, I want the intake form to request the information required for the selected category so that work can begin without clarification.",
      acceptanceCriteria: [
        "Selecting a category displays its required questions before submission",
        "The requester cannot submit while a required answer or attachment is missing",
        "The submitted request preserves the category and answers in its audit history"
      ],
      testCases: [
        {
          id: "TC-01",
          title: "Submit a complete request",
          type: "happy-path",
          steps: ["Select a pilot category", "Complete required fields", "Submit"],
          expectedResult: "The request is created and receives a reference number."
        },
        {
          id: "TC-02",
          title: "Block an incomplete request",
          type: "negative",
          steps: ["Select a category", "Leave one required answer blank", "Submit"],
          expectedResult: "Submission is blocked and the missing answer is identified."
        }
      ],
      sourceIds: ["sample-pain-points", "sample-policy"],
      readiness: "ready"
    },
    {
      id: "US-02",
      epicId: "EPIC-02",
      featureId: "FEAT-03",
      title: "Assign a request automatically",
      story: "As a regional coordinator, I want eligible requests assigned by rules so that I only handle exceptions.",
      acceptanceCriteria: [
        "A request is evaluated against region, category, urgency, and active ownership rules",
        "The assigned owner and assignment reason are visible in the request history",
        "Requests that match no rule enter the coordinator exception queue"
      ],
      testCases: [
        {
          id: "TC-03",
          title: "Route a standard request",
          type: "happy-path",
          steps: ["Submit an eligible request", "Run assignment rules"],
          expectedResult: "The matching regional team owns the request and receives a notification."
        },
        {
          id: "TC-04",
          title: "Handle an unmatched request",
          type: "edge",
          steps: ["Submit a request with an unmapped category", "Run assignment rules"],
          expectedResult: "The request enters the exception queue without losing its submitted data."
        }
      ],
      sourceIds: ["sample-capability-assessment", "sample-volume-analysis"],
      readiness: "ready"
    },
    {
      id: "US-03",
      epicId: "EPIC-02",
      featureId: "FEAT-04",
      title: "Approve a policy exception",
      story: "As a compliance administrator, I want to approve or reject an exception with rationale so that the service team has an auditable decision.",
      acceptanceCriteria: [
        "Only an authorized approver can act on an exception",
        "Approval and rejection require a rationale",
        "The decision, actor, timestamp, and rationale are immutable audit events"
      ],
      testCases: [
        {
          id: "TC-05",
          title: "Reject unauthorized approval",
          type: "negative",
          steps: ["Sign in as a service team member", "Attempt to approve an exception"],
          expectedResult: "The action is denied and no decision event is written."
        }
      ],
      sourceIds: ["sample-policy", "sample-workshop-notes"],
      readiness: "needs-input"
    }
  ],
  readinessScore: 82,
  readinessNarrative:
    "The product boundary, primary journey, first-release capabilities, and measurable outcomes are defined. Engineering can refine intake, routing, and reporting now. The approval story should remain uncommitted until leadership names the pilot exception owner.",
  sourceCount: 6,
  generatedAt: "2026-05-04T14:30:00.000Z",
  provider: "local"
};
