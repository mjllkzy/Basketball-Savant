# API Notes

All API responses use:

```ts
{
  data: unknown,
  meta?: Record<string, unknown>,
  error?: {
    code: string,
    message: string,
    details?: unknown
  }
}
```

## Core Endpoints

- `GET /api/health`
- `GET /api/players`
- `GET /api/players/:id`
- `GET /api/players/:id/summary`
- `GET /api/players/:id/metrics`
- `GET /api/players/:id/shots`
- `GET /api/players/:id/rolling`
- `GET /api/players/:id/similar`
- `GET /api/teams`
- `GET /api/teams/:id`
- `GET /api/teams/:id/summary`
- `GET /api/teams/:id/metrics`
- `GET /api/teams/:id/shots`
- `GET /api/teams/:id/lineups`
- `GET /api/games`
- `GET /api/games/:id`
- `GET /api/games/:id/feed`
- `GET /api/games/:id/boxscore`
- `GET /api/games/:id/lineups`
- `GET /api/search/events`
- `GET /api/search/shots`
- `GET /api/search/possessions`
- `GET /api/leaderboards`
- `GET /api/leaderboards/custom`
- `GET /api/metrics`
- `GET /api/glossary`
- `POST /api/import/csv`

`/api/v1/players`, `/api/v1/teams`, `/api/v1/games`, `/api/v1/leaders`, and `/api/v1/search` alias the main core endpoints.

## Query Behavior

List endpoints normalize params, filter, sort with stable tie-breakers, paginate, and return meta totals.

Invalid query params return `400`. Missing entities return `404`. Empty result lists return `200` with an empty `data` array.
