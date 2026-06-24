import type { PlayerFilters } from "@/lib/data/queries";
import { listPlayers } from "@/lib/data/queries";
import { calculatePlayerMetric } from "@/lib/metrics/registry";
import { queryDatabase } from "./client.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/playerDirectory.server.ts can only be imported on the server.");
}

export type PlayerDirectoryRow = {
  playerSlug: string;
  playerName: string;
  teamId: string;
  teamAbbreviation: string;
  position: string;
  height: string;
  weight: number | null;
  age: number | null;
  games: number;
  minutesPerGame: number | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  fgPct: number | null;
  threePct: number | null;
  ftPct: number | null;
  tsPct: number | null;
  efgPct: number | null;
  usageRate: number | null;
  astPct: number | null;
  rebPct: number | null;
  turnoverRate: number | null;
  offRating: number | null;
  defRating: number | null;
  netRating: number | null;
  pie: number | null;
};

export type PlayerDirectoryResult = {
  rows: PlayerDirectoryRow[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    source: "postgres" | "json";
  };
};

type PlayerDirectoryDbRow = {
  player_slug: string;
  player_name: string;
  team_id: string | null;
  primary_team_abbreviation: string | null;
  position: string | null;
  height: string | null;
  weight: number | null;
  age: number | null;
  games: number | string | null;
  minutes: number | string | null;
  pts: number | string | null;
  reb: number | string | null;
  ast: number | string | null;
  stl: number | string | null;
  blk: number | string | null;
  tov: number | string | null;
  fg_pct: number | string | null;
  three_pct: number | string | null;
  ft_pct: number | string | null;
  ts_pct: number | string | null;
  efg_pct: number | string | null;
  usage_rate: number | string | null;
  ast_pct: number | string | null;
  reb_pct: number | string | null;
  turnover_rate: number | string | null;
  off_rating: number | string | null;
  def_rating: number | string | null;
  net_rating: number | string | null;
  pie: number | string | null;
  total_count: number | string;
};

const sortColumns: Record<string, string> = {
  name: "p.player_name",
  team: "p.primary_team_abbreviation",
  position: "CASE p.position WHEN 'PG' THEN 1 WHEN 'SG' THEN 2 WHEN 'SF' THEN 3 WHEN 'PF' THEN 4 WHEN 'C' THEN 5 ELSE 6 END",
  pts: "s.pts",
  reb: "s.reb",
  ast: "s.ast",
  stl: "s.stl",
  blk: "s.blk",
  tov: "s.tov",
  fg_pct: "s.fg_pct",
  three_pct: "s.three_pct",
  ft_pct: "s.ft_pct",
  ts_pct: "s.ts_pct",
  efg_pct: "s.efg_pct",
  usage_rate: "s.usage_rate",
  ast_pct: "s.ast_pct",
  reb_pct: "s.reb_pct",
  turnover_rate: "s.turnover_rate",
  off_rating: "s.off_rating",
  def_rating: "s.def_rating",
  net_rating: "s.net_rating",
  pie: "s.pie",
};

function numeric(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapDbRow(row: PlayerDirectoryDbRow): PlayerDirectoryRow {
  return {
    playerSlug: row.player_slug,
    playerName: row.player_name,
    teamId: row.team_id ?? row.primary_team_abbreviation ?? "",
    teamAbbreviation: row.primary_team_abbreviation ?? "N/A",
    position: row.position ?? "N/A",
    height: row.height ?? "N/A",
    weight: row.weight,
    age: row.age,
    games: numeric(row.games) ?? 0,
    minutesPerGame: numeric(row.minutes),
    pts: numeric(row.pts),
    reb: numeric(row.reb),
    ast: numeric(row.ast),
    stl: numeric(row.stl),
    blk: numeric(row.blk),
    tov: numeric(row.tov),
    fgPct: numeric(row.fg_pct),
    threePct: numeric(row.three_pct),
    ftPct: numeric(row.ft_pct),
    tsPct: numeric(row.ts_pct),
    efgPct: numeric(row.efg_pct),
    usageRate: numeric(row.usage_rate),
    astPct: numeric(row.ast_pct),
    rebPct: numeric(row.reb_pct),
    turnoverRate: numeric(row.turnover_rate),
    offRating: numeric(row.off_rating),
    defRating: numeric(row.def_rating),
    netRating: numeric(row.net_rating),
    pie: numeric(row.pie),
  };
}

function jsonFallback(params: PlayerFilters): PlayerDirectoryResult {
  const result = listPlayers(params);
  return {
    rows: result.rows.map((row) => ({
      playerSlug: row.player.slug,
      playerName: row.player.name,
      teamId: row.team.id,
      teamAbbreviation: row.team.abbreviation,
      position: row.player.position,
      height: row.player.height,
      weight: row.player.weight || null,
      age: row.player.age || null,
      games: row.games,
      minutesPerGame: row.minutes / Math.max(row.games, 1),
      pts: calculatePlayerMetric("pts", row),
      reb: calculatePlayerMetric("reb", row),
      ast: calculatePlayerMetric("ast", row),
      stl: calculatePlayerMetric("stl", row),
      blk: calculatePlayerMetric("blk", row),
      tov: calculatePlayerMetric("tov", row),
      fgPct: calculatePlayerMetric("fg_pct", row),
      threePct: calculatePlayerMetric("three_pct", row),
      ftPct: calculatePlayerMetric("ft_pct", row),
      tsPct: calculatePlayerMetric("ts_pct", row),
      efgPct: calculatePlayerMetric("efg_pct", row),
      usageRate: calculatePlayerMetric("usage_rate", row),
      astPct: calculatePlayerMetric("ast_pct", row),
      rebPct: calculatePlayerMetric("reb_pct", row),
      turnoverRate: calculatePlayerMetric("turnover_rate", row),
      offRating: calculatePlayerMetric("off_rating", row),
      defRating: calculatePlayerMetric("def_rating", row),
      netRating: calculatePlayerMetric("net_rating", row),
      pie: calculatePlayerMetric("pie", row),
    })),
    meta: { ...result.meta, source: "json" },
  };
}

export async function listPlayerDirectory(params: PlayerFilters = {}): Promise<PlayerDirectoryResult> {
  const page = params.all ? 1 : Math.max(1, params.page ?? 1);
  const requestedPageSize = params.all ? 1000 : params.pageSize ?? 20;
  const pageSize = Math.min(1000, Math.max(1, requestedPageSize));
  const sortKey = sortColumns[params.sort ?? "name"] ? params.sort ?? "name" : "name";
  const sortColumn = sortColumns[sortKey];
  const order = params.order ?? (sortKey === "name" ? "asc" : "desc");
  const values: unknown[] = [];
  const where: string[] = [];
  const addValue = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (params.q?.trim()) {
    const placeholder = addValue(`%${params.q.trim()}%`);
    where.push(`(p.player_name ILIKE ${placeholder} OR p.primary_team_abbreviation ILIKE ${placeholder})`);
  }
  if (params.teamId) {
    const placeholder = addValue(params.teamId);
    where.push(`(p.primary_team_id = ${placeholder} OR p.primary_team_abbreviation = ${placeholder})`);
  }
  if (params.position) {
    const positions = params.position === "G" ? ["PG", "SG"] : params.position === "F" ? ["SF", "PF"] : [params.position];
    const placeholder = addValue(positions);
    where.push(`p.position = ANY(${placeholder}::text[])`);
  }
  if (params.minGames !== undefined) {
    where.push(`COALESCE(s.games, 0) >= ${addValue(params.minGames)}`);
  }
  if (params.minMinutes !== undefined) {
    where.push(`COALESCE(s.minutes, 0) * COALESCE(s.games, 0) >= ${addValue(params.minMinutes)}`);
  }

  const offset = (page - 1) * pageSize;
  const limitPlaceholder = addValue(pageSize);
  const offsetPlaceholder = addValue(offset);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const result = await queryDatabase<PlayerDirectoryDbRow>(
      `
      SELECT
        p.player_slug,
        p.player_name,
        p.primary_team_id AS team_id,
        p.primary_team_abbreviation,
        p.position,
        p.height,
        p.weight,
        p.age,
        s.games,
        s.minutes,
        s.pts,
        s.reb,
        s.ast,
        s.stl,
        s.blk,
        s.tov,
        s.fg_pct,
        s.three_pct,
        s.ft_pct,
        s.ts_pct,
        s.efg_pct,
        s.usage_rate,
        s.ast_pct,
        s.reb_pct,
        s.turnover_rate,
        s.off_rating,
        s.def_rating,
        s.net_rating,
        s.pie,
        count(*) OVER() AS total_count
      FROM current_player_season_summaries s
      JOIN players p USING (player_slug)
      ${whereSql}
      ORDER BY ${sortColumn} ${order === "asc" ? "ASC" : "DESC"} NULLS LAST, p.player_name ASC
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
      `,
      values,
    );
    if (!result) return jsonFallback(params);

    const total = numeric(result.rows[0]?.total_count ?? 0) ?? 0;
    return {
      rows: result.rows.map(mapDbRow),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        source: "postgres",
      },
    };
  } catch {
    return jsonFallback(params);
  }
}
