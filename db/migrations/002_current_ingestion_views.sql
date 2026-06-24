-- Stable read targets for the latest successful ingestion.

CREATE OR REPLACE VIEW current_ingestion_run AS
SELECT *
FROM ingestion_runs
WHERE status = 'succeeded'
ORDER BY finished_at DESC NULLS LAST, started_at DESC
LIMIT 1;

CREATE OR REPLACE VIEW current_player_profiles AS
SELECT profile.*
FROM player_profiles profile
JOIN current_ingestion_run run ON run.id = profile.ingestion_run_id;

CREATE OR REPLACE VIEW current_player_season_summaries AS
SELECT summary.*
FROM player_season_summaries summary
JOIN current_ingestion_run run ON run.id = summary.ingestion_run_id;

CREATE OR REPLACE VIEW current_player_stat_values AS
SELECT stat.*
FROM player_stat_values stat
JOIN current_ingestion_run run ON run.id = stat.ingestion_run_id;

CREATE OR REPLACE VIEW current_column_dictionary AS
SELECT dictionary.*
FROM column_dictionary dictionary
JOIN current_ingestion_run run ON run.id = dictionary.ingestion_run_id;

CREATE OR REPLACE VIEW current_data_issues AS
SELECT issue.*
FROM data_issues issue
JOIN current_ingestion_run run ON run.id = issue.ingestion_run_id;
