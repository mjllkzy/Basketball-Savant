-- Phase 3.1 database foundation for Basketball Savant.
-- This file is intentionally not executed by the app yet.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_workbook_path text NOT NULL,
  source_workbook_sha256 text NOT NULL,
  season text NOT NULL,
  season_type text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  sheets_found integer,
  sheets_imported integer,
  sheets_skipped integer,
  sheets_failed integer,
  unique_players integer,
  stat_rows_created integer,
  issues_logged integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS teams (
  id text PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  abbreviation text UNIQUE NOT NULL,
  city text NOT NULL,
  name text NOT NULL,
  conference text,
  division text,
  primary_color text,
  secondary_color text,
  source text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  player_slug text PRIMARY KEY,
  nba_player_id text UNIQUE,
  app_player_id text UNIQUE,
  player_name text NOT NULL,
  normalized_player_name text NOT NULL,
  primary_team_id text REFERENCES teams(id),
  primary_team_abbreviation text,
  position text,
  height text,
  height_inches numeric,
  weight integer,
  age integer,
  college text,
  country text,
  jersey_number text,
  headshot_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_profiles (
  id bigserial PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  player_slug text NOT NULL REFERENCES players(player_slug),
  season text NOT NULL,
  season_type text NOT NULL,
  primary_team text,
  teams jsonb NOT NULL DEFAULT '[]'::jsonb,
  name_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_sheets jsonb NOT NULL DEFAULT '[]'::jsonb,
  stat_rows integer NOT NULL,
  profile_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_slug, season, season_type, ingestion_run_id)
);

CREATE TABLE IF NOT EXISTS stat_categories (
  id bigserial PRIMARY KEY,
  source_sheet text NOT NULL,
  stat_category text NOT NULL,
  description text,
  UNIQUE (source_sheet, stat_category)
);

CREATE TABLE IF NOT EXISTS column_dictionary (
  id bigserial PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  source_sheet text NOT NULL,
  stat_category text NOT NULL,
  column_index integer NOT NULL,
  excel_column text NOT NULL,
  original_column_name text NOT NULL,
  cleaned_column_name text NOT NULL,
  role text NOT NULL,
  imported boolean NOT NULL,
  notes text,
  UNIQUE (ingestion_run_id, source_sheet, column_index, cleaned_column_name)
);

CREATE TABLE IF NOT EXISTS player_stat_values (
  id bigserial PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  raw_player_name text,
  player_name text NOT NULL,
  player_slug text NOT NULL REFERENCES players(player_slug),
  team text,
  team_id text REFERENCES teams(id),
  season text NOT NULL,
  season_type text NOT NULL,
  source_sheet text NOT NULL,
  stat_category text NOT NULL,
  original_column_name text NOT NULL,
  cleaned_column_name text NOT NULL,
  raw_value text,
  raw_value_json jsonb,
  numeric_value numeric,
  import_notes text,
  source_row_number integer NOT NULL,
  source_column_letter text NOT NULL,
  row_fingerprint text NOT NULL,
  UNIQUE (ingestion_run_id, row_fingerprint)
);

CREATE TABLE IF NOT EXISTS player_season_summaries (
  id bigserial PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  player_slug text NOT NULL REFERENCES players(player_slug),
  team_id text REFERENCES teams(id),
  season text NOT NULL,
  season_type text NOT NULL,
  position text,
  games integer,
  minutes numeric,
  pts numeric,
  reb numeric,
  ast numeric,
  stl numeric,
  blk numeric,
  tov numeric,
  fg_pct numeric,
  three_pct numeric,
  ft_pct numeric,
  ts_pct numeric,
  efg_pct numeric,
  usage_rate numeric,
  ast_pct numeric,
  reb_pct numeric,
  turnover_rate numeric,
  off_rating numeric,
  def_rating numeric,
  net_rating numeric,
  pie numeric,
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (player_slug, season, season_type, ingestion_run_id)
);

CREATE TABLE IF NOT EXISTS data_issues (
  id bigserial PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  severity text NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status_started_at
  ON ingestion_runs (status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_teams_conference
  ON teams (conference);

CREATE INDEX IF NOT EXISTS idx_players_normalized_name
  ON players (normalized_player_name);

CREATE INDEX IF NOT EXISTS idx_players_lower_name
  ON players (lower(player_name));

CREATE INDEX IF NOT EXISTS idx_players_primary_team
  ON players (primary_team_id);

CREATE INDEX IF NOT EXISTS idx_players_position
  ON players (position);

CREATE INDEX IF NOT EXISTS idx_player_profiles_player_season
  ON player_profiles (player_slug, season, season_type);

CREATE INDEX IF NOT EXISTS idx_player_profiles_season
  ON player_profiles (season, season_type);

CREATE INDEX IF NOT EXISTS idx_stat_categories_sheet_category
  ON stat_categories (source_sheet, stat_category);

CREATE INDEX IF NOT EXISTS idx_column_dictionary_run
  ON column_dictionary (ingestion_run_id);

CREATE INDEX IF NOT EXISTS idx_column_dictionary_sheet_column
  ON column_dictionary (source_sheet, cleaned_column_name);

CREATE INDEX IF NOT EXISTS idx_player_stat_values_player_season
  ON player_stat_values (player_slug, season, season_type);

CREATE INDEX IF NOT EXISTS idx_player_stat_values_team_season
  ON player_stat_values (team, season, season_type);

CREATE INDEX IF NOT EXISTS idx_player_stat_values_team_id_season
  ON player_stat_values (team_id, season, season_type);

CREATE INDEX IF NOT EXISTS idx_player_stat_values_sheet_column
  ON player_stat_values (source_sheet, cleaned_column_name);

CREATE INDEX IF NOT EXISTS idx_player_stat_values_column_season
  ON player_stat_values (cleaned_column_name, season, season_type);

CREATE INDEX IF NOT EXISTS idx_player_stat_values_leaderboard
  ON player_stat_values (season, season_type, cleaned_column_name, numeric_value DESC)
  WHERE numeric_value IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_season_summaries_season
  ON player_season_summaries (season, season_type);

CREATE INDEX IF NOT EXISTS idx_player_season_summaries_team
  ON player_season_summaries (team_id, season, season_type);

CREATE INDEX IF NOT EXISTS idx_player_season_summaries_position
  ON player_season_summaries (position, season, season_type);

CREATE INDEX IF NOT EXISTS idx_player_season_summaries_common_filters
  ON player_season_summaries (season, season_type, games, minutes);

CREATE INDEX IF NOT EXISTS idx_player_season_summaries_pts
  ON player_season_summaries (season, season_type, pts DESC);

CREATE INDEX IF NOT EXISTS idx_player_season_summaries_ts
  ON player_season_summaries (season, season_type, ts_pct DESC);

CREATE INDEX IF NOT EXISTS idx_player_season_summaries_pie
  ON player_season_summaries (season, season_type, pie DESC);

CREATE INDEX IF NOT EXISTS idx_player_season_summaries_usage
  ON player_season_summaries (season, season_type, usage_rate DESC);

CREATE INDEX IF NOT EXISTS idx_player_season_summaries_net
  ON player_season_summaries (season, season_type, net_rating DESC);

CREATE INDEX IF NOT EXISTS idx_data_issues_run
  ON data_issues (ingestion_run_id);

CREATE INDEX IF NOT EXISTS idx_data_issues_type
  ON data_issues (type);

COMMIT;
