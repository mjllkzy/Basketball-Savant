-- Compact team-level analytics sourced from the verified NBA Stats snapshot.

CREATE TABLE IF NOT EXISTS team_season_summaries (
  id bigserial PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  team_id text NOT NULL REFERENCES teams(id),
  season text NOT NULL,
  season_type text NOT NULL,
  games integer,
  wins integer,
  losses integer,
  pts numeric,
  pts_allowed numeric,
  fgm numeric,
  fga numeric,
  three_pm numeric,
  three_pa numeric,
  ftm numeric,
  fta numeric,
  oreb numeric,
  dreb numeric,
  reb numeric,
  ast numeric,
  stl numeric,
  blk numeric,
  tov numeric,
  possessions numeric,
  off_rating numeric,
  def_rating numeric,
  net_rating numeric,
  assist_pct numeric,
  offensive_rebound_pct numeric,
  defensive_rebound_pct numeric,
  rebound_pct numeric,
  turnover_pct numeric,
  efg_pct numeric,
  ts_pct numeric,
  pie numeric,
  pace numeric,
  three_frequency numeric,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (team_id, season, season_type, ingestion_run_id)
);

CREATE INDEX IF NOT EXISTS idx_team_season_summaries_season
  ON team_season_summaries (season, season_type);

CREATE INDEX IF NOT EXISTS idx_team_season_summaries_net
  ON team_season_summaries (season, season_type, net_rating DESC);

CREATE INDEX IF NOT EXISTS idx_team_season_summaries_team
  ON team_season_summaries (team_id, season, season_type);

CREATE OR REPLACE VIEW current_team_season_summaries AS
SELECT summary.*
FROM team_season_summaries summary
JOIN current_ingestion_run run ON run.id = summary.ingestion_run_id;
