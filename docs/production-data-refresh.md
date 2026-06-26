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

## Backup/PITR launch gate

The application is protected by Railway Postgres storage plus configured usage alerts, but final public launch should explicitly confirm the restore policy that is acceptable for the site:

- Railway-managed backup/PITR policy is accepted for the launch risk profile, or
- an external backup/export process is added and restore-tested.

After that decision is made, set the local validation flag when running the launch gate check:

```bash
BASKETBALL_SAVANT_BACKUP_POLICY_CONFIRMED=true python scripts/check_external_launch_gates.py
```
