# Final Launch Handoff

This is the remaining account-level setup needed after the repo-side launch work. Do not commit secrets to the repository.

## Current Verified State

- Production URL: `https://basketball-savant-production.up.railway.app`
- Release verification source: read the live deployment commit from Railway or `/api/health` and use that value as `<live-deployment-commit>`.
- Data source of truth: `data/raw/nba_data_2025_26.xlsx`
- Runtime data version: `excel-master-2025-26-196c59613934`
- Loaded production data: 582 players, 30 teams, 1,315 games, 219,160 shot attempts
- GitHub CI, Production Smoke, Production Load Check, Production Data Refresh, and Production Postgres Backup are passing on the verified application-code baseline and current handoff deployments.

## Required Before Public Launch

1. Choose the public domain, for example `https://www.shotclockanalytics.com`.
2. Add that custom domain to the current Railway application service.
3. Add the DNS records Railway provides at the domain registrar.
4. Wait until Railway marks the custom domain active.
5. Set the production site URL:

```bash
railway variable set \
  NEXT_PUBLIC_SITE_URL=https://www.example.com \
  --service Basketball-Savant \
  --environment production
```

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
NEXT_PUBLIC_SITE_URL=https://www.example.com \
SENTRY_DSN='https://public-key@o000000.ingest.sentry.io/000000' \
SENTRY_ENVIRONMENT=production \
NEXT_PUBLIC_POSTHOG_KEY='phc_project_key' \
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com \
SHOTCLOCK_UPTIME_MONITOR_DECISION=github-smoke-only \
SHOTCLOCK_BACKUP_POLICY_CONFIRMED=true \
python scripts/check_external_launch_gates.py --site-url https://www.example.com

python scripts/check_launch_readiness.py \
  --base-url https://www.example.com \
  --expected-commit <live-deployment-commit> \
  --require-custom-domain

python scripts/load_check_production.py \
  --base-url https://www.example.com \
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
