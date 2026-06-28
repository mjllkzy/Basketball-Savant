# ShotClock

ShotClock is a professional basketball analytics portal: advanced search, custom leaderboards, player pages, team pages, gamefeed, visual labs, comparison tools, similarity search, glossary, and API routes.

It is an original product direction inspired by the depth of elite sports analytics tools. It does not include official logos, protected league assets, proprietary layouts, or scraped protected data.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- TanStack Table
- Recharts plus custom SVG basketball visuals
- Zod validation for API query params
- Vitest tests
- Official NBA Stats snapshot adapter
- Excel masterfile ingestion with generated JSON/SQLite fallbacks
- Postgres-backed production reads for players, teams, games, shots, and leaderboard APIs
- Development-only reference data generator retained for local reference

## Setup

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

For production-style verification:

```bash
pnpm test
pnpm lint
pnpm build
pnpm start
```

## Routes

- `/` dashboard command center
- `/search` advanced shot and possession search
- `/leaderboards` leaderboard hub
- `/leaderboards/custom` custom leaderboard builder
- `/players` player index
- `/players/[playerId]` player profile
- `/teams` team index
- `/teams/[teamId]` team profile
- `/games` game index
- `/games/[gameId]` gamefeed and report
- `/visuals` visualization lab
- `/compare` player comparison
- `/similarity` similarity finder
- `/glossary` metric glossary
- `/about` project and data-source notes
- `/docs/api` API reference

## Production Data

The authoritative 2025-26 baseline is the tracked workbook at `data/raw/nba_data_2025_26.xlsx`. The ingestion pipeline preserves the raw workbook, writes generated JSON and SQLite fallback artifacts, and writes Postgres when explicitly run with database output enabled.

Production reads use Postgres where available and keep generated JSON as the local/degraded fallback. The current pipeline is documented in `docs/production-data-refresh.md`.

NBA Stats is the primary machine-readable source. Public box-score and series pages from Basketball Reference, NBA.com, and ESPN are tracked in snapshot metadata as cross-reference sources for score and series sanity checks.

NBA Stats Advanced player and team tables are loaded for TS%, eFG%, USG%, AST%, rebound percentages, ratings, pace, PIE, and official possession counts. Basketball Reference player advanced, player per-game, and team advanced pages are parsed into lightweight cross-check tables for player and team efficiency/rate stats; NBA Stats remains the primary machine-readable source.

The checked-in snapshot also carries `metadata.publicReferenceGames`: a public reference fixture for the displayed 2026 NBA Finals games. Tests compare those expected dates, teams, scores, and source URLs against the game-log rows so the dashboard cannot silently drift back to generated or mismatched latest-game cards.

Current default snapshot coverage:

- 2025-26 regular-season player totals
- 2025-26 playoff player totals
- 2025-26 regular-season and playoff player advanced stats from NBA Stats Advanced
- 2025-26 Basketball Reference player advanced and per-game rows for source cross-checks
- 2025-26 NBA player index rows for position, jersey, height, weight, country, college, roster status, and draft metadata
- 2025-26 regular-season player bio-stat rows used as an official cross-check for height, weight, country, college, and draft metadata
- Explicit Basketball Reference player-bio fallback rows only where NBA Stats leaves a displayed bio field blank
- 2025-26 regular-season team totals
- 2025-26 playoff team totals
- 2025-26 regular-season and playoff team advanced stats from NBA Stats Advanced
- 2025-26 Basketball Reference team advanced rows for source cross-checks
- 2025-26 regular-season team and player game logs when refreshed
- 2025-26 playoff team and player game logs when refreshed
- Best-effort team roster enrichment when `--include-rosters` is used

Local and production refresh commands:

```bash
python scripts/ingest_nba_excel.py
python scripts/refresh_production_data.py
DATABASE_URL=postgresql://... python scripts/refresh_production_data.py --write-postgres
```

The larger game-log and shot-event endpoints can be slower, so they are optional. If they are not loaded, the relevant UI surfaces show empty states or `N/A` rather than fabricated data.

## Data Model

The official snapshot and adapter model:

- teams
- players
- games
- lineups
- possessions, shots, passes, rebounds, and defensive events when optional event feeds are refreshed
- player game stats
- team game stats
- derived metric values

Core types live in `src/lib/types.ts`. Official data mapping lives in `src/lib/data/official.ts`. Query and adapter-style helpers live in `src/lib/data/queries.ts`. The old generated sample file remains as a development reference only and is not used by the app.

## Metric Registry

Every displayed metric is defined in `src/lib/metrics/registry.ts` with:

- key and labels
- category
- description
- formula
- unit
- directionality
- source type
- feed/tracking requirement
- sample-size note
- glossary markdown

Formula utilities live in `src/lib/metrics/formulas.ts`. The expected shot value model lives in `src/lib/models/expectedShotValue.ts`.

## How To Add A Metric

1. Add the metric definition to `metricRegistry`.
2. Add the calculation to `calculatePlayerMetric` or `calculateTeamMetric`.
3. Add tests for formula behavior and display formatting.
4. Use the metric key in pages, leaderboards, charts, or API responses.

## Importing Data

Place local CSV or JSON files in `data/imports/`. The app includes a CSV parser and a preview endpoint at `POST /api/import/csv`.

The production import path is the Excel masterfile pipeline. CSV import remains preview-only until a new source is explicitly approved, mapped, validated, and connected to the same Postgres/raw-value preservation rules used by the masterfile ingestion.

## Known Limitations

- Tracking, defender-distance, gravity, pass-map, lineup, and shot-quality values require licensed event/tracking/model input data and display as `N/A` until connected.
- Expected shot value exists as a model interface and testable baseline, but is not used as factual production data without a shot-event/tracking feed.
- CSV import previews rows but does not persist them.
- Playwright e2e script is present, but browser smoke coverage should be expanded after product flows stabilize.

## Tracking Feed Requirements

To turn on shot quality, defender distance, play type PPP, touch maps, pass networks, gravity, and rebound-chance metrics, ShotClock needs row-level event or tracking data with stable game IDs, player IDs, team IDs, event timestamps, shot coordinates, closest defender or matchup IDs, defender distance, touch time, dribble count, shot clock, play type tags, pass/rebound/contest events, and source licensing terms that allow display in the app. A CSV export, database URL, or licensed provider API can work as long as those fields are present and can be mapped to NBA Stats IDs.

## Roadmap

See `docs/roadmap.md`.
