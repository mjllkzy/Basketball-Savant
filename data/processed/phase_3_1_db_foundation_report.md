# Phase 3.1 Database Foundation Report

Date: 2026-06-23

Goal: add a Postgres-ready database foundation without changing the current JSON-powered app behavior.

## Files Added

- `db/migrations/001_initial_schema.sql`
- `src/lib/db/client.server.ts`
- `src/lib/db/types.ts`
- `src/lib/db/client.server.test.ts`
- `data/processed/phase_3_1_db_foundation_report.md`

## Files Updated

- `package.json`
- `pnpm-lock.yaml`

## Schema Tables Created In Migration File

The migration defines these tables:

- `ingestion_runs`
- `teams`
- `players`
- `player_profiles`
- `player_season_summaries`
- `player_stat_values`
- `stat_categories`
- `column_dictionary`
- `data_issues`

No `news_items` or `similarity_scores` tables were added in Phase 3.1.

## Indexes Added In Migration File

The migration includes indexes for:

- ingestion run status and start time
- team conference
- player normalized name, lower-cased display name, team, and position
- player profile player/season lookup
- stat category sheet/category lookup
- column dictionary ingestion run and sheet/column lookup
- player stat value player/season lookup
- player stat value team/season lookup
- player stat value sheet/column lookup
- player stat value common leaderboard lookup by season, stat name, and numeric value
- player season summary season, team, position, common filters, and major leaderboard metrics
- data issue ingestion run and issue type lookup

## DATABASE_URL Handling

`src/lib/db/client.server.ts` is server-only by filename and runtime guard.

It exposes:

- `getDatabaseUrl()`
- `hasDatabaseUrl()`
- `getDatabaseAvailability()`
- `getDatabasePool()`
- `withDatabaseClient()`
- `queryDatabase()`
- `closeDatabasePool()`

Behavior:

- Missing `DATABASE_URL` reports unavailable.
- Missing `DATABASE_URL` returns `null` instead of creating a pool.
- Importing the module does not connect to Postgres.
- A `pg` pool is only created lazily when `getDatabasePool()`, `withDatabaseClient()`, or `queryDatabase()` is called and `DATABASE_URL` exists.

## JSON Fallback Preservation

No page reads were moved to Postgres.

Current JSON-backed files remain active:

- `src/lib/data/generated/master-player-summaries.json`
- `public/data/players.json`
- `public/data/player_profiles/*.json`
- `src/lib/data/generated/official-snapshot.json`
- `src/lib/data/generated/team-shot-charts.json`
- `src/lib/data/news.json`

The added tests verify that player list/profile data remains usable when `DATABASE_URL` is absent.

## Dependencies Added

- Runtime dependency: `pg`
- Development dependency: `@types/pg`

No ORM was added. This follows the readiness audit recommendation to keep Phase 3 lightweight with plain SQL, `pg` for server reads, and later `psycopg` for Python ingestion writes.

## Intentionally Not Changed

- Railway settings were not changed.
- Production environment variables were not changed.
- No database tables were created.
- The ingestion writer was not changed.
- No data was written to Postgres.
- No frontend pages were moved to Postgres reads.
- The raw Excel workbook was not modified.
- The current JSON fallback was not removed.
- No page layout, styling, navigation, or visual design was changed.

## Next Recommended Step

Phase 3.2 should make `scripts/ingest_nba_excel.py` optionally write to Postgres when `DATABASE_URL` exists, while still generating the existing SQLite and JSON outputs. It should also add a no-Postgres escape hatch and DB-vs-JSON count validation before any frontend reads are moved.
