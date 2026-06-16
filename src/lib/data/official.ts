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

function optionalNumberValue(tableData: SnapshotTable, row: unknown[], key: string): number | undefined {
  if (!tableData.headers.includes(key)) return undefined;
  const raw = value<unknown>(tableData, row, key);
  if (raw === null || raw === undefined || raw === "") return undefined;
  const numeric = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function stringValue(tableData: SnapshotTable, row: unknown[], key: string): string {
  const raw = value<unknown>(tableData, row, key);
  return raw === null || raw === undefined ? "" : String(raw);
}

const teamMetadataByAbbreviation: Record<string, Pick<Team, "conference" | "division" | "primaryColor" | "secondaryColor">> = {
  ATL: { conference: "East", division: "Southeast", primaryColor: "#e03a3e", secondaryColor: "#c1d32f" },
  BOS: { conference: "East", division: "Atlantic", primaryColor: "#007a33", secondaryColor: "#ba9653" },
  BKN: { conference: "East", division: "Atlantic", primaryColor: "#000000", secondaryColor: "#ffffff" },
  CHA: { conference: "East", division: "Southeast", primaryColor: "#1d1160", secondaryColor: "#00788c" },
  CHI: { conference: "East", division: "Central", primaryColor: "#ce1141", secondaryColor: "#000000" },
  CLE: { conference: "East", division: "Central", primaryColor: "#860038", secondaryColor: "#041e42" },
  DAL: { conference: "West", division: "Southwest", primaryColor: "#00538c", secondaryColor: "#002b5e" },
  DEN: { conference: "West", division: "Northwest", primaryColor: "#0e2240", secondaryColor: "#fec524" },
  DET: { conference: "East", division: "Central", primaryColor: "#c8102e", secondaryColor: "#1d42ba" },
  GSW: { conference: "West", division: "Pacific", primaryColor: "#1d428a", secondaryColor: "#ffc72c" },
  HOU: { conference: "West", division: "Southwest", primaryColor: "#ce1141", secondaryColor: "#000000" },
  IND: { conference: "East", division: "Central", primaryColor: "#002d62", secondaryColor: "#fdbb30" },
  LAC: { conference: "West", division: "Pacific", primaryColor: "#c8102e", secondaryColor: "#1d428a" },
  LAL: { conference: "West", division: "Pacific", primaryColor: "#552583", secondaryColor: "#fdb927" },
  MEM: { conference: "West", division: "Southwest", primaryColor: "#5d76a9", secondaryColor: "#12173f" },
  MIA: { conference: "East", division: "Southeast", primaryColor: "#98002e", secondaryColor: "#f9a01b" },
  MIL: { conference: "East", division: "Central", primaryColor: "#00471b", secondaryColor: "#eee1c6" },
  MIN: { conference: "West", division: "Northwest", primaryColor: "#0c2340", secondaryColor: "#78be20" },
  NOP: { conference: "West", division: "Southwest", primaryColor: "#0c2340", secondaryColor: "#c8102e" },
  NYK: { conference: "East", division: "Atlantic", primaryColor: "#006bb6", secondaryColor: "#f58426" },
  OKC: { conference: "West", division: "Northwest", primaryColor: "#007ac1", secondaryColor: "#ef3b24" },
  ORL: { conference: "East", division: "Southeast", primaryColor: "#0077c0", secondaryColor: "#c4ced4" },
  PHI: { conference: "East", division: "Atlantic", primaryColor: "#006bb6", secondaryColor: "#ed174c" },
  PHX: { conference: "West", division: "Pacific", primaryColor: "#1d1160", secondaryColor: "#e56020" },
  POR: { conference: "West", division: "Northwest", primaryColor: "#e03a3e", secondaryColor: "#000000" },
  SAC: { conference: "West", division: "Pacific", primaryColor: "#5a2d81", secondaryColor: "#63727a" },
  SAS: { conference: "West", division: "Southwest", primaryColor: "#c4ced4", secondaryColor: "#000000" },
  TOR: { conference: "East", division: "Atlantic", primaryColor: "#ce1141", secondaryColor: "#000000" },
  UTA: { conference: "West", division: "Northwest", primaryColor: "#002b5c", secondaryColor: "#f9a01b" },
  WAS: { conference: "East", division: "Southeast", primaryColor: "#002b5c", secondaryColor: "#e31837" }
};

function positionFromRoster(playerId: string): { position: Player["position"]; height: string; weight: number; jerseyNumber: number } {
  for (const rosterTable of Object.values(officialSnapshot.tables.rosters) as SnapshotTable[]) {
    const row = rosterTable.rows.find((item) => String(value(rosterTable, item, "PLAYER_ID")) === playerId);
    if (row) {
      const rawPosition = stringValue(rosterTable, row, "POSITION");
      return {
        position: rawPosition || "N/A",
        height: stringValue(rosterTable, row, "HEIGHT") || "N/A",
        weight: Number(stringValue(rosterTable, row, "WEIGHT")) || 0,
        jerseyNumber: Number(stringValue(rosterTable, row, "NUM")) || 0
      };
    }
  }
  return { position: "N/A", height: "N/A", weight: 0, jerseyNumber: 0 };
}

function splitTeamName(teamName: string) {
  const parts = teamName.split(" ");
  if (parts.length <= 1) return { city: teamName, name: teamName };
  return { city: parts.slice(0, -1).join(" "), name: parts.at(-1) ?? teamName };
}

const teamTable = table("teamStatsRegular");
const playerTable = table("playerStatsRegular");
const playoffPlayerTable = table("playerStatsPlayoffs");
const teamGameLogsRegularTable = table("teamGameLogsRegular");
const teamGameLogsPlayoffsTable = table("teamGameLogsPlayoffs");
const playerGameLogsRegularTable = table("playerGameLogsRegular");
const playerGameLogsPlayoffsTable = table("playerGameLogsPlayoffs");

export const officialDatasetVersion = `official-nba-stats-${officialSnapshot.metadata.season}-${officialSnapshot.metadata.generatedAt}`;
export const officialMetadata = officialSnapshot.metadata;

export const officialTeams: Team[] = teamTable.rows.map((row) => {
  const id = String(numberValue(teamTable, row, "TEAM_ID"));
  const fullName = stringValue(teamTable, row, "TEAM_NAME");
  const parts = splitTeamName(fullName);
  const abbreviation = playerTable.rows.find((playerRow) => String(numberValue(playerTable, playerRow, "TEAM_ID")) === id)?.[playerTable.headers.indexOf("TEAM_ABBREVIATION")] as string | undefined;
  const metadata = abbreviation ? teamMetadataByAbbreviation[abbreviation] : undefined;
  return {
    id,
    slug: slugify(fullName),
    name: parts.name,
    abbreviation: abbreviation ?? parts.name.slice(0, 3).toUpperCase(),
    city: parts.city,
    conference: metadata?.conference ?? "East",
    division: metadata?.division ?? "NBA",
    primaryColor: metadata?.primaryColor ?? "#101820",
    secondaryColor: metadata?.secondaryColor ?? "#0f766e"
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
const teamByAbbreviation = new Map(officialTeams.map((team) => [team.abbreviation, team]));
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
    recentGameScores: []
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

function normalizeGameDate(rawDate: string): string {
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? rawDate.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function opponentFromMatchup(matchup: string): Team | undefined {
  const abbreviation = matchup.split(/\s(?:vs\.|@)\s/).at(1)?.trim();
  return abbreviation ? teamByAbbreviation.get(abbreviation) : undefined;
}

function teamGameRows(tableData: SnapshotTable, seasonType: Game["seasonType"]): TeamGameStat[] {
  return tableData.rows.flatMap((row): TeamGameStat[] => {
    const teamId = String(numberValue(tableData, row, "TEAM_ID"));
    const team = teamById.get(teamId);
    const gameId = stringValue(tableData, row, "GAME_ID");
    const matchup = stringValue(tableData, row, "MATCHUP");
    const opponent = opponentFromMatchup(matchup);
    if (!team || !opponent || !gameId) return [];
    const fga = numberValue(tableData, row, "FGA");
    const fta = numberValue(tableData, row, "FTA");
    const oreb = numberValue(tableData, row, "OREB");
    const tov = numberValue(tableData, row, "TOV");
    return [{
      id: `official-team-game-${seasonType}-${gameId}-${teamId}`,
      gameId,
      teamId: team.id,
      opponentTeamId: opponent.id,
      pts: numberValue(tableData, row, "PTS"),
      fgm: numberValue(tableData, row, "FGM"),
      fga,
      threePm: numberValue(tableData, row, "FG3M"),
      threePa: numberValue(tableData, row, "FG3A"),
      ftm: numberValue(tableData, row, "FTM"),
      fta,
      oreb,
      dreb: numberValue(tableData, row, "DREB"),
      reb: numberValue(tableData, row, "REB"),
      ast: numberValue(tableData, row, "AST"),
      stl: numberValue(tableData, row, "STL"),
      blk: numberValue(tableData, row, "BLK"),
      tov,
      pf: optionalNumberValue(tableData, row, "PF") ?? 0,
      possessions: estimatePossessions(fga, fta, oreb, tov)
    }];
  });
}

export const officialTeamGameStats: TeamGameStat[] = [
  ...teamGameRows(teamGameLogsRegularTable, "Regular Season"),
  ...teamGameRows(teamGameLogsPlayoffsTable, "Playoffs")
];

function gamesFromTeamGameRows(tableData: SnapshotTable, seasonType: Game["seasonType"]): Game[] {
  const grouped = new Map<string, unknown[][]>();
  for (const row of tableData.rows) {
    const gameId = stringValue(tableData, row, "GAME_ID");
    if (!gameId) continue;
    const rows = grouped.get(gameId) ?? [];
    rows.push(row);
    grouped.set(gameId, rows);
  }

  return Array.from(grouped.entries()).flatMap(([gameId, rows]): Game[] => {
    const homeRow = rows.find((row) => stringValue(tableData, row, "MATCHUP").includes(" vs. "));
    const awayRow = rows.find((row) => stringValue(tableData, row, "MATCHUP").includes(" @ "));
    const neutralSite = !homeRow && rows.length === 2 && rows.every((row) => stringValue(tableData, row, "MATCHUP").includes(" @ "));
    const firstRow = neutralSite ? rows[0] : awayRow;
    const secondRow = neutralSite ? rows[1] : homeRow;
    if (!firstRow || !secondRow) return [];
    const awayTeamId = String(numberValue(tableData, firstRow, "TEAM_ID"));
    const homeTeamId = String(numberValue(tableData, secondRow, "TEAM_ID"));
    if (!teamById.has(homeTeamId) || !teamById.has(awayTeamId)) return [];
    return [{
      id: gameId,
      date: normalizeGameDate(stringValue(tableData, secondRow, "GAME_DATE")),
      season: officialSnapshot.metadata.season,
      seasonType,
      homeTeamId,
      awayTeamId,
      homeScore: numberValue(tableData, secondRow, "PTS"),
      awayScore: numberValue(tableData, firstRow, "PTS"),
      status: "Final",
      neutralSite: neutralSite || undefined,
      arena: neutralSite ? "Neutral site" : undefined
    }];
  });
}

export const officialGames: Game[] = [
  ...gamesFromTeamGameRows(teamGameLogsRegularTable, "Regular Season"),
  ...gamesFromTeamGameRows(teamGameLogsPlayoffsTable, "Playoffs")
];

function playerGameRows(tableData: SnapshotTable): PlayerGameStat[] {
  return tableData.rows.flatMap((row): PlayerGameStat[] => {
    const playerId = String(numberValue(tableData, row, "PLAYER_ID"));
    const teamId = String(numberValue(tableData, row, "TEAM_ID"));
    const gameId = stringValue(tableData, row, "GAME_ID");
    const matchup = stringValue(tableData, row, "MATCHUP");
    const opponent = opponentFromMatchup(matchup);
    if (!playerById.has(playerId) || !teamById.has(teamId) || !opponent || !gameId) return [];
    return [{
      id: `official-player-game-${gameId}-${playerId}`,
      gameId,
      playerId,
      teamId,
      opponentTeamId: opponent.id,
      minutes: numberValue(tableData, row, "MIN"),
      pts: numberValue(tableData, row, "PTS"),
      reb: numberValue(tableData, row, "REB"),
      oreb: numberValue(tableData, row, "OREB"),
      dreb: numberValue(tableData, row, "DREB"),
      ast: numberValue(tableData, row, "AST"),
      stl: numberValue(tableData, row, "STL"),
      blk: numberValue(tableData, row, "BLK"),
      tov: numberValue(tableData, row, "TOV"),
      pf: optionalNumberValue(tableData, row, "PF") ?? 0,
      fgm: numberValue(tableData, row, "FGM"),
      fga: numberValue(tableData, row, "FGA"),
      threePm: numberValue(tableData, row, "FG3M"),
      threePa: numberValue(tableData, row, "FG3A"),
      ftm: numberValue(tableData, row, "FTM"),
      fta: numberValue(tableData, row, "FTA"),
      plusMinus: numberValue(tableData, row, "PLUS_MINUS")
    }];
  });
}

export const officialPlayerGameStats: PlayerGameStat[] = [
  ...playerGameRows(playerGameLogsRegularTable),
  ...playerGameRows(playerGameLogsPlayoffsTable)
];

const gameDateById = new Map(officialGames.map((game) => [game.id, game.date]));

for (const aggregate of officialPlayerSeasonAggregates) {
  aggregate.recentGameScores = officialPlayerGameStats
    .filter((line) => line.playerId === aggregate.player.id)
    .sort((a, b) => (gameDateById.get(a.gameId) ?? "").localeCompare(gameDateById.get(b.gameId) ?? ""))
    .slice(-10)
    .map((line) => ({
      gameId: line.gameId,
      date: gameDateById.get(line.gameId) ?? "",
      pts: line.pts,
      ts: trueShootingPercentage(line.pts, line.fga, line.fta) ?? 0,
      usage: 0,
      net: line.plusMinus
    }));
}

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
    title: "Box-score efficiency is calculated locally",
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
