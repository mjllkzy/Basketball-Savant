import type { Game, Lineup, SeasonType, Shot, Team, TeamGameStat, TeamSeasonAggregate } from "@/lib/types";
import { loadRuntimeFallbacks } from "@/lib/data/runtimeFallbacks.server";
import { officialGames, officialTeamGameStats } from "@/lib/data/official";
import { listGameAnalytics, type GameListItem } from "./gameAnalytics.server";
import { listPlayerDirectory, type PlayerDirectoryRow } from "./playerDirectory.server";
import { queryDatabase } from "./client.server";
import { listShotAttempts } from "./shotAttempts.server";
import { getCachedTeamShotChart } from "@/lib/data/teamShotCache";
import { DEFAULT_SEASON_TYPE, parseSeasonType, seasonTypeOptions } from "@/lib/seasonTypes";
import { DEFAULT_SEASON, mergeSeasonOptions, parseSeason, type SeasonOption } from "@/lib/seasons";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/teamAnalytics.server.ts can only be imported on the server.");
}

type TeamSummaryDbRow = {
  id: string;
  slug: string;
  abbreviation: string;
  city: string;
  name: string;
  conference: "East" | "West" | null;
  division: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  season: string;
  games: number | string | null;
  wins: number | string | null;
  losses: number | string | null;
  pts: number | string | null;
  pts_allowed: number | string | null;
  fgm: number | string | null;
  fga: number | string | null;
  three_pm: number | string | null;
  three_pa: number | string | null;
  ftm: number | string | null;
  fta: number | string | null;
  oreb: number | string | null;
  dreb: number | string | null;
  reb: number | string | null;
  ast: number | string | null;
  stl: number | string | null;
  blk: number | string | null;
  tov: number | string | null;
  possessions: number | string | null;
  off_rating: number | string | null;
  def_rating: number | string | null;
  net_rating: number | string | null;
  assist_pct: number | string | null;
  offensive_rebound_pct: number | string | null;
  defensive_rebound_pct: number | string | null;
  rebound_pct: number | string | null;
  turnover_pct: number | string | null;
  efg_pct: number | string | null;
  ts_pct: number | string | null;
  pie: number | string | null;
  pace: number | string | null;
  three_frequency: number | string | null;
};

type TeamGameSummaryDbRow = {
  id: string;
  slug: string;
  abbreviation: string;
  city: string;
  name: string;
  conference: "East" | "West" | null;
  division: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  season: string;
  game_id: string;
  game_date: string | Date;
  minutes: number | string | null;
  pts: number | string | null;
  opponent_pts: number | string | null;
  fgm: number | string | null;
  fga: number | string | null;
  three_pm: number | string | null;
  three_pa: number | string | null;
  ftm: number | string | null;
  fta: number | string | null;
  oreb: number | string | null;
  opponent_oreb: number | string | null;
  dreb: number | string | null;
  opponent_dreb: number | string | null;
  reb: number | string | null;
  opponent_reb: number | string | null;
  ast: number | string | null;
  stl: number | string | null;
  blk: number | string | null;
  tov: number | string | null;
  possessions: number | string | null;
  opponent_possessions: number | string | null;
};

type TeamSummaryParams = {
  season?: string;
  seasonType?: SeasonType;
  conference?: "East" | "West";
  division?: string;
  month?: string;
};

export type TeamSummaryFilterOptions = {
  seasons: SeasonOption[];
  seasonTypes: Array<{ label: string; value: SeasonType }>;
  conferences: Array<{ label: string; value: "East" | "West" }>;
  divisions: Array<{ label: string; value: string; conference: "East" | "West" }>;
  months: Array<{ label: string; value: string }>;
};

export type TeamSummaryResult = {
  rows: TeamSeasonAggregate[];
  source: "postgres" | "json";
};

export type TeamProfileResult = {
  team: Team;
  aggregate: TeamSeasonAggregate;
  rosterRows: PlayerDirectoryRow[];
  games: GameListItem[];
  shots: Shot[];
  lineups: Lineup[];
  source: "postgres" | "json";
};

function numeric(value: number | string | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumeric(value: number | string | null) {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeRate(numerator: number, denominator: number, scale = 1) {
  return denominator > 0 ? (numerator / denominator) * scale : null;
}

function optionalRate(numerator: number, denominator: number, scale = 1) {
  const value = safeRate(numerator, denominator, scale);
  return value === null || Number.isFinite(value) ? value : null;
}

function monthLabel(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function normalizeMonth(value?: string) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

function selectedSeasonType(params: Pick<TeamSummaryParams, "seasonType">) {
  return parseSeasonType(params.seasonType);
}

function selectedSeason(params: Pick<TeamSummaryParams, "season">) {
  return parseSeason(params.season);
}

function filterTeamAggregateRows(rows: TeamSeasonAggregate[], params: TeamSummaryParams) {
  return rows.filter((row) =>
    (!params.season || row.season === parseSeason(params.season))
    && (!params.conference || row.team.conference === params.conference)
    && (!params.division || row.team.division === params.division)
  );
}

function mapTeamSummary(row: TeamSummaryDbRow): TeamSeasonAggregate {
  const team: Team = {
    id: row.id,
    slug: row.slug,
    abbreviation: row.abbreviation,
    city: row.city,
    name: row.name,
    conference: row.conference ?? "East",
    division: row.division ?? "NBA",
    primaryColor: row.primary_color ?? "#101820",
    secondaryColor: row.secondary_color ?? "#0f766e",
  };

  return {
    team,
    season: row.season,
    games: numeric(row.games),
    wins: numeric(row.wins),
    losses: numeric(row.losses),
    pts: numeric(row.pts),
    ptsAllowed: numeric(row.pts_allowed),
    fgm: numeric(row.fgm),
    fga: numeric(row.fga),
    threePm: numeric(row.three_pm),
    threePa: numeric(row.three_pa),
    ftm: numeric(row.ftm),
    fta: numeric(row.fta),
    oreb: numeric(row.oreb),
    dreb: numeric(row.dreb),
    reb: numeric(row.reb),
    ast: numeric(row.ast),
    stl: numeric(row.stl),
    blk: numeric(row.blk),
    tov: numeric(row.tov),
    possessions: numeric(row.possessions),
    offRating: optionalNumeric(row.off_rating),
    defRating: optionalNumeric(row.def_rating),
    netRating: optionalNumeric(row.net_rating),
    assistPct: optionalNumeric(row.assist_pct),
    offensiveReboundPct: optionalNumeric(row.offensive_rebound_pct),
    defensiveReboundPct: optionalNumeric(row.defensive_rebound_pct),
    reboundPct: optionalNumeric(row.rebound_pct),
    turnoverPct: optionalNumeric(row.turnover_pct),
    officialEfgPct: optionalNumeric(row.efg_pct),
    officialTsPct: optionalNumeric(row.ts_pct),
    pie: optionalNumeric(row.pie),
    expectedPoints: 0,
    rimFrequency: 0,
    threeFrequency: numeric(row.three_frequency),
    pace: numeric(row.pace),
    shotQuality: 0,
  };
}

type TeamMonthAccumulator = {
  team: Team;
  season: string;
  games: number;
  wins: number;
  losses: number;
  minutes: number;
  pts: number;
  ptsAllowed: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  oreb: number;
  opponentOreb: number;
  dreb: number;
  opponentDreb: number;
  reb: number;
  opponentReb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  possessions: number;
  opponentPossessions: number;
};

function emptyAccumulator(team: Team, season: string): TeamMonthAccumulator {
  return {
    team,
    season,
    games: 0,
    wins: 0,
    losses: 0,
    minutes: 0,
    pts: 0,
    ptsAllowed: 0,
    fgm: 0,
    fga: 0,
    threePm: 0,
    threePa: 0,
    ftm: 0,
    fta: 0,
    oreb: 0,
    opponentOreb: 0,
    dreb: 0,
    opponentDreb: 0,
    reb: 0,
    opponentReb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    tov: 0,
    possessions: 0,
    opponentPossessions: 0,
  };
}

function paceMinutes(row: TeamMonthAccumulator) {
  if (row.minutes <= 0) return 0;
  const minutesPerGame = row.games > 0 ? row.minutes / row.games : row.minutes;
  return minutesPerGame <= 75 ? row.minutes : row.minutes / 5;
}

function finalizeAccumulator(row: TeamMonthAccumulator): TeamSeasonAggregate {
  const offRating = optionalRate(row.pts, row.possessions, 100);
  const defRating = optionalRate(row.ptsAllowed, row.opponentPossessions, 100);
  return {
    team: row.team,
    season: row.season,
    games: row.games,
    wins: row.wins,
    losses: row.losses,
    pts: row.pts,
    ptsAllowed: row.ptsAllowed,
    fgm: row.fgm,
    fga: row.fga,
    threePm: row.threePm,
    threePa: row.threePa,
    ftm: row.ftm,
    fta: row.fta,
    oreb: row.oreb,
    dreb: row.dreb,
    reb: row.reb,
    ast: row.ast,
    stl: row.stl,
    blk: row.blk,
    tov: row.tov,
    possessions: row.possessions,
    offRating,
    defRating,
    netRating: offRating !== null && defRating !== null ? offRating - defRating : null,
    assistPct: optionalRate(row.ast, row.fgm),
    offensiveReboundPct: optionalRate(row.oreb, row.oreb + row.opponentDreb),
    defensiveReboundPct: optionalRate(row.dreb, row.dreb + row.opponentOreb),
    reboundPct: optionalRate(row.reb, row.reb + row.opponentReb),
    turnoverPct: optionalRate(row.tov, row.possessions),
    officialEfgPct: optionalRate(row.fgm + 0.5 * row.threePm, row.fga),
    officialTsPct: optionalRate(row.pts, 2 * (row.fga + 0.44 * row.fta)),
    pie: null,
    expectedPoints: 0,
    rimFrequency: 0,
    threeFrequency: optionalRate(row.threePa, row.fga) ?? 0,
    pace: optionalRate(48 * (row.possessions + row.opponentPossessions), 2 * paceMinutes(row)) ?? 0,
    shotQuality: 0,
  };
}

function sortTeamRows(rows: TeamSeasonAggregate[]) {
  return rows.sort((a, b) => `${a.team.city} ${a.team.name}`.localeCompare(`${b.team.city} ${b.team.name}`));
}

function aggregateTeamGameRows(
  rows: Array<{
    team: Team;
    season: string;
    line: TeamGameStat;
    opponentLine: TeamGameStat;
  }>
) {
  const accumulator = new Map<string, TeamMonthAccumulator>();
  rows.forEach(({ team, season, line, opponentLine }) => {
    const current = accumulator.get(team.id) ?? emptyAccumulator(team, season);
    current.games += 1;
    current.wins += line.pts > opponentLine.pts ? 1 : 0;
    current.losses += line.pts < opponentLine.pts ? 1 : 0;
    current.minutes += line.minutes;
    current.pts += line.pts;
    current.ptsAllowed += opponentLine.pts;
    current.fgm += line.fgm;
    current.fga += line.fga;
    current.threePm += line.threePm;
    current.threePa += line.threePa;
    current.ftm += line.ftm;
    current.fta += line.fta;
    current.oreb += line.oreb;
    current.opponentOreb += opponentLine.oreb;
    current.dreb += line.dreb;
    current.opponentDreb += opponentLine.dreb;
    current.reb += line.reb;
    current.opponentReb += opponentLine.reb;
    current.ast += line.ast;
    current.stl += line.stl;
    current.blk += line.blk;
    current.tov += line.tov;
    current.possessions += line.possessions;
    current.opponentPossessions += opponentLine.possessions;
    accumulator.set(team.id, current);
  });
  return sortTeamRows([...accumulator.values()].map(finalizeAccumulator));
}

async function teamGameJsonFallback(params: TeamSummaryParams): Promise<TeamSummaryResult> {
  const month = normalizeMonth(params.month);
  if (params.month && !month) return { source: "json", rows: [] };
  const season = selectedSeason(params);
  const seasonType = selectedSeasonType(params);
  const { teams, metadata } = await loadRuntimeFallbacks();
  if ((metadata.season !== season || metadata.season_type !== seasonType) && !officialGames.some((game) => game.season === season && game.seasonType === seasonType)) {
    return { source: "json", rows: [] };
  }
  const seasonTeams = teams.filter((row) => row.season === season && row.season_type === seasonType);
  const teamRows = seasonTeams.length ? seasonTeams : teams;
  const teamsById = new Map(
    teamRows.map((row) => [
      row.team_id,
      mapTeamSummary({ ...row, id: row.team_id }).team
    ])
  );
  const gameById = new Map(officialGames.map((game) => [game.id, game]));
  const teamLineByGameAndTeam = new Map(officialTeamGameStats.map((line) => [`${line.gameId}:${line.teamId}`, line]));
  const monthlyRows = officialTeamGameStats.flatMap((line) => {
    const game = gameById.get(line.gameId);
    const team = teamsById.get(line.teamId);
    const opponentLine = teamLineByGameAndTeam.get(`${line.gameId}:${line.opponentTeamId}`);
    if (!game || !team || !opponentLine || game.season !== season || game.seasonType !== seasonType) return [];
    if (month && !game.date.startsWith(month)) return [];
    if (params.conference && team.conference !== params.conference) return [];
    if (params.division && team.division !== params.division) return [];
    return [{ team, season: game.season, line, opponentLine }];
  });
  return { source: "json", rows: aggregateTeamGameRows(monthlyRows) };
}

async function jsonFallback(params: TeamSummaryParams = {}): Promise<TeamSummaryResult> {
  if (params.month) return teamGameJsonFallback(params);
  const season = selectedSeason(params);
  const seasonType = selectedSeasonType(params);
  const { teams } = await loadRuntimeFallbacks();
  const summaryRows = teams.filter((row) => row.season === season && row.season_type === seasonType);
  if (!summaryRows.length && seasonType === "Playoffs") return teamGameJsonFallback(params);
  return {
    source: "json",
    rows: filterTeamAggregateRows(
      summaryRows
        .map((row) => mapTeamSummary({
          ...row,
          id: row.team_id,
        })),
      params,
    ),
  };
}

async function listTeamGameSummaries(params: TeamSummaryParams): Promise<TeamSummaryResult> {
  const month = normalizeMonth(params.month);
  if (params.month && !month) return jsonFallback(params);
  const season = selectedSeason(params);
  const seasonType = selectedSeasonType(params);
  const values: unknown[] = [seasonType, season];
  const filters = ["g.season_type = $1", "g.season = $2"];
  if (month) {
    values.push(month);
    filters.push(`to_char(g.game_date, 'YYYY-MM') = $${values.length}`);
  }
  if (params.conference) {
    values.push(params.conference);
    filters.push(`t.conference = $${values.length}`);
  }
  if (params.division) {
    values.push(params.division);
    filters.push(`t.division = $${values.length}`);
  }
  try {
    const result = await queryDatabase<TeamGameSummaryDbRow>(`
      SELECT
        t.id,
        t.slug,
        t.abbreviation,
        t.city,
        t.name,
        t.conference,
        t.division,
        t.primary_color,
        t.secondary_color,
        g.season,
        g.game_id,
        g.game_date,
        stat.minutes,
        stat.pts,
        opponent.pts AS opponent_pts,
        stat.fgm,
        stat.fga,
        stat.three_pm,
        stat.three_pa,
        stat.ftm,
        stat.fta,
        stat.oreb,
        opponent.oreb AS opponent_oreb,
        stat.dreb,
        opponent.dreb AS opponent_dreb,
        stat.reb,
        opponent.reb AS opponent_reb,
        stat.ast,
        stat.stl,
        stat.blk,
        stat.tov,
        stat.possessions,
        opponent.possessions AS opponent_possessions
      FROM current_team_game_stats stat
      JOIN current_games g
        ON g.ingestion_run_id = stat.ingestion_run_id
        AND g.game_id = stat.game_id
      JOIN current_team_game_stats opponent
        ON opponent.ingestion_run_id = stat.ingestion_run_id
        AND opponent.game_id = stat.game_id
        AND opponent.team_id = stat.opponent_team_id
      JOIN teams t ON t.id = stat.team_id
      WHERE ${filters.join(" AND ")}
      ORDER BY t.city, t.name, g.game_date
    `, values);
    if (!result?.rows.length) return teamGameJsonFallback(params);
    const rows = result.rows.map((row) => {
      const line: TeamGameStat = {
        id: `${row.game_id}-${row.id}`,
        gameId: row.game_id,
        teamId: row.id,
        opponentTeamId: "",
        minutes: numeric(row.minutes),
        pts: numeric(row.pts),
        fgm: numeric(row.fgm),
        fga: numeric(row.fga),
        threePm: numeric(row.three_pm),
        threePa: numeric(row.three_pa),
        ftm: numeric(row.ftm),
        fta: numeric(row.fta),
        oreb: numeric(row.oreb),
        dreb: numeric(row.dreb),
        reb: numeric(row.reb),
        ast: numeric(row.ast),
        stl: numeric(row.stl),
        blk: numeric(row.blk),
        tov: numeric(row.tov),
        pf: 0,
        possessions: numeric(row.possessions),
      };
      const opponentLine: TeamGameStat = {
        ...line,
        pts: numeric(row.opponent_pts),
        oreb: numeric(row.opponent_oreb),
        dreb: numeric(row.opponent_dreb),
        reb: numeric(row.opponent_reb),
        possessions: numeric(row.opponent_possessions),
      };
      return {
        team: {
          id: row.id,
          slug: row.slug,
          abbreviation: row.abbreviation,
          city: row.city,
          name: row.name,
          conference: row.conference ?? "East",
          division: row.division ?? "NBA",
          primaryColor: row.primary_color ?? "#101820",
          secondaryColor: row.secondary_color ?? "#0f766e",
        },
        season: row.season,
        line,
        opponentLine,
      };
    });
    return { rows: aggregateTeamGameRows(rows), source: "postgres" };
  } catch {
    return teamGameJsonFallback(params);
  }
}

export async function listTeamSeasonSummaries(params: TeamSummaryParams = {}): Promise<TeamSummaryResult> {
  const season = selectedSeason(params);
  const seasonType = selectedSeasonType(params);
  if (params.month || seasonType === "Playoffs") return listTeamGameSummaries(params);
  const values: unknown[] = [];
  const filters: string[] = [];
  values.push(seasonType);
  filters.push(`s.season_type = $${values.length}`);
  values.push(season);
  filters.push(`s.season = $${values.length}`);
  if (params.conference) {
    values.push(params.conference);
    filters.push(`t.conference = $${values.length}`);
  }
  if (params.division) {
    values.push(params.division);
    filters.push(`t.division = $${values.length}`);
  }
  try {
    const result = await queryDatabase<TeamSummaryDbRow>(`
      SELECT
        t.id,
        t.slug,
        t.abbreviation,
        t.city,
        t.name,
        t.conference,
        t.division,
        t.primary_color,
        t.secondary_color,
        s.season,
        s.games,
        s.wins,
        s.losses,
        s.pts,
        s.pts_allowed,
        s.fgm,
        s.fga,
        s.three_pm,
        s.three_pa,
        s.ftm,
        s.fta,
        s.oreb,
        s.dreb,
        s.reb,
        s.ast,
        s.stl,
        s.blk,
        s.tov,
        s.possessions,
        s.off_rating,
        s.def_rating,
        s.net_rating,
        s.assist_pct,
        s.offensive_rebound_pct,
        s.defensive_rebound_pct,
        s.rebound_pct,
        s.turnover_pct,
        s.efg_pct,
        s.ts_pct,
        s.pie,
        s.pace,
        s.three_frequency
      FROM current_team_season_summaries s
      JOIN teams t ON t.id = s.team_id
      WHERE ${filters.join(" AND ")}
      ORDER BY t.city, t.name
    `, values);
    if (!result?.rows.length) return jsonFallback(params);
    return { rows: result.rows.map(mapTeamSummary), source: "postgres" };
  } catch {
    return jsonFallback(params);
  }
}

function monthOptionsFromGames(games: Game[]) {
  return [...new Set(games.map((game) => game.date.slice(0, 7)).filter((value) => /^\d{4}-\d{2}$/.test(value)))]
    .sort()
    .map((value) => ({ value, label: monthLabel(value) }));
}

export async function loadTeamSeasonSummaryFilters(params: Pick<TeamSummaryParams, "season" | "seasonType"> = {}): Promise<TeamSummaryFilterOptions> {
  const season = selectedSeason(params);
  const seasonType = selectedSeasonType(params);
  const fallback = async (): Promise<TeamSummaryFilterOptions> => {
    const { teams, metadata } = await loadRuntimeFallbacks();
    const seasonTeams = teams.filter((row) => row.season === season && row.season_type === seasonType);
    const teamRows = seasonTeams.length ? seasonTeams : teams;
    const rows = teamRows
      .map((row) => mapTeamSummary({ ...row, id: row.team_id }).team);
    return {
      seasons: mergeSeasonOptions([metadata.season]),
      seasonTypes: seasonTypeOptions,
      conferences: ["East", "West"].map((value) => ({ value: value as "East" | "West", label: value })),
      divisions: rows
        .map((team) => ({ value: team.division, label: team.division, conference: team.conference }))
        .filter((option, index, options) => options.findIndex((candidate) => candidate.value === option.value) === index)
        .sort((a, b) => a.label.localeCompare(b.label)),
      months: monthOptionsFromGames(officialGames.filter((game) => game.season === season && game.seasonType === seasonType)),
    };
  };

  try {
    const [seasonResult, result] = await Promise.all([
      queryDatabase<{ season: string }>(`
        SELECT DISTINCT season FROM current_team_season_summaries
        UNION
        SELECT DISTINCT season FROM current_games
        ORDER BY season DESC
      `),
      queryDatabase<{ conference: "East" | "West" | null; division: string | null; month: string | null }>(`
      SELECT DISTINCT t.conference, t.division, NULL::text AS month
      FROM teams t
      JOIN current_team_season_summaries s ON s.team_id = t.id
      WHERE s.season_type = $1
        AND s.season = $2
      UNION
      SELECT NULL::text AS conference, NULL::text AS division, to_char(date_trunc('month', g.game_date), 'YYYY-MM') AS month
      FROM current_games g
      WHERE g.season_type = $1
        AND g.season = $2
    `, [seasonType, season]),
    ]);
    if (!result?.rows.length) return fallback();
    const conferences = [...new Set(result.rows.map((row) => row.conference).filter((value): value is "East" | "West" => value === "East" || value === "West"))]
      .sort()
      .map((value) => ({ value, label: value }));
    const divisions = result.rows
      .filter((row): row is { conference: "East" | "West"; division: string; month: string | null } =>
        (row.conference === "East" || row.conference === "West") && Boolean(row.division)
      )
      .map((row) => ({ value: row.division, label: row.division, conference: row.conference }))
      .filter((option, index, options) => options.findIndex((candidate) => candidate.value === option.value) === index)
      .sort((a, b) => a.label.localeCompare(b.label));
    const months = [...new Set(result.rows.map((row) => row.month).filter((value): value is string => Boolean(value)))]
      .sort()
      .map((value) => ({ value, label: monthLabel(value) }));
    const fallbackOptions = conferences.length && divisions.length && months.length ? null : await fallback();
    return {
      seasons: mergeSeasonOptions(seasonResult?.rows.map((row) => row.season)),
      seasonTypes: seasonTypeOptions,
      conferences: conferences.length ? conferences : fallbackOptions?.conferences ?? [],
      divisions: divisions.length ? divisions : fallbackOptions?.divisions ?? [],
      months: months.length ? months : fallbackOptions?.months ?? [],
    };
  } catch {
    return fallback();
  }
}

export async function loadTeamProfile(idOrSlug: string, seasonType: SeasonType = DEFAULT_SEASON_TYPE, season = DEFAULT_SEASON): Promise<TeamProfileResult | null> {
  const selected = parseSeason(season);
  const teamResult = await listTeamSeasonSummaries({ season: selected, seasonType });
  const normalized = idOrSlug.trim().toLowerCase();
  const aggregate = teamResult.rows.find((row) =>
    row.team.id === idOrSlug
    || row.team.slug.toLowerCase() === normalized
    || row.team.abbreviation.toLowerCase() === normalized
  );
  if (!aggregate) return null;

  const [roster, games] = await Promise.all([
    listPlayerDirectory({ teamId: aggregate.team.id, all: true, minGames: 0, minMinutes: 0, season: selected, seasonType }),
    listGameAnalytics({ teamId: aggregate.team.id, season: selected, seasonType, pageSize: 100 }),
  ]);
  const shotResult = await listShotAttempts({ teamId: aggregate.team.id, season: selected, seasonType });
  return {
    team: aggregate.team,
    aggregate,
    rosterRows: roster.rows,
    games: games.rows,
    shots: shotResult.source === "postgres" && shotResult.rows.length
      ? shotResult.rows
      : selected === DEFAULT_SEASON && seasonType === DEFAULT_SEASON_TYPE ? getCachedTeamShotChart(aggregate.team.id) : [],
    lineups: [],
    source: teamResult.source === "postgres"
      && roster.meta.source === "postgres"
      && games.meta.source === "postgres"
      && shotResult.source === "postgres"
      ? "postgres"
      : "json",
  };
}
