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

- Used behind provider boundaries for guided-plan synthesis, role artifact recommendations, artifact generation, leadership interpretation, and usage tracking.
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
  - select program
  - select role
  - load recommended brief
  - generate artifact
  - verify export
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

The long-term product direction is an in-app Knowledge Center that renders role-aware, searchable guidance from repo-backed content, then uses AI-assisted draft updates and Admin approval to keep training material current as NorthStar evolves.

## Codex Organization

Use a Codex project named `NorthStar` for future work so implementation threads, test notes, deployment tasks, and product decisions stay grouped around the product. The GitHub repo remains the source of truth for code.
