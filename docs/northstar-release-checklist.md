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
4. Confirm user-facing changes update the relevant knowledge assets:
   - `docs/northstar-team-user-guide.md`
   - `docs/northstar-executive-demo-guide.md`
   - `docs/northstar-knowledge-management-solution.md`
   - module-specific release notes or smoke documentation when behavior changes
5. Review Admin > Trust & Operations > Documentation freshness after deployment. If it shows `Needs review`, update the Knowledge Center source docs before the next planned release.

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
- logged-in Client Portal seeded update: writes executive fields, opens `/client`, verifies portfolio/detail rendering, captures desktop/mobile screenshots, and prunes the tagged update
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

Client Portal screenshots are written to `/tmp/north-star-smoke-screenshots` by default. Override with `NORTHSTAR_CLIENT_PORTAL_SCREENSHOT_DIR`, or set `NORTHSTAR_CLIENT_PORTAL_SCREENSHOT_SMOKE=false` only when browser screenshot capture is intentionally unavailable.

Client-facing updates are governed at publish time. The API rejects internal-only, relationship-sensitive, tactical working-note, and commercial/private delivery language before it can appear in the Client Portal or PDF export.

## Release Notes

For each release, record:

- commit SHA
- Vercel deployment URL
- production smoke result
- documentation impact: updated, not impacted, or follow-up required
- any intentionally skipped smoke step and why
- any follow-up defect or product risk
