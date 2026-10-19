# NorthStar Knowledge Management Solution

Last updated: October 18, 2026

## Purpose

NorthStar's Knowledge Center renders repository-backed guides so users can learn the application as it evolves. The long-term goal is to keep that content current through a governed update workflow that explains functionality, role-specific workflows, release changes, examples, and governance rules.

## Product Intent

The knowledge-management solution should answer:

- What can I do in NorthStar?
- Which module should I use for my job?
- What changed since the last release?
- How do I complete a specific workflow?
- Which inputs feed Guided Plans, Studio, Client Portal, Leadership, and Admin?
- Which content is internal-only versus client-facing?
- How do role assignments shape what I see?
- How do I know whether guidance, exports, or client updates are trustworthy?

## Target Experience

The current in-app Knowledge Center provides searchable, audience-filtered guides from repository documentation. Expand this foundation as the application evolves.

The Knowledge Center should include:

- Searchable user guide.
- Role-based learning paths.
- Module-by-module how-to articles.
- Short workflow checklists.
- Examples of strong inputs and weak inputs.
- Client-safe communication guidance.
- Release notes.
- Admin trust and operations guidance.
- Troubleshooting.
- Glossary.
- Links to downloadable PDF/DOCX guides when needed.

## Role-Based Learning Paths

| Role | Knowledge path |
|---|---|
| Team Member | Update role signal, manage delivery cards, attach evidence, review role guidance, generate role artifacts. |
| Delivery Lead | Set up programs, manage active programs, curate client updates, review guidance, coordinate team execution. |
| Leadership | Review program posture, provide sponsor guidance, understand what changed, monitor risks and decisions. |
| Client | Review portfolio dashboard, inspect program detail, download executive PDF updates, add decisions when enabled. |
| Admin | Manage users, role assignments, audit history, cost, model settings, integrations, trust controls, and documentation freshness. |

## Source of Truth

The implementation treats repository documentation as the source of truth:

- `docs/northstar-team-user-guide.md`
- `docs/northstar-executive-demo-guide.md`
- `docs/northstar-project-map.md`
- `docs/northstar-release-checklist.md`
- release commits, smoke tests, and audit-event taxonomy

The app renders curated versions of these docs inside Knowledge Center. Keeping them in the repo makes the docs reviewable, versioned, and tied to code changes.

### Current Release Coverage

Guides must describe **Explore with sample data** as an exploration mode across the ordinary Program Hub, Guided Plans, Studio, Leadership, Client Updates, and Client Portal screens. There is no separate Sample navigation tab. The banner identifies the fictional scenario and provides **Reset sample** and **Exit sample data** controls. Document the difference between browser-session sample program edits and Studio's temporary page workspace.

Studio documentation must cover standalone source intake, desired deliverables, editable Word/Excel/PowerPoint downloads, Markdown copy/export, evidence and readiness review, feedback-driven revisions, and restoration of prior outputs. Explain optional public research: users supply a generic public topic, research citations are displayed when available, and private uploaded source text is used for synthesis rather than web-search queries. Quality labels must distinguish prepared examples, OpenAI-generated results, and provisional local drafts. Users should download outputs before refreshing or leaving Studio.

## Evergreen Content Workflow

NorthStar should eventually refresh knowledge content through a governed cycle:

1. Detect product changes from merged commits, release notes, route/component diffs, tests, and audit-event changes.
2. Identify impacted knowledge topics.
3. Draft documentation updates with an AI-assisted summarization workflow.
4. Require Admin or product-owner review before publishing.
5. Publish updated in-app articles and downloadable guides.
6. Write an audit event showing what documentation changed, who approved it, and which release it maps to.

## AI-Assisted Refresh Model

The OpenAI integration should not directly publish training content without review. It should create draft updates that a human approves.

Recommended workflow:

- Input: release diff, changed routes/components, smoke-test changes, release checklist, current docs.
- Output: proposed article changes, new workflow steps, updated screenshots needed, release note summary, stale-doc warnings.
- Reviewer: Admin or product owner.
- Publish target: Knowledge Center articles and downloadable user guide.

## Content Governance Rules

Knowledge content must be:

- accurate to production behavior
- written in plain language
- role-aware
- concise by default with drill-down detail
- clear about client-facing versus internal-only workflows
- explicit about what is automated versus human-reviewed
- versioned and auditable

Knowledge content must not:

- expose secrets, API keys, private credentials, or implementation internals that users do not need
- imply AI output is final without human review where governance is required
- tell client users about internal-only tactical workflows
- document deprecated features as active functionality

## Initial Information Architecture

### Start Here

- What NorthStar is.
- Where people, intelligence, and data move as one.
- Which module to use first.
- Common user journeys.
- Explore a connected fictional program in the normal screens, reset the example, and exit to the normal workspace.

### Program Hub

- Set up a new program.
- Manage active programs.
- Configure client, portfolio, timeline, milestones, team footprint, and role owners.
- Submit role updates.
- Manage delivery board cards.
- Attach evidence.
- Publish client-facing updates.

### Guided Plans

- Select a program.
- Understand program-level guidance.
- Review role-specific Team Action Plans.
- Inspect inputs used.
- Flag guidance.

### Studio

- Start a standalone workspace and add a multi-format discovery package without selecting an active program.
- Synthesize capabilities, pain points, business rules, assumptions, and source coverage.
- Identify and resolve delivery-readiness gaps.
- Generate a traceable roadmap, backlog, acceptance criteria, and test package for export.
- Choose deliverables and editable Word, Excel, PowerPoint, or Markdown output before analysis and download.
- Inspect the provider, evidence-review findings, source references, test steps, and readiness warnings.
- Opt into public research with a generic topic and review its citations or availability notice.
- Request corrections or updates with targeted feedback, compare revisions, and restore earlier outputs.
- Explain that sources, outputs, and revisions are temporary and must be downloaded before leaving or refreshing the Studio page.

### Client Portal

- Review portfolio dashboard.
- Review program detail.
- Understand progress basis.
- Download PDF update.
- Keep client-facing content safe and executive-level.

### Leadership

- Review program posture.
- Submit leadership feedback.
- Understand how feedback affects guidance.

### Admin

- Invite users.
- Assign user types and program roles.
- Review audit history.
- Govern flags.
- Manage model settings.
- Monitor cost and platform health.
- Review documentation freshness.

## Product Backlog

### Phase 1: Documentation Foundation

- Keep source docs current in `/docs`.
- Add release checklist items that require documentation review for user-facing changes.
- Add a short "docs updated" note to pull requests or release notes.

### Phase 2: In-App Knowledge Center

- Maintain the existing `/knowledge` route, searchable article index, and audience filters.
- Keep the rendered repository-backed content aligned with released workflows.
- Expand "last updated" and "applies to version" metadata.

### Phase 3: AI-Assisted Documentation Refresh

- Add an Admin-only "Review documentation drift" action.
- Compare current docs to recent changed files and release notes.
- Generate draft documentation updates.
- Require human approval.
- Audit published documentation changes.

### Phase 4: Interactive Training

- Expand the connected sample-data exploration mode with guided walkthroughs for core workflows.
- Add short role-specific training checklists.
- Add example inputs and sample outputs.
- Add "show me where this is in the app" deep links.

## Quality Checks

Every major product change should answer:

- Did a user-facing label, workflow, module, route, or permission model change?
- Did a client-facing workflow change?
- Did a role-specific behavior change?
- Did an Admin trust, cost, audit, or settings workflow change?
- Does the user guide need an update?
- Does the executive review need an update?
- Does the release checklist need an update?
- Does a smoke test need to cover the change?

## Recommended Next Build

Keep the existing read-only Knowledge Center aligned with releases, including connected sample exploration and the current Studio workflow. Add Admin review workflows and AI-assisted refresh once documentation-drift detection and publication controls are ready.
