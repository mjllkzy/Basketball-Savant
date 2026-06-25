import type { Player, PlayerSeasonAggregate, Team } from "@/lib/types";
import { playerSimilaritySummary, similarPlayers } from "@/lib/comparison";
import { loadRuntimeFallbacks } from "@/lib/data/runtimeFallbacks.server";
import { queryDatabase } from "./client.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/playerAnalytics.server.ts can only be imported on the server.");
}

export type PlayerOption = {
  slug: string;
  name: string;
  teamAbbreviation: string;
  position: string;
};

export type ComparisonPlayer = {
  player: Player;
  team: Team;
  aggregate: PlayerSeasonAggregate;
  percentiles: {
    tsPct: number;
    usageRate: number;
    pie: number;
  };
};

export type SimilarPlayerMatch = {
  player: Player;
  team: Team;
  score: number;
  matchingTraits: string[];
  ratioScore: number;
  perMinuteScore: number;
  physicalScore: number;
  roleScore: number;
  summary: ReturnType<typeof playerSimilaritySummary>;
};

export type PlayerSimilarityResult = {
  target: ComparisonPlayer;
  matches: SimilarPlayerMatch[];
  source: "postgres" | "json";
};

type ComparisonDbRow = {
  player_slug: string;
  nba_player_id: string | null;
  app_player_id: string | null;
  player_name: string;
  primary_team_id: string | null;
  primary_team_abbreviation: string | null;
  position: string | null;
  height: string | null;
  weight: number | null;
  age: number | null;
  college: string | null;
  country: string | null;
  jersey_number: string | null;
  headshot_url: string | null;
  team_slug: string | null;
  team_name: string | null;
  team_city: string | null;
  conference: "East" | "West" | null;
  division: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  season: string;
  games: number | string | null;
  minutes: number | string | null;
  pts: number | string | null;
  reb: number | string | null;
  ast: number | string | null;
  stl: number | string | null;
  blk: number | string | null;
  tov: number | string | null;
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
  ts_percentile: number | string | null;
  usage_percentile: number | string | null;
  pie_percentile: number | string | null;
};

type PlayerOptionDbRow = {
  player_slug: string;
  player_name: string;
  primary_team_abbreviation: string | null;
  position: string | null;
};

const blankHeadshot = "/brand/player-placeholder.png";
const teamIdByAbbreviation: Record<string, string> = {
  ATL: "1610612737",
  BOS: "1610612738",
  BKN: "1610612751",
  CHA: "1610612766",
  CHI: "1610612741",
  CLE: "1610612739",
  DAL: "1610612742",
  DEN: "1610612743",
  DET: "1610612765",
  GSW: "1610612744",
  HOU: "1610612745",
  IND: "1610612754",
  LAC: "1610612746",
  LAL: "1610612747",
  MEM: "1610612763",
  MIA: "1610612748",
  MIL: "1610612749",
  MIN: "1610612750",
  NOP: "1610612740",
  NYK: "1610612752",
  OKC: "1610612760",
  ORL: "1610612753",
  PHI: "1610612755",
  PHX: "1610612756",
  POR: "1610612757",
  SAC: "1610612758",
  SAS: "1610612759",
  TOR: "1610612761",
  UTA: "1610612762",
  WAS: "1610612764",
};

function numeric(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function total(value: number | string | null, games: number) {
  return (numeric(value) ?? 0) * Math.max(games, 1);
}

function percentile(value: number | null, values: number[]) {
  if (value === null || !values.length) return 0;
  const belowOrEqual = values.filter((candidate) => candidate <= value).length;
  return Math.round(((belowOrEqual - 1) / Math.max(values.length - 1, 1)) * 100);
}

function mapComparisonRow(row: ComparisonDbRow): ComparisonPlayer {
  const games = Math.round(numeric(row.games) ?? 0);
  const teamId = row.primary_team_id ?? row.primary_team_abbreviation ?? "";
  const player: Player = {
    id: row.nba_player_id ?? row.app_player_id ?? row.player_slug,
    name: row.player_name,
    slug: row.player_slug,
    teamId,
    position: row.position ?? "N/A",
    height: row.height ?? "N/A",
    weight: row.weight ?? 0,
    age: row.age ?? 0,
    draftYear: 0,
    draftRound: 0,
    draftPick: 0,
    college: row.college ?? undefined,
    country: row.country ?? undefined,
    headshotUrl: row.headshot_url ?? blankHeadshot,
    active: true,
    jerseyNumber: row.jersey_number ?? "",
    role: "2025-26 masterfile player",
    skill: 0,
    createdAt: "",
    updatedAt: "",
  };
  const team: Team = {
    id: teamId,
    slug: row.team_slug ?? (row.primary_team_abbreviation ?? "nba").toLowerCase(),
    name: row.team_name ?? row.primary_team_abbreviation ?? "NBA",
    abbreviation: row.primary_team_abbreviation ?? "NBA",
    city: row.team_city ?? "",
    conference: row.conference ?? "East",
    division: row.division ?? "NBA",
    primaryColor: row.primary_color ?? "#101820",
    secondaryColor: row.secondary_color ?? "#0f766e",
  };
  const aggregate: PlayerSeasonAggregate = {
    player,
    team,
    season: row.season,
    games,
    minutes: total(row.minutes, games),
    pts: total(row.pts, games),
    reb: total(row.reb, games),
    oreb: 0,
    dreb: 0,
    ast: total(row.ast, games),
    stl: total(row.stl, games),
    blk: total(row.blk, games),
    tov: total(row.tov, games),
    pf: 0,
    fgm: 0,
    fga: 0,
    threePm: 0,
    threePa: 0,
    ftm: 0,
    fta: 0,
    plusMinus: 0,
    possessions: 0,
    onCourtPossessions: 0,
    teamPossessions: 0,
    teamMinutes: 0,
    teamFga: 0,
    teamFta: 0,
    teamTov: 0,
    officialEfgPct: numeric(row.efg_pct),
    officialTsPct: numeric(row.ts_pct),
    usagePct: numeric(row.usage_rate),
    assistPct: numeric(row.ast_pct),
    offensiveReboundPct: null,
    defensiveReboundPct: null,
    reboundPct: numeric(row.reb_pct),
    turnoverPct: numeric(row.turnover_rate),
    offRating: numeric(row.off_rating),
    defRating: numeric(row.def_rating),
    netRating: numeric(row.net_rating),
    pace: null,
    pie: numeric(row.pie),
    pointsAllowedOnCourt: 0,
    expectedPoints: 0,
    actualMinusExpectedPoints: 0,
    expectedFgPct: 0,
    rimAttempts: 0,
    shortMidAttempts: 0,
    longMidAttempts: 0,
    cornerThreeAttempts: 0,
    aboveBreakThreeAttempts: 0,
    pullUpAttempts: 0,
    catchAndShootAttempts: 0,
    assistedAttempts: 0,
    unassistedRimAttempts: 0,
    paintTouches: 0,
    drives: 0,
    touches: 0,
    potentialAssists: 0,
    secondaryAssists: 0,
    reboundChances: 0,
    contestedRebounds: 0,
    deflections: 0,
    chargesDrawn: 0,
    stocks: total(row.stl, games) + total(row.blk, games),
    opponentExpectedFgPct: 0,
    opponentActualMinusExpectedFg: 0,
    rimContests: 0,
    shotContests: 0,
    lineupNet: numeric(row.net_rating) ?? 0,
    recentGameScores: [],
  };

  return {
    player,
    team,
    aggregate,
    percentiles: {
      tsPct: Math.round(numeric(row.ts_percentile) ?? 0),
      usageRate: Math.round(numeric(row.usage_percentile) ?? 0),
      pie: Math.round(numeric(row.pie_percentile) ?? 0),
    },
  };
}

async function jsonPlayerOptions(): Promise<PlayerOption[]> {
  const { players } = await loadRuntimeFallbacks();
  return players.map((player) => ({
    slug: player.player_slug,
    name: player.player_name,
    teamAbbreviation: player.team_abbreviation ?? "NBA",
    position: player.position ?? "N/A",
  }));
}

async function jsonComparisonPlayers(slugs?: string[]): Promise<ComparisonPlayer[]> {
  const { players, teams } = await loadRuntimeFallbacks();
  const selected = slugs ? new Set(slugs) : null;
  const tsValues = players.flatMap((player) => player.ts_pct === null ? [] : [player.ts_pct]);
  const usageValues = players.flatMap((player) => player.usage_rate === null ? [] : [player.usage_rate]);
  const pieValues = players.flatMap((player) => player.pie === null ? [] : [player.pie]);
  const teamsById = new Map(teams.map((team) => [team.team_id, team]));
  const rows = players.flatMap((player): ComparisonDbRow[] => {
    if (selected && !selected.has(player.player_slug)) return [];
    const teamAbbreviation = player.team_abbreviation ?? "NBA";
    const teamId = player.team_id ?? teamIdByAbbreviation[teamAbbreviation] ?? teamAbbreviation;
    const team = teamsById.get(teamId);
    return [{
      player_slug: player.player_slug,
      nba_player_id: null,
      app_player_id: player.player_slug,
      player_name: player.player_name,
      primary_team_id: teamId,
      primary_team_abbreviation: teamAbbreviation,
      position: player.position,
      height: player.height,
      weight: player.weight,
      age: player.age,
      college: null,
      country: null,
      jersey_number: null,
      headshot_url: null,
      team_slug: team?.slug ?? teamAbbreviation.toLowerCase(),
      team_name: team?.name ?? teamAbbreviation,
      team_city: team?.city ?? "",
      conference: team?.conference ?? null,
      division: team?.division ?? null,
      primary_color: team?.primary_color ?? null,
      secondary_color: team?.secondary_color ?? null,
      season: "2025-26",
      games: player.games,
      minutes: player.minutes,
      pts: player.pts,
      reb: player.reb,
      ast: player.ast,
      stl: player.stl,
      blk: player.blk,
      tov: player.tov,
      ts_pct: player.ts_pct,
      efg_pct: player.efg_pct,
      usage_rate: player.usage_rate,
      ast_pct: player.ast_pct,
      reb_pct: player.reb_pct,
      turnover_rate: player.turnover_rate,
      off_rating: player.off_rating,
      def_rating: player.def_rating,
      net_rating: player.net_rating,
      pie: player.pie,
      ts_percentile: percentile(player.ts_pct, tsValues),
      usage_percentile: percentile(player.usage_rate, usageValues),
      pie_percentile: percentile(player.pie, pieValues),
    }];
  });
  const bySlug = new Map(rows.map((row) => [row.player_slug, mapComparisonRow(row)]));
  if (!slugs) return rows.map(mapComparisonRow);
  return slugs.flatMap((slug) => {
    const player = bySlug.get(slug);
    return player ? [player] : [];
  });
}

export async function listComparisonPlayerOptions(): Promise<PlayerOption[]> {
  try {
    const result = await queryDatabase<PlayerOptionDbRow>(
      `
      SELECT
        p.player_slug,
        p.player_name,
        p.primary_team_abbreviation,
        p.position
      FROM players p
      JOIN current_player_season_summaries s USING (player_slug)
      ORDER BY p.player_name
      `,
    );
    if (!result) return jsonPlayerOptions();
    return result.rows.map((row) => ({
      slug: row.player_slug,
      name: row.player_name,
      teamAbbreviation: row.primary_team_abbreviation ?? "NBA",
      position: row.position ?? "N/A",
    }));
  } catch {
    return jsonPlayerOptions();
  }
}

export async function loadComparisonPlayers(slugs: string[]): Promise<ComparisonPlayer[]> {
  const requested = Array.from(new Set(slugs.filter(Boolean))).slice(0, 2);
  if (!requested.length) return [];

  try {
    const result = await queryDatabase<ComparisonDbRow>(
      `
      WITH ranked AS (
        SELECT
          s.*,
          percent_rank() OVER (ORDER BY s.ts_pct) * 100 AS ts_percentile,
          percent_rank() OVER (ORDER BY s.usage_rate) * 100 AS usage_percentile,
          percent_rank() OVER (ORDER BY s.pie) * 100 AS pie_percentile
        FROM current_player_season_summaries s
      )
      SELECT
        p.player_slug,
        p.nba_player_id,
        p.app_player_id,
        p.player_name,
        p.primary_team_id,
        p.primary_team_abbreviation,
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
        t.city AS team_city,
        t.conference,
        t.division,
        t.primary_color,
        t.secondary_color,
        ranked.*
      FROM ranked
      JOIN players p USING (player_slug)
      LEFT JOIN teams t ON t.id = p.primary_team_id
      WHERE p.player_slug = ANY($1::text[])
      `,
      [requested],
    );
    if (!result) return jsonComparisonPlayers(requested);
    const bySlug = new Map(result.rows.map((row) => [row.player_slug, mapComparisonRow(row)]));
    return requested.flatMap((slug) => {
      const player = bySlug.get(slug);
      return player ? [player] : [];
    });
  } catch {
    return jsonComparisonPlayers(requested);
  }
}

async function jsonSimilarityResult(playerSlug: string): Promise<PlayerSimilarityResult | null> {
  const players = await jsonComparisonPlayers();
  const target = players.find((player) => player.player.slug === playerSlug);
  if (!target) return null;

  const matches = similarPlayers(target.aggregate, players.map((player) => player.aggregate), 10).map((row) => ({
    player: row.aggregate.player,
    team: row.aggregate.team,
    score: row.score,
    matchingTraits: row.traits,
    ratioScore: row.ratioScore,
    perMinuteScore: row.perMinuteScore,
    physicalScore: row.physicalScore,
    roleScore: row.roleScore,
    summary: row.candidateSummary,
  }));
  return {
    target,
    source: "json",
    matches,
  };
}

export async function loadPlayerSimilarity(playerSlug: string): Promise<PlayerSimilarityResult | null> {
  if (!playerSlug) return null;

  try {
    const result = await queryDatabase<ComparisonDbRow>(`
      WITH ranked AS (
        SELECT
          s.*,
          percent_rank() OVER (ORDER BY s.ts_pct) * 100 AS ts_percentile,
          percent_rank() OVER (ORDER BY s.usage_rate) * 100 AS usage_percentile,
          percent_rank() OVER (ORDER BY s.pie) * 100 AS pie_percentile
        FROM current_player_season_summaries s
      )
      SELECT
        p.player_slug,
        p.nba_player_id,
        p.app_player_id,
        p.player_name,
        p.primary_team_id,
        p.primary_team_abbreviation,
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
        t.city AS team_city,
        t.conference,
        t.division,
        t.primary_color,
        t.secondary_color,
        ranked.*
      FROM ranked
      JOIN players p USING (player_slug)
      LEFT JOIN teams t ON t.id = p.primary_team_id
    `);
    if (!result?.rows.length) return jsonSimilarityResult(playerSlug);

    const players = result.rows.map(mapComparisonRow);
    const target = players.find((player) => player.player.slug === playerSlug);
    if (!target) return jsonSimilarityResult(playerSlug);
    const matches = similarPlayers(target.aggregate, players.map((player) => player.aggregate), 10).map((row) => ({
      player: row.aggregate.player,
      team: row.aggregate.team,
      score: row.score,
      matchingTraits: row.traits,
      ratioScore: row.ratioScore,
      perMinuteScore: row.perMinuteScore,
      physicalScore: row.physicalScore,
      roleScore: row.roleScore,
      summary: row.candidateSummary,
    }));

    return { target, matches, source: "postgres" };
  } catch {
    return jsonSimilarityResult(playerSlug);
  }
}
