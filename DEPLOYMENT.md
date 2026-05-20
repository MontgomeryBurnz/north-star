# Alpha Deployment

This application is ready for an internal alpha deployment on **Vercel** with **Supabase**.

Do not use Squarespace for this app. It is a full-stack Next.js application with:

- App Router pages
- server routes
- Supabase database and storage
- server-side OpenAI integration
- authenticated leadership surfaces

## Recommended Stack

For the current alpha:

1. **Vercel** for application hosting
2. **Supabase Postgres** for persistence
3. **Supabase Storage** for artifacts
4. **Supabase auth-backed managed users and roles** for access control
5. **OpenAI server-side providers** for guided plans, Studio artifacts, leadership interpretation, and cost tracking

After alpha approval:

1. add SSO for enterprise identity management
2. add role-aware navigation and authorization
3. add audit logging
4. add stronger artifact processing and confidence scoring

## Current Production Capabilities

The current codebase already supports:

- `postgres` persistence
- `supabase` artifact storage
- `openai` guidance provider
- leadership feedback capture
- delivery-safe leadership signal synthesis
- guided-plan generation from saved program context
- health checks at `/api/health`

## Vercel Deployment Steps

If this folder is not in git yet:

```bash
git init
git add .
git commit -m "Prepare North Star for alpha deployment"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

Then:

1. Push this repo to GitHub.
2. Create a new Vercel project from that repo.
3. Keep the default Next.js framework detection.
4. Add the environment variables listed below.
5. Deploy.
6. Open `/api/health` on the deployed URL and confirm:
   - `persistenceProvider: postgres`
   - `artifactStorageProvider: supabase`
   - `guidedPlanProvider: openai` or `local`
   - `chatGuideEnabled: false`
   - `leadershipAuthProvider: supabase`
7. Open `/alpha-status` and run the in-app readiness checks.

## Required Environment Variables

Use these values in Vercel:

```bash
SITE_ACCESS_ENABLED=true
SITE_ACCESS_SESSION_TOKEN=replace-with-a-long-random-token
# Optional local troubleshooting only. Keep unset in production so shared password login remains disabled.
# SITE_ACCESS_PASSWORD=replace-with-a-local-only-password
# SITE_ACCESS_PASSWORD_LOGIN_ENABLED=true

PERSISTENCE_PROVIDER=postgres
DATABASE_URL=postgresql://...
DATABASE_SSL=require

ARTIFACT_STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=artifacts
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

RESEND_API_KEY=...
NORTHSTAR_EMAIL_FROM="North Star <no-reply@yourdomain.com>"
NORTHSTAR_EMAIL_REPLY_TO=support@yourdomain.com

LEADERSHIP_AUTH_PROVIDER=supabase
LEADERSHIP_ALLOWED_DOMAINS=yourcompany.com

OPENAI_API_KEY=...
GUIDED_PLAN_PROVIDER=openai
ROLE_ARTIFACT_PROVIDER=openai
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=medium
```

For a non-model fallback deployment, use:

```bash
GUIDED_PLAN_PROVIDER=local
ROLE_ARTIFACT_PROVIDER=local
```

## Alpha Test Path

Once deployed, validate this sequence:

1. Open the homepage and confirm metrics load
2. Create a new program
3. Upload an artifact
4. Save the program
5. Generate a guided plan
6. Open the Active Program view and save an update
7. Open Leadership and save feedback
8. Regenerate or refresh the guided plan
9. Confirm the delivery-safe leadership signal appears
10. Generate a Studio artifact and confirm it uses program context
11. After Vercel deploys successfully, run the production release checklist in `docs/northstar-release-checklist.md`

## Known Alpha Constraints

- access control is role-based through managed users, but enterprise SSO is still a future hardening step
- artifact extraction is strongest for `.txt`, `.pdf`, `.docx`, `.pptx`
- legacy `.doc` and `.ppt` remain best-effort
- guided plan and Studio synthesis use provider boundaries with local fallbacks for deterministic testing

## Security Notes

Before deploying publicly or sharing widely:

1. rotate any secrets that were pasted into chat
2. confirm `.env.local` is not committed
3. use Vercel env vars for all secrets
4. do not expose service-role or OpenAI secrets to the client
5. require authenticated managed-user access for production alpha users
