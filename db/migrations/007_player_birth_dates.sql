-- Exact date of birth for live age calculation.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS birth_date date;
