# Metrics

All metrics are defined in `src/lib/metrics/registry.ts`. Display code should never invent a metric label, formula, or tooltip outside the registry.

## Formula Utilities

- `eFG% = (FGM + 0.5 * 3PM) / FGA`
- `TS% = PTS / (2 * (FGA + 0.44 * FTA))`
- `Pace = 48 * ((Team Possessions + Opponent Possessions) / (2 * Team Minutes Played / 5))`
- `Offensive Rating = Points Scored / Possessions * 100`
- `Defensive Rating = Points Allowed / Possessions * 100`
- `Net Rating = Offensive Rating - Defensive Rating`
- `Usage Rate = (FGA + 0.44 * FTA + TOV) / Team Possessions`
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

Metrics based directly on official box totals are active by default. Metrics that require tracking, matchup, play-type tagging, defender distance, pass location, touch time, or possession-level event detail are kept in the registry but return `N/A` until a real event/tracking source is connected.

## Expected Shot Value

The expected-shot model is intentionally transparent and testable, but it is not presented as official factual data unless a real shot-event/tracking feed is loaded. It starts with shot-zone baselines, then adjusts for:

- defender distance
- shot type
- transition/catch-and-shoot/pull-up flags
- player skill placeholder
- shot clock
- touch time and dribbles
- clutch context

The model returns `expectedFgPct` and `expectedPoints`. It is designed to be replaced later with logistic regression, gradient boosting, or a neural model.

## Sample-Size Notes

Small samples can make rate stats and actual-over-expected values noisy. Leaderboards should use minimum games, minutes, possessions, or attempts before exposing production claims.
