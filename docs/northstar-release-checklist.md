# NorthStar Release Checklist

Use this checklist for every production push to keep verification consistent.

## Before Push

1. Confirm the worktree only contains intended product changes.
2. Run local quality gates:

```bash
npm run lint
npm test
npm run build
```

3. Confirm any feature work includes a focused automated test, smoke test, or documented QA path.

## Deploy

1. Commit the intended changes.
2. Push `main`.
3. Confirm Vercel reports the commit as successful.
4. Open `https://www.north-star.live` and confirm the app loads.

## Production Smoke

Run the single production smoke bundle after Vercel deploys successfully:

```bash
npm run qa:ensure-user
SMOKE_BASE_URL=https://www.north-star.live npm run smoke:production
```

The bundle currently verifies:

- disabled chat policy: `/assistant` redirects and `/api/assistant` returns `410`
- program slicers across product surfaces
- Studio program, role, brief load, generation, and export behavior
- Admin model settings save and automatic revert
- Admin audit export filters
- logged-in Client Portal seeded update: writes executive fields, opens `/client`, verifies portfolio/detail rendering, and prunes the tagged update
- Active Program save, role focus, Delivery Board, mobile screenshot, and cleanup behavior

## Required Smoke Environment

The smoke bundle reads ignored `.env.local` values. At minimum, keep these available:

```bash
NORTHSTAR_TEST_USER_EMAIL=...
NORTHSTAR_TEST_USER_PASSWORD=...
```

For browser smokes on macOS, Safari must have `Develop > Allow Remote Automation` enabled. If using a different WebDriver target, set `SMOKE_WEBDRIVER_URL`.

## Cleanup Expectations

The Active Program smoke defaults production cleanup to `prune` when run through `smoke:production`. If a smoke fails mid-run, review the selected program for records tagged `North Star active-program save smoke` and remove them before the next demo or alpha test cycle.

The Client Portal smoke also defaults cleanup to `prune` and uses the same `North Star active-program save smoke` tag prefix so seeded executive-dashboard records can be safely removed through the smoke cleanup API.

## Release Notes

For each release, record:

- commit SHA
- Vercel deployment URL
- production smoke result
- any intentionally skipped smoke step and why
- any follow-up defect or product risk
