-- Optional contract detail fields used by salary views and future automated updates.

ALTER TABLE player_contracts
  ADD COLUMN IF NOT EXISTS options_by_season jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS guarantee_status_by_season jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contract_notes text,
  ADD COLUMN IF NOT EXISTS source_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS needs_followup boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_player_contracts_options_by_season
  ON player_contracts USING gin (options_by_season);

CREATE INDEX IF NOT EXISTS idx_player_contracts_needs_followup
  ON player_contracts (needs_followup)
  WHERE needs_followup = true;
