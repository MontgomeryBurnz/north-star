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
    { label: "Build-ready stories", value: "03", detail: "With acceptance criteria and tests" },
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
    extractedText: `FICTIONAL TRAINING DOCUMENT — Current-state capability assessment.
Civic Services Network operates 12 regional offices. Its service coordinators receive resident requests through email, shared inboxes, and local spreadsheets. A regional coordinator manually checks completeness, categorizes each request, and asks a regional service manager to assign a service team. Residents must call or email to learn status.
Capability gaps: intake has no common required fields; service categories vary by region; reassignment has no recorded reason; approvals are stored in email; leaders cannot compare request aging consistently. Duplicate entry occurs when email details move into regional spreadsheets.
Target capabilities: category-aware guided intake; regional and category routing; privacy classification and access controls; approvals with rationale; requester status notifications; reporting on volume, aging, reassignment, and service-level risk. Each request needs a unique reference and an accountable owner throughout its lifecycle.
Primary users are resident service coordinators, regional coordinators, regional service managers, compliance administrators, and executive operations leaders. Residents submit through a coordinator during the pilot; a public self-service portal is a later proposal.
The pilot will cover three regions. Required pilot categories and their SLA targets are an open decision. Existing enterprise identity and notification services are candidate dependencies requiring technical validation. Offline entry is not required for the pilot; field demand should be reassessed after pilot feedback.`
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
    extractedText: `FICTIONAL TRAINING WORKBOOK — Request volume and aging, eight-week baseline.
Measure | Current baseline | Target or decision
Regional offices | 12 | Pilot 3 before scale-up
Median request-to-assignment time | 3.8 calendar days | Under 4 business hours; business calendar needs confirmation
Requests reassigned after initial routing | 27% | Proposed target below 10%; product owner to confirm
Requests missing a required detail at triage | 31% | Proposed target below 5%; product owner to confirm
Four highest-volume candidate categories | Facilities access, records request, service correction, general inquiry | Operations council must approve pilot selection and per-category SLA
Known limitations: local trackers use different status labels, some have no assignment timestamp, and the baseline excludes abandoned email threads. Do not infer a verified cost saving from this dataset.
The management dashboard should show volume, unassigned requests, aging buckets, reassignment rate, and cases that reach 80% of the applicable SLA. Report definitions need consistent time zones, pause rules, and working-day calendars before rollout.`
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
    extractedText: `FICTIONAL TRAINING PRESENTATION — Service modernization vision.
Vision: one transparent service-request journey with measurable ownership and outcomes across all 12 regional offices.
Business outcomes: reduce assignment delay from 3.8 days to under four business hours; establish a single auditable approval path; give leaders a timely view of demand, aging, and service-level risk. Outcomes are targets, not achieved results.
Delivery approach: definition and operating-model decisions first; configure and prove a three-region pilot next; expand to 12 regions after an outcome review. Pilot work should prioritize category-aware intake, protected sensitive requests, basic routing, and auditable exceptions. Cross-region reporting follows once categories and metric definitions are stable.
Indicative planning windows: 0–30 days validate blueprint and policy, 31–60 days pilot configuration and validation, 61–120 days assess scale-up. These are planning horizons, not committed release dates.
Executive sponsor owns exception-approval policy. Operations council owns pilot category scope and service-level targets. Regional managers validate team ownership rules. Engineering validates identity, notifications, data retention, and deployment controls.
Success review should compare measured pilot assignment time, reassignment, incomplete requests, and requester satisfaction against confirmed baselines. No budget, implementation estimate, or system vendor has been approved.`
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
    extractedText: `FICTIONAL TRAINING POLICY — Approval and privacy rules, draft for pilot validation.
All requests have a regional owner and a service category. Sensitive requests may be viewed only by assigned service staff and authorized compliance approvers. Requests must not expose resident personal details in dashboard summaries or notification subject lines.
An approval, rejection, reassignment, or policy exception requires an immutable audit event with the actor, timestamp, prior state, new state, and rationale. Approval and rejection require a non-empty explanation. Unauthorized users cannot execute approval actions. A user cannot approve their own policy exception.
Audit history retention is seven years. The applicable policy for deletion of request content, legal holds, encryption, and access-review frequency is not yet confirmed and must be raised as discovery gaps.
Service-level intervention: alert when a request reaches 80% of its applicable SLA. Exact per-category SLA, business calendar, pause/resume behavior, and escalation owner require decisions.
Exception approver differs across current regional procedures. The proposed pilot design uses one compliance administrator, but the executive sponsor has not approved cross-region approval authority. Do not treat that proposal as a settled business rule.`
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
    extractedText: `FICTIONAL TRAINING DATASET — Frontline pain-point inventory.
ID,Persona,Pain point,Frequency,Impact,Desired change
PP01,Service coordinator,Re-enter email details in spreadsheet,Daily,High,One intake record with mandatory information
PP02,Regional coordinator,Unknown responsible team,Daily,High,Routing by region and common service category
PP03,Requester,No visible status,Weekly,Medium,Reference number and status notification
PP04,Service manager,Repeated reassignment without reason,Daily,High,Reason-coded assignment history and exception queue
PP05,Operations leader,Incomparable aging by region,Weekly,High,Shared metric definitions and portfolio dashboard
PP06,Compliance administrator,Approvals scattered across email,Weekly,High,Authorized decision with rationale and immutable history
PP07,Service coordinator,Sensitive details copied into general updates,Weekly,High,Privacy classification and restricted views
Pain points indicate needs, not validated solution requirements. Confirm accessibility needs with frontline users, including keyboard navigation, clear validation messages, and screen-reader support. Notification channel preference, delivery failure handling, and request cancellation rules are not documented.`
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
    extractedText: `FICTIONAL TRAINING NOTES — Discovery workshop.
Attendees: product owner, regional managers, service coordinators, compliance representative, engineering lead, and operations sponsor.
Agreed: begin with a three-region pilot; give each request a reference, category, regional owner, status, and history. Required-field validation should explain how to correct an incomplete request. Unmatched routing rules should create a coordinator exception, not silently discard the request. Reassignments need a reason.
Proposed: four high-volume categories. Candidate categories are facilities access, records request, service correction, and general inquiry. Operations council will confirm the categories and SLA targets. Product owner will confirm measurable pilot exit thresholds.
Open decision: whether one compliance administrator can approve exceptions across all three pilot regions. Sponsor confirmation is required before the governed approval story is committed.
Open technical questions: identity roles and integration interfaces, data model and migration boundary, notification retry strategy, dashboard refresh interval, performance target, accessibility acceptance standard, and retention/deletion interaction. Do not invent values for these.
Scope: offline intake is excluded from the pilot based on current workshop preference; validate with field users before broader rollout. Public resident self-service and historical data migration are proposals for later assessment.
Next actions: reconcile categories, confirm accountable exception approver, validate a representative request journey with frontline users, and obtain engineering estimates after the critical gaps are closed.`
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
          id: "TC-06",
          title: "Record an authorized approval with rationale",
          type: "happy-path",
          steps: ["Sign in as the authorized compliance approver", "Open an exception raised by another user", "Enter a rationale and approve"],
          expectedResult: "The exception is approved and an immutable audit event records actor, decision, rationale, and timestamp."
        },
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
    },
    {
      id: "US-04", epicId: "EPIC-01", featureId: "FEAT-02", title: "Protect sensitive request details",
      story: "As a service manager, I want sensitive requests restricted to assigned staff and compliance approvers so that resident information is protected.",
      acceptanceCriteria: ["A request marked sensitive is visible only to its assigned staff and authorized compliance approvers", "General dashboard summaries and notification subject lines omit resident personal details", "An unauthorized attempt to access a sensitive request returns an access-denied result without revealing its content"],
      testCases: [
        { id: "TC-07", title: "Assigned staff view a sensitive request", type: "happy-path", steps: ["Mark a request sensitive", "Assign a service team", "Open it as an assigned team member"], expectedResult: "The assigned team member can view the request and its privacy classification." },
        { id: "TC-08", title: "Unassigned staff cannot read sensitive content", type: "negative", steps: ["Sign in as an unassigned service team member", "Attempt to open the sensitive request URL"], expectedResult: "Access is denied and the request details are not returned." }
      ], sourceIds: ["sample-policy", "sample-pain-points"], readiness: "ready"
    },
    {
      id: "US-05", epicId: "EPIC-03", featureId: "FEAT-05", title: "Flag requests approaching their service-level target",
      story: "As an operations leader, I want requests flagged at 80% of their applicable SLA so that I can intervene before a commitment is missed.",
      acceptanceCriteria: ["A request with a configured applicable SLA is flagged when elapsed service time reaches 80% of that target", "The intervention view displays the reference, region, category, current owner, elapsed time, and applicable target", "Requests with no configured SLA are visibly marked as missing configuration rather than assigned an invented target"],
      testCases: [
        { id: "TC-09", title: "Flag a request at the threshold", type: "happy-path", steps: ["Configure a test category SLA", "Advance a request to 80% of that target using the configured calendar", "Refresh the intervention view"], expectedResult: "The request appears with the correct target, elapsed time, and accountable owner." },
        { id: "TC-10", title: "Handle missing service-level configuration", type: "edge", steps: ["Create a request in a category without a configured SLA", "Open the intervention view"], expectedResult: "The request shows a configuration gap and no fabricated SLA percentage." }
      ], sourceIds: ["sample-policy", "sample-volume-analysis", "sample-vision-deck"], readiness: "needs-input"
    }
  ],
  readinessScore: 82,
  readinessNarrative:
    "The product boundary, primary journey, first-release capabilities, and measurable outcomes are defined. Engineering can refine intake, routing, and reporting now. The approval story should remain uncommitted until leadership names the pilot exception owner.",
  sourceCount: 6,
  generatedAt: "2026-05-04T14:30:00.000Z",
  provider: "local",
  sources: sampleDiscoverySources.map((source) => ({ id: source.id, name: source.name, coverage: "complete", characters: source.extractedText?.length ?? 0 })),
  revision: { number: 1, summary: "Prepared fictional example for exploring the connected North Star workflow." }
};
