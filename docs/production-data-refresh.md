# Production Data Refresh

The tracked workbook at `data/raw/nba_data_2025_26.xlsx` is the authoritative 2025-26 baseline. Production refreshes preserve all generated JSON fallbacks and only write Postgres when the workbook changes, the current ingestion is incomplete, or an operator explicitly forces a run.

## Local validation

```bash
python scripts/refresh_production_data.py
```

## Explicit Postgres refresh

```bash
DATABASE_URL=postgresql://... python scripts/refresh_production_data.py --write-postgres
```

Use `--force` after an ingestion/schema mapping change that requires rebuilding the same workbook checksum. Successful refreshes retain the two newest completed ingestion runs.

## Schedule

`.github/workflows/data-refresh.yml` runs:

- Daily at 12:00 PM America/Phoenix.
- Daily at 1:30 AM America/Phoenix, after typical West Coast game windows.
- On demand through GitHub Actions, with an optional force input.

The workflow requires the repository secret `DATABASE_PUBLIC_URL`. It applies migrations, validates the masterfile, skips unchanged complete data, and checks the Railway database health endpoint.

The workflow also loads the compact NBA Stats team shot-cache files into the `shot_attempts` Postgres table after the current masterfile ingestion is known. The site still keeps the generated JSON shot cache as a fallback, but production shot search, team shot maps, player shot charts, and game shot charts can read from Postgres after this step succeeds.

## Rolling Postgres exports

`.github/workflows/postgres-backup.yml` creates a daily short-retention production database export after the overnight refresh window and can also be run on demand from GitHub Actions.

The workflow:

- uses the existing `DATABASE_PUBLIC_URL` repository secret;
- installs PostgreSQL 18 client tools to match the current Railway Postgres major version;
- runs `pg_dump --format=custom --no-owner --no-acl`;
- verifies the dump with `pg_restore --list`;
- checks for the required production tables, including `shot_attempts`;
- uploads the dump, manifest, and metadata as a GitHub artifact with `retention-days: 14`.

Last manual verification: workflow run `28263354997` succeeded on 2026-06-26 and uploaded `basketball-savant-postgres-backup-20260626T202622Z` at 74,514,243 bytes.

This gives the project a rolling external export path without changing Railway settings or the live application. It is still a short-term artifact backup, not a replacement for a confirmed Railway backup/PITR policy.

For restore testing, download an artifact and restore it into a disposable database first:

```bash
pg_restore --list basketball-savant-postgres-YYYYMMDDTHHMMSSZ.dump
pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DISPOSABLE_DATABASE_URL" basketball-savant-postgres-YYYYMMDDTHHMMSSZ.dump
```

## Backup/PITR launch gate

The application is protected by Railway Postgres storage plus configured usage alerts, but final public launch should explicitly confirm the restore policy that is acceptable for the site:

- Railway-managed backup/PITR policy is accepted for the launch risk profile, or
- an external backup/export process is added and restore-tested.

After that decision is made, set the local validation flag when running the launch gate check:

```bash
SHOTCLOCK_BACKUP_POLICY_CONFIRMED=true python scripts/check_external_launch_gates.py
```
