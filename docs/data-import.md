# Data Import Guide

The app starts with an official NBA Stats snapshot and a parser boundary for future imports from CSV, JSON, official exports, or a database.

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

## Official NBA Stats Refresh

```bash
npm run refresh:official
npm run refresh:official -- --include-rosters
npm run refresh:official:shots
```

The default refresh writes `src/lib/data/generated/official-snapshot.json`.

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

## Production TODO

Implement a persistent adapter that validates imports, checks foreign keys, stores raw rows, recomputes derived aggregates, and invalidates cached leaderboard/search results.
