# Phase 3.2 Postgres Ingestion Report

## Scope

Phase 3.2 adds an optional Postgres write path to the existing Excel ingestion pipeline. The current JSON and SQLite outputs remain the default production data source.

## Files Changed

- `scripts/ingest_nba_excel.py`
- `requirements.txt`
- `tests/ingest-postgres-cli.test.ts`
- `data/processed/phase_3_2_postgres_ingestion_report.md`

The normal ingestion command also regenerated:

- `data/processed/column_dictionary.json`
- `data/processed/data_issues_log.json`
- `data/processed/nba_master.sqlite` locally only, ignored by Git

## How To Run Normal Ingestion

Normal ingestion does not require `DATABASE_URL` and does not connect to Postgres.

```bash
python scripts/ingest_nba_excel.py
```

In this local shell, `python` is not installed, so the validation run used the bundled Python executable:

```bash
/Users/johnnypark/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/ingest_nba_excel.py
```

Normal ingestion still writes:

- `data/processed/nba_master.sqlite`
- `data/processed/column_dictionary.json`
- `data/processed/data_issues_log.json`
- `public/data/players.json`
- `public/data/player_profiles/{player_slug}.json`
- `src/lib/data/generated/master-player-summaries.json`

## How To Run Postgres Write Ingestion

Postgres writing is explicit and opt-in:

```bash
DATABASE_URL="postgresql://..." python scripts/ingest_nba_excel.py --write-postgres
```

If `--write-postgres` is used without `DATABASE_URL`, the script exits before workbook parsing with a clear message:

```text
Postgres write requested with --write-postgres, but DATABASE_URL is not set.
```

## Python Dependencies

`requirements.txt` now declares:

- `openpyxl>=3.1.0`
- `psycopg[binary]>=3.2.0`

`psycopg` is imported only inside the Postgres writer. Normal JSON/SQLite ingestion does not require it.

## Tables Written

When `--write-postgres` is enabled and `DATABASE_URL` is present, the writer uses the schema in `db/migrations/001_initial_schema.sql` and writes:

- `ingestion_runs`
- `teams`
- `players`
- `player_profiles`
- `player_season_summaries`
- `player_stat_values`
- `stat_categories`
- `column_dictionary`
- `data_issues`

## Duplicate Avoidance

- `teams` upsert by stable `id`.
- `players` upsert by generated `player_slug`.
- `stat_categories` upsert by `(source_sheet, stat_category)`.
- `column_dictionary` is unique per ingestion run by `(ingestion_run_id, source_sheet, column_index, cleaned_column_name)`.
- `player_profiles` and `player_season_summaries` are unique per player, season, season type, and ingestion run.
- `player_stat_values` uses a deterministic SHA-256 `row_fingerprint` and unique `(ingestion_run_id, row_fingerprint)`.

This design prevents duplicate rows inside a single ingestion run while preserving historical ingestion runs.

## Transaction Behavior

The Postgres path:

1. Creates an `ingestion_runs` row with status `running`.
2. Writes teams, players, categories, dictionaries, profiles, summaries, stat rows, and issues.
3. Marks the run `succeeded` after successful writes.
4. Rolls back the transaction if an error occurs.
5. Attempts to log a failed ingestion run after rollback if possible.

## JSON Fallback Preservation

The frontend still reads generated JSON files. No page reads were moved to Postgres. The default ingestion path still regenerates JSON and SQLite exactly as before, with `postgres.requested` reported as `false`.

## Validation Results

Normal ingestion result:

- Sheets found: 67
- Sheets imported: 67
- Sheets skipped: 0
- Sheets failed: 0
- Unique players: 582
- Stat rows created: 567,552
- Postgres requested: false
- Postgres written: false

No-`DATABASE_URL` safety check:

- Command: `env -u DATABASE_URL python3 scripts/ingest_nba_excel.py --write-postgres`
- Result: exited with status 2
- Stack trace: none
- Workbook parsing: not started

Test/build result:

- `pnpm test`: passed with 75 tests across 14 files when run with bundled Node and pnpm on PATH.
- `pnpm build`: passed and generated 34 app routes.
- Local runtime warning: this Codex runtime uses Node 24.14.0 while the project declares Node 22.x. This did not fail tests or build.

Local cleanup:

- Removed 307 ignored duplicate generated profile-copy files matching `* 2.json` or `* copy*.json`.
- Canonical `public/data/player_profiles/{player_slug}.json` files were left intact.

## Intentionally Not Changed

- Railway settings were not changed.
- `DATABASE_URL` was not added.
- Frontend page reads were not moved to Postgres.
- JSON fallback was not removed.
- Raw Excel file was not modified.
- Page layout, navigation, styling, and visible UI were not changed.

## Next Recommended Step

Phase 3.3 should add a server-side read/query layer that can read from Postgres when available and fall back to the current generated JSON files. Do not move production pages to database reads until a real Postgres database has been created, migrated, and validated against the JSON output.
