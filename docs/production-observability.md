# Production Observability

ShotClock keeps analytics and error reporting optional. The app builds and runs without any telemetry environment variables.

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

The browser integration uses cookieless, memory-only analytics. It disables autocapture and session recording, and records:

- explicit page views
- Core Web Vitals
- `navigation_click` events for same-site links
- `outbound_link_click` events for external source links

Interaction events include only page area, current pathname, target pathname, external-link status, external target domain, and download status. They intentionally do not include full URLs, query strings, search input text, user IDs, or session recordings.

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

The current production decision is to use GitHub Production Smoke as the uptime monitor. Railway has:

```txt
BASKETBALL_SAVANT_UPTIME_MONITOR_DECISION=github-smoke-only
```

If a separate uptime service is added later, change the decision to `external-monitor` and set `BASKETBALL_SAVANT_UPTIME_MONITOR_URL`.

## Load Check

Before public launch and after high-risk performance changes, run a conservative load check:

```bash
python scripts/load_check_production.py \
  --expected-commit <live-deployment-commit> \
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

The same validation is available as the manual GitHub Final Launch Gates workflow. It expects `SENTRY_DSN` and `NEXT_PUBLIC_POSTHOG_KEY` as GitHub secrets, accepts the public custom domain as a workflow input, and then runs the external gate, launch-readiness, and conservative load checks against that domain. See [Final Launch Handoff](final-launch-handoff.md) for the exact setup sequence.
