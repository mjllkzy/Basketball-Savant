# Production Observability

Basketball Savant keeps analytics and error reporting optional. The app builds and runs without any telemetry environment variables.

## Sentry

Configure these Railway variables on the application service:

```txt
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
```

Sentry runs only on the server through its envelope API. The client error boundary sends a small, rate-limited same-origin payload to `/api/telemetry/error`; the browser does not download a Sentry SDK and no user identifiers are included.

## PostHog

Configure:

```txt
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

The browser integration uses cookieless, memory-only analytics. It disables autocapture and session recording, and records explicit page views plus Core Web Vitals.

## Uptime

Monitor:

```txt
GET /api/health/database
```

A successful response must be HTTP 200 and report `schemaReady: true` and `dataReady: true`.

The GitHub Production Smoke workflow runs hourly and after successful CI deployments. It checks the database-backed APIs, canonical pages, SEO files, and manifest. If a separate uptime service is added, set:

```txt
BASKETBALL_SAVANT_UPTIME_MONITOR_DECISION=external-monitor
BASKETBALL_SAVANT_UPTIME_MONITOR_URL=https://...
```

If GitHub Production Smoke is the chosen uptime monitor, set:

```txt
BASKETBALL_SAVANT_UPTIME_MONITOR_DECISION=github-smoke-only
```

## Load Check

Before public launch and after high-risk performance changes, run a conservative load check:

```bash
python scripts/load_check_production.py \
  --expected-commit 2ab8305 \
  --rounds 3 \
  --concurrency 4 \
  --max-p95-seconds 3
```

This is intentionally a lightweight responsiveness check across core database-backed APIs and canonical pages. It is not a high-volume stress test.

The GitHub Production Load Check workflow also runs this conservative check after successful Production Smoke runs, daily at 12:37 UTC, and on demand from GitHub Actions.

## Final Validation

After Sentry and PostHog are configured, run the external launch gate check from a shell that contains the production variable values:

```bash
python scripts/check_external_launch_gates.py
```
