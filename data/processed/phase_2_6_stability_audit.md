# Phase 2.6 Stability Audit

Date: 2026-06-23

Scope: conservative hardening of the existing ShotClock data flow after Phase 2.5. This phase did not redesign pages, change navigation, change deployment settings, start Postgres, or modify the raw Excel workbook.

## 1. Pages And Components Audited

- Home: `src/app/page.tsx`
- Players index: `src/app/players/page.tsx`
- Player profile: `src/app/players/[playerId]/page.tsx`
- Compare: `src/app/compare/page.tsx`
- Similarity: `src/app/similarity/page.tsx`
- Teams index: `src/app/teams/page.tsx`
- Team profile: `src/app/teams/[teamId]/page.tsx`
- Leaderboards: `src/app/leaderboards/page.tsx`
- Custom leaderboards: `src/app/leaderboards/custom/page.tsx`
- Games and game reports: `src/app/games/page.tsx`, `src/app/games/[gameId]/page.tsx`
- Visuals: `src/app/visuals/page.tsx`
- Search: `src/app/search/page.tsx`, `src/components/layout/CommandSearch.tsx`
- News: `src/app/news/page.tsx`, `src/lib/news.ts`
- Shared data access: `src/lib/data/queries.ts`, `src/lib/data/master.ts`, `src/lib/data/masterProfiles.server.ts`, `src/lib/data/official.ts`
- Shared tables/charts: `src/components/ui/StatTable.tsx`, `src/components/domain/LineupTable.tsx`, `src/components/domain/PossessionTable.tsx`, `src/components/domain/SimilarPlayersTable.tsx`

## 2. Major Page Data Sources

- Home uses static page copy, brand image assets, and `src/lib/news.ts` for recent news preview.
- Players index uses `listPlayers()` from `src/lib/data/queries.ts`, backed by `src/lib/data/generated/master-player-summaries.json`.
- Player profile uses `getPlayerProfile()` for runtime summary data and `loadMasterPlayerProfile()` for the generated full profile JSON at `public/data/player_profiles/{slug}.json`.
- Compare uses `getPlayerProfile()` and `comparisonRows()`, backed by generated master summaries.
- Similarity uses `getPlayerByIdOrSlug()`, `getPlayerProfile()`, and `getSimilarPlayers()`, backed by generated master summaries.
- Leaderboards use `getPlayerLeaderboard()`, backed by generated master summaries for player aggregates.
- Teams index uses `officialTeamSeasonAggregates` through `teamSeasonAggregates`.
- Team profile uses official team aggregates plus master-summary roster rows.
- Games, game reports, search shot results, visuals, shot charts, possession feeds, and lineup helpers still use the official snapshot/event data layer where available.
- News uses `src/lib/data/news.json`.

## 3. Hardcoded, Demo, Or Stale Data

- No active `src/lib/data/seed.ts` file remains.
- No active code references to mock, demo, synthetic, or fictional data were found. The only remaining text match is the test that prevents those words from entering active metric documentation.
- `official-snapshot.json` remains a real static snapshot source for teams, games, event feeds, and fallback metadata. It is not a demo source, but it is separate from the Excel master data.
- `stocks` still exists as a compatibility metric and aggregate field because the historical type and registry support it. Visible glossary output filters it out, and visible player/comparison tables use separate STL and BLK fields.

## 4. Broken Or Risky Data Imports

- `src/lib/data/master.ts` correctly imports `src/lib/data/generated/master-player-summaries.json`.
- `src/lib/data/masterProfiles.server.ts` correctly reads the public player index and per-player profile JSON on the server only.
- `src/lib/data/official.ts` still imports `official-snapshot.json` for non-master data.
- Risk reduced in this phase: route lookups now use normalized player/team maps instead of repeated exact-match scans.
- Risk reduced in this phase: missing player/team aggregate rows now return `undefined` or omit broken rows instead of forcing non-null assertions in common query paths.

## 5. Player And Profile Slug Issues

- Players can have route-facing app slugs that differ from canonical generated master profile slugs when names include accents or NBA IDs.
- Existing Phase 2.5 name fallback handled most cases.
- This phase hardened generated profile resolution by normalizing canonical slugs, trimming whitespace, lowercasing input, and falling back to player-name lookup when a route-facing slug is provided with a name.
- Added tests for Luka Doncic/Luka Dončić route resolution and generated profile resolution.

## 6. Missing Fallback States

- Player and team route helpers now return clean `undefined` values for blank, missing, mixed-case, or whitespace-padded route inputs.
- `getPlayerProfile()` now returns `undefined` if the player exists but the aggregate row is missing.
- `getTeamProfile()` now returns `undefined` if the team exists but the aggregate row is missing.
- `getGameReport()` now returns `undefined` if required home/away team data is missing.
- Game reports now omit individual broken box-score or possession rows instead of throwing.
- `lineupPlayers()` now filters missing player references instead of returning forced undefined values.

## 7. Performance Concerns

- Players index and leaderboards continue to use generated summaries, not full per-player JSON profiles.
- Full generated profile JSON files are only loaded by player profile pages/server helpers.
- This phase replaced several repeated `players.find()` and `teams.find()` lookups with module-level maps.
- Remaining performance concern before large-scale traffic: all JSON data is bundled/read from static files. This is acceptable for the current phase, but Postgres or another indexed data store will be needed before supporting much larger data volumes and heavier query traffic.

## 8. Small Safe Improvements Made

- Added normalized `playerById`, `playerBySlug`, `teamById`, `teamBySlug`, and `teamByAbbreviation` maps in `src/lib/data/queries.ts`.
- Hardened player/team route lookup helpers against whitespace and casing.
- Hardened player profile, team profile, game report, shot filtering, search metadata, metric snapshots, and lineup player lookup against missing related records.
- Hardened generated master profile lookup and parsed-profile validation in `src/lib/data/masterProfiles.server.ts`.
- Renamed the metric registry helper type/parameter from `DefinitionSeed`/`seed` to `MetricDefinitionInput`/`definition` to avoid false stale-data matches in future scans.
- Added tests for normalized route lookup, missing profile fallback behavior, and master profile alias resolution.

## 9. Saved For Later Visual Redesign

- No visual redesign was done in this phase.
- Later work should address richer team pages, shot-chart/heatmap UX, broader navigation, homepage content polish, and any larger page hierarchy changes after the data layer is stable.
- Later work should also decide whether legacy `stocks` support should be removed entirely from types/generated aggregates or kept as an internal compatibility metric.

## 10. Still Needed Before Postgres

- Decide which team-level values should eventually come from the Excel masterfile versus official snapshot team aggregates.
- Define a database schema for player summaries, player profile stat rows, teams, games, news, and source metadata.
- Add an ingestion-to-database writer after the JSON pipeline is stable.
- Add query indexes for common player/team/metric filters.
- Keep the JSON production source until the database path is validated against tests and build output.
- Preserve the raw Excel workbook as immutable input and keep generated SQLite files ignored.

## Validation Notes

- Raw Excel file was not modified in this phase.
- `data/processed/nba_master.sqlite` was not staged or modified.
- No duplicate `* 2.json` or `* copy*.json` files were found under `public/data/player_profiles`.
- `pnpm test` passed before this report was written.
