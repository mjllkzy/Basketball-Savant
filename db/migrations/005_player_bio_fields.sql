-- Bio fields needed by DB-first player profile headers.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS draft_year integer,
  ADD COLUMN IF NOT EXISTS draft_round integer,
  ADD COLUMN IF NOT EXISTS draft_pick integer,
  ADD COLUMN IF NOT EXISTS roster_status text;
