# North Star

North Star is an internal operator console for delivery leads and leadership teams. It captures program context, tracks active delivery posture, generates grounded guidance, and uses a provider-based assistant layer for server-side OpenAI synthesis.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- shadcn/ui-style primitives
- Framer Motion
- Local retrieval + provider-based assistant service
- File persistence fallback + optional Postgres persistence adapter

## Local Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Browser QA

Program slicers can be smoke-tested through a real Safari WebDriver session:

```bash
SMOKE_BASE_URL=http://localhost:3000 npm run smoke:slicers
```

Use `SMOKE_BASE_URL` to target production or a Vercel preview. The script reads `.env.local` by default and also accepts `NORTHSTAR_SITE_PASSWORD`, `NORTHSTAR_LEADERSHIP_USERNAME`, and `NORTHSTAR_LEADERSHIP_PASSWORD`.

Active Program performance can be profiled with:

```bash
SMOKE_BASE_URL=http://localhost:3000 npm run profile:active-program
```

On macOS, Safari must have Developer > Allow Remote Automation enabled. If another WebDriver server is preferred, set `SMOKE_WEBDRIVER_URL`.

## Alpha Architecture

The app now supports two persistence modes:

- `file`: default local mode backed by `.data/work-path-store.json`
- `postgres`: server-side mode backed by `DATABASE_URL`

Provider selection:

- `PERSISTENCE_PROVIDER=file`
- `PERSISTENCE_PROVIDER=postgres`
- or omit it and let the app choose `postgres` when `DATABASE_URL` is present

Artifact storage also has a provider boundary:

- `local`: stores uploaded files in `.data/artifacts`
- `blob`: reserved for future Vercel Blob or object storage integration
- `supabase`: uploads artifacts into a Supabase storage bucket using the server-side service key

Leadership auth now also supports two modes:

- `env`: current local password gate
- `supabase`: Microsoft sign-in through Supabase Auth, with leadership access filtered by allowed emails, domains, or roles

Managed users can also enter through the main `/login` page with Supabase email/password credentials. Admin invitations send users through `/auth/setup` so they can set their own password and use their invite email as their username. Password recovery is available from the same login page and routes through `/auth/reset-password`.

Branded North Star invite and recovery emails are sent through Resend when these optional variables are configured:

- `RESEND_API_KEY`
- `NORTHSTAR_EMAIL_FROM`
- `NORTHSTAR_EMAIL_REPLY_TO`

When Resend is not configured, the app falls back to Supabase Auth's default email delivery while still routing users into the North Star setup and reset screens.

## Production Alpha Setup

Recommended stack:

1. Vercel for app hosting
2. Supabase Postgres for persistence
3. Supabase Storage for uploaded artifacts
4. Server-side OpenAI integration through the existing assistant provider boundary
5. SSO or role-based auth before broad internal rollout

Minimum production environment variables:

```bash
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=postgres://...
DATABASE_SSL=require
ARTIFACT_STORAGE_PROVIDER=supabase
ASSISTANT_PROVIDER=local
LEADERSHIP_AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=artifacts
LEADERSHIP_ALLOWED_DOMAINS=yourcompany.com
```

The app exposes a deployment-readiness check at `/api/health`.

For actual deployment steps, use:

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [ALPHA_CHECKLIST.md](./ALPHA_CHECKLIST.md)

## Data Model

Server persistence is organized around:

- `programs`
- `program_updates`
- `guided_plans`
- `leadership_feedback`
- `artifacts`

The current guided-plan generator remains deterministic and local. That keeps the product testable and inspectable while the assistant and future guidance layers use server-side model synthesis.

## OpenAI Integration Boundary

The assistant service already uses a provider pattern:

- `local`: deterministic retrieval
- `openai`: server-side OpenAI Responses API provider

The OpenAI provider is already wired in `src/lib/assistant-openai-provider.ts`. Keep grounded record selection local and use the model for synthesis, not for source-of-truth retrieval.
