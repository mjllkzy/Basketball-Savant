import type { Lineup, Shot, Team, TeamSeasonAggregate } from "@/lib/types";
import { loadRuntimeFallbacks } from "@/lib/data/runtimeFallbacks.server";
import { listGameAnalytics, type GameListItem } from "./gameAnalytics.server";
import { listPlayerDirectory, type PlayerDirectoryRow } from "./playerDirectory.server";
import { queryDatabase } from "./client.server";
import { listShotAttempts } from "./shotAttempts.server";
import { getCachedTeamShotChart } from "@/lib/data/teamShotCache";

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

async function jsonFallback(): Promise<TeamSummaryResult> {
  const { teams } = await loadRuntimeFallbacks();
  return {
    source: "json",
    rows: teams.map((row) => mapTeamSummary({
      ...row,
      id: row.team_id,
    })),
  };
}

export async function listTeamSeasonSummaries(): Promise<TeamSummaryResult> {
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
      ORDER BY t.city, t.name
    `);
    if (!result?.rows.length) return jsonFallback();
    return { rows: result.rows.map(mapTeamSummary), source: "postgres" };
  } catch {
    return jsonFallback();
  }
}

export async function loadTeamProfile(idOrSlug: string): Promise<TeamProfileResult | null> {
  const teamResult = await listTeamSeasonSummaries();
  const normalized = idOrSlug.trim().toLowerCase();
  const aggregate = teamResult.rows.find((row) =>
    row.team.id === idOrSlug
    || row.team.slug.toLowerCase() === normalized
    || row.team.abbreviation.toLowerCase() === normalized
  );
  if (!aggregate) return null;

  const [roster, games] = await Promise.all([
    listPlayerDirectory({ teamId: aggregate.team.id, all: true, minGames: 0, minMinutes: 0 }),
    listGameAnalytics({ teamId: aggregate.team.id, pageSize: 100 }),
  ]);
  const shotResult = await listShotAttempts({ teamId: aggregate.team.id });
  return {
    team: aggregate.team,
    aggregate,
    rosterRows: roster.rows,
    games: games.rows,
    shots: shotResult.source === "postgres" && shotResult.rows.length
      ? shotResult.rows
      : getCachedTeamShotChart(aggregate.team.id),
    lineups: [],
    source: teamResult.source === "postgres"
      && roster.meta.source === "postgres"
      && games.meta.source === "postgres"
      ? "postgres"
      : "json",
  };
}
