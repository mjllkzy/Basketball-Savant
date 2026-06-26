export const databaseTables = [
  "ingestion_runs",
  "teams",
  "players",
  "player_profiles",
  "player_season_summaries",
  "player_stat_values",
  "shot_attempts",
  "stat_categories",
  "column_dictionary",
  "data_issues"
] as const;

export type DatabaseTableName = (typeof databaseTables)[number];

export type IngestionRunStatus = "running" | "succeeded" | "failed";

export type IngestionRunRow = {
  id: string;
  source_workbook_path: string;
  source_workbook_sha256: string;
  season: string;
  season_type: string;
  started_at: Date;
  finished_at: Date | null;
  status: IngestionRunStatus;
  sheets_found: number | null;
  sheets_imported: number | null;
  sheets_skipped: number | null;
  sheets_failed: number | null;
  unique_players: number | null;
  stat_rows_created: number | null;
  issues_logged: number | null;
  metadata: Record<string, unknown>;
};

export type TeamDbRow = {
  id: string;
  slug: string;
  abbreviation: string;
  city: string;
  name: string;
  conference: string | null;
  division: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  source: string;
  updated_at: Date;
};

export type PlayerDbRow = {
  player_slug: string;
  nba_player_id: string | null;
  app_player_id: string | null;
  player_name: string;
  normalized_player_name: string;
  primary_team_id: string | null;
  primary_team_abbreviation: string | null;
  position: string | null;
  height: string | null;
  height_inches: string | null;
  weight: number | null;
  age: number | null;
  college: string | null;
  country: string | null;
  jersey_number: string | null;
  headshot_url: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type PlayerProfileDbRow = {
  id: string;
  ingestion_run_id: string;
  player_slug: string;
  season: string;
  season_type: string;
  primary_team: string | null;
  teams: string[];
  name_variants: string[];
  source_sheets: string[];
  stat_rows: number;
  profile_json: Record<string, unknown> | null;
  created_at: Date;
};

export type PlayerSeasonSummaryDbRow = {
  id: string;
  ingestion_run_id: string;
  player_slug: string;
  team_id: string | null;
  season: string;
  season_type: string;
  position: string | null;
  games: number | null;
  minutes: string | null;
  pts: string | null;
  reb: string | null;
  ast: string | null;
  stl: string | null;
  blk: string | null;
  tov: string | null;
  fg_pct: string | null;
  three_pct: string | null;
  ft_pct: string | null;
  ts_pct: string | null;
  efg_pct: string | null;
  usage_rate: string | null;
  ast_pct: string | null;
  reb_pct: string | null;
  turnover_rate: string | null;
  off_rating: string | null;
  def_rating: string | null;
  net_rating: string | null;
  pie: string | null;
  summary_json: Record<string, unknown>;
};

export type PlayerStatValueDbRow = {
  id: string;
  ingestion_run_id: string;
  raw_player_name: string | null;
  player_name: string;
  player_slug: string;
  team: string | null;
  team_id: string | null;
  season: string;
  season_type: string;
  source_sheet: string;
  stat_category: string;
  original_column_name: string;
  cleaned_column_name: string;
  raw_value: string | null;
  raw_value_json: unknown;
  numeric_value: string | null;
  import_notes: string | null;
  source_row_number: number;
  source_column_letter: string;
  row_fingerprint: string;
};

export type ColumnDictionaryDbRow = {
  id: string;
  ingestion_run_id: string;
  source_sheet: string;
  stat_category: string;
  column_index: number;
  excel_column: string;
  original_column_name: string;
  cleaned_column_name: string;
  role: string;
  imported: boolean;
  notes: string | null;
};

export type DataIssueDbRow = {
  id: string;
  ingestion_run_id: string;
  severity: string;
  type: string;
  message: string;
  details: Record<string, unknown>;
  created_at: Date;
};
