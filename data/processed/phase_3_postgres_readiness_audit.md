# Phase 3 Postgres Readiness Audit

Date: 2026-06-23

Goal: plan the safest path from generated JSON/SQLite-style files to Postgres without breaking the current Basketball Savant site.

This audit is planning-only. No Postgres tables were created, no Railway settings were changed, no environment variables were modified, and the existing JSON data flow was not removed.

## Current Data Flow

```text
data/raw/nba_data_2025_26.xlsx
  -> scripts/ingest_nba_excel.py
  -> data/processed/nba_master.sqlite
  -> data/processed/column_dictionary.json
  -> data/processed/data_issues_log.json
  -> public/data/players.json
  -> public/data/player_profiles/{player_slug}.json
  -> src/lib/data/generated/master-player-summaries.json
  -> website pages through src/lib/data/*
```

## 1. Current Data Inventory

### Raw Excel Source

- Path: `data/raw/nba_data_2025_26.xlsx`
- Size: about 4.2 MB.
- Git status: tracked.
- Role: raw source of truth for the master player/stat dataset.
- Safety note: this file should remain immutable during ingestion. Future phases should continue treating it as raw input only.

### SQLite Output

- Path: `data/processed/nba_master.sqlite`
- Size: about 132 MB.
- Git status: ignored by `.gitignore`.
- Role: generated normalized local database output from the Excel ingestion.
- Tables:
  - `import_metadata`
  - `imported_sheets`
  - `column_dictionary`
  - `players`
  - `stat_values`
- Current counts:
  - `players`: 582
  - `stat_values`: 567,552
  - `column_dictionary`: 1,262
  - `imported_sheets`: 67
  - `import_metadata`: 6
- Current SQLite indexes:
  - `idx_stat_values_player` on `player_slug`
  - `idx_stat_values_sheet` on `source_sheet`
  - `idx_stat_values_column` on `cleaned_column_name`

### Public JSON Files

- `public/data/players.json`
  - 582 player index rows.
  - Used by `src/lib/data/masterProfiles.server.ts`.
- `public/data/player_profiles/{player_slug}.json`
  - 582 generated player profile JSON files.
  - Each file contains full per-player stat rows from the Excel import.
  - Used by player profile pages through server-side profile loading.

### Generated Runtime Summaries

- `src/lib/data/generated/master-player-summaries.json`
  - Size: about 5.7 MB.
  - 582 summary rows.
  - Used by `src/lib/data/master.ts` to build runtime `Player` and `PlayerSeasonAggregate` objects.
  - Drives players index, leaderboards, compare, similarity, player summaries, and roster rows.

### News Data

- `src/lib/data/news.json`
  - 13 news items.
  - Used by `src/lib/news.ts`, homepage preview, and `/news`.
  - Small enough to stay JSON until database basics are proven.

### Team Data

- `src/lib/data/generated/official-snapshot.json`
  - Size: about 15 MB.
  - Contains official snapshot metadata and many NBA Stats/Basketball Reference tables.
  - Relevant current counts:
    - regular-season player stats: 582
    - regular-season player advanced stats: 582
    - regular-season team stats: 30
    - regular-season team advanced stats: 30
    - regular-season team game logs: 2,460
    - playoff team game logs: 170
    - regular-season player game logs: 26,651
    - playoff player game logs: 1,921
    - Basketball Reference player crosschecks: 582
    - Basketball Reference team crosschecks: 30
  - `src/lib/data/official.ts` converts this JSON into runtime teams, games, team aggregates, player game logs, and shot/event arrays.

### Game, Event, And Shot Data

- `src/lib/data/generated/official-snapshot.json`
  - Primary current source for games, player game logs, team game logs, and any loaded shot charts.
- `src/lib/data/generated/team-shot-charts.json`
  - Size: about 42 MB.
  - Contains cached team shot chart data for 30 teams.
- Current event limitations:
  - `officialPossessions`, `officialPasses`, `officialRebounds`, and `officialLineups` are currently empty arrays.
  - The app already has fallback messaging for unloaded tracking/event feeds.

### Data Issues And Column Dictionary

- `data/processed/data_issues_log.json`
  - 186 issues logged.
  - 67 sheets imported, 0 skipped, 0 failed.
  - 582 unique players, 567,552 stat rows.
  - Top issue categories:
    - duplicate original column names: 90
    - blank stat values: 52
    - reviewed sheets imported: 18
    - non-numeric stat values: 11
    - time-formatted headers normalized: 8
    - player name reformatted: 3
    - normalized numeric values: 2
    - missing team column: 1
    - missing team values: 1
- `data/processed/column_dictionary.json`
  - 1,262 column dictionary entries.
  - Should move to Postgres with ingestion run metadata.

## 2. What Should Move To Postgres First

### Move First

1. `ingestion_runs`
   - Needed before importing anything else so every row can be tied to a source workbook hash, season, season type, run timestamp, and row counts.

2. `teams`
   - Players reference teams.
   - Current team data comes from the official snapshot, not the Excel stat row file.
   - This should be a small stable lookup table loaded before players.

3. `players`
   - 582 rows.
   - Should include canonical master slug, app/NBA player id when known, display name, current/primary team, position, height, weight, age, college/country, headshot URL, and source metadata.

4. `player_profiles`
   - One row per player/season/season type.
   - Should store profile-level metadata currently in `public/data/players.json`: primary team, teams, source sheets, stat row count, profile path or generated profile JSON/cache.

5. `player_stat_values`
   - The normalized raw/numeric stat row table.
   - This is the core source of truth from Excel.
   - Store both raw values and numeric values, never guessing missing data.

6. `column_dictionary`
   - Needed to explain where each stat came from and preserve original/cleaned column names.

7. `data_issues`
   - Keeps ingestion quality visible and auditable.

8. `player_season_summaries`
   - Recommended even though it was not in the original list.
   - Reason: `/players`, leaderboards, compare, and similarity should not scan 567k row-value records on every request.
   - This table should mirror the current fast runtime shape produced by `master-player-summaries.json` / `src/lib/data/master.ts`.

### Move After The First Pass

- Leaderboards:
  - Use `player_season_summaries` first.
  - Only query `player_stat_values` directly for less common/exploratory stats.
- Similarity inputs:
  - Move after player summaries are stable.
  - Similarity can compute on demand at first, then later materialize to `similarity_scores`.
- Player full profiles:
  - Move after `/players` works from DB with fallback.
  - Query `player_stat_values` by `player_slug + season + season_type`.
- News:
  - Optional. Current JSON is small and low-risk.
  - Move only when admin/news automation needs database writes.

## 3. What Should Stay JSON For Now

- `src/lib/data/generated/master-player-summaries.json`
  - Keep as production fallback until DB reads are proven.
- `public/data/players.json`
  - Keep as fallback index for player profile files.
- `public/data/player_profiles/*.json`
  - Keep as fallback for player profile pages.
- `src/lib/data/generated/official-snapshot.json`
  - Keep for games, game logs, official team aggregates, and fallback metadata until those flows have dedicated DB tables.
- `src/lib/data/generated/team-shot-charts.json`
  - Keep as shot-chart cache for now. It is large, but moving shot charts should be a separate phase because the shape differs from player stat values.
- `src/lib/data/news.json`
  - Keep until DB-backed news is actually needed.
- UI metadata and code-native config:
  - `src/lib/metrics/registry.ts`
  - team branding helpers
  - formatting helpers
  - table config
  - route/search param helpers

## 4. Proposed Postgres Schema

Use narrow, auditable tables first. Avoid a very wide stat table until the stable summary columns are known.

### `ingestion_runs`

Purpose: one row per ingestion attempt.

Recommended columns:

- `id uuid primary key`
- `source_workbook_path text not null`
- `source_workbook_sha256 text not null`
- `season text not null`
- `season_type text not null`
- `started_at timestamptz not null`
- `finished_at timestamptz`
- `status text not null` with values like `running`, `succeeded`, `failed`
- `sheets_found integer`
- `sheets_imported integer`
- `sheets_skipped integer`
- `sheets_failed integer`
- `unique_players integer`
- `stat_rows_created integer`
- `issues_logged integer`
- `metadata jsonb not null default '{}'::jsonb`

### `teams`

Purpose: stable team lookup.

Recommended columns:

- `id text primary key`
- `slug text unique not null`
- `abbreviation text unique not null`
- `city text not null`
- `name text not null`
- `conference text`
- `division text`
- `primary_color text`
- `secondary_color text`
- `source text not null`
- `updated_at timestamptz not null`

### `players`

Purpose: canonical player identity.

Recommended columns:

- `player_slug text primary key`
- `nba_player_id text unique`
- `app_player_id text unique`
- `player_name text not null`
- `normalized_player_name text not null`
- `primary_team_id text references teams(id)`
- `primary_team_abbreviation text`
- `position text`
- `height text`
- `height_inches numeric`
- `weight integer`
- `age integer`
- `college text`
- `country text`
- `jersey_number text`
- `headshot_url text`
- `active boolean not null default true`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `player_profiles`

Purpose: one summary/profile-index row per player season.

Recommended columns:

- `id bigserial primary key`
- `ingestion_run_id uuid references ingestion_runs(id)`
- `player_slug text references players(player_slug)`
- `season text not null`
- `season_type text not null`
- `primary_team text`
- `teams jsonb not null default '[]'::jsonb`
- `name_variants jsonb not null default '[]'::jsonb`
- `source_sheets jsonb not null default '[]'::jsonb`
- `stat_rows integer not null`
- `profile_json jsonb`
- `created_at timestamptz not null`
- Unique: `(player_slug, season, season_type, ingestion_run_id)`

### `stat_categories`

Purpose: normalize sheet/category labels.

Recommended columns:

- `id bigserial primary key`
- `source_sheet text not null`
- `stat_category text not null`
- `description text`
- Unique: `(source_sheet, stat_category)`

### `column_dictionary`

Purpose: preserve original and cleaned Excel columns.

Recommended columns:

- `id bigserial primary key`
- `ingestion_run_id uuid references ingestion_runs(id)`
- `source_sheet text not null`
- `stat_category text not null`
- `column_index integer not null`
- `excel_column text not null`
- `original_column_name text not null`
- `cleaned_column_name text not null`
- `role text not null`
- `imported boolean not null`
- `notes text`
- Unique: `(ingestion_run_id, source_sheet, column_index, cleaned_column_name)`

### `player_stat_values`

Purpose: normalized stat facts from the Excel masterfile.

Recommended columns:

- `id bigserial primary key`
- `ingestion_run_id uuid references ingestion_runs(id)`
- `raw_player_name text`
- `player_name text not null`
- `player_slug text references players(player_slug)`
- `team text`
- `team_id text references teams(id)`
- `season text not null`
- `season_type text not null`
- `source_sheet text not null`
- `stat_category text not null`
- `original_column_name text not null`
- `cleaned_column_name text not null`
- `raw_value text`
- `raw_value_json jsonb`
- `numeric_value numeric`
- `import_notes text`
- `source_row_number integer not null`
- `source_column_letter text not null`
- `row_fingerprint text not null`
- Unique: `(ingestion_run_id, row_fingerprint)`

### `player_season_summaries`

Purpose: fast reads for `/players`, leaderboards, compare, and similarity.

Recommended columns:

- `id bigserial primary key`
- `ingestion_run_id uuid references ingestion_runs(id)`
- `player_slug text references players(player_slug)`
- `team_id text references teams(id)`
- `season text not null`
- `season_type text not null`
- `games integer`
- `minutes numeric`
- `pts numeric`
- `reb numeric`
- `ast numeric`
- `stl numeric`
- `blk numeric`
- `tov numeric`
- `fg_pct numeric`
- `three_pct numeric`
- `ft_pct numeric`
- `ts_pct numeric`
- `efg_pct numeric`
- `usage_rate numeric`
- `ast_pct numeric`
- `reb_pct numeric`
- `turnover_rate numeric`
- `off_rating numeric`
- `def_rating numeric`
- `net_rating numeric`
- `pie numeric`
- `summary_json jsonb not null default '{}'::jsonb`
- Unique: `(player_slug, season, season_type, ingestion_run_id)`

### `data_issues`

Purpose: preserve ingestion issues.

Recommended columns:

- `id bigserial primary key`
- `ingestion_run_id uuid references ingestion_runs(id)`
- `severity text not null`
- `type text not null`
- `message text not null`
- `details jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null`

### `news_items` Optional

Purpose: DB-backed news if the feed becomes automated.

Recommended columns:

- `id text primary key`
- `title text not null`
- `category text not null`
- `published_at timestamptz not null`
- `source_name text not null`
- `source_url text not null`
- `summary text not null`
- `active boolean not null default true`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `similarity_scores` Later

Purpose: materialized similarity results if on-demand computation gets slow.

Recommended columns:

- `id bigserial primary key`
- `ingestion_run_id uuid references ingestion_runs(id)`
- `target_player_slug text references players(player_slug)`
- `candidate_player_slug text references players(player_slug)`
- `basis text not null`
- `score numeric not null`
- `ratio_score numeric`
- `per_minute_score numeric`
- `physical_score numeric`
- `role_score numeric`
- `build_score numeric`
- `matching_traits jsonb not null default '[]'::jsonb`
- `summary_json jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null`
- Unique: `(ingestion_run_id, target_player_slug, candidate_player_slug, basis)`

## 5. Recommended Indexes

### Players

- `unique (player_slug)`
- `unique (nba_player_id)` where `nba_player_id is not null`
- `index on lower(player_name)`
- `index on normalized_player_name`
- `index on primary_team_id`
- `index on position`
- Later: `pg_trgm` GIN index on `player_name` for fast fuzzy search.

### Teams

- `unique (slug)`
- `unique (abbreviation)`
- `index on conference`

### Player Stat Values

- `index on (player_slug, season, season_type)`
- `index on (team, season, season_type)`
- `index on (source_sheet, cleaned_column_name)`
- `index on (cleaned_column_name, season, season_type)`
- `index on (season, season_type, cleaned_column_name, numeric_value desc)` for leaderboard-style queries.
- Partial index: `(cleaned_column_name, numeric_value desc) where numeric_value is not null`
- Unique index on `(ingestion_run_id, row_fingerprint)` to prevent duplicate inserts during retry.

### Player Season Summaries

- `index on (season, season_type)`
- `index on (team_id, season, season_type)`
- `index on (position, season, season_type)`
- `index on (season, season_type, pts desc)`
- `index on (season, season_type, ts_pct desc)`
- `index on (season, season_type, pie desc)`
- `index on (season, season_type, usage_rate desc)`
- `index on (season, season_type, net_rating desc)`
- For common filters: `(season, season_type, games, minutes)`.

### Player Profiles

- `unique (player_slug, season, season_type, ingestion_run_id)`
- `index on (season, season_type)`
- GIN index on `source_sheets` only if querying inside JSON becomes necessary.

### Data Issues And Column Dictionary

- `index on (ingestion_run_id)`
- `index on data_issues(type)`
- `index on column_dictionary(source_sheet, cleaned_column_name)`

### News

- `index on (published_at desc)`
- `index on (category, published_at desc)`
- Partial index on `(published_at desc) where active = true`

### Similarity Later

- `index on (target_player_slug, basis, score desc)`
- `index on (candidate_player_slug)`

## 6. Ingestion Plan

### Required Behavior

- The Excel workbook remains raw and unmodified.
- The current JSON outputs remain generated exactly as they are now.
- If `DATABASE_URL` exists, the ingestion script can write to Postgres.
- Local development without `DATABASE_URL` continues to generate SQLite/JSON only.
- Postgres writes must preserve:
  - raw values
  - raw JSON-safe values
  - numeric values when deterministic
  - original column names
  - cleaned column names
  - source sheet/category
  - source row and column locations
  - import notes
  - issues

### Recommended Write Flow

1. Run the existing audit and import logic.
2. Generate the current SQLite and JSON outputs first.
3. If `DATABASE_URL` is present, open a Postgres transaction.
4. Insert a new `ingestion_runs` row with `status = 'running'`.
5. Upsert teams.
6. Upsert players.
7. Insert profile rows for the new run.
8. Insert stat category and column dictionary rows for the new run.
9. Bulk insert `player_stat_values` using batched inserts or `COPY`.
10. Insert data issues.
11. Build or insert `player_season_summaries`.
12. Mark the ingestion run `succeeded`.
13. Commit transaction.
14. If anything fails, roll back the DB transaction and keep local JSON outputs intact.

### Important Safety Choices

- Do not delete previous successful DB runs during import.
- Add an "active run" concept through either:
  - an `import_metadata` key such as `active_ingestion_run_id`, or
  - a boolean/status on `ingestion_runs`.
- Frontend should read only the latest successful active run.
- Use `row_fingerprint` to prevent duplicate stat rows on retries.
- Add a `--no-postgres` escape hatch even if `DATABASE_URL` exists.
- Log database write failures to the console and issue log, but do not break JSON generation.

## 7. Frontend Transition Plan

### Keep Existing Fallback

The current site can keep working during the transition. The existing JSON flow should remain the default fallback until DB reads are proven in production.

### Add A Database Read Layer

Add a new server-only data access module, for example:

- `src/lib/db/client.server.ts`
- `src/lib/db/playerQueries.server.ts`
- `src/lib/data/dbBackedQueries.server.ts`

It should:

- only run on the server
- check whether `DATABASE_URL` exists
- use Postgres when available
- return `null` or throw a controlled internal error when unavailable
- never expose `DATABASE_URL` to the browser

### Transition Order

1. `/players`
   - Lowest risk.
   - Reads from `player_season_summaries`.
   - Fall back to `listPlayers()` from JSON if DB is unavailable.

2. Player profiles
   - Load profile metadata from `player_profiles`.
   - Load stat rows from `player_stat_values`.
   - Fall back to `public/data/player_profiles/{slug}.json`.

3. Leaderboards
   - Use `player_season_summaries` for common metrics.
   - Fall back to JSON summary data.

4. Compare and similarity
   - Use DB summaries for compare.
   - Keep similarity computation in app code until materialized `similarity_scores` is needed.

5. Teams
   - Move team summaries after player flows are stable.
   - Current team data depends more heavily on `official-snapshot.json`.

6. News
   - Move only if the news refresh automation needs persistent DB writes.

7. Games, shots, visuals
   - Keep JSON/cache for now.
   - Move later in a dedicated event/shot schema phase.

## 8. Required Packages And Recommended Library

### Recommendation

Use:

- Node/Next.js: `pg`
- Node types: `@types/pg`
- Python ingestion: `psycopg[binary]`
- SQL migrations: plain `.sql` files under a future `db/migrations/` folder

### Why `pg` Is Best Right Now

- The current ingestion script is Python, so Prisma or Drizzle would not cover the writer without rewriting ingestion in TypeScript.
- The data model is normalized and ingestion-heavy; plain SQL is clearer for bulk inserts, `COPY`, transactions, and indexes.
- `pg` is lightweight and works well with Railway Postgres.
- It avoids generating or maintaining ORM models before the schema is proven.
- The app already has strong TypeScript types at the query boundary; the database adapter can convert SQL rows into existing `Player`, `PlayerSeasonAggregate`, and profile shapes.

### Why Not Prisma Yet

- Heavier dependency and generated client.
- Less convenient for bulk row-value ingestion from Python.
- Adds schema/codegen complexity before the data model has stabilized.

### Why Not Drizzle Yet

- Drizzle is a reasonable future option for TypeScript migrations and typed SQL.
- It does not solve Python ingestion unless ingestion is rewritten or schema is duplicated.
- For Phase 3, plain SQL plus `pg`/`psycopg` is safer and more direct.

## 9. Railway Setup Plan

Do not change Railway yet. When ready:

1. Add a Railway Postgres service to the project.
2. Let Railway inject `DATABASE_URL` into the Basketball Savant service.
3. Keep `DATABASE_URL` server-only. Do not create `NEXT_PUBLIC_DATABASE_URL`.
4. Locally, keep working without `DATABASE_URL`; JSON fallback remains active.
5. Add migrations before any production DB write.
6. Run ingestion locally or through a controlled Railway job after schema exists.
7. Verify DB read path in a non-destructive mode before switching pages to prefer DB.

Recommended env behavior:

- No `DATABASE_URL`: use JSON only.
- `DATABASE_URL` present but no tables: app should continue JSON fallback.
- `DATABASE_URL` present and healthy: DB-backed pages may read from DB.
- Ingestion failure: rollback DB transaction and keep JSON outputs.

## 10. Risks

### Slow Ingestion

- 567k stat rows is not huge for Postgres, but row-by-row inserts would be slow.
- Use batched inserts or `COPY`.

### Duplicate Rows

- Retry logic can duplicate stat rows without a run id and row fingerprint.
- Use `ingestion_run_id` plus `row_fingerprint`.

### Schema Too Wide

- The Excel source has many sheets and columns.
- Avoid one giant player table with hundreds of nullable columns.
- Use `player_stat_values` for raw facts and `player_season_summaries` for common fast reads.

### Broken Production Deploy

- Adding a hard DB dependency too early could break Railway if env vars/tables are missing.
- All DB reads should be optional with JSON fallback at first.

### Loading Too Much Data

- Do not load every profile JSON/stat row for the players table.
- `/players` should use summary rows only.
- Player profile pages can query one player at a time.

### JSON And Database Mismatch

- During transition, JSON and DB may disagree.
- Tie both outputs to the same `ingestion_run` metadata and workbook hash.
- Add validation comparing JSON counts to DB counts before DB reads are trusted.

### Environment Differences

- Local Node is currently not the same version as the project engine in this workspace.
- Railway should use Node 22.x as configured.
- DB package choices should be tested in the deployment environment before switching reads.

## 11. Safe Implementation Phases

### Phase 3.1: Schema And Types Only

- Add SQL migration files.
- Add TypeScript DB types/interfaces.
- Add a server-only `pg` client wrapper.
- Add tests for connection-disabled fallback.
- Do not change page data sources yet.

### Phase 3.2: Optional Postgres Write In Ingestion

- Add `psycopg[binary]`.
- Keep all existing JSON/SQLite outputs.
- If `DATABASE_URL` exists, write to Postgres in one transaction.
- Add DB count validation after import.
- Do not change frontend reads yet.

### Phase 3.3: DB Query Layer With JSON Fallback

- Add read functions that return the same shapes as existing query helpers.
- Add fallback to current JSON query layer.
- Add tests that simulate no `DATABASE_URL`.

### Phase 3.4: Move `/players` To Database Reads

- Read from `player_season_summaries`.
- Keep existing sorting/filtering behavior.
- Fall back to JSON.
- Compare result counts and top rows against JSON.

### Phase 3.5: Move Player Profiles And Leaderboards

- Player profile metadata from `player_profiles`.
- Full stats from `player_stat_values`.
- Leaderboards from `player_season_summaries`.
- Keep JSON fallback.

### Phase 3.6: Railway Production Setup

- Add Railway Postgres service.
- Add/confirm `DATABASE_URL`.
- Run migrations.
- Run ingestion.
- Verify production pages.
- Monitor logs.

### Phase 3.7: Remove Old Fallback Only After Proven Safe

- Do not remove JSON fallback until DB has been stable across multiple deploys and data refreshes.
- Keep raw Excel and ingestion reports.
- Consider retaining static JSON as an emergency fallback even after DB becomes primary.

## Recommended First Implementation Step

The safest first implementation step is Phase 3.1:

1. Add SQL migration files only.
2. Add a server-only Postgres client wrapper using `pg`.
3. Add types for the proposed DB rows.
4. Add tests proving the app still uses JSON fallback when `DATABASE_URL` is missing.
5. Do not write to Postgres yet.
6. Do not move any page reads yet.

This gives the project a database foundation without touching production behavior.

## Files Likely To Change In Future Phase 3.1

- `package.json`
- `pnpm-lock.yaml`
- `db/migrations/001_initial_postgres_schema.sql`
- `src/lib/db/client.server.ts`
- `src/lib/db/types.ts`
- `src/lib/db/client.server.test.ts`
- possibly `README.md` or `docs/postgres-transition.md`

## Files Likely To Change In Future Phase 3.2

- `scripts/ingest_nba_excel.py`
- optional Python dependency file if added
- `data/processed/data_issues_log.json` after rerun
- generated JSON outputs after rerun, if ingestion logic changes

## What Should Not Be Touched Yet

- Railway settings.
- Production environment variables.
- Existing JSON data flow.
- Current page layouts and visual design.
- Raw Excel workbook.
- `src/lib/data/generated/official-snapshot.json` migration.
- `src/lib/data/generated/team-shot-charts.json` migration.
- News DB migration unless persistent news automation becomes a priority.

## Readiness Conclusion

The app can keep working during a Postgres transition if Postgres is added as an optional parallel path first. The current JSON-backed site is already stable enough to remain the fallback. The first production-safe move is not to rewrite pages; it is to add schema, a server-only DB client, and fallback-aware tests. After that, ingestion can write to Postgres while continuing to produce the current JSON outputs.
