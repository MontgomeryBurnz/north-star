# NorthStar Project Map

NorthStar is the product workspace for the app hosted at `https://www.north-star.live`.

## Codebase

- Repo: `MontgomeryBurnz/north-star`
- Local workspace: this repository
- Framework: Next.js App Router, React, Tailwind CSS
- Core modules:
  - `src/components`: product surfaces and shared UI
  - `src/app/api`: server routes for auth, programs, guidance, Studio, Admin, and cost center data
  - `src/lib`: persistence, OpenAI providers, Supabase auth, email delivery, artifact generation, and program intelligence
  - `scripts`: browser smoke tests, QA user provisioning, profiling, and security checks

## Vercel

- Project: `north-star`
- Production domain: `www.north-star.live`
- Production branch: `main`
- Key env groups:
  - app URLs and canonical redirects
  - Supabase connection keys
  - OpenAI keys and model config
  - Resend email delivery
  - Vercel metrics and cost-center API keys

## Supabase

- Used for managed user authentication, Postgres persistence, and artifact storage.
- Primary public app tables include programs, updates, guided plans, leadership feedback, role artifacts, usage records, and managed users.
- RLS is expected to stay enabled for public tables; app data access should go through server routes and service-role server code only.

## OpenAI

- Used behind provider boundaries for guided-plan synthesis, artifact generation, leadership interpretation, and usage tracking.
- Studio uses evidence review followed by product synthesis, with source references, structural checks, feedback revisions, and optional public research from a user-supplied generic topic.
- Model/cost settings live in environment variables and are surfaced in Admin cost-center views.
- Prompt-cache and usage tracking are program/workflow scoped so Admin can reconcile spend and cache posture.

## Resend

- Used for branded invite and recovery emails from the verified `north-star.live` sending domain.
- Email templates live in `src/lib/north-star-auth-emails.ts`.
- Delivery status is surfaced in Admin so testers can see whether branded delivery is active.

## QA

- `npm run qa:ensure-user` creates or refreshes the Codex production QA account and stores smoke-test credentials in ignored `.env.local`.
- `SMOKE_BASE_URL=https://www.north-star.live npm run smoke:studio` runs the authenticated Studio flow:
  - sign in
  - verify the standalone workspace renders without an active-program selector
  - verify the multi-format source workspace
  - verify discovery analysis waits for readable evidence
  - verify selected deliverables and Word/Excel/PowerPoint/Markdown format controls
  - load the fictional discovery package and verify preview selection, source references, test steps, feedback, and revision controls
  - verify public research starts off and Start fresh clears the Studio workspace
- `SMOKE_BASE_URL=https://www.north-star.live npm run smoke:slicers` validates program slicers across key product surfaces.
- `SMOKE_BASE_URL=https://www.north-star.live npm run smoke:client-portal` signs in with the QA user, seeds a tagged active-program update, opens `/client`, verifies the executive portfolio/detail fields render from that update, captures desktop/mobile screenshots, and prunes the seeded record.
- `SMOKE_BASE_URL=https://www.north-star.live npm run smoke:production` runs the standard post-deploy production smoke bundle.
- The production bundle includes Admin Trust & Operations coverage by verifying that the documentation freshness panel renders after deploy.
- Release verification is documented in `docs/northstar-release-checklist.md`.

## Knowledge Management

- Executive application review and demo narrative: `docs/northstar-executive-demo-guide.md`
- User guide and training manual source: `docs/northstar-team-user-guide.md`
- Evergreen knowledge-management blueprint: `docs/northstar-knowledge-management-solution.md`
- Release documentation gate: `docs/northstar-release-checklist.md`

The in-app Knowledge Center renders searchable, audience-filtered guidance from repository-backed content. The next step is AI-assisted draft updates and Admin approval to keep training material current as NorthStar evolves.

## Sample Data and Studio Workspaces

- Explore with sample data uses the ordinary application screens and a connected fictional program; Reset sample and Exit sample data control the browser-session example.
- Studio accepts discovery sources without an active program and exports selected product deliverables as editable Office files or Markdown.
- Studio sources, outputs, and revision history remain only in the open page workspace. They are not persisted to program records and should be downloaded before refreshing or navigating away.

## Codex Organization

Use a Codex project named `NorthStar` for future work so implementation threads, test notes, deployment tasks, and product decisions stay grouped around the product. The GitHub repo remains the source of truth for code.
