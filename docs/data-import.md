# Data Import Guide

The app uses `data/raw/nba_data_2025_26.xlsx` as the authoritative 2025-26 masterfile. Ingestion preserves the raw workbook, writes generated JSON and SQLite fallback artifacts, and can write the validated data into Postgres for production reads.

## Location

Place files in:

```txt
data/imports/
```

Ignored examples:

```txt
data/imports/players.csv
data/imports/shots.json
```

## Masterfile Refresh

Local fallback generation:

```bash
python scripts/ingest_nba_excel.py
```

Production refresh with Postgres output:

```bash
DATABASE_URL=postgresql://... python scripts/refresh_production_data.py --write-postgres
```

The production refresh path applies migrations, validates the workbook checksum and row counts, preserves generated JSON fallbacks, and skips unchanged complete data unless forced. Details are in `docs/production-data-refresh.md`.

## Official NBA Stats Refresh

```bash
pnpm refresh:official
pnpm refresh:official -- --include-rosters
pnpm refresh:official:shots
```

The official snapshot adapter remains available for source updates and shot-cache support. The default refresh writes `src/lib/data/generated/official-snapshot.json`.

The snapshot metadata includes public reference game fixtures for high-visibility displayed games. Each fixture records the expected date, teams, score, NBA.com box-score URL, Basketball Reference box-score URL, and ESPN game URL so tests can cross-check the app's game-log mapping against public sources.

The refresh also pulls NBA Stats Advanced player and team tables. Those tables supply official TS%, eFG%, USG%, AST%, rebound percentages, ratings, pace, PIE, and possession counts. Basketball Reference player advanced and per-game pages are parsed into `basketballReferencePlayerAdvancedCrosscheck`, which records matched BRef values and absolute deltas for TS%, eFG%, USG%, AST%, ORB%, DRB%, and TRB%. Basketball Reference team advanced rows are parsed into `basketballReferenceTeamAdvancedCrosscheck`, which compares team ratings, pace, TS%, eFG%, turnover percentage, ORB%, and DRB%. NBA Stats remains the primary machine-readable source; Basketball Reference is the public cross-reference and formula source.

## Supported Import Preview

`POST /api/import/csv` accepts a CSV body and returns a preview envelope:

```json
{
  "data": {
    "rows": [],
    "total": 0,
    "mode": "preview"
  }
}
```

## Expected Tables

### players

Required fields:

- id
- name
- slug
- teamId
- position
- height
- weight
- age
- active

### teams

Required fields:

- id
- name
- abbreviation
- city
- conference
- division

### games

Required fields:

- id
- date
- season
- seasonType
- homeTeamId
- awayTeamId
- homeScore
- awayScore
- status

### possessions

Required fields:

- id
- gameId
- season
- quarter
- clock
- offenseTeamId
- defenseTeamId
- playType
- primaryPlayerId
- resultType
- points
- expectedPoints

### shots

Required fields:

- id
- possessionId
- gameId
- season
- playerId
- teamId
- x
- y
- shotDistance
- shotZone
- pointsValue
- made
- expectedFgPct
- expectedPoints

Useful tracking/model fields:

- defenderId
- defenderDistance
- closestDefender
- contestLevel
- shotClock
- touchTime
- dribblesBeforeShot
- shotType
- playType
- isTransition
- isCatchAndShoot
- isPullUp

### passes

Required fields:

- id
- possessionId
- passerId
- receiverId

Useful tracking/model fields:

- xStart
- yStart
- xEnd
- yEnd
- ledToShot
- ledToAssist
- potentialAssist
- secondaryAssist

### tracking requirements

Shot quality, defender distance, play-type PPP, touch maps, pass networks, rebound chances, boxouts, contests, matchup difficulty, and gravity need row-level event/tracking data. A usable provider feed must include stable NBA-compatible IDs, period/clock or event timestamps, player/team/game IDs, coordinates where relevant, and display rights for derived metrics.

Basketball Reference and public NBA Stats aggregate tables are credible sources for box-score totals, advanced rate stats, team ratings, and formula cross-checks, but they do not provide the complete row-level optical/event feed needed for shot quality, defender distance, touch location, or lineup stint modeling. To enable those metrics, provide one of these:

- Licensed API credentials or scheduled exports from a provider that permits derived public display.
- CSV/JSON exports with stable NBA-compatible `gameId`, `teamId`, and `playerId` values.
- A clear data dictionary for coordinates, timestamps, shot context, possession context, and lineup stint definitions.
- Confirmation that ShotClock can store raw rows and show derived metrics on a public Railway deployment.

Minimum fields for tracking/event metrics:

- shot rows: game, period, clock, shooter, team, opponent, x/y coordinates, zone, shot type, result, points value, defender, defender distance, shot clock, touch time, dribbles, assist/pull-up/catch-and-shoot/transition flags
- possession rows: game, period, clock, offense, defense, lineup ids, play type, primary player, result type, points, expected points when available
- pass rows: passer, receiver, possession, start/end coordinates, potential assist, secondary assist, led-to-shot, led-to-assist
- rebound/defense rows: rebound chances, contested rebounds, boxouts, contests, matchup assignments, expected points allowed, actual points allowed
- lineup rows: five player ids, stint/game id, possessions, offensive rating, defensive rating, net rating, pace, and shooting/four-factor values when available

### defensive_events

Required fields:

- id
- gameId
- possessionId
- defenderId
- offensivePlayerId
- eventType
- expectedPointsAllowed
- actualPointsAllowed

### lineups

Required fields:

- id
- gameId
- teamId
- player1Id
- player2Id
- player3Id
- player4Id
- player5Id
- possessions
- offensiveRating
- defensiveRating
- netRating

## Production Import Rules

New persistent sources should not bypass the masterfile pipeline. Before a new CSV, JSON, API, or provider export writes production data, it must:

- preserve raw source rows or raw values;
- keep stable player, team, game, and season identifiers;
- validate foreign keys and required fields;
- write through an explicit Postgres ingestion run;
- preserve generated JSON fallback behavior where relevant;
- log data issues rather than silently fixing or dropping rows;
- recompute affected summaries and invalidate cached leaderboard/search results.
