# Launch Readiness

Last verified: 2026-06-28

ShotClock is deployed on Railway at:

```txt
https://basketball-savant-production.up.railway.app
```

The Railway service domain remains attached as an operational fallback. Browser page requests on that host redirect permanently to `https://shotclockbb.com`; API and health-check routes remain available on the Railway host for monitoring and platform diagnostics.

Target public domain:

```txt
https://shotclockbb.com
```

## Current Production State

- Live release source: `/api/health` field `data.release`. Use that value as `<live-deployment-commit>` when running final launch checks; do not rely on a committed SHA in this document because docs-only releases change the live commit.
- Source of truth: `data/raw/nba_data_2025_26.xlsx`
- Source workbook SHA-256: `196c596139340b0abe43668f0ecd42a1a77321767f1d6cde640251ee35d69169`
- Runtime data version: `excel-master-2025-26-196c59613934`
- Database status: connected
- Schema ready: true
- Data ready: true
- Players: 582
- Teams: 30
- Games: 1,315
- Team game stat rows: 2,630
- Player game stat rows: 28,572
- Shot attempts loaded: 219,160

## Verified Gates

These checks passed after the Next.js security upgrade:

```bash
CI=true pnpm install --frozen-lockfile
CI=true pnpm dlx pnpm@9.15.9 install --frozen-lockfile
CI=true pnpm test
CI=true pnpm build
pnpm audit --prod --audit-level moderate
python scripts/smoke_production.py --expected-commit <live-deployment-commit> --wait-seconds 120
python scripts/check_launch_readiness.py --expected-commit <live-deployment-commit>
python scripts/load_check_production.py --expected-commit <live-deployment-commit> --rounds 3 --concurrency 4 --max-p95-seconds 3
```

Production smoke results on the deployed Railway site:

- `/api/health`: 200
- `/api/players?pageSize=1&sort=pts&order=desc&minGames=30`: 200
- `/api/teams?pageSize=1`: 200
- `/api/leaderboards?metric=pts&limit=1&minGames=30`: 200
- `/api/games?pageSize=1`: 200
- `/`: 200
- `/players/luka-doncic`: 200
- `/teams/los-angeles-lakers`: 200
- `/visuals`: 200
- Slowest checked production response: 0.563 seconds

Launch-readiness smoke also validates `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, and the core indexable pages. It runs inside the GitHub Production Smoke workflow after deploy verification. Use `--require-custom-domain` after a public domain is configured to make the Railway service domain fail this check.

The conservative load check repeats the core database-backed APIs and canonical pages with light concurrency. It is designed as a launch confidence gate, not a stress test.

GitHub Actions status for the current deployed commit:

- CI: success
- Production Smoke: success
- Production Load Check: success
- Production Data Refresh: success
- Latest Production Postgres Backup: success

Live API cache-header verification for the current deployed commit:

- `/api/players?...`: `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`
- `/api/search/shots?...`: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
- `/api/health`: `Cache-Control: no-store`

Last verified production data refresh:

- Commit: current deployed commit from `/api/health`
- Workflow: Production Data Refresh
- Status: success

Last verified production backup artifact:

- Workflow run: `28263354997`
- Artifact: `basketball-savant-postgres-backup-20260626T202622Z`
- Size: 74,514,243 bytes
- Expires: 2026-07-10

Last verified application-code Railway deployment:

- Deployment: `e52a826d-9d55-4929-86b1-a3ef40092053`, online

## Data Pipeline

The current production data flow is:

```txt
data/raw/nba_data_2025_26.xlsx
-> scripts/ingest_nba_excel.py
-> generated JSON + SQLite fallback outputs
-> scripts/refresh_production_data.py --write-postgres
-> scripts/refresh_postgres_shots.py --write-postgres
-> Postgres-backed website reads
```

The app still preserves JSON fallback behavior for local and degraded states. Production APIs, core analytics pages, game logs, and shot-chart surfaces use Postgres-backed reads where available. The current production shot source is `Postgres shot_attempts` with 219,160 loaded attempts.

## Automation

`.github/workflows/data-refresh.yml` runs:

- Daily at 12:00 PM America/Phoenix.
- Daily at 1:30 AM America/Phoenix after typical West Coast game windows.
- On demand through GitHub Actions.

The workflow applies migrations, validates the workbook, refreshes Postgres when needed, and runs the production smoke script.

`.github/workflows/production-load-check.yml` runs the conservative production load check after successful Production Smoke runs, daily, and on demand.

`.github/workflows/postgres-backup.yml` creates a daily verified `pg_dump` artifact after the overnight data-refresh window and can be run manually before risky data or deployment work. The artifact is intentionally short-retention and does not replace the final Railway backup/PITR policy decision.

`.github/workflows/news-refresh.yml` refreshes the fan-facing news feed from the official NBA.com news index every day at 12:00 PM America/Phoenix and commits `src/lib/data/news.json` only when the validated source-backed feed changes. News cards carry both a topic category, such as `Free Agency` or `Trade`, and a reporting status, either `Official` or `Rumor`. `Official` is reserved for league/team sources or established NBA reporters and outlets with strong sourcing standards. `Rumor` may be used for credible pre-announcement reporting from reputable insiders or outlet rumor pages, but should not include anonymous social-only speculation; social or forum links should point back to a trusted original reporter or outlet and identify that source in the summary.

`.github/workflows/final-launch-gates.yml` is a manual workflow for the final public-domain launch check. It supports the current no-paid-telemetry launch path by setting Sentry and PostHog decisions to `deferred`, while still allowing `configured` later if credentials are added. It validates the external launch gates, custom-domain SEO readiness, and conservative responsiveness against the selected public URL. If the optional expected commit input is blank, the workflow resolves the live release from `/api/health` and uses it for the readiness and load checks.

## Final External Gate Validation

After the public domain, telemetry decisions, uptime-monitor decision, and backup policy are configured, run:

```bash
NEXT_PUBLIC_SITE_URL=https://shotclockbb.com \
SHOTCLOCK_SENTRY_DECISION=deferred \
SHOTCLOCK_POSTHOG_DECISION=deferred \
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com \
SHOTCLOCK_UPTIME_MONITOR_DECISION=github-smoke-only \
SHOTCLOCK_BACKUP_POLICY_CONFIRMED=true \
python scripts/check_external_launch_gates.py

python scripts/check_launch_readiness.py \
  --base-url https://shotclockbb.com \
  --expected-commit <live-deployment-commit> \
  --require-custom-domain
```

Use `SHOTCLOCK_UPTIME_MONITOR_DECISION=external-monitor` and set `SHOTCLOCK_UPTIME_MONITOR_URL=https://...` if a third-party uptime monitor is added instead of relying only on the scheduled GitHub Production Smoke workflow.

## Security Baseline

- Next.js upgraded to `15.5.19`.
- React and React DOM upgraded to `19.2.7`.
- `eslint-config-next` upgraded to `15.5.19`.
- PostCSS overridden to `^8.5.10` to avoid the production advisory range.
- Production audit at moderate level reports no known vulnerabilities.
- Security headers are configured in `next.config.mjs`.
- Launch readiness requires the configured Content Security Policy to deny framing and object embeds, restrict default sources to self, and allow only the app, NBA CDN images, and configured PostHog analytics endpoints.
- CI and production smoke GitHub Actions are pinned to commit SHAs.

## Railway Configuration

Application service:

- `DATABASE_URL`: set through the Railway Postgres service reference.
- `NEXT_PUBLIC_SITE_URL`: `https://shotclockbb.com`.
- `SHOTCLOCK_SENTRY_DECISION`: `deferred`.
- `SHOTCLOCK_POSTHOG_DECISION`: `deferred`.
- `SENTRY_DSN`: intentionally not set while Sentry is deferred.
- `SENTRY_ENVIRONMENT`: intentionally not set while Sentry is deferred.
- `NEXT_PUBLIC_POSTHOG_KEY`: intentionally not set while PostHog is deferred.
- `NEXT_PUBLIC_POSTHOG_HOST`: `https://us.i.posthog.com`.
- `SHOTCLOCK_UPTIME_MONITOR_DECISION`: `github-smoke-only`.
- `SHOTCLOCK_BACKUP_POLICY_CONFIRMED`: `true`.
- Legacy `BASKETBALL_SAVANT_*` launch-gate names still work as fallbacks.

Domains:

- Active Railway service domain: `basketball-savant-production.up.railway.app`
- Custom domains attached in Railway: `shotclockbb.com`, `www.shotclockbb.com`
- Canonical host behavior: page requests on the Railway service domain redirect to `https://shotclockbb.com`; `/api/*` routes do not redirect.
- Required DNS records:
  - `shotclockbb.com` CNAME `lgd67kyj.up.railway.app`
  - `www.shotclockbb.com` CNAME `l35bxp7x.up.railway.app`
- External HTTPS verification from this workspace reached ShotClock successfully on both custom domains on 2026-06-28.

Postgres volume:

- Active volume: `postgres-volume-8KcF`
- Mounted service: `Postgres-QerL`
- Size: 5,000 MB
- Current usage at verification: about 2,388 MB
- Usage alerts: configured at 80%, 95%, and 100%

## Remaining External Launch Gates

These are not code blockers. Current decisions are recorded so launch validation can pass without paid telemetry:

1. Sentry server error monitoring is deferred.
2. PostHog product analytics is deferred.
3. Optional later: add an external uptime monitor in addition to GitHub scheduled production smoke checks.
4. Optional later: replace or supplement the current verified rolling `pg_dump` artifacts with Railway PITR or a stricter restore-tested backup process.

Use [Final Launch Handoff](final-launch-handoff.md) for the exact non-repo setup commands and validation sequence.

## Safe Next Product Work

The platform is ready for feature work after the final launch gates pass with the recorded telemetry decisions. Suggested next website additions should build on the existing Postgres-backed data layer and preserve the masterfile ingestion path as the authoritative 2025-26 baseline.
