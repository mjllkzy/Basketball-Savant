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
