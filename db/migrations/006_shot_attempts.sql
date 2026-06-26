-- Official NBA Stats shot attempts attached to the latest validated ingestion run.

CREATE TABLE IF NOT EXISTS shot_attempts (
  id bigserial PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  shot_id text NOT NULL,
  possession_id text NOT NULL,
  game_id text NOT NULL,
  season text NOT NULL,
  player_id text NOT NULL,
  player_slug text REFERENCES players(player_slug),
  team_id text NOT NULL REFERENCES teams(id),
  quarter integer NOT NULL,
  clock text NOT NULL,
  loc_x numeric NOT NULL,
  loc_y numeric NOT NULL,
  shot_distance numeric NOT NULL,
  shot_zone text NOT NULL,
  shot_type text NOT NULL,
  points_value integer NOT NULL,
  made boolean NOT NULL,
  assisted boolean NOT NULL DEFAULT false,
  dribbles_before_shot integer NOT NULL DEFAULT 0,
  touch_time numeric NOT NULL DEFAULT 0,
  defender_distance numeric NOT NULL DEFAULT 0,
  closest_defender text NOT NULL DEFAULT 'Not loaded',
  contest_level text NOT NULL DEFAULT 'Open',
  shot_clock numeric NOT NULL DEFAULT 12,
  expected_fg_pct numeric NOT NULL DEFAULT 0,
  expected_points numeric NOT NULL DEFAULT 0,
  actual_minus_expected numeric NOT NULL DEFAULT 0,
  play_type text NOT NULL,
  is_clutch boolean NOT NULL DEFAULT false,
  is_transition boolean NOT NULL DEFAULT false,
  is_catch_and_shoot boolean NOT NULL DEFAULT false,
  is_pull_up boolean NOT NULL DEFAULT false,
  is_at_rim boolean NOT NULL DEFAULT false,
  is_corner_three boolean NOT NULL DEFAULT false,
  is_above_break_three boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'team-shot-cache',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ingestion_run_id, shot_id)
);

CREATE INDEX IF NOT EXISTS idx_shot_attempts_team
  ON shot_attempts (ingestion_run_id, team_id, game_id);

CREATE INDEX IF NOT EXISTS idx_shot_attempts_player
  ON shot_attempts (ingestion_run_id, player_id, game_id);

CREATE INDEX IF NOT EXISTS idx_shot_attempts_player_slug
  ON shot_attempts (ingestion_run_id, player_slug, game_id);

CREATE INDEX IF NOT EXISTS idx_shot_attempts_game
  ON shot_attempts (ingestion_run_id, game_id);

CREATE INDEX IF NOT EXISTS idx_shot_attempts_zone
  ON shot_attempts (ingestion_run_id, shot_zone, shot_type);

CREATE OR REPLACE VIEW current_shot_attempts AS
SELECT shot.*
FROM shot_attempts shot
JOIN current_ingestion_run run ON run.id = shot.ingestion_run_id;
