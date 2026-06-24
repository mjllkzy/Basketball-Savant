# Railway Postgres Recovery

Date: 2026-06-24

## Root Causes

1. `requirements.txt` caused Railpack to detect the repository as Python instead of Node. The two latest app builds failed before installation with `No start command detected`.
2. The original Railway Postgres volume was only 500 MB. A large single-transaction import filled PostgreSQL WAL, leaving the service in recovery with `No space left on device`.
3. Railway accepted a 5120 MB resize configuration for the old volume but did not reconcile the mounted filesystem, which remained about 433 MiB.

`5120 MB` was the binary representation of 5 GiB. It was not a second database size requirement. The committed replacement volume uses Railway's 5000 MB allocation.

## Recovery

- Provisioned a clean replacement Railway PostgreSQL service with a committed 5000 MB volume.
- Verified PostgreSQL reached `database system is ready to accept connections`.
- Applied `001_initial_schema.sql` and `002_current_ingestion_views.sql`.
- Loaded the Excel master dataset using committed 5,000-row `COPY` batches.
- Kept incomplete ingestion runs invisible through current-ingestion views.
- Added failed-run cleanup through the `ingestion_runs` cascade.

## Verified Database State

- Players: 582
- Teams: 30
- Current player profiles: 582
- Current player season summaries: 582
- Current stat values: 567,552
- Data issues: 186
- Orphan summaries: 0
- Orphan stat values: 0
- Missing points summaries: 0
- Disk usage after import: about 1.38 GB of 5 GB

## Application Integration

- Railpack is explicitly configured to use the Node provider.
- Railway runs database migrations as a pre-deploy command.
- Railway uses `/api/health/database` as the deployment health check.
- `/api/health` reports database configuration, schema readiness, ingestion readiness, and row counts.
- `/players` uses Postgres for filtering, sorting, and pagination.
- Player master-profile stat rows use Postgres.
- Generated JSON remains an automatic fallback when Postgres is unavailable.

## Cleanup Gate

The crashed original Postgres service and 500 MB volume should be removed only after:

1. the app is deployed with the replacement `DATABASE_URL`;
2. `/api/health/database` returns HTTP 200 in production;
3. `/players` confirms `data-data-source="postgres"`;
4. a full player profile loads successfully.

The generated JSON fallback remains intentionally. It is useful for build-time resilience and emergency read availability.
