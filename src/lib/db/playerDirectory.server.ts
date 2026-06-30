import { loadRuntimeFallbacks, type RuntimePlayerFallback } from "@/lib/data/runtimeFallbacks.server";
import { buildUpcomingRosterRows } from "@/lib/data/currentRoster";
import { officialBasketballReferenceGamesStartedByPlayerId, officialPlayerBirthDateById } from "@/lib/data/official";
import { decimalAgeFromBirthDate, normalizeBirthDate } from "@/lib/playerAge";
import type { SeasonType } from "@/lib/types";
import { DEFAULT_SEASON_TYPE, parseSeasonType, seasonTypeOptions } from "@/lib/seasonTypes";
import { DEFAULT_SEASON, UPCOMING_SEASON, mergeSeasonOptions, parseSeason, type SeasonOption } from "@/lib/seasons";
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
  birthDate: string | null;
  games: number;
  gamesStarted: number | null;
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

export type PlayerDirectoryFilters = {
  seasons: SeasonOption[];
  seasonTypes: Array<{ label: string; value: SeasonType }>;
  teams: Array<{ label: string; value: string }>;
  positions: string[];
  source: "postgres" | "json";
};

export type PlayerDirectoryParams = {
  page?: number;
  pageSize?: number;
  all?: boolean;
  sort?: string;
  order?: "asc" | "desc";
  q?: string;
  teamId?: string;
  position?: string;
  season?: string;
  seasonType?: SeasonType;
  minGames?: number;
  minMinutes?: number;
};

type PlayerDirectoryDbRow = {
  player_slug: string;
  nba_player_id: string | null;
  player_name: string;
  team_id: string | null;
  primary_team_abbreviation: string | null;
  position: string | null;
  height: string | null;
  weight: number | null;
  age: number | null;
  birth_date: Date | string | null;
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

function rowBirthDate(value: Date | string | null | undefined, playerId: string | null) {
  return normalizeBirthDate(value) ?? (playerId ? officialPlayerBirthDateById.get(playerId) ?? null : null);
}

function mapDbRow(row: PlayerDirectoryDbRow): PlayerDirectoryRow {
  const gamesStarted = row.nba_player_id
    ? officialBasketballReferenceGamesStartedByPlayerId.get(row.nba_player_id) ?? null
    : null;
  const birthDate = rowBirthDate(row.birth_date, row.nba_player_id);
  return {
    playerSlug: row.player_slug,
    playerName: row.player_name,
    teamId: row.team_id ?? row.primary_team_abbreviation ?? "",
    teamAbbreviation: row.primary_team_abbreviation ?? "N/A",
    position: row.position ?? "N/A",
    height: row.height ?? "N/A",
    weight: row.weight,
    age: decimalAgeFromBirthDate(birthDate) ?? row.age,
    birthDate,
    games: numeric(row.games) ?? 0,
    gamesStarted,
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

function mapFallbackRow(row: RuntimePlayerFallback): PlayerDirectoryRow {
  const birthDate = normalizeBirthDate(row.birth_date);
  return {
    playerSlug: row.player_slug,
    playerName: row.player_name,
    teamId: row.team_id ?? row.team_abbreviation ?? "",
    teamAbbreviation: row.team_abbreviation ?? "NBA",
    position: row.position ?? "N/A",
    height: row.height ?? "N/A",
    weight: row.weight,
    age: decimalAgeFromBirthDate(birthDate) ?? row.age,
    birthDate,
    games: row.games ?? 0,
    gamesStarted: row.games_started ?? null,
    minutesPerGame: row.minutes,
    pts: row.pts,
    reb: row.reb,
    ast: row.ast,
    stl: row.stl,
    blk: row.blk,
    tov: row.tov,
    fgPct: row.fg_pct,
    threePct: row.three_pct,
    ftPct: row.ft_pct,
    tsPct: row.ts_pct,
    efgPct: row.efg_pct,
    usageRate: row.usage_rate,
    astPct: row.ast_pct,
    rebPct: row.reb_pct,
    turnoverRate: row.turnover_rate,
    offRating: row.off_rating,
    defRating: row.def_rating,
    netRating: row.net_rating,
    pie: row.pie,
  };
}

const fallbackSortValues: Record<string, (row: RuntimePlayerFallback) => number | string | null> = {
  name: (row) => row.player_name,
  team: (row) => row.team_abbreviation ?? "",
  position: (row) => ["PG", "SG", "SF", "PF", "C"].indexOf(row.position ?? ""),
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

function compareFallbackValues(left: number | string | null, right: number | string | null, order: "asc" | "desc") {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const result = typeof left === "string" || typeof right === "string"
    ? String(left).localeCompare(String(right))
    : left - right;
  return order === "asc" ? result : -result;
}

async function jsonFallback(params: PlayerDirectoryParams): Promise<PlayerDirectoryResult> {
  const { players, teams, metadata } = await loadRuntimeFallbacks();
  const page = params.all ? 1 : Math.max(1, params.page ?? 1);
  const requestedPageSize = params.all ? 1000 : params.pageSize ?? 20;
  const pageSize = Math.min(1000, Math.max(1, requestedPageSize));
  const season = parseSeason(params.season);
  const seasonType = parseSeasonType(params.seasonType);
  const query = params.q?.trim().toLowerCase();
  const positions = params.position === "G" ? ["PG", "SG"] : params.position === "F" ? ["SF", "PF"] : params.position ? [params.position] : [];
  const sortKey = fallbackSortValues[params.sort ?? "name"] ? params.sort ?? "name" : "name";
  const order = params.order ?? (sortKey === "name" ? "asc" : "desc");
  const sortValue = fallbackSortValues[sortKey];
  const sourceRows = metadata.season === season && metadata.season_type === seasonType
    ? players
    : season === UPCOMING_SEASON && seasonType === DEFAULT_SEASON_TYPE
      ? buildUpcomingRosterRows(players, teams)
      : [];
  const filtered = sourceRows
    .filter((row) => !query || `${row.player_name} ${row.team_abbreviation ?? ""} ${row.position ?? ""}`.toLowerCase().includes(query))
    .filter((row) => !params.teamId || row.team_id === params.teamId || row.team_abbreviation === params.teamId)
    .filter((row) => !positions.length || positions.includes(row.position ?? ""))
    .filter((row) => params.minGames === undefined || (row.games ?? 0) >= params.minGames)
    .filter((row) => params.minMinutes === undefined || (row.minutes ?? 0) * (row.games ?? 0) >= params.minMinutes)
    .sort((left, right) => compareFallbackValues(sortValue(left), sortValue(right), order) || left.player_name.localeCompare(right.player_name));
  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    rows: filtered.slice(offset, offset + pageSize).map(mapFallbackRow),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      source: "json",
    },
  };
}

export async function listPlayerDirectory(params: PlayerDirectoryParams = {}): Promise<PlayerDirectoryResult> {
  const season = parseSeason(params.season);
  const seasonType = parseSeasonType(params.seasonType);
  if (season === UPCOMING_SEASON && seasonType === DEFAULT_SEASON_TYPE) {
    return jsonFallback(params);
  }
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

  where.push(`s.season_type = ${addValue(seasonType)}`);
  where.push(`s.season = ${addValue(season)}`);

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
        p.nba_player_id,
        p.player_name,
        p.primary_team_id AS team_id,
        p.primary_team_abbreviation,
        p.position,
        p.height,
        p.weight,
        p.age,
        p.birth_date,
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

export async function loadPlayerDirectoryFilters(seasonType: SeasonType = DEFAULT_SEASON_TYPE, season = DEFAULT_SEASON): Promise<PlayerDirectoryFilters> {
  const selectedSeason = parseSeason(season);
  try {
    const [seasonResult, teamResult, positionResult] = await Promise.all([
      queryDatabase<{ season: string }>(`
        SELECT DISTINCT season
        FROM current_player_season_summaries
        ORDER BY season DESC
      `),
      queryDatabase<{ id: string; abbreviation: string }>(`
        SELECT DISTINCT t.id, t.abbreviation
        FROM teams t
        JOIN current_player_season_summaries s ON s.team_id = t.id
        WHERE s.season_type = $1
          AND s.season = $2
        ORDER BY t.abbreviation
      `, [seasonType, selectedSeason]),
      queryDatabase<{ position: string }>(`
        SELECT DISTINCT p.position
        FROM players p
        JOIN current_player_season_summaries s USING (player_slug)
        WHERE s.season_type = $1
          AND s.season = $2
          AND p.position IN ('PG', 'SG', 'SF', 'PF', 'C')
      `, [seasonType, selectedSeason]),
    ]);
    if (teamResult?.rows.length && positionResult?.rows.length) {
      return {
        seasons: mergeSeasonOptions(seasonResult?.rows.map((row) => row.season)),
        seasonTypes: seasonTypeOptions,
        teams: teamResult.rows.map((team) => ({ label: team.abbreviation, value: team.id })),
        positions: positionResult.rows.map((row) => row.position),
        source: "postgres",
      };
    }
  } catch {
    // Generated data remains the fallback when Postgres is absent or incomplete.
  }

  const { players, teams, metadata } = await loadRuntimeFallbacks();
  const sourcePlayers = metadata.season === selectedSeason && metadata.season_type === seasonType
    ? players
    : selectedSeason === UPCOMING_SEASON && seasonType === DEFAULT_SEASON_TYPE
      ? buildUpcomingRosterRows(players, teams)
      : [];
  return {
    seasons: mergeSeasonOptions([metadata.season]),
    seasonTypes: seasonTypeOptions,
    teams: teams.map((team) => ({ label: team.abbreviation, value: team.team_id })),
    positions: Array.from(new Set(sourcePlayers.map((player) => player.position).filter((position): position is string => Boolean(position && position !== "N/A"))))
      .concat(sourcePlayers.length ? [] : ["PG", "SG", "SF", "PF", "C"]),
    source: "json",
  };
}
