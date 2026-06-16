import snapshot from "@/lib/data/generated/official-snapshot.json";
import type {
  Game,
  Lineup,
  Pass,
  Player,
  PlayerGameStat,
  PlayerSeasonAggregate,
  Possession,
  Rebound,
  Shot,
  Team,
  TeamGameStat,
  TeamSeasonAggregate
} from "@/lib/types";
import { estimatePossessions, trueShootingPercentage } from "@/lib/metrics/formulas";
import { slugify } from "@/lib/utils";

type SnapshotTable = {
  headers: string[];
  rows: unknown[][];
};

type OfficialSnapshot = typeof snapshot;

const officialSnapshot = snapshot as OfficialSnapshot;

function table(name: keyof OfficialSnapshot["tables"]): SnapshotTable {
  return officialSnapshot.tables[name] as SnapshotTable;
}

function value<T = unknown>(tableData: SnapshotTable, row: unknown[], key: string): T {
  return row[tableData.headers.indexOf(key)] as T;
}

function numberValue(tableData: SnapshotTable, row: unknown[], key: string): number {
  const raw = value<unknown>(tableData, row, key);
  return typeof raw === "number" ? raw : Number(raw ?? 0);
}

function stringValue(tableData: SnapshotTable, row: unknown[], key: string): string {
  const raw = value<unknown>(tableData, row, key);
  return raw === null || raw === undefined ? "" : String(raw);
}

function positionFromRoster(playerId: string): { position: Player["position"]; height: string; weight: number; jerseyNumber: number } {
  for (const rosterTable of Object.values(officialSnapshot.tables.rosters) as SnapshotTable[]) {
    const row = rosterTable.rows.find((item) => String(value(rosterTable, item, "PLAYER_ID")) === playerId);
    if (row) {
      const rawPosition = stringValue(rosterTable, row, "POSITION");
      const mapped = rawPosition.includes("C")
        ? "C"
        : rawPosition.includes("F") && rawPosition.includes("G")
          ? "SF"
          : rawPosition.includes("F")
            ? "PF"
            : rawPosition.includes("G")
              ? "PG"
              : "SF";
      return {
        position: mapped,
        height: stringValue(rosterTable, row, "HEIGHT") || "N/A",
        weight: Number(stringValue(rosterTable, row, "WEIGHT")) || 0,
        jerseyNumber: Number(stringValue(rosterTable, row, "NUM")) || 0
      };
    }
  }
  return { position: "SF", height: "N/A", weight: 0, jerseyNumber: 0 };
}

function splitTeamName(teamName: string) {
  const parts = teamName.split(" ");
  if (parts.length <= 1) return { city: teamName, name: teamName };
  return { city: parts.slice(0, -1).join(" "), name: parts.at(-1) ?? teamName };
}

const teamTable = table("teamStatsRegular");
const playerTable = table("playerStatsRegular");
const playoffPlayerTable = table("playerStatsPlayoffs");

export const officialDatasetVersion = `official-nba-stats-${officialSnapshot.metadata.season}-${officialSnapshot.metadata.generatedAt}`;
export const officialMetadata = officialSnapshot.metadata;

export const officialTeams: Team[] = teamTable.rows.map((row) => {
  const id = String(numberValue(teamTable, row, "TEAM_ID"));
  const fullName = stringValue(teamTable, row, "TEAM_NAME");
  const parts = splitTeamName(fullName);
  const abbreviation = playerTable.rows.find((playerRow) => String(numberValue(playerTable, playerRow, "TEAM_ID")) === id)?.[playerTable.headers.indexOf("TEAM_ABBREVIATION")] as string | undefined;
  return {
    id,
    slug: slugify(fullName),
    name: parts.name,
    abbreviation: abbreviation ?? parts.name.slice(0, 3).toUpperCase(),
    city: parts.city,
    conference: "East",
    division: "NBA",
    primaryColor: "#101820",
    secondaryColor: "#0f766e"
  };
});

export const officialPlayers: Player[] = playerTable.rows.map((row) => {
  const id = String(numberValue(playerTable, row, "PLAYER_ID"));
  const teamId = String(numberValue(playerTable, row, "TEAM_ID"));
  const name = stringValue(playerTable, row, "PLAYER_NAME");
  const roster = positionFromRoster(id);
  return {
    id,
    name,
    slug: slugify(`${name}-${id}`),
    teamId,
    position: roster.position,
    height: roster.height,
    weight: roster.weight,
    age: numberValue(playerTable, row, "AGE"),
    draftYear: 0,
    draftRound: 0,
    draftPick: 0,
    headshotUrl: "/headshots/placeholder.svg",
    active: true,
    handedness: undefined,
    jerseyNumber: roster.jerseyNumber,
    role: "Official NBA Stats player",
    skill: 0,
    createdAt: officialSnapshot.metadata.generatedAt,
    updatedAt: officialSnapshot.metadata.generatedAt
  };
});

const teamById = new Map(officialTeams.map((team) => [team.id, team]));
const playerById = new Map(officialPlayers.map((player) => [player.id, player]));

function playerAggregateFromRow(row: unknown[]): PlayerSeasonAggregate {
  const playerId = String(numberValue(playerTable, row, "PLAYER_ID"));
  const player = playerById.get(playerId)!;
  const team = teamById.get(player.teamId)!;
  const gp = numberValue(playerTable, row, "GP");
  const fga = numberValue(playerTable, row, "FGA");
  const fta = numberValue(playerTable, row, "FTA");
  const oreb = numberValue(playerTable, row, "OREB");
  const tov = numberValue(playerTable, row, "TOV");
  const possessions = estimatePossessions(fga, fta, oreb, tov);
  const pts = numberValue(playerTable, row, "PTS");
  const teamRow = teamTable.rows.find((teamStatsRow) => String(numberValue(teamTable, teamStatsRow, "TEAM_ID")) === player.teamId);
  const teamPossessions = teamRow ? estimatePossessions(numberValue(teamTable, teamRow, "FGA"), numberValue(teamTable, teamRow, "FTA"), numberValue(teamTable, teamRow, "OREB"), numberValue(teamTable, teamRow, "TOV")) : 0;
  const recentGameScores = Array.from({ length: Math.min(10, Math.max(1, gp)) }, (_, index) => ({
    gameId: `official-season-${playerId}-${index}`,
    date: `2026-${String(Math.max(1, 4 - Math.floor(index / 6))).padStart(2, "0")}-${String(20 - index).padStart(2, "0")}`,
    pts: pts / Math.max(gp, 1),
    ts: trueShootingPercentage(pts, fga, fta) ?? 0,
    usage: possessions / Math.max(teamPossessions, 1),
    net: numberValue(playerTable, row, "PLUS_MINUS") / Math.max(gp, 1)
  }));

  return {
    player,
    team,
    season: officialSnapshot.metadata.season,
    games: gp,
    minutes: numberValue(playerTable, row, "MIN"),
    pts,
    reb: numberValue(playerTable, row, "REB"),
    oreb,
    dreb: numberValue(playerTable, row, "DREB"),
    ast: numberValue(playerTable, row, "AST"),
    stl: numberValue(playerTable, row, "STL"),
    blk: numberValue(playerTable, row, "BLK"),
    tov,
    pf: numberValue(playerTable, row, "PF"),
    fgm: numberValue(playerTable, row, "FGM"),
    fga,
    threePm: numberValue(playerTable, row, "FG3M"),
    threePa: numberValue(playerTable, row, "FG3A"),
    ftm: numberValue(playerTable, row, "FTM"),
    fta,
    plusMinus: numberValue(playerTable, row, "PLUS_MINUS"),
    possessions,
    teamPossessions,
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
    stocks: numberValue(playerTable, row, "STL") + numberValue(playerTable, row, "BLK"),
    opponentExpectedFgPct: 0,
    opponentActualMinusExpectedFg: 0,
    rimContests: 0,
    shotContests: 0,
    lineupNet: numberValue(playerTable, row, "PLUS_MINUS") / Math.max(gp, 1),
    recentGameScores
  };
}

export const officialPlayerSeasonAggregates: PlayerSeasonAggregate[] = playerTable.rows.map(playerAggregateFromRow);

export const officialTeamSeasonAggregates: TeamSeasonAggregate[] = teamTable.rows.map((row) => {
  const teamId = String(numberValue(teamTable, row, "TEAM_ID"));
  const team = teamById.get(teamId)!;
  const fga = numberValue(teamTable, row, "FGA");
  const fta = numberValue(teamTable, row, "FTA");
  const oreb = numberValue(teamTable, row, "OREB");
  const tov = numberValue(teamTable, row, "TOV");
  const possessions = estimatePossessions(fga, fta, oreb, tov);
  const threePa = numberValue(teamTable, row, "FG3A");
  return {
    team,
    season: officialSnapshot.metadata.season,
    games: numberValue(teamTable, row, "GP"),
    wins: numberValue(teamTable, row, "W"),
    losses: numberValue(teamTable, row, "L"),
    pts: numberValue(teamTable, row, "PTS"),
    ptsAllowed: numberValue(teamTable, row, "PTS") - numberValue(teamTable, row, "PLUS_MINUS"),
    fgm: numberValue(teamTable, row, "FGM"),
    fga,
    threePm: numberValue(teamTable, row, "FG3M"),
    threePa,
    ftm: numberValue(teamTable, row, "FTM"),
    fta,
    oreb,
    dreb: numberValue(teamTable, row, "DREB"),
    reb: numberValue(teamTable, row, "REB"),
    ast: numberValue(teamTable, row, "AST"),
    stl: numberValue(teamTable, row, "STL"),
    blk: numberValue(teamTable, row, "BLK"),
    tov,
    possessions,
    expectedPoints: 0,
    rimFrequency: 0,
    threeFrequency: fga ? threePa / fga : 0,
    pace: possessions / Math.max(numberValue(teamTable, row, "GP"), 1),
    shotQuality: 0
  };
});

export const officialGames: Game[] = officialTeamSeasonAggregates.slice(0, 30).map((row, index) => ({
  id: `official-team-summary-${row.team.id}`,
  date: officialSnapshot.metadata.generatedAt.slice(0, 10),
  season: officialSnapshot.metadata.season,
  seasonType: "Regular Season",
  homeTeamId: row.team.id,
  awayTeamId: officialTeamSeasonAggregates[(index + 1) % officialTeamSeasonAggregates.length].team.id,
  homeScore: Math.round(row.pts / Math.max(row.games, 1)),
  awayScore: Math.round(officialTeamSeasonAggregates[(index + 1) % officialTeamSeasonAggregates.length].pts / Math.max(officialTeamSeasonAggregates[(index + 1) % officialTeamSeasonAggregates.length].games, 1)),
  status: "Final",
  arena: "Official team summary"
}));

export const officialPlayerGameStats: PlayerGameStat[] = officialPlayerSeasonAggregates.slice(0, 240).map((row) => ({
  id: `official-line-${row.player.id}`,
  gameId: `official-team-summary-${row.team.id}`,
  playerId: row.player.id,
  teamId: row.team.id,
  opponentTeamId: officialTeams.find((team) => team.id !== row.team.id)?.id ?? row.team.id,
  minutes: row.minutes / Math.max(row.games, 1),
  pts: row.pts / Math.max(row.games, 1),
  reb: row.reb / Math.max(row.games, 1),
  oreb: row.oreb / Math.max(row.games, 1),
  dreb: row.dreb / Math.max(row.games, 1),
  ast: row.ast / Math.max(row.games, 1),
  stl: row.stl / Math.max(row.games, 1),
  blk: row.blk / Math.max(row.games, 1),
  tov: row.tov / Math.max(row.games, 1),
  pf: row.pf / Math.max(row.games, 1),
  fgm: row.fgm / Math.max(row.games, 1),
  fga: row.fga / Math.max(row.games, 1),
  threePm: row.threePm / Math.max(row.games, 1),
  threePa: row.threePa / Math.max(row.games, 1),
  ftm: row.ftm / Math.max(row.games, 1),
  fta: row.fta / Math.max(row.games, 1),
  plusMinus: row.plusMinus / Math.max(row.games, 1)
}));

export const officialTeamGameStats: TeamGameStat[] = officialTeamSeasonAggregates.map((row) => ({
  id: `official-team-line-${row.team.id}`,
  gameId: `official-team-summary-${row.team.id}`,
  teamId: row.team.id,
  opponentTeamId: officialTeams.find((team) => team.id !== row.team.id)?.id ?? row.team.id,
  pts: row.pts / Math.max(row.games, 1),
  fgm: row.fgm / Math.max(row.games, 1),
  fga: row.fga / Math.max(row.games, 1),
  threePm: row.threePm / Math.max(row.games, 1),
  threePa: row.threePa / Math.max(row.games, 1),
  ftm: row.ftm / Math.max(row.games, 1),
  fta: row.fta / Math.max(row.games, 1),
  oreb: row.oreb / Math.max(row.games, 1),
  dreb: row.dreb / Math.max(row.games, 1),
  reb: row.reb / Math.max(row.games, 1),
  ast: row.ast / Math.max(row.games, 1),
  stl: row.stl / Math.max(row.games, 1),
  blk: row.blk / Math.max(row.games, 1),
  tov: row.tov / Math.max(row.games, 1),
  pf: 0,
  possessions: row.possessions / Math.max(row.games, 1)
}));

export const officialShots: Shot[] = [];
export const officialPossessions: Possession[] = [];
export const officialPasses: Pass[] = [];
export const officialRebounds: Rebound[] = [];
export const officialLineups: Lineup[] = [];

export const officialInsights = [
  {
    title: "Official NBA Stats snapshot loaded",
    body: `${officialSnapshot.metadata.coverage.regularSeasonPlayerStats} regular-season players and ${officialSnapshot.metadata.coverage.regularSeasonTeamStats} teams are loaded from NBA Stats.`,
    href: "/leaderboards"
  },
  {
    title: "Tracking metrics require a licensed feed",
    body: "Shot quality, defender distance, touch maps, pass networks, and gravity are disabled or marked N/A until tracking/event data is connected.",
    href: "/about"
  },
  {
    title: "Basketball-Reference-style efficiency is calculated locally",
    body: "eFG%, TS%, possession estimates, ratings, usage, and rates are derived from official NBA box totals.",
    href: "/glossary"
  }
];

export function playoffPlayerRow(playerId: string) {
  const row = playoffPlayerTable.rows.find((item) => String(numberValue(playoffPlayerTable, item, "PLAYER_ID")) === playerId);
  if (!row) return undefined;
  return {
    games: numberValue(playoffPlayerTable, row, "GP"),
    pts: numberValue(playoffPlayerTable, row, "PTS"),
    reb: numberValue(playoffPlayerTable, row, "REB"),
    ast: numberValue(playoffPlayerTable, row, "AST")
  };
}
