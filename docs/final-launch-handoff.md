# Final Launch Handoff

This is the remaining account-level setup needed after the repo-side launch work. Do not commit secrets to the repository.

## Current Verified State

- Current Railway URL: `https://basketball-savant-production.up.railway.app`
- Target public domain: `https://shotclockbb.com`
- Release verification source: read the live deployment commit from Railway or `/api/health` and use that value as `<live-deployment-commit>`.
- Data source of truth: `data/raw/nba_data_2025_26.xlsx`
- Runtime data version: `excel-master-2025-26-196c59613934`
- Loaded production data: 582 players, 30 teams, 1,315 games, 219,160 shot attempts
- GitHub CI, Production Smoke, Production Load Check, Production Data Refresh, and Production Postgres Backup are passing on the verified application-code baseline and current handoff deployments.

## Required Before Public Launch

1. Keep `shotclockbb.com` and `www.shotclockbb.com` attached to the current Railway application service.
2. Keep the DNS records below active at the domain registrar.
3. Keep the production site URL set to the public domain:

```bash
railway variable set \
  NEXT_PUBLIC_SITE_URL=https://shotclockbb.com \
  --service Basketball-Savant \
  --environment production
```

Current Railway custom-domain records created on 2026-06-28:

```txt
shotclockbb.com      CNAME  lgd67kyj.up.railway.app
www.shotclockbb.com  CNAME  l35bxp7x.up.railway.app
```

External HTTPS checks against `https://shotclockbb.com/api/health` returned ShotClock successfully from this workspace on 2026-06-28.

6. Create a Sentry project and set:

```bash
railway variable set \
  SENTRY_DSN='https://public-key@o000000.ingest.sentry.io/000000' \
  SENTRY_ENVIRONMENT=production \
  --service Basketball-Savant \
  --environment production
```

7. Create a PostHog project and set:

```bash
railway variable set \
  NEXT_PUBLIC_POSTHOG_KEY='phc_project_key' \
  NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com \
  --service Basketball-Savant \
  --environment production
```

8. Keep the current uptime and backup policy flags unless those decisions change:

```bash
railway variable set \
  SHOTCLOCK_UPTIME_MONITOR_DECISION=github-smoke-only \
  SHOTCLOCK_BACKUP_POLICY_CONFIRMED=true \
  --service Basketball-Savant \
  --environment production
```

The legacy `BASKETBALL_SAVANT_UPTIME_MONITOR_DECISION`, `BASKETBALL_SAVANT_UPTIME_MONITOR_URL`, and `BASKETBALL_SAVANT_BACKUP_POLICY_CONFIRMED` names still work as fallbacks, but new setup should use the `SHOTCLOCK_*` names.

## GitHub Secrets For Final Gate Workflow

The manual `Final Launch Gates` workflow also needs these GitHub secrets:

```bash
gh secret set SENTRY_DSN
gh secret set NEXT_PUBLIC_POSTHOG_KEY
gh variable set NEXT_PUBLIC_POSTHOG_HOST --body https://us.i.posthog.com
```

Do not add the Sentry or PostHog values to `.env`, docs, screenshots, or committed files.

## Final Validation

After Railway redeploys and DNS is active, run:

```bash
NEXT_PUBLIC_SITE_URL=https://shotclockbb.com \
SENTRY_DSN='https://public-key@o000000.ingest.sentry.io/000000' \
SENTRY_ENVIRONMENT=production \
NEXT_PUBLIC_POSTHOG_KEY='phc_project_key' \
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com \
SHOTCLOCK_UPTIME_MONITOR_DECISION=github-smoke-only \
SHOTCLOCK_BACKUP_POLICY_CONFIRMED=true \
python scripts/check_external_launch_gates.py --site-url https://shotclockbb.com

python scripts/check_launch_readiness.py \
  --base-url https://shotclockbb.com \
  --expected-commit <live-deployment-commit> \
  --require-custom-domain

python scripts/load_check_production.py \
  --base-url https://shotclockbb.com \
  --expected-commit <live-deployment-commit> \
  --rounds 3 \
  --concurrency 4 \
  --max-p95-seconds 3
```

Then run the manual GitHub `Final Launch Gates` workflow with:

- `site_url`: the public custom domain.
- `expected_commit`: optional. Leave it blank to let the workflow resolve the live release from `/api/health`, or provide the full commit SHA from the live Railway deployment.
- `uptime_monitor_decision`: `github-smoke-only`, unless an external monitor was added.
- `backup_policy_confirmed`: `true`.

## Completion Criteria

The launch goal is complete only when:

- The public custom domain resolves over HTTPS.
- `NEXT_PUBLIC_SITE_URL` matches the public custom domain.
- Sentry DSN and `SENTRY_ENVIRONMENT=production` are configured.
- PostHog public key and host are configured.
- External launch gates pass without `--allow-railway-domain`.
- Custom-domain launch readiness passes with `--require-custom-domain`.
- Production Smoke and Production Load Check pass against the custom domain.
