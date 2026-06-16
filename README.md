# Basketball Savant

Basketball Savant is a professional basketball analytics portal: advanced search, custom leaderboards, player pages, team pages, gamefeed, visual labs, comparison tools, similarity search, glossary, and API routes.

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
- Development-only reference data generator
- Future adapters for PostgreSQL, DuckDB, Parquet, official CSV imports, or licensed data feeds

## Setup

```bash
npm install
npm run refresh:official
npm run dev
```

Open `http://localhost:3000`.

For production-style verification:

```bash
npm run test
npm run lint
npm run build
npm start
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

## Real Data

The app defaults to `src/lib/data/generated/official-snapshot.json`, refreshed from official NBA Stats public JSON endpoints.

NBA Stats is the primary machine-readable source. Public box-score and series pages from Basketball Reference, NBA.com, and ESPN are tracked in snapshot metadata as cross-reference sources for score and series sanity checks.

Current default snapshot coverage:

- 2025-26 regular-season player totals
- 2025-26 playoff player totals
- 2025-26 NBA player index rows for position, jersey, height, weight, country, college, roster status, and draft metadata
- 2025-26 regular-season player bio-stat rows used as an official cross-check for height, weight, country, college, and draft metadata
- Explicit Basketball Reference player-bio fallback rows only where NBA Stats leaves a displayed bio field blank
- 2025-26 regular-season team totals
- 2025-26 playoff team totals
- 2025-26 regular-season team and player game logs when refreshed
- 2025-26 playoff team and player game logs when refreshed
- Best-effort team roster enrichment when `--include-rosters` is used

Refresh commands:

```bash
npm run refresh:official
npm run refresh:official -- --include-rosters
npm run refresh:official -- --include-team-game-logs
npm run refresh:official -- --include-player-game-logs
npm run refresh:official:shots
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
- tracking requirement
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

Persistent import is intentionally a TODO: wire the parser into a database adapter once the production data source is chosen.

## Known Limitations

- Tracking, defender-distance, gravity, pass-map, and some shot-quality values require licensed event/tracking data and display as `N/A` until connected.
- Expected shot value exists as a model interface and testable baseline, but is not used as factual production data without a shot-event/tracking feed.
- CSV import previews rows but does not persist them.
- Playwright e2e script is present, but browser smoke coverage should be expanded after product flows stabilize.

## Roadmap

See `docs/roadmap.md`.
