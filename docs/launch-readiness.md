# Launch Readiness

Last verified: 2026-06-26

Basketball Savant is deployed on Railway at:

```txt
https://basketball-savant-production.up.railway.app
```

## Current Production State

- Latest verified release: `d541f9e7549a29344131411da3e1201e2614df45`
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
python scripts/smoke_production.py --expected-commit d541f9e --wait-seconds 120
python scripts/check_launch_readiness.py --expected-commit d541f9e
python scripts/load_check_production.py --expected-commit d541f9e --rounds 3 --concurrency 4 --max-p95-seconds 3
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
- Slowest checked production response: 0.94 seconds

Launch-readiness smoke also validates `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, and the core indexable pages. It runs inside the GitHub Production Smoke workflow after deploy verification. Use `--require-custom-domain` after a public domain is configured to make the Railway service domain fail this check.

The conservative load check repeats the core database-backed APIs and canonical pages with light concurrency. It is designed as a launch confidence gate, not a stress test.

GitHub Actions status for `d541f9e`:

- CI: success
- Production Smoke: success
- Production Load Check: success
- Production Data Refresh: success

Railway status for `d541f9e`:

- Deployment: success

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

`.github/workflows/final-launch-gates.yml` is a manual workflow for the final public-domain launch check. Run it after DNS is active and GitHub secrets are configured for `SENTRY_DSN` and `NEXT_PUBLIC_POSTHOG_KEY`. It validates the external launch gates, custom-domain SEO readiness, and conservative responsiveness against the selected public URL.

## Final External Gate Validation

After the public domain, Sentry, PostHog, uptime-monitor decision, and backup policy are configured, run:

```bash
NEXT_PUBLIC_SITE_URL=https://www.example.com \
SENTRY_DSN=https://public@sentry.example.com/42 \
SENTRY_ENVIRONMENT=production \
NEXT_PUBLIC_POSTHOG_KEY=phc_... \
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com \
BASKETBALL_SAVANT_UPTIME_MONITOR_DECISION=github-smoke-only \
BASKETBALL_SAVANT_BACKUP_POLICY_CONFIRMED=true \
python scripts/check_external_launch_gates.py

python scripts/check_launch_readiness.py \
  --base-url https://www.example.com \
  --expected-commit d541f9e \
  --require-custom-domain
```

Use `BASKETBALL_SAVANT_UPTIME_MONITOR_DECISION=external-monitor` and set `BASKETBALL_SAVANT_UPTIME_MONITOR_URL=https://...` if a third-party uptime monitor is added instead of relying only on the scheduled GitHub Production Smoke workflow.

## Security Baseline

- Next.js upgraded to `15.5.19`.
- React and React DOM upgraded to `19.2.7`.
- `eslint-config-next` upgraded to `15.5.19`.
- PostCSS overridden to `^8.5.10` to avoid the production advisory range.
- Production audit at moderate level reports no known vulnerabilities.
- Security headers are configured in `next.config.mjs`.
- CI and production smoke GitHub Actions are pinned to commit SHAs.

## Railway Configuration

Application service:

- `DATABASE_URL`: set through the Railway Postgres service reference.
- `NEXT_PUBLIC_SITE_URL`: set to the current Railway service URL.
- `SENTRY_DSN`: missing.
- `SENTRY_ENVIRONMENT`: missing.
- `NEXT_PUBLIC_POSTHOG_KEY`: missing.
- `NEXT_PUBLIC_POSTHOG_HOST`: missing.

Domains:

- Active Railway service domain: `basketball-savant-production.up.railway.app`
- Custom domain: not configured yet.

Postgres volume:

- Active volume: `postgres-volume-8KcF`
- Mounted service: `Postgres-QerL`
- Size: 5,000 MB
- Current usage at verification: about 2,388 MB
- Usage alerts: configured at 80%, 95%, and 100%

## Remaining External Launch Gates

These are not code blockers, but they require account or product decisions outside the repository:

1. Choose and configure the public custom domain.
2. Add the custom domain in Railway and complete DNS verification.
3. Update `NEXT_PUBLIC_SITE_URL` to the custom domain after DNS is active.
4. Add Sentry project credentials if server error monitoring should be live.
5. Add PostHog credentials if growth analytics should be live.
6. Decide whether to add an external uptime monitor in addition to GitHub scheduled production smoke checks.
7. Confirm Railway backup/PITR policy beyond the current managed volume and alerts if stricter restore guarantees are required.

## Safe Next Product Work

The platform is ready for feature work after the external launch gates are decided. Suggested next website additions should build on the existing Postgres-backed data layer and preserve the masterfile ingestion path as the authoritative 2025-26 baseline.
