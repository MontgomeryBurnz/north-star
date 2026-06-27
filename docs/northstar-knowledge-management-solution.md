# NorthStar Knowledge Management Solution

## Purpose

NorthStar needs an evergreen knowledge-management layer so users can learn the application as it evolves. The long-term goal is an in-app help and training portal that explains current functionality, role-specific workflows, release changes, examples, and governance rules without relying on static tribal knowledge.

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

Add an in-app Knowledge Center that is accessible from Quick Start and the global navigation footer or help control.

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

The first implementation should treat repository documentation as the source of truth:

- `docs/northstar-team-user-guide.md`
- `docs/northstar-executive-demo-guide.md`
- `docs/northstar-project-map.md`
- `docs/northstar-release-checklist.md`
- release commits, smoke tests, and audit-event taxonomy

The app can render curated versions of these docs inside the product later. For now, keeping them in the repo makes the docs reviewable, versioned, and tied to code changes.

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

- Select program and role.
- Load recommended artifact brief.
- Request custom artifact.
- Generate, iterate, export, and version artifacts.

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

- Add `/knowledge` route.
- Add searchable article index.
- Add role-based article filters.
- Render curated markdown content from repo-backed content files.
- Add "last updated" and "applies to version" metadata.

### Phase 3: AI-Assisted Documentation Refresh

- Add an Admin-only "Review documentation drift" action.
- Compare current docs to recent changed files and release notes.
- Generate draft documentation updates.
- Require human approval.
- Audit published documentation changes.

### Phase 4: Interactive Training

- Add guided walkthroughs for core workflows.
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

Build a first-pass `/knowledge` route that renders a polished, searchable Knowledge Center from repo-backed markdown content. Keep it read-only at first. Then add Admin review workflows and AI-assisted refresh once the content model is stable.
