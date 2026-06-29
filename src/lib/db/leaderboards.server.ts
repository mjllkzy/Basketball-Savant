import { getMetric } from "@/lib/metrics/registry";
import { percentileRank } from "@/lib/metrics/formulas";
import { loadRuntimeFallbacks, type RuntimePlayerFallback } from "@/lib/data/runtimeFallbacks.server";
import { DEFAULT_SEASON, parseSeason } from "@/lib/seasons";
import { queryDatabase } from "./client.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/leaderboards.server.ts can only be imported on the server.");
}

export type PlayerLeaderboardRow = {
  rank: number;
  playerSlug: string;
  playerName: string;
  teamAbbreviation: string;
  position: string;
  value: number | null;
  percentile: number;
  games: number;
};

export type PlayerLeaderboardResult = {
  rows: PlayerLeaderboardRow[];
  source: "postgres" | "json";
};

type LeaderboardDbRow = {
  player_slug: string;
  player_name: string;
  primary_team_abbreviation: string | null;
  position: string | null;
  metric_value: number | string | null;
  percentile: number | string | null;
  games: number | string | null;
};

const metricColumns: Record<string, string> = {
  pts: "pts",
  reb: "reb",
  ast: "ast",
  stl: "stl",
  blk: "blk",
  tov: "tov",
  fg_pct: "fg_pct",
  three_pct: "three_pct",
  ft_pct: "ft_pct",
  ts_pct: "ts_pct",
  efg_pct: "efg_pct",
  usage_rate: "usage_rate",
  ast_pct: "ast_pct",
  reb_pct: "reb_pct",
  turnover_rate: "turnover_rate",
  off_rating: "off_rating",
  def_rating: "def_rating",
  net_rating: "net_rating",
  pie: "pie",
};

function numeric(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function jsonFallback(metricKey: string, limit: number, season = DEFAULT_SEASON): Promise<PlayerLeaderboardResult> {
  const { players, metadata } = await loadRuntimeFallbacks();
  if (metadata.season !== parseSeason(season)) return { source: "json", rows: [] };
  const valueFor = fallbackMetricValues[metricKey];
  if (!valueFor) return { source: "json", rows: [] };
  const metric = getMetric(metricKey);
  const values = players.map(valueFor).filter((value): value is number => value !== null);
  const sorted = players
    .map((player) => ({ player, value: valueFor(player) }))
    .filter((row): row is { player: RuntimePlayerFallback; value: number } => row.value !== null)
    .sort((left, right) => {
      const compared = metric.higherIsBetter ? right.value - left.value : left.value - right.value;
      return compared || left.player.player_name.localeCompare(right.player.player_name);
    })
    .slice(0, limit);

  return {
    source: "json",
    rows: sorted.map((row, index) => ({
      rank: index + 1,
      playerSlug: row.player.player_slug,
      playerName: row.player.player_name,
      teamAbbreviation: row.player.team_abbreviation ?? "NBA",
      position: row.player.position ?? "N/A",
      value: row.value,
      percentile: percentileRank(row.value, values, metric.higherIsBetter),
      games: row.player.games ?? 0,
    })),
  };
}

const fallbackMetricValues: Record<string, (row: RuntimePlayerFallback) => number | null> = {
  pts: (row) => row.pts,
  reb: (row) => row.reb,
  ast: (row) => row.ast,
  stl: (row) => row.stl,
  blk: (row) => row.blk,
  tov: (row) => row.tov,
  fg_pct: (row) => row.fg_pct,
  three_pct: (row) => row.three_pct,
  ft_pct: (row) => row.ft_pct,
  ts_pct: (row) => row.ts_pct,
  efg_pct: (row) => row.efg_pct,
  usage_rate: (row) => row.usage_rate,
  ast_pct: (row) => row.ast_pct,
  reb_pct: (row) => row.reb_pct,
  turnover_rate: (row) => row.turnover_rate,
  off_rating: (row) => row.off_rating,
  def_rating: (row) => row.def_rating,
  net_rating: (row) => row.net_rating,
  pie: (row) => row.pie,
};

export async function listPlayerLeaderboard(metricKey: string, limit = 50, season = DEFAULT_SEASON): Promise<PlayerLeaderboardResult> {
  const column = metricColumns[metricKey];
  if (!column) return jsonFallback(metricKey, limit, season);
  const selectedSeason = parseSeason(season);

  const metric = getMetric(metricKey);
  const sortDirection = metric.higherIsBetter ? "DESC" : "ASC";
  const percentileDirection = metric.higherIsBetter ? "ASC" : "DESC";
  const safeLimit = Math.min(100, Math.max(1, limit));

  try {
    const result = await queryDatabase<LeaderboardDbRow>(`
      WITH ranked AS (
        SELECT
          s.player_slug,
          s.games,
          s.${column} AS metric_value,
          percent_rank() OVER (ORDER BY s.${column} ${percentileDirection}) * 100 AS percentile
        FROM current_player_season_summaries s
        WHERE s.${column} IS NOT NULL
          AND s.season = $2
          AND s.season_type = 'Regular Season'
      )
      SELECT
        p.player_slug,
        p.player_name,
        p.primary_team_abbreviation,
        p.position,
        ranked.metric_value,
        ranked.percentile,
        ranked.games
      FROM ranked
      JOIN players p USING (player_slug)
      ORDER BY ranked.metric_value ${sortDirection} NULLS LAST, p.player_name
      LIMIT $1
    `, [safeLimit, selectedSeason]);
    if (!result?.rows.length) return jsonFallback(metricKey, safeLimit, selectedSeason);

    return {
      source: "postgres",
      rows: result.rows.map((row, index) => ({
        rank: index + 1,
        playerSlug: row.player_slug,
        playerName: row.player_name,
        teamAbbreviation: row.primary_team_abbreviation ?? "NBA",
        position: row.position ?? "N/A",
        value: numeric(row.metric_value),
        percentile: Math.round(numeric(row.percentile) ?? 0),
        games: Math.round(numeric(row.games) ?? 0),
      })),
    };
  } catch {
    return jsonFallback(metricKey, safeLimit, selectedSeason);
  }
}
