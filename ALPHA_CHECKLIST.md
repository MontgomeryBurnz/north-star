# Alpha Readiness Checklist

## Hosting

- [ ] Repo pushed to GitHub
- [ ] Vercel project created
- [ ] Production env vars added in Vercel
- [ ] First deployment completed
- [ ] `/api/health` verified on deployed app

## Data And Storage

- [ ] `PERSISTENCE_PROVIDER=postgres`
- [ ] `DATABASE_URL` points to Supabase transaction pooler
- [ ] `ARTIFACT_STORAGE_PROVIDER=supabase`
- [ ] `artifacts` bucket exists in Supabase Storage

## Auth

- [ ] leadership login works in deployed app
- [ ] leadership route blocks unauthenticated users
- [ ] delivery flow does not expose raw leadership notes

## Assistant

- [ ] `ASSISTANT_PROVIDER=openai` or `local` intentionally chosen
- [ ] OpenAI billing/quota confirmed
- [ ] grounded assistant response tested
- [ ] no client-side secret exposure

## End-To-End Product Flow

- [ ] create a new program
- [ ] upload an artifact
- [ ] save intake
- [ ] generate guided plan
- [ ] save active-program update
- [ ] save leadership feedback
- [ ] confirm leadership signal appears for delivery
- [ ] confirm assistant answers from saved context

## UX Review

- [ ] nav routes feel like distinct capabilities
- [ ] no broken links
- [ ] no client-side runtime errors
- [ ] empty states read cleanly
- [ ] old saved plans load without crashing

## Demo Scope

- [ ] seed 2-3 realistic test programs
- [ ] define alpha tester group
- [ ] prepare short test script
- [ ] define success criteria for alpha feedback

## Security Cleanup

- [ ] rotate any secrets pasted into chat
- [ ] confirm `.env.local` is ignored
- [ ] verify service-role key is server-only
- [ ] verify OpenAI key is server-only
