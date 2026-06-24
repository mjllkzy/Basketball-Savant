import { getDatabaseAvailability, queryDatabase } from "./client.server";

export type DatabaseHealth =
  | {
      status: "disabled";
      configured: false;
      schemaReady: false;
      dataReady: false;
      message: string;
    }
  | {
      status: "uninitialized";
      configured: true;
      schemaReady: false;
      dataReady: false;
      message: string;
    }
  | {
      status: "connected";
      configured: true;
      schemaReady: true;
      dataReady: boolean;
      message: string;
      latestIngestion: {
        id: string;
        season: string;
        seasonType: string;
        finishedAt: string | null;
        players: number;
        statRows: number;
      } | null;
      currentPlayerSummaries: number;
    }
  | {
      status: "unavailable";
      configured: true;
      schemaReady: false;
      dataReady: false;
      message: string;
    };

type SchemaProbeRow = {
  schema_ready: boolean;
};

type DataProbeRow = {
  id: string | null;
  season: string | null;
  season_type: string | null;
  finished_at: Date | string | null;
  unique_players: number | string | null;
  stat_rows_created: number | string | null;
  current_player_summaries: number | string;
};

function safeMessage(error: unknown) {
  if (!(error instanceof Error)) return "Database connection failed.";
  if (/timeout/i.test(error.message)) return "Database connection timed out.";
  if (/password authentication failed/i.test(error.message)) return "Database authentication failed.";
  if (/getaddrinfo|ENOTFOUND/i.test(error.message)) return "Database hostname could not be resolved.";
  return "Database connection failed.";
}

function count(value: number | string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const availability = getDatabaseAvailability();
  if (!availability.available) {
    return {
      status: "disabled",
      configured: false,
      schemaReady: false,
      dataReady: false,
      message: availability.message,
    };
  }

  try {
    const schemaProbe = await queryDatabase<SchemaProbeRow>(`
      SELECT
        to_regclass('public.ingestion_runs') IS NOT NULL
        AND to_regclass('public.current_player_season_summaries') IS NOT NULL
        AS schema_ready
    `);
    if (!schemaProbe?.rows[0]?.schema_ready) {
      return {
        status: "uninitialized",
        configured: true,
        schemaReady: false,
        dataReady: false,
        message: "Database is reachable but migrations have not been applied.",
      };
    }

    const dataProbe = await queryDatabase<DataProbeRow>(`
      SELECT
        run.id,
        run.season,
        run.season_type,
        run.finished_at,
        run.unique_players,
        run.stat_rows_created,
        (SELECT count(*) FROM current_player_season_summaries) AS current_player_summaries
      FROM current_ingestion_run run
      UNION ALL
      SELECT NULL, NULL, NULL, NULL, 0, 0, 0
      WHERE NOT EXISTS (SELECT 1 FROM current_ingestion_run)
      LIMIT 1
    `);
    const row = dataProbe?.rows[0];
    const currentPlayerSummaries = count(row?.current_player_summaries ?? 0);
    const latestIngestion = row?.id
      ? {
          id: row.id,
          season: row.season ?? "",
          seasonType: row.season_type ?? "",
          finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
          players: count(row.unique_players),
          statRows: count(row.stat_rows_created),
        }
      : null;
    const dataReady = Boolean(latestIngestion && currentPlayerSummaries > 0);

    return {
      status: "connected",
      configured: true,
      schemaReady: true,
      dataReady,
      message: dataReady
        ? "Postgres is connected, migrated, and populated."
        : "Postgres is connected and migrated, but no successful ingestion is available.",
      latestIngestion,
      currentPlayerSummaries,
    };
  } catch (error) {
    return {
      status: "unavailable",
      configured: true,
      schemaReady: false,
      dataReady: false,
      message: safeMessage(error),
    };
  }
}
