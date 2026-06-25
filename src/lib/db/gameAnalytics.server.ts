import type { Game, Player, PlayerGameStat, Team, TeamGameStat } from "@/lib/types";
import { getCachedTeamShotChart } from "@/lib/data/teamShotCache";
import { queryDatabase } from "./client.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/gameAnalytics.server.ts can only be imported on the server.");
}

export type GameListParams = {
  page?: number;
  pageSize?: number;
  teamId?: string;
  status?: string;
  season?: string;
  date?: string;
};

export type GameListItem = {
  game: Game;
  homeTeam: Team;
  awayTeam: Team;
  leadingScorer: {
    player: Player;
    team: Team;
    points: number;
  } | null;
};

export type GameListResult = {
  rows: GameListItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    source: "postgres" | "json";
  };
};

type GameDbRow = {
  game_id: string;
  season: string;
  season_type: Game["seasonType"];
  game_date: string | Date;
  home_team_id: string;
  away_team_id: string;
  home_score: number | string;
  away_score: number | string;
  status: Game["status"];
  neutral_site: boolean;
  arena: string | null;
  home_slug: string;
  home_name: string;
  home_abbreviation: string;
  home_city: string;
  home_conference: "East" | "West" | null;
  home_division: string | null;
  home_primary_color: string | null;
  home_secondary_color: string | null;
  away_slug: string;
  away_name: string;
  away_abbreviation: string;
  away_city: string;
  away_conference: "East" | "West" | null;
  away_division: string | null;
  away_primary_color: string | null;
  away_secondary_color: string | null;
  leader_slug: string | null;
  leader_nba_player_id: string | null;
  leader_name: string | null;
  leader_team_id: string | null;
  leader_position: string | null;
  leader_height: string | null;
  leader_weight: number | null;
  leader_age: number | null;
  leader_headshot_url: string | null;
  leader_points: number | string | null;
  leader_team_slug: string | null;
  leader_team_name: string | null;
  leader_team_abbreviation: string | null;
  leader_team_city: string | null;
  leader_team_conference: "East" | "West" | null;
  leader_team_division: string | null;
  leader_team_primary_color: string | null;
  leader_team_secondary_color: string | null;
  total_count: number | string;
};

type PlayerGameDbRow = {
  game_id: string;
  player_slug: string;
  nba_player_id: string | null;
  player_name: string;
  position: string | null;
  height: string | null;
  weight: number | null;
  age: number | null;
  college: string | null;
  country: string | null;
  jersey_number: string | null;
  headshot_url: string | null;
  team_id: string;
  opponent_team_id: string;
  minutes: number | string | null;
  pts: number | string | null;
  reb: number | string | null;
  oreb: number | string | null;
  dreb: number | string | null;
  ast: number | string | null;
  stl: number | string | null;
  blk: number | string | null;
  tov: number | string | null;
  pf: number | string | null;
  fgm: number | string | null;
  fga: number | string | null;
  three_pm: number | string | null;
  three_pa: number | string | null;
  ftm: number | string | null;
  fta: number | string | null;
  plus_minus: number | string | null;
  team_slug: string;
  team_name: string;
  team_abbreviation: string;
  team_city: string;
  team_conference: "East" | "West" | null;
  team_division: string | null;
  team_primary_color: string | null;
  team_secondary_color: string | null;
};

type TeamGameDbRow = {
  game_id: string;
  team_id: string;
  opponent_team_id: string;
  minutes: number | string | null;
  pts: number | string | null;
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
  pf: number | string | null;
  possessions: number | string | null;
};

const placeholderHeadshot = "/brand/player-placeholder.png";

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: string | Date) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function mapTeam(
  prefix: "home" | "away" | "leader_team",
  row: Record<string, unknown>,
  fallbackId: string,
): Team {
  const value = (key: string) => row[`${prefix}_${key}`];
  return {
    id: fallbackId,
    slug: String(value("slug") ?? fallbackId),
    name: String(value("name") ?? ""),
    abbreviation: String(value("abbreviation") ?? ""),
    city: String(value("city") ?? ""),
    conference: (value("conference") as "East" | "West" | null) ?? "East",
    division: String(value("division") ?? "NBA"),
    primaryColor: String(value("primary_color") ?? "#101820"),
    secondaryColor: String(value("secondary_color") ?? "#0f766e"),
  };
}

function mapGameRow(row: GameDbRow): GameListItem {
  const homeTeam = mapTeam("home", row as unknown as Record<string, unknown>, row.home_team_id);
  const awayTeam = mapTeam("away", row as unknown as Record<string, unknown>, row.away_team_id);
  const game: Game = {
    id: row.game_id,
    date: dateValue(row.game_date),
    season: row.season,
    seasonType: row.season_type,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeScore: numberValue(row.home_score),
    awayScore: numberValue(row.away_score),
    status: row.status,
    neutralSite: row.neutral_site || undefined,
    arena: row.arena ?? undefined,
  };
  if (!row.leader_slug || !row.leader_name || !row.leader_team_id) {
    return { game, homeTeam, awayTeam, leadingScorer: null };
  }
  const leaderTeam = mapTeam("leader_team", row as unknown as Record<string, unknown>, row.leader_team_id);
  const player: Player = {
    id: row.leader_nba_player_id ?? row.leader_slug,
    name: row.leader_name,
    slug: row.leader_slug,
    teamId: row.leader_team_id,
    position: row.leader_position ?? "N/A",
    height: row.leader_height ?? "N/A",
    weight: row.leader_weight ?? 0,
    age: row.leader_age ?? 0,
    draftYear: 0,
    draftRound: 0,
    draftPick: 0,
    headshotUrl: row.leader_headshot_url ?? placeholderHeadshot,
    active: true,
    jerseyNumber: "",
    role: "2025-26 NBA player",
    skill: 0,
    createdAt: "",
    updatedAt: "",
  };
  return {
    game,
    homeTeam,
    awayTeam,
    leadingScorer: {
      player,
      team: leaderTeam,
      points: numberValue(row.leader_points),
    },
  };
}

function mapPlayer(row: PlayerGameDbRow): Player {
  return {
    id: row.nba_player_id ?? row.player_slug,
    name: row.player_name,
    slug: row.player_slug,
    teamId: row.team_id,
    position: row.position ?? "N/A",
    height: row.height ?? "N/A",
    weight: row.weight ?? 0,
    age: row.age ?? 0,
    draftYear: 0,
    draftRound: 0,
    draftPick: 0,
    college: row.college ?? undefined,
    country: row.country ?? undefined,
    headshotUrl: row.headshot_url ?? placeholderHeadshot,
    active: true,
    jerseyNumber: row.jersey_number ?? "",
    role: "2025-26 NBA player",
    skill: 0,
    createdAt: "",
    updatedAt: "",
  };
}

function mapPlayerGameStat(row: PlayerGameDbRow): PlayerGameStat & { player: Player; team: Team } {
  const player = mapPlayer(row);
  const team: Team = {
    id: row.team_id,
    slug: row.team_slug,
    name: row.team_name,
    abbreviation: row.team_abbreviation,
    city: row.team_city,
    conference: row.team_conference ?? "East",
    division: row.team_division ?? "NBA",
    primaryColor: row.team_primary_color ?? "#101820",
    secondaryColor: row.team_secondary_color ?? "#0f766e",
  };
  return {
    id: `db-player-game-${row.game_id}-${row.player_slug}`,
    gameId: row.game_id,
    playerId: player.id,
    teamId: row.team_id,
    opponentTeamId: row.opponent_team_id,
    minutes: numberValue(row.minutes),
    pts: numberValue(row.pts),
    reb: numberValue(row.reb),
    oreb: numberValue(row.oreb),
    dreb: numberValue(row.dreb),
    ast: numberValue(row.ast),
    stl: numberValue(row.stl),
    blk: numberValue(row.blk),
    tov: numberValue(row.tov),
    pf: numberValue(row.pf),
    fgm: numberValue(row.fgm),
    fga: numberValue(row.fga),
    threePm: numberValue(row.three_pm),
    threePa: numberValue(row.three_pa),
    ftm: numberValue(row.ftm),
    fta: numberValue(row.fta),
    plusMinus: numberValue(row.plus_minus),
    player,
    team,
  };
}

function mapTeamGameStat(row: TeamGameDbRow): TeamGameStat {
  return {
    id: `db-team-game-${row.game_id}-${row.team_id}`,
    gameId: row.game_id,
    teamId: row.team_id,
    opponentTeamId: row.opponent_team_id,
    minutes: numberValue(row.minutes),
    pts: numberValue(row.pts),
    fgm: numberValue(row.fgm),
    fga: numberValue(row.fga),
    threePm: numberValue(row.three_pm),
    threePa: numberValue(row.three_pa),
    ftm: numberValue(row.ftm),
    fta: numberValue(row.fta),
    oreb: numberValue(row.oreb),
    dreb: numberValue(row.dreb),
    reb: numberValue(row.reb),
    ast: numberValue(row.ast),
    stl: numberValue(row.stl),
    blk: numberValue(row.blk),
    tov: numberValue(row.tov),
    pf: numberValue(row.pf),
    possessions: numberValue(row.possessions),
  };
}

const gameSelect = `
  SELECT
    g.game_id,
    g.season,
    g.season_type,
    g.game_date,
    g.home_team_id,
    g.away_team_id,
    g.home_score,
    g.away_score,
    g.status,
    g.neutral_site,
    g.arena,
    home.slug AS home_slug,
    home.name AS home_name,
    home.abbreviation AS home_abbreviation,
    home.city AS home_city,
    home.conference AS home_conference,
    home.division AS home_division,
    home.primary_color AS home_primary_color,
    home.secondary_color AS home_secondary_color,
    away.slug AS away_slug,
    away.name AS away_name,
    away.abbreviation AS away_abbreviation,
    away.city AS away_city,
    away.conference AS away_conference,
    away.division AS away_division,
    away.primary_color AS away_primary_color,
    away.secondary_color AS away_secondary_color,
    leader.player_slug AS leader_slug,
    leader.nba_player_id AS leader_nba_player_id,
    leader.player_name AS leader_name,
    leader.team_id AS leader_team_id,
    leader.position AS leader_position,
    leader.height AS leader_height,
    leader.weight AS leader_weight,
    leader.age AS leader_age,
    leader.headshot_url AS leader_headshot_url,
    leader.pts AS leader_points,
    leader_team.slug AS leader_team_slug,
    leader_team.name AS leader_team_name,
    leader_team.abbreviation AS leader_team_abbreviation,
    leader_team.city AS leader_team_city,
    leader_team.conference AS leader_team_conference,
    leader_team.division AS leader_team_division,
    leader_team.primary_color AS leader_team_primary_color,
    leader_team.secondary_color AS leader_team_secondary_color
  FROM current_games g
  JOIN teams home ON home.id = g.home_team_id
  JOIN teams away ON away.id = g.away_team_id
  LEFT JOIN LATERAL (
    SELECT
      stat.player_slug,
      stat.nba_player_id,
      stat.team_id,
      stat.pts,
      p.player_name,
      p.position,
      p.height,
      p.weight,
      p.age,
      p.headshot_url
    FROM current_player_game_stats stat
    JOIN players p USING (player_slug)
    WHERE stat.game_id = g.game_id
    ORDER BY stat.pts DESC NULLS LAST, stat.minutes DESC NULLS LAST, p.player_name
    LIMIT 1
  ) leader ON true
  LEFT JOIN teams leader_team ON leader_team.id = leader.team_id
`;

async function jsonGameList(params: GameListParams): Promise<GameListResult> {
  const query = await import("@/lib/data/queries");
  const result = query.listGames({
    page: params.page,
    pageSize: params.pageSize,
    teamId: params.teamId,
    season: params.season,
    date: params.date,
  });
  return {
    rows: result.rows.map((game) => {
      const homeTeam = query.getTeamByIdOrSlug(game.homeTeamId)!;
      const awayTeam = query.getTeamByIdOrSlug(game.awayTeamId)!;
      const leader = query.getGameLeadingScorer(game.id);
      return {
        game,
        homeTeam,
        awayTeam,
        leadingScorer: leader
          ? { player: leader.player, team: leader.team, points: leader.points }
          : null,
      };
    }),
    meta: { ...result.meta, source: "json" },
  };
}

export async function listGameAnalytics(params: GameListParams = {}): Promise<GameListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const values: unknown[] = [];
  const conditions: string[] = [];
  const addValue = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (params.teamId) {
    const placeholder = addValue(params.teamId);
    conditions.push(`(g.home_team_id = ${placeholder} OR g.away_team_id = ${placeholder})`);
  }
  if (params.season) conditions.push(`g.season = ${addValue(params.season)}`);
  if (params.date) conditions.push(`g.game_date = ${addValue(params.date)}::date`);
  if (params.status) conditions.push(`g.status = ${addValue(params.status)}`);
  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = addValue(pageSize);
  const offset = addValue((page - 1) * pageSize);

  try {
    const result = await queryDatabase<GameDbRow>(`
      SELECT listed.*, count(*) OVER() AS total_count
      FROM (
        ${gameSelect}
        ${whereSql}
      ) listed
      ORDER BY listed.game_date DESC, listed.game_id
      LIMIT ${limit}
      OFFSET ${offset}
    `, values);
    if (!result) return jsonGameList(params);
    const total = numberValue(result.rows[0]?.total_count);
    return {
      rows: result.rows.map(mapGameRow),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        source: "postgres",
      },
    };
  } catch {
    return jsonGameList(params);
  }
}

export async function getGameAnalytics(gameId: string) {
  try {
    const [gameResult, playerResult, teamResult] = await Promise.all([
      queryDatabase<GameDbRow>(`${gameSelect} WHERE g.game_id = $1 LIMIT 1`, [gameId]),
      queryDatabase<PlayerGameDbRow>(`
        SELECT
          stat.*,
          p.player_name,
          p.position,
          p.height,
          p.weight,
          p.age,
          p.college,
          p.country,
          p.jersey_number,
          p.headshot_url,
          t.slug AS team_slug,
          t.name AS team_name,
          t.abbreviation AS team_abbreviation,
          t.city AS team_city,
          t.conference AS team_conference,
          t.division AS team_division,
          t.primary_color AS team_primary_color,
          t.secondary_color AS team_secondary_color
        FROM current_player_game_stats stat
        JOIN players p USING (player_slug)
        JOIN teams t ON t.id = stat.team_id
        WHERE stat.game_id = $1
        ORDER BY stat.pts DESC NULLS LAST, stat.minutes DESC NULLS LAST, p.player_name
      `, [gameId]),
      queryDatabase<TeamGameDbRow>(`
        SELECT *
        FROM current_team_game_stats
        WHERE game_id = $1
        ORDER BY team_id
      `, [gameId]),
    ]);
    const gameRow = gameResult?.rows[0];
    if (!gameRow || !playerResult || !teamResult) throw new Error("Game data unavailable");
    const item = mapGameRow(gameRow);
    const shots = [
      ...getCachedTeamShotChart(item.game.homeTeamId),
      ...getCachedTeamShotChart(item.game.awayTeamId),
    ].filter((shot) => shot.gameId === item.game.id);
    return {
      source: "postgres" as const,
      game: item.game,
      homeTeam: item.homeTeam,
      awayTeam: item.awayTeam,
      boxScore: playerResult.rows.map(mapPlayerGameStat),
      teamStats: teamResult.rows.map(mapTeamGameStat),
      feed: [],
      shots,
      lineups: [],
    };
  } catch {
    const query = await import("@/lib/data/queries");
    const report = query.getGameReport(gameId);
    return report ? { ...report, source: "json" as const } : undefined;
  }
}

export function gameMatchupLabel(item: Pick<GameListItem, "game" | "homeTeam" | "awayTeam">) {
  const separator = item.game.neutralSite ? "vs." : "at";
  return `${item.awayTeam.city} ${item.awayTeam.name} ${separator} ${item.homeTeam.city} ${item.homeTeam.name}`.trim();
}

export function gameContextLabel(item: Pick<GameListItem, "game" | "homeTeam" | "awayTeam">) {
  const { game, homeTeam, awayTeam } = item;
  if (game.seasonType === "Regular Season") return "Regular Season";
  const match = game.id.match(/^004\d{2}00([1-4])([0-7])([1-7])$/);
  if (!match) return game.seasonType;
  const round = Number(match[1]);
  const gameNumber = Number(match[3]);
  if (round === 4) return `NBA Finals Game ${gameNumber}`;
  const conference = homeTeam.conference === awayTeam.conference ? homeTeam.conference : undefined;
  if (round === 3) return `${conference === "East" ? "ECF" : conference === "West" ? "WCF" : "Conference Finals"} Game ${gameNumber}`;
  if (round === 2) return `${conference ? `${conference} Semifinals` : "Conference Semifinals"} Game ${gameNumber}`;
  if (round === 1) return `${conference ? `${conference} First Round` : "First Round"} Game ${gameNumber}`;
  return `Playoffs Game ${gameNumber}`;
}
