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

### passes

Required fields:

- id
- possessionId
- passerId
- receiverId
- gameId
- season
- passType

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
