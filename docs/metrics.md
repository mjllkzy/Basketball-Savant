# Metrics

All metrics are defined in `src/lib/metrics/registry.ts`. Display code should never invent a metric label, formula, or tooltip outside the registry.

## Formula Utilities

- `eFG% = (FGM + 0.5 * 3PM) / FGA`
- `TS% = PTS / (2 * (FGA + 0.44 * FTA))`
- `Pace = 48 * ((Team Possessions + Opponent Possessions) / (2 * Team Minutes Played / 5))`
- `Offensive Rating = Points Scored / Possessions * 100`
- `Defensive Rating = Points Allowed / Possessions * 100`
- `Net Rating = Offensive Rating - Defensive Rating`
- `Usage Rate = NBA Stats USG_PCT when loaded; fallback = (FGA + 0.44 * FTA + TOV) * Team MIN / (MIN * (Team FGA + 0.44 * Team FTA + Team TOV))`
- `AST%, OREB%, DREB%, REB%, PIE, Pace, Ratings, and Possessions = NBA Stats Advanced columns when loaded`
- `Actual - Expected Points = Actual Points - Expected Points`
- `Shot Quality = Expected Points Per Shot`
- `Expected Points = Expected FG Probability * Points Value`
- `Rim Frequency = Rim Attempts / Total FGA`
- `Assist Rate = Assists / Teammate Made Field Goals While On Court`
- `Turnover Rate = Turnovers / Possessions Used`
- `Rebound Conversion = Rebounds / Rebound Chances`

## Categories

- Traditional
- Efficiency
- Shot Quality
- Shot Profile
- Creation
- Play Type
- Defense
- Rebounding
- Movement/Tracking
- Lineup
- Trend

## Accuracy Boundary

Metrics based directly on official box totals or NBA Stats Advanced tables are active by default. TS%, eFG%, USG%, AST%, rebound percentages, ratings, pace, PIE, and possession counts use NBA Stats Advanced when present. Basketball Reference player advanced, player per-game, and team advanced pages are parsed into snapshot cross-check tables for overlapping player and team efficiency/rate stats, and the glossary URL remains the public formula reference.

Metrics that require tracking, matchup, play-type tagging, defender distance, pass location, touch time, lineup stints, model inputs, or possession-level event detail are kept in the registry but return `N/A` until a real event/tracking/model source is connected. Their registry metadata is feed-gated so API consumers can distinguish them from active box-score metrics.

## Expected Shot Value

Expected-shot fields are registry definitions only until a real shot-event or tracking feed is connected. In the default official NBA Stats snapshot, expected FG%, shot quality, actual-minus-expected, rim/three/midrange shot quality, and clutch shot quality return `N/A` rather than locally estimated values.

When a licensed or public event feed is added, the adapter must persist the source expected values or the complete shot-context inputs used to calculate them. The model output should be treated as ShotClock analysis, not an official NBA fact, unless the upstream source explicitly provides the value.

## Tracking Feed Requirements

Shot quality, defender distance, play-type PPP, touch maps, pass networks, gravity, contest value, rebound chances, and matchup difficulty need row-level event/tracking data. The minimum useful feed includes NBA Stats-compatible game IDs, team IDs, player IDs, period/clock or event timestamps, shot x/y coordinates, shot zone/type, closest defender ID, defender distance, touch time, dribble count, shot clock, play type, pass events, rebound chances, boxouts, contests, matchup assignments, and terms that allow ShotClock to display derived results.

Basketball Reference is used as a public cross-check and formula reference for overlapping advanced/rate stats. It does not include the row-level optical tracking fields needed for defender distance, shot quality models, touch maps, pass maps, lineup networks, or matchup assignments.

## Sample-Size Notes

Small samples can make rate stats and actual-over-expected values noisy. Leaderboards should use minimum games, minutes, possessions, or attempts before exposing production claims.
