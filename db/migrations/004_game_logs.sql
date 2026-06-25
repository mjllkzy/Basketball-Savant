-- Official NBA Stats game and box-score rows attached to a validated ingestion run.

CREATE TABLE IF NOT EXISTS games (
  id bigserial PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  season text NOT NULL,
  season_type text NOT NULL,
  game_date date NOT NULL,
  home_team_id text NOT NULL REFERENCES teams(id),
  away_team_id text NOT NULL REFERENCES teams(id),
  home_score integer NOT NULL,
  away_score integer NOT NULL,
  status text NOT NULL DEFAULT 'Final',
  neutral_site boolean NOT NULL DEFAULT false,
  arena text,
  UNIQUE (ingestion_run_id, game_id)
);

CREATE TABLE IF NOT EXISTS team_game_stats (
  id bigserial PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  team_id text NOT NULL REFERENCES teams(id),
  opponent_team_id text NOT NULL REFERENCES teams(id),
  minutes numeric,
  pts numeric,
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
  pf numeric,
  possessions numeric,
  FOREIGN KEY (ingestion_run_id, game_id) REFERENCES games(ingestion_run_id, game_id) ON DELETE CASCADE,
  UNIQUE (ingestion_run_id, game_id, team_id)
);

CREATE TABLE IF NOT EXISTS player_game_stats (
  id bigserial PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  player_slug text NOT NULL REFERENCES players(player_slug),
  nba_player_id text,
  team_id text NOT NULL REFERENCES teams(id),
  opponent_team_id text NOT NULL REFERENCES teams(id),
  minutes numeric,
  pts numeric,
  reb numeric,
  oreb numeric,
  dreb numeric,
  ast numeric,
  stl numeric,
  blk numeric,
  tov numeric,
  pf numeric,
  fgm numeric,
  fga numeric,
  three_pm numeric,
  three_pa numeric,
  ftm numeric,
  fta numeric,
  plus_minus numeric,
  FOREIGN KEY (ingestion_run_id, game_id) REFERENCES games(ingestion_run_id, game_id) ON DELETE CASCADE,
  UNIQUE (ingestion_run_id, game_id, player_slug, team_id)
);

CREATE INDEX IF NOT EXISTS idx_games_current_order
  ON games (ingestion_run_id, game_date DESC, game_id);

CREATE INDEX IF NOT EXISTS idx_games_team_date
  ON games (ingestion_run_id, home_team_id, away_team_id, game_date DESC);

CREATE INDEX IF NOT EXISTS idx_team_game_stats_team
  ON team_game_stats (ingestion_run_id, team_id, game_id);

CREATE INDEX IF NOT EXISTS idx_player_game_stats_player
  ON player_game_stats (ingestion_run_id, player_slug, game_id);

CREATE INDEX IF NOT EXISTS idx_player_game_stats_game_points
  ON player_game_stats (ingestion_run_id, game_id, pts DESC);

CREATE OR REPLACE VIEW current_games AS
SELECT game.*
FROM games game
JOIN current_ingestion_run run ON run.id = game.ingestion_run_id;

CREATE OR REPLACE VIEW current_team_game_stats AS
SELECT stat.*
FROM team_game_stats stat
JOIN current_ingestion_run run ON run.id = stat.ingestion_run_id;

CREATE OR REPLACE VIEW current_player_game_stats AS
SELECT stat.*
FROM player_game_stats stat
JOIN current_ingestion_run run ON run.id = stat.ingestion_run_id;
