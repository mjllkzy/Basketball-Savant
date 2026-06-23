# Phase 2.5 Frontend Data Audit

## Scope

- Raw source of truth remains `data/raw/nba_data_2025_26.xlsx`.
- Ingestion pipeline remains `scripts/ingest_nba_excel.py`.
- Current production frontend data source remains generated JSON, not Postgres.
- Raw Excel, Railway settings, and Postgres were not changed.

## Generated Data Files Reviewed

| File | Role | Status |
| --- | --- | --- |
| `src/lib/data/generated/master-player-summaries.json` | Runtime player summary data used by `src/lib/data/master.ts` | Active |
| `public/data/players.json` | Lightweight public index for generated player profile files | Active after Phase 2.5 profile loader |
| `public/data/player_profiles/{player_slug}.json` | Full per-player stat rows from the Excel masterfile | Active on player profile pages after Phase 2.5 |
| `src/lib/data/generated/official-snapshot.json` | Official NBA Stats snapshot for teams, games, game logs, shot feeds, and cross-checks | Active |
| `src/lib/data/generated/team-shot-charts.json` | Optional cached team shot-chart events | Active for team shot maps when available |

## Answers

1. **Which website pages currently use the generated master data?**
   - `/players` uses `listPlayers()` from `src/lib/data/queries.ts`, which reads `masterPlayerSeasonAggregates` from `src/lib/data/master.ts`.
   - `/players/[playerId]` uses `getPlayerProfile()` for summary aggregates and now loads full `public/data/player_profiles/{slug}.json` through `src/lib/data/masterProfiles.server.ts`.
   - `/compare` uses `getPlayerProfile()` and comparison rows built from master-backed `PlayerSeasonAggregate` rows.
   - `/similarity` uses `getPlayerProfile()` and `getSimilarPlayers()` from master-backed aggregates.
   - `/leaderboards` and `/leaderboards/custom` use player leaderboards from master-backed aggregates.
   - `/search` uses the master-backed player list for player filters and display names, but shot rows still depend on official/event feeds.
   - `/visuals` uses `playerSeasonAggregates` for player aggregate views, plus official/event feeds where available.
   - Home links and descriptions reference the masterfile; home news is separate static JSON.

2. **Which pages still use hardcoded/demo/static player stats?**
   - No active route imports the old seed/demo data after Phase 2.5.
   - `src/lib/data/seed.ts` was removed because it was unused stale demo data.
   - News content in `src/lib/data/news.json` is static editorial data, not player stats.

3. **Which pages use `src/lib/data/generated/master-player-summaries.json`?**
   - Directly: `src/lib/data/master.ts`.
   - Indirectly through `src/lib/data/queries.ts`: `/players`, `/players/[playerId]`, `/compare`, `/similarity`, `/leaderboards`, `/leaderboards/custom`, `/search`, `/visuals`, and player/team API routes that expose player aggregates.

4. **Which pages use `public/data/players.json`?**
   - After Phase 2.5: `src/lib/data/masterProfiles.server.ts` imports this lightweight index.
   - `/players/[playerId]` uses it indirectly to resolve the canonical profile JSON path for the selected player.
   - Tests use it to verify every listed player has a generated profile file.

5. **Which pages use `public/data/player_profiles/{slug}.json`?**
   - After Phase 2.5: `/players/[playerId]` loads the selected player profile JSON only for that page.
   - The main players table does not load every profile JSON; it stays on summary data for speed.

6. **Are all player links/slugs working?**
   - App links use route slugs from `Player.slug`.
   - `getPlayerByIdOrSlug()` also resolves canonical master slugs through `masterPlayerAliasBySlug`.
   - Phase 2.5 adds `masterPlayerSlugById` so route slugs can resolve to canonical profile-file slugs.
   - Added tests verify every app player name maps to a generated profile file.

7. **Are player pages loading full profile data or only summary data?**
   - Before Phase 2.5: player pages used summary-derived aggregates only.
   - After Phase 2.5: player pages still use summaries for fast cards/charts, and additionally load the selected player's full profile JSON for source-sheet count, stat-row count, key raw stats, and category coverage.

8. **Are player ranking tables sortable/filterable using generated data?**
   - Yes. `/players`, `/leaderboards`, `/leaderboards/custom`, `/compare`, and `/similarity` use `playerSeasonAggregates` from the Excel-backed master summary layer.
   - Existing table sorting keeps missing values at the bottom and supports custom positional sorting.

9. **Are team pages connected to generated data?**
   - Partially.
   - Team records/ratings still come from `officialTeamSeasonAggregates` in the official snapshot.
   - Team roster rows now use master-backed `playerSeasonAggregates`.
   - Team shot maps use live/cached official shot charts if present.

10. **Is the compare page connected to generated data?**
    - Yes. Compare cards and metric edges use `getPlayerProfile()` aggregates from the master summary layer.
    - The player dropdown uses the master-backed `players` list.

11. **Are there any duplicate or conflicting data sources?**
    - Active player aggregates come from the Excel master summary layer.
    - Active teams/games/events still come from the official snapshot because the Excel pipeline currently generates player-focused outputs.
    - The old seed/demo data source has been removed.
    - `official-snapshot.json` remains necessary until team/game/event data are either produced by the Excel pipeline or moved to Postgres.

12. **Are there any broken imports, missing files, or stale mock data files?**
    - No missing profile files were found: `public/data/players.json` has 582 rows and `public/data/player_profiles` has 582 JSON files.
    - No duplicate `* 2.json` or `* copy*.json` profile files were found.
    - Stale mock file `src/lib/data/seed.ts` was removed.

13. **What should be fixed before Postgres?**
    - Decide whether team aggregates should be generated from the Excel masterfile instead of staying in `official-snapshot.json`.
    - Decide whether full profile JSON should be exposed through API routes as metadata only or full raw stat rows.
    - Keep the summary/profile split: list pages should use compact summaries; detail pages can load one full profile.
    - Add a typed Postgres schema that mirrors the current JSON contract before changing the frontend data API.

## Phase 2.5 Changes Made

- Added `src/lib/data/masterProfiles.server.ts` for server-only access to `public/data/players.json` and selected `public/data/player_profiles/{slug}.json` files.
- Exposed `masterPlayerSlugById` from `src/lib/data/master.ts`.
- Added `masterSlug` to `getPlayerProfile()` results without changing the existing summary aggregate behavior.
- Updated `/players/[playerId]` to show a Master Data Profile section with identity, season, team, source sheet count, stat row count, key raw stats, and category coverage.
- Removed unused `src/lib/data/seed.ts`.
- Added tests for generated player index/profile coverage and full profile loading.

## Remaining Work

- Team-level records and ratings still use the official NBA Stats snapshot, not Excel-generated team summary JSON.
- Shot search and visual shot-event pages depend on official/event feeds; full profile JSON does not provide row-level shot coordinates.
- Game pages still depend on official game-log feeds.
