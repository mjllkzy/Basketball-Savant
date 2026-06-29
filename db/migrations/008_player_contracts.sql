-- Player contract salary source storage.
-- Rows preserve the source ranking while season salaries are normalized for fast per-year reads.

CREATE TABLE IF NOT EXISTS player_contract_sources (
  source_key text PRIMARY KEY,
  source_label text NOT NULL,
  source_file_sha256 text NOT NULL,
  received_date date NOT NULL,
  row_count integer NOT NULL CHECK (row_count >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_contracts (
  source_key text NOT NULL REFERENCES player_contract_sources(source_key) ON DELETE CASCADE,
  source_rank integer NOT NULL,
  player_slug text REFERENCES players(player_slug) ON DELETE SET NULL,
  source_player_name text NOT NULL,
  normalized_player_name text NOT NULL,
  team_abbreviation text NOT NULL,
  team_id text REFERENCES teams(id) ON DELETE SET NULL,
  guaranteed_amount bigint CHECK (guaranteed_amount IS NULL OR guaranteed_amount >= 0),
  salary_by_season jsonb NOT NULL DEFAULT '{}'::jsonb,
  matched_by text NOT NULL DEFAULT 'unmatched',
  match_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_key, source_rank)
);

CREATE TABLE IF NOT EXISTS player_contract_salaries (
  source_key text NOT NULL,
  source_rank integer NOT NULL,
  season text NOT NULL,
  salary_amount bigint NOT NULL CHECK (salary_amount >= 0),
  PRIMARY KEY (source_key, source_rank, season),
  FOREIGN KEY (source_key, source_rank)
    REFERENCES player_contracts(source_key, source_rank)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_player_contract_sources_imported_at
  ON player_contract_sources (imported_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_contracts_player
  ON player_contracts (player_slug)
  WHERE player_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_contracts_team
  ON player_contracts (team_id, team_abbreviation);

CREATE INDEX IF NOT EXISTS idx_player_contracts_normalized_name
  ON player_contracts (normalized_player_name);

CREATE INDEX IF NOT EXISTS idx_player_contract_salaries_season_salary
  ON player_contract_salaries (season, salary_amount DESC);

CREATE OR REPLACE VIEW current_player_contract_source AS
SELECT source.*
FROM player_contract_sources source
WHERE source.source_key = (
  SELECT source_key
  FROM player_contract_sources
  ORDER BY imported_at DESC, received_date DESC, source_key DESC
  LIMIT 1
);

CREATE OR REPLACE VIEW current_player_contracts AS
SELECT contract.*
FROM player_contracts contract
JOIN current_player_contract_source source
  ON source.source_key = contract.source_key;

CREATE OR REPLACE VIEW current_player_contract_salaries AS
SELECT salary.*
FROM player_contract_salaries salary
JOIN current_player_contract_source source
  ON source.source_key = salary.source_key;
